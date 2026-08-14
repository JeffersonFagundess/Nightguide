# Setup do NightGuide

Este guia mostra como rodar o NightGuide localmente, configurar Supabase, Google OAuth, Mercado Pago e preparar deploy.

## Requisitos

- Node.js 20 ou superior.
- npm com lockfile versionado.
- Conta Supabase.
- Conta Vercel.
- Conta Mercado Pago Developers para ambiente de teste.
- Conta Google Cloud para OAuth.

## Instalar dependencias

```bash
npm install
```

## Rodar em desenvolvimento

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Variaveis locais

Crie `.env.local` a partir de `.env.example`.

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-sua-public-key
MERCADOPAGO_ACCESS_TOKEN=TEST-seu-access-token
```

Regras:

- Variaveis com `NEXT_PUBLIC_` aparecem no navegador.
- `MERCADOPAGO_ACCESS_TOKEN` nao pode ter `NEXT_PUBLIC_`.
- Nunca versionar `.env.local`.
- Nunca colocar client secret do Google no codigo.

## Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o conteudo de `supabase/schema.sql`.
4. Confirme que as tabelas foram criadas no schema `public`.
5. Confirme que RLS esta ativo em todas as tabelas expostas.
6. Em Auth, habilite Email e Google se for usar OAuth.

Tabelas esperadas:

- `profiles`
- `venues`
- `events`
- `event_images`
- `venue_images`
- `saved_events`
- `saved_venues`
- `tickets`
- `reviews`
- `owner_messages`
- `impact_metrics`

Buckets esperados:

- `venue-covers`
- `event-covers`

## Google OAuth

No Google Cloud Console:

1. Crie um OAuth Client do tipo Web Application.
2. Em JavaScript origins, adicione:
   - `http://localhost:3000`
   - `https://nightguide-saquarema.vercel.app`
3. Em Authorized redirect URIs, adicione o callback do Supabase:
   - `https://SEU-PROJETO.supabase.co/auth/v1/callback`
4. Copie Client ID e Client Secret.

No Supabase:

1. Va em Authentication > Providers > Google.
2. Habilite o provider.
3. Cole Client ID e Client Secret.
4. Em URL Configuration, configure:
   - Site URL: `https://nightguide-saquarema.vercel.app`
   - Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://nightguide-saquarema.vercel.app/auth/callback`

No app:

- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...apps.googleusercontent.com`

## Mercado Pago

Use credenciais de teste.

Variaveis:

```bash
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-sua-public-key
MERCADOPAGO_ACCESS_TOKEN=TEST-seu-access-token
```

Cartoes de teste e documentos ficam no painel Mercado Pago Developers. Para o nome do comprador, use os status de teste como `APRO`, `OTHE`, `CONT`, `CALL`, `FUND`, `SECU`, `EXPI` ou `FORM`.

## Vercel

1. Importe o repositorio.
2. Configure as variaveis de ambiente de Production.
3. Garanta que `NEXT_PUBLIC_SITE_URL` aponta para a URL final.
4. Rode o deploy.
5. Teste login, checkout, PWA e webhook.

## Comandos uteis

```bash
npm run lint
npm run build
npm audit
```

## Problemas comuns

### Login Google volta para a tela de login

Verifique se o callback correto esta no Supabase:

```text
https://nightguide-saquarema.vercel.app/auth/callback
```

Tambem confira `NEXT_PUBLIC_SITE_URL` na Vercel.

### Mercado Pago mostra erro de partes de teste

Isso acontece quando comprador e vendedor pertencem ao mesmo usuario real, ou quando as credenciais nao sao do vendedor de teste correto. Para Checkout Pro, use conta vendedora de teste para criar a preferencia e conta compradora de teste para pagar.

### PWA nao aparece para instalar

O prompt depende do navegador, HTTPS, manifest valido, service worker e criterios do sistema. Em iOS, o fluxo normal e "Adicionar a Tela de Inicio" pelo menu de compartilhamento.
