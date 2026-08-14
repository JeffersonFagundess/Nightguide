# Deploy na Vercel

O NightGuide foi pensado para deploy na Vercel usando Next.js App Router.

## Projeto

Nome sugerido:

```text
Nightguide
```

URL de producao atual:

```text
https://nightguide-saquarema.vercel.app
```

## Variaveis de ambiente de Production

Configurar na Vercel:

```bash
NEXT_PUBLIC_SITE_URL=https://nightguide-saquarema.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-sua-public-key
MERCADOPAGO_ACCESS_TOKEN=TEST-seu-access-token
```

Nao configurar:

- Google Client Secret como `NEXT_PUBLIC_`
- Supabase service role no frontend
- Access Token do Mercado Pago no frontend

## Build

Comandos esperados:

```bash
npm install
npm run build
```

A Vercel detecta Next.js automaticamente.

## Depois do deploy

Validar:

- home abre sem login
- `/login` abre
- `/cadastro` abre
- `/conta` exige sessao quando necessario
- Google volta para `/auth/callback`
- PWA possui manifest
- service worker registra
- API Mercado Pago responde com usuario logado
- webhook Mercado Pago retorna 200 no GET

## URLs que precisam bater

`NEXT_PUBLIC_SITE_URL` precisa ser a mesma URL configurada em:

- Supabase Site URL
- Supabase Redirect URLs
- Google OAuth origins/callbacks
- Mercado Pago notification URL/back URLs

## Webhook Mercado Pago

Configurar no painel:

```text
https://nightguide-saquarema.vercel.app/api/mercadopago/webhook
```

Eventos:

- pagamentos
- vinculacao de aplicacoes, se necessario no painel

Ambiente:

- Teste para credenciais `TEST-`

## Logs

No Vercel:

- abrir projeto
- Deployments
- escolher deploy
- Functions/Runtime logs
- filtrar por `[NightGuide][MercadoPago]`

Logs uteis:

- `preference:start`
- `preference:created`
- `payment:start`
- `payment:created`
- `payment:fallback`
- `webhook:received`

## Rollback

Se um deploy quebrar:

1. Abrir Vercel Deployments.
2. Escolher ultimo deploy saudavel.
3. Promote to Production.
4. Corrigir na branch.
5. Subir novo deploy.
