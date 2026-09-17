# Banco de dados Supabase

O banco do NightGuide usa Postgres no Supabase, Auth integrado, RLS nas tabelas publicas e buckets publicos para capas de eventos/locais.

Arquivo principal:

```text
supabase/schema.sql
```

## Extensoes e tipos

O schema habilita:

```sql
create extension if not exists pgcrypto;
```

Enums:

- `user_role`: `admin`, `owner`, `customer`, `promoter`
- `event_status`: `draft`, `published`, `cancelled`
- `ticket_status`: `interested`, `reserved`, `paid`, `cancelled`

## Tabelas

### profiles

Perfil do usuario autenticado. A chave primaria referencia `auth.users(id)`.

Campos principais:

- `id`
- `full_name`
- `avatar_url`
- `cover_url`
- `phone`
- `bio`
- `role`
- `created_at`
- `updated_at`

Uso:

- cliente comum
- dono de estabelecimento
- admin/promoter no futuro

A foto e a capa do perfil usam arquivos no bucket `review-media`, dentro da pasta do usuario.
No app nativo, `bio` e a descricao do perfil. O cache local preserva as imagens e o texto
enquanto houver uma edicao pendente; a API confirma exatamente uma linha atualizada antes
de remover essa alteracao da fila offline.

### venues

Estabelecimentos e locais parceiros.

Campos principais:

- `owner_id`
- `name`
- `slug`
- `category`
- `description`
- `address`
- `latitude`
- `longitude`
- `phone`
- `whatsapp`
- `instagram`
- `website_url`
- `logo_url`
- `cover_url`
- `rating`
- `review_count`
- `is_published`
- `is_partner`

Uso:

- mapa
- pagina de descoberta
- painel do dono
- reviews
- eventos vinculados

### events

Eventos publicados pelos locais.

Campos principais:

- `venue_id`
- `creator_id`
- `title`
- `description`
- `starts_at`
- `ends_at`
- `cover_url`
- `price`
- `ticket_url`
- `genre`
- `mood`
- `capacity`
- `status`
- `is_featured`

Uso:

- carrossel
- cards
- detalhes
- checkout
- ingressos

### event_images e venue_images

Galerias de imagens para eventos e locais.

Campos:

- `event_id` ou `venue_id`
- `url`
- `alt_text`
- `sort_order`

### saved_events e saved_venues

Favoritos do usuario.

Chave composta:

- `user_id`
- `event_id` ou `venue_id`

### tickets

Ingressos/reservas do usuario.

Campos principais:

- `user_id`
- `event_id`
- `status`
- `quantity`
- `amount`
- `customer_note`

### reviews

Feedbacks de clientes para estabelecimentos.

Campos:

- `user_id`
- `venue_id`
- `rating`
- `comment`
- `visited_at`
- `image_url`
- `author_name`
- `author_avatar_url`

Tem `unique (user_id, venue_id)` para um review por usuario/local.
O nome e avatar publicos do autor sao copiados pelo trigger `private.set_review_author`, sem liberar telefone, bio ou outros campos do perfil.

### owner_messages

Mensagens recebidas pelo dono do estabelecimento.

Campos:

- `venue_id`
- `sender_id`
- `sender_name`
- `sender_email`
- `message`
- `is_read`

### impact_metrics

Metricas de impacto para apresentacao, relatorios e extensao.

Campos:

- `venue_id`
- `event_id`
- `metric_name`
- `metric_value`
- `source`
- `recorded_at`

Exemplos:

- visualizacoes
- favoritos
- cliques em ingresso
- reviews
- alcance por evento

## Indices

O schema cria indices para:

- donos dos locais
- eventos por local/criador
- eventos publicados por data
- ingressos por usuario
- reviews por local
- metricas por evento

## Triggers

### set_updated_at

Atualiza `updated_at` em:

- `profiles`
- `venues`
- `events`
- `tickets`
- `reviews`

### refresh_venue_rating

Recalcula `rating` e `review_count` do local quando reviews sao inseridas, atualizadas ou deletadas.

### set_review_author

Preenche o nome e avatar publicos da publicacao a partir do perfil autenticado. A funcao fica no schema `private`, limpa o `search_path` e nao pode ser chamada diretamente por `anon` ou `authenticated`.

### handle_new_user

Cria um perfil em `public.profiles` quando um usuario e criado em `auth.users`.

Importante:

- A funcao fica no schema `private`.
- Usa `security definer`.
- O `search_path` e limpo para reduzir risco.

## RLS

RLS esta ativado em todas as tabelas publicas principais.

### profiles

- Usuario le apenas o proprio perfil.
- Usuario atualiza apenas o proprio perfil.

### venues

- Qualquer pessoa le locais publicados.
- Dono le o proprio local mesmo nao publicado.
- Dono cria, edita e deleta apenas os proprios locais.

### events

- Qualquer pessoa le eventos publicados.
- Criador/dono le eventos proprios.
- Dono cria eventos apenas em local dele.
- Dono edita/deleta eventos do proprio local.

### imagens

- Leitura publica.
- Escrita apenas pelo dono do local/evento relacionado.

### favoritos

- Usuario gerencia apenas os proprios favoritos.

### tickets

- Usuario gerencia apenas os proprios ingressos.
- Dono pode ler ingressos de eventos do proprio local.

### reviews

- Leitura publica.
- Usuario cria, edita e deleta apenas a propria review.

### owner_messages

- Qualquer pessoa pode enviar mensagem.
- Dono le/atualiza mensagens do proprio local.

### impact_metrics

- Dono le metricas do proprio local.
- Metricas globais com `venue_id is null` podem ser lidas por dono autenticado.

## Storage

Buckets criados:

- `venue-covers`
- `event-covers`
- `review-media`

As capas e fotos publicadas usam URLs publicas. No bucket `review-media`:

- o tamanho maximo e 6 MB
- somente JPEG, PNG e WebP sao aceitos
- cada usuario grava, substitui e remove apenas arquivos dentro da propria pasta
- a listagem dos objetos nao e publica

Para producao real, recomenda-se:

- validar tamanho e tipo de arquivo
- criar politicas de Storage para upload apenas do dono
- gerar nomes de arquivo com UUID
- remover arquivos antigos ao trocar capa

## Pendencia conhecida

`src/lib/offline-sync.ts` tenta sincronizar a fila para uma tabela `user_activity`. Essa tabela deve ser criada antes de transformar a fila offline em persistencia real. Enquanto ela nao existir, a fila permanece local e as tentativas de sync podem ser reprocessadas depois.

Sugestao futura:

```sql
create table public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_id text not null,
  action_type text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  client_created_at timestamptz not null,
  synced_at timestamptz not null default now(),
  unique (user_id, action_id)
);

alter table public.user_activity enable row level security;

create policy "Users manage own activity"
  on public.user_activity for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```
