# Seguranca e boas praticas

Este documento resume os cuidados de seguranca do NightGuide para o MVP e os proximos passos antes de producao real.

## Segredos

Nunca versionar:

- `.env.local`
- `.env.vercel.production`
- Access Token Mercado Pago
- Google OAuth Client Secret
- Supabase service role key
- arquivos `client_secret_*.json`
- chaves privadas

O `.gitignore` foi configurado para bloquear envs, logs, `.vercel`, `.next` e `node_modules`.

## Variaveis publicas x privadas

Publicas:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`

Privadas:

- `MERCADOPAGO_ACCESS_TOKEN`

Regra: qualquer `NEXT_PUBLIC_` vai para o bundle do navegador.

## Supabase

Boas praticas aplicadas:

- RLS ativado em todas as tabelas publicas principais.
- Politicas por dono/usuario.
- Dono so altera locais/eventos dele.
- Usuario so altera favoritos, ingressos e reviews dele.
- Leitura publica apenas onde o produto precisa.
- Trigger de perfil fica em schema `private`.

Cuidados futuros:

- nunca usar `user_metadata` para autorizacao sensivel
- preferir `app_metadata` para roles administrativas
- adicionar advisors do Supabase no pipeline
- criar politicas de Storage para upload
- criar tabela de auditoria para pagamentos e webhooks

## SQL Injection

O app usa Supabase client e filtros parametrizados em vez de montar SQL manual com string. Isso reduz risco de SQL injection no frontend/backend.

Pontos a manter:

- nao concatenar input de usuario em SQL bruto
- validar IDs, quantidade e metodo de pagamento nas API routes
- usar allowlist para filtros e status
- manter RLS como segunda camada de protecao

## Mercado Pago

Cuidados aplicados:

- Access Token fica apenas em API routes.
- Cartao e tokenizado com Public Key.
- Backend valida login antes de criar pagamento.
- Quantidade e metodo sao normalizados no servidor.
- Logs usam `debugId` e nao precisam expor token.

Cuidados futuros:

- validar assinatura de webhook
- criar idempotencia por pedido real
- gravar `payments` e `payment_events`
- nao liberar ingresso apenas por retorno de URL
- liberar ingresso a partir de webhook validado ou consulta server-side ao pagamento

## Autenticacao

Cuidados:

- Supabase SSR gerencia cookies de sessao.
- `next` de redirecionamento e sanitizado para impedir redirect externo.
- Login Google depende de redirect URLs exatas no Supabase.

Cuidados futuros:

- expirar sessoes sensiveis
- proteger acoes de dono com papel real no banco
- adicionar verificacao server-side antes de salvar edicoes

## PWA e offline

Riscos:

- dados locais podem ser apagados pelo navegador
- dados locais nao devem conter segredo
- compras reais nao devem depender somente de `localStorage`

Recomendacao:

- usar Supabase para persistir favoritos, reviews, tickets e pagamentos
- manter localStorage/IndexedDB apenas como cache e fila

## Dependencias

Comandos recomendados:

```bash
npm audit
npm run lint
npm run build
```

## Checklist antes de publicar

- `.env.local` nao aparece no Git.
- `.env.vercel.production` nao aparece no Git.
- Nenhum token real aparece em `git grep`.
- Build passa.
- Lint passa.
- RLS revisado no Supabase.
- Google OAuth com callbacks corretos.
- Mercado Pago com token de vendedor correto.
- Webhook responde 200.
- PWA abre em HTTPS.
- Teste mobile feito.

## Politica de secrets

Se algum segredo for exposto por acidente:

1. Remover do codigo.
2. Revogar/rotacionar no provedor.
3. Criar novo valor.
4. Atualizar Vercel/Supabase/Mercado Pago.
5. Reimplantar.
6. Se ja foi commitado, limpar historico ou recriar repositorio.
