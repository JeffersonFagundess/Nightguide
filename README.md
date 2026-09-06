# NightGuide Saquarema

NightGuide e uma aplicacao web/mobile hibrida para centralizar eventos, bares e experiencias noturnas em Saquarema-RJ. O projeto nasceu como trabalho de faculdade/extensao e foi evoluido para um MVP moderno com carrossel full screen, mapa, autenticacao, conta de cliente, painel de dono de estabelecimento, PWA, modo claro/escuro, idiomas PT/EN e simulacao de compra de ingressos com Mercado Pago.

> Status atual: MVP hibrido/PWA pronto para Vercel e regressao nativa em desenvolvimento ativo na branch `native-regression`.

Na branch `native-regression`, a nova base Expo/React Native fica em `apps/mobile`. Ela convive com a versao web e ja inclui cadastro/login por email e senha, Google opcional, descoberta, favoritos, mapa/localizacao, ingressos com QR, scanner, notificacoes locais, painel nativo de estabelecimento e publicacoes com foto que sincronizam depois do uso offline.

## Links uteis

- Producao: https://nightguide-saquarema.vercel.app
- Schema Supabase: [`supabase/schema.sql`](supabase/schema.sql)
- Imagens do carrossel: [`public/carousel-source-images`](public/carousel-source-images)
- Documentacao completa: [`docs`](docs)

## Stack

- Next.js 16 com App Router
- React 19 e TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, RLS e Storage
- Mercado Pago em ambiente de teste
- Leaflet + OpenStreetMap para mapa
- PWA com manifest, icones, service worker e cache offline
- IndexedDB para fila offline de acoes do usuario
- Vercel para deploy

## Principais funcionalidades

- Home responsiva com carrossel visual em tela cheia.
- Eventos em destaque com movimento de imagem, filtros e busca.
- Mapa interativo com zoom controlado para nao atrapalhar o scroll da pagina.
- Modal de detalhes de evento/local com fechamento por `Esc`.
- Login e cadastro por email/senha com Supabase.
- Login com Google via Supabase Auth.
- Conta de cliente com favoritos, feedbacks e ingressos.
- Conta de dono com edicao de perfil do estabelecimento e eventos locais.
- Compra de ingresso teste por cartao, Pix visual e Checkout Pro.
- Mensagem de pagamento confirmado dentro da tela.
- PWA instalavel no celular e cache de paginas/imagens.
- Idioma portugues/ingles e tema claro/escuro.

## Como rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

Para build de producao:

```bash
npm run lint
npm run build
```

## Variaveis de ambiente

Copie `.env.example` para `.env.local` e preencha com valores reais do seu ambiente:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-sua-public-key
MERCADOPAGO_ACCESS_TOKEN=TEST-seu-access-token
```

Nunca suba `.env.local`, `.env.vercel.production`, Access Token, service role key, client secret do Google ou qualquer arquivo de credenciais.

## Documentacao

- [`docs/SETUP.md`](docs/SETUP.md): configuracao local, Supabase, Google OAuth e Vercel.
- [`docs/PRODUCT.md`](docs/PRODUCT.md): escopo do produto, jornadas e criterio de sucesso.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): arquitetura do app e fluxo dos dados.
- [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md): rotas internas, payloads e respostas.
- [`docs/DATABASE.md`](docs/DATABASE.md): tabelas, RLS e Storage do Supabase.
- [`docs/PAYMENTS.md`](docs/PAYMENTS.md): cartao, Pix, Checkout Pro, webhooks e testes Mercado Pago.
- [`docs/PWA_OFFLINE.md`](docs/PWA_OFFLINE.md): instalacao como app e comportamento offline.
- [`docs/SECURITY.md`](docs/SECURITY.md): boas praticas, segredos, RLS, SQL injection e checklist.
- [`docs/TESTING.md`](docs/TESTING.md): testes tecnicos e QA manual.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): deploy na Vercel.
- [`docs/BRANCHING.md`](docs/BRANCHING.md): estrategia de branches.
- [`docs/NATIVE_ROADMAP.md`](docs/NATIVE_ROADMAP.md): plano para migracao nativa.
- [`docs/MOBILE_SETUP.md`](docs/MOBILE_SETUP.md): configuracao e execucao do app Expo/React Native.

## Estrutura

```text
src/app                         Rotas App Router e APIs
src/components                  Componentes de UI e experiencias
src/lib                         Dados, Supabase, pagamentos, preferencias e offline
public/events                   Imagens finais usadas nos eventos
public/carousel-source-images   Imagens separadas para animar com IA
public/sw.js                    Service worker do PWA
supabase/schema.sql             Schema, triggers, RLS e buckets
docs                            Documentacao detalhada
```

## Fluxo de pagamento teste

O app tem tres caminhos:

- Cartao via API do Mercado Pago usando cartoes oficiais de teste.
- Pix com fluxo visual no NightGuide. Quando o Mercado Pago de teste aceita, o app usa o QR retornado pela API. Quando a sandbox recusa por restricao de conta, o app gera um Pix de demonstracao e deixa claro que e teste.
- Checkout Pro redirecionando para o Mercado Pago quando usado pelo botao correspondente.

Nenhuma cobranca real e feita com credenciais `TEST-`.

## Banco e seguranca

O arquivo `supabase/schema.sql` cria as tabelas principais, ativa RLS e define politicas por dono/cliente. O Access Token do Mercado Pago fica apenas em rotas server-side. O frontend usa somente chave publicavel do Supabase e Public Key do Mercado Pago.

## Branches

- `main`: MVP hibrido/PWA atual, pronto para web, mobile browser e instalacao como PWA.
- `native-regression`: base documentada para a regressao/migracao para app nativo.

## Observacoes de produto

Este projeto ainda e um MVP de faculdade. Algumas interacoes de cliente/dono usam armazenamento local e fila offline para demonstrar experiencia completa antes de persistir tudo em tabelas reais. A estrutura do Supabase ja esta preparada para levar esses fluxos para persistencia definitiva.
