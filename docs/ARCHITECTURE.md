# Arquitetura

O NightGuide e um app Next.js com App Router. Ele mistura renderizacao server-side para paginas e sessoes com componentes client-side para carrossel, mapa, preferencias, favoritos, checkout e experiencia offline.

## Camadas

```text
Browser / PWA
  -> React components
  -> Next.js App Router pages
  -> Server Actions e API Routes
  -> Supabase Auth/Postgres/Storage
  -> Mercado Pago APIs
```

## Pastas principais

```text
src/app
  page.tsx                         Home
  login/page.tsx                    Login
  cadastro/page.tsx                 Cadastro
  conta/page.tsx                    Conta cliente/dono
  ingressos/[eventId]/page.tsx      Checkout e ingresso
  auth/actions.ts                   Server Actions de auth
  auth/callback/route.ts            Callback OAuth Supabase
  api/payments/mercadopago          Pagamentos Mercado Pago
  api/mercadopago/webhook           Webhook Mercado Pago

src/components
  carousel.tsx                      Carrossel full screen
  discovery-experience.tsx          Busca, filtros, eventos, detalhes
  venue-map.tsx                     Wrapper do mapa
  venue-map-inner.tsx               Leaflet no cliente
  fake-checkout.tsx                 Checkout teste, Pix e confirmacao
  account-dashboard.tsx             Area cliente/dono
  header.tsx / footer.tsx           Navegacao e rodape
  preferences-menu.tsx              Tema e idioma
  install-app-prompt.tsx            Prompt mobile PWA

src/lib
  data.ts                           Busca dados do Supabase ou fallback
  mock-data.ts                      Eventos/locais de fallback
  supabase/*                        Clientes Supabase SSR/browser
  mercadopago-server.ts             Helpers server-side Mercado Pago
  fake-tickets.ts                   Modelo local de ingressos teste
  offline-sync.ts                   Fila IndexedDB offline
  preferences.ts                    Copys PT/EN e tema/idioma
```

## Fluxo da home

1. `src/app/page.tsx` chama `getHomeData()`.
2. `getHomeData()` tenta buscar eventos e locais publicados no Supabase.
3. Se nao houver env Supabase ou a busca falhar, usa `fallbackEvents` e `fallbackVenues`.
4. A UI monta:
   - header responsivo
   - carrossel full screen
   - busca/filtros
   - cards de eventos e detalhes
   - mapa com zoom controlado
   - footer

## Fluxo de autenticacao

Email/senha:

1. Usuario envia formulario em `/login` ou `/cadastro`.
2. `src/app/auth/actions.ts` chama Supabase Auth.
3. Supabase grava cookies SSR.
4. Usuario volta para `/conta` ou para o `next` desejado.

Google:

1. Usuario clica em continuar com Google.
2. Server Action gera URL OAuth do Supabase.
3. Supabase redireciona para Google.
4. Google volta para `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
5. Supabase volta para `/auth/callback`.
6. O app troca o codigo pela sessao e redireciona.

## Fluxo de cliente

O cliente logado pode:

- salvar/desfavoritar eventos
- ver favoritos
- registrar feedbacks
- comprar ingressos teste
- ver ingressos gerados
- cancelar/remover ingresso local

Parte do MVP usa `localStorage` com escopo por usuario para demonstrar experiencia completa antes da persistencia definitiva em Supabase.

## Fluxo de dono

O dono de estabelecimento pode:

- editar dados do estabelecimento
- alterar descricao, capa e informacoes de contato
- criar evento
- editar evento
- deletar evento
- ver metricas demonstrativas

No MVP, a edicao do dono tambem usa armazenamento local escopado. O schema ja tem tabelas e RLS para persistir isso no Supabase.

## Mapa

O mapa usa:

- `react-leaflet`
- OpenStreetMap tiles
- `scrollWheelZoom={false}` para evitar zoom acidental durante scroll
- controles proprios de zoom
- marcadores dos locais

Esse desenho evita o problema comum de o usuario rolar a pagina e cair dentro do mapa sem querer.

## PWA e offline

O app tem:

- `manifest.ts` com nome, icones e modo standalone
- `public/sw.js` para cache de rotas e imagens
- `InstallAppPrompt` para prompt mobile
- `offline-sync.ts` com fila IndexedDB
- `OfflineSyncProvider` para tentar reenviar quando volta a internet

## Pagamentos

O app possui:

- API de pagamento por cartao em `api/payments/mercadopago`
- API de preferencia Checkout Pro
- API de tokenizacao de cartao
- webhook para eventos Mercado Pago
- fallback de Pix visual quando a sandbox recusa o fluxo por restricao de conta

O Access Token fica apenas no servidor.

## Internacionalizacao e tema

O app nao usa biblioteca externa de i18n. As copys PT/EN ficam em `src/lib/preferences.ts`, com estado salvo no `localStorage`.

O tema claro/escuro tambem usa `localStorage` e aplica `data-theme` no `documentElement`.

## Decisao tecnica atual

Para o MVP hibrido, Next.js + PWA foi a melhor escolha porque:

- roda em desktop e celular com uma base so
- publica rapido na Vercel
- permite usar Supabase e Mercado Pago no mesmo stack
- entrega instalacao como app sem loja
- facilita apresentacao e validacao do projeto

Para a fase nativa, a recomendacao e Expo/React Native para reaproveitar TypeScript, regras de produto e integracoes.
