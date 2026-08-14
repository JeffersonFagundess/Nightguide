# Roadmap para app nativo

Este documento prepara a proxima fase: migrar do MVP hibrido/PWA para um app nativo.

## Recomendacao de stack

Para este projeto, a melhor escolha e:

```text
Expo + React Native + TypeScript
```

Motivos:

- reaproveita conhecimento de React e TypeScript
- integra bem com Supabase
- acelera camera, galeria, notificacoes e localizacao
- permite builds Android/iOS
- tem ecossistema forte para mapas, push e storage
- facilita manter web/PWA separada enquanto a nativa evolui

Alternativas:

- Flutter: excelente UI e performance, mas exigiria reescrever em Dart.
- Kotlin/Swift nativo puro: maximo controle, mas maior custo e duas bases.
- Capacitor/Ionic: mais proximo do hibrido, mas nao resolve tanto a necessidade de recursos nativos reais.

## O que sai da versao hibrida

Na branch nativa, estes pontos devem ser substituidos:

- PWA manifest
- service worker web
- prompt de instalacao web
- Leaflet web
- localStorage como armazenamento principal
- dependencia de navegador para camera/galeria
- fluxo visual baseado em viewport desktop

## O que entra na versao nativa

Recursos nativos planejados:

- Camera para foto de estabelecimento/evento.
- Galeria para escolher imagem.
- Upload de capa no Supabase Storage.
- Notificacoes push.
- Notificacoes locais de eventos salvos.
- Permissao de localizacao.
- Mapa nativo.
- QR Code de ingresso.
- Scanner de QR Code para validar entrada.
- Share sheet para compartilhar evento.
- Deep links para abrir evento/ingresso.
- Armazenamento offline com SQLite ou AsyncStorage.
- SecureStore para dados sensiveis.
- Splash screen e icone nativo.
- Build Android APK/AAB.
- Build iOS no futuro.

## Modulos Expo sugeridos

- `expo-router`
- `expo-image-picker`
- `expo-camera`
- `expo-notifications`
- `expo-location`
- `expo-secure-store`
- `expo-sqlite`
- `expo-linking`
- `expo-sharing`
- `expo-device`
- `react-native-maps`
- `@supabase/supabase-js`

## Arquitetura desejada

```text
apps/mobile
  app/                       Rotas Expo Router
  src/components             Componentes nativos
  src/features/auth          Login/cadastro
  src/features/events        Eventos e detalhes
  src/features/venues        Estabelecimentos
  src/features/tickets       Ingressos e QR
  src/features/payments      Mercado Pago/deep links
  src/features/offline       SQLite/fila
  src/lib/supabase           Cliente Supabase
  src/lib/storage            Upload e cache
```

## Fases

### Fase 1 - Bootstrap

- Criar app Expo.
- Configurar TypeScript.
- Configurar Expo Router.
- Criar tema NightGuide.
- Configurar variaveis de ambiente.
- Conectar Supabase.

### Fase 2 - Auth

- Login email/senha.
- Login Google com deep link.
- Persistencia segura de sessao.
- Tela de conta.
- Logout.

### Fase 3 - Eventos

- Listagem de eventos.
- Busca e filtros.
- Detalhe do evento.
- Favoritos.
- Dados de fallback.
- Carrossel/hero nativo.

### Fase 4 - Mapa

- Mapa nativo.
- Marcadores dos locais.
- Permissao de localizacao.
- Distancia do usuario.
- Botao de rota.

### Fase 5 - Dono de estabelecimento

- Editar perfil do local.
- Criar evento.
- Editar evento.
- Deletar evento.
- Trocar capa com camera/galeria.
- Upload Supabase Storage.

### Fase 6 - Ingressos

- Compra teste.
- QR Code do ingresso.
- Tela "meus ingressos".
- Validacao do ingresso.
- Historico de compras.

### Fase 7 - Notificacoes

- Push para eventos favoritos.
- Notificacao local antes do evento.
- Preferencias do usuario.
- Opt-in por tipo de alerta.

### Fase 8 - Offline

- Cache de eventos e locais.
- Fila de acoes offline.
- Sincronizacao quando voltar internet.
- Indicador de pendencias.
- Resolucao de conflito.

### Fase 9 - Release

- Icone e splash.
- Android build.
- Teste em aparelho real.
- Checklist de permissoes.
- Politica de privacidade.
- Termos de uso.

## Banco compartilhado

A nativa deve usar o mesmo Supabase:

- `profiles`
- `venues`
- `events`
- `saved_events`
- `tickets`
- `reviews`
- `owner_messages`
- `impact_metrics`
- `event_images`
- `venue_images`

Adicionar:

- `payments`
- `payment_events`
- `user_activity`
- `push_tokens`
- `ticket_validations`

## Riscos

- Google OAuth em app nativo exige deep links corretos.
- Push notification exige configuracao Android/iOS.
- Camera/galeria exige permissoes e politica de privacidade.
- Mercado Pago pode exigir fluxo especifico para app nativo.
- Offline precisa de regras claras de conflito.

## Criterio de sucesso da nativa

O app nativo sera considerado pronto quando:

- instalar em Android real
- login funcionar
- eventos carregarem
- mapa funcionar
- camera/galeria subir imagem
- notificacoes chegarem
- favoritos persistirem
- ingresso gerar QR
- fluxo de pagamento teste funcionar
- offline basico funcionar
- build for reproduzivel
