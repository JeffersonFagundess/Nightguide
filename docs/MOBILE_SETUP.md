# App nativo Expo

O app nativo do NightGuide fica em `apps/mobile` e usa Expo 57, React Native, Expo Router e TypeScript. A versao Next.js/PWA continua na raiz do repositorio.

## Requisitos

- Node.js compativel com Expo 57.
- pnpm ou npm.
- Expo Go compativel para testes basicos, ou development build para testar todos os modulos nativos.
- Projeto Supabase com `supabase/schema.sql` aplicado.

## Instalar e executar

```bash
cd apps/mobile
pnpm install
pnpm start
```

Para abrir diretamente no Android:

```bash
pnpm android
```

## Variaveis de ambiente

Crie `apps/mobile/.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
EXPO_PUBLIC_API_URL=https://nightguide-saquarema.vercel.app
EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=false
```

Sem Supabase configurado, a descoberta, busca, filtros e mapa abrem com dados de demonstracao. Cadastro e login reais ficam desabilitados para evitar uma falsa autenticacao.

## Autenticacao

Email e senha sao o fluxo principal:

1. O usuario informa nome, email, senha e confirmacao.
2. `supabase.auth.signUp` cria a conta.
3. No projeto NightGuide, a confirmacao de email esta desativada para permitir login imediato.
4. O login usa `supabase.auth.signInWithPassword`.
5. A sessao nativa fica no SecureStore e e renovada automaticamente.

O Google e opcional. Para habilitar:

1. Configure o provider Google no Supabase.
2. Adicione `nightguide://**` aos Redirect URLs do Supabase.
3. Use `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
4. Teste em development build, pois o esquema `nightguide://` pertence ao app instalado.

## Backend de pagamentos

O app nativo chama as rotas seguras da versao Next.js definida em `EXPO_PUBLIC_API_URL`. As rotas aceitam a sessao Supabase nativa pelo header `Authorization: Bearer ...`; o Access Token do Mercado Pago continua somente no servidor.

Credenciais de teste continuam obrigatorias. A simulacao local e rotulada como demonstracao e nunca realiza cobranca real.

## Recursos nativos presentes

- mapa com marcadores e localizacao do usuario
- abertura de rota no aplicativo de mapas
- camera e galeria para capas de estabelecimento/evento
- publicacoes por estabelecimento com descricao, nota e foto
- camera e galeria para anexar fotos as publicacoes
- criacao, edicao e exclusao de publicacao offline, com envio automatico ao reconectar
- rascunho automatico, busca de estabelecimento e fotos em tela cheia
- painel de conta com edicao de nome/foto, tema, idioma e recuperacao de senha
- perfil publico do estabelecimento com comentarios de outras pessoas
- cache local das publicacoes visitadas para leitura offline
- upload de imagem para Supabase Storage, limitado a 6 MB e JPEG/PNG/WebP
- notificacao local para evento salvo com data futura
- QR Code de ingresso
- scanner QR para conta de dono
- compartilhamento nativo de evento
- deep links `nightguide://`
- cache de eventos e dados locais offline
- seletor PT-BR/EN persistido no aparelho

## Verificacao

```bash
pnpm typecheck
pnpm export:android
pnpm doctor
```

Camera, galeria, fila offline, notificacoes, localizacao, OAuth e checkout devem ser validados tambem em aparelho Android real antes de release.
