# PWA e offline

O NightGuide funciona como PWA para celular e navegador moderno. Isso permite instalar o site como app, abrir em modo standalone e manter uma experiencia basica mesmo com internet instavel.

## Arquivos principais

```text
src/app/manifest.ts
public/sw.js
src/components/service-worker.tsx
src/components/install-app-prompt.tsx
src/components/offline-sync-provider.tsx
src/lib/offline-sync.ts
```

## Manifest

O manifest define:

- nome: `NightGuide Saquarema`
- short name: `NightGuide`
- start URL: `/`
- display: `standalone`
- orientacao: `portrait`
- icones 192, 512 e maskable
- cores de tema

## Service worker

O service worker:

- cacheia paginas principais
- cacheia icones
- cacheia imagens de eventos
- devolve cache quando a rede falha
- atualiza cache em requisicoes GET

Ele so e registrado em producao.

## Instalacao

Android/Chrome:

- O navegador decide quando disparar `beforeinstallprompt`.
- O app mostra prompt apenas quando faz sentido para mobile.
- O usuario pode instalar pelo botao ou pelo menu do navegador.

iOS/Safari:

- iOS nao dispara o mesmo prompt do Chrome.
- O fluxo esperado e menu de compartilhar > Adicionar a Tela de Inicio.

Desktop:

- O app deve evitar chamar instalacao como CTA principal no desktop.
- Alguns navegadores ainda podem mostrar icone de instalacao na barra.

## Offline sync

O arquivo `src/lib/offline-sync.ts` usa IndexedDB para guardar acoes enquanto o usuario esta offline.

Acoes previstas:

- adicionar favorito
- remover favorito
- criar review
- comprar ingresso
- cancelar ingresso
- atualizar perfil do local
- criar/editar evento do dono
- deletar evento do dono

Quando a internet volta:

1. `OfflineSyncProvider` detecta `online`.
2. Chama `syncQueuedActions()`.
3. O app tenta obter usuario autenticado no Supabase.
4. Cada acao e enviada para `user_activity`.
5. Se sincronizar, remove da fila.
6. Se falhar, incrementa tentativas e guarda erro.

## Ponto de atencao

A tabela `user_activity` ainda precisa entrar no schema definitivo para persistir a fila. Sem ela, a fila continua funcionando localmente, mas a sincronizacao real nao conclui.

## O que fica offline hoje

- carregamento de rotas cacheadas
- imagens cacheadas
- dados de fallback
- favoritos/ingressos/feedbacks salvos localmente
- fila de acoes pendentes

## O que nao fica totalmente offline ainda

- login novo
- pagamento real Mercado Pago
- leitura de dados novos do Supabase
- upload de imagem
- sincronizacao definitiva sem a tabela `user_activity`

## Boas praticas futuras

- criar tabela `user_activity`
- salvar snapshots de eventos no IndexedDB
- mostrar status visual por item pendente
- resolver conflitos de edicao do dono
- invalidar cache quando houver novo deploy
- versionar schema local
- adicionar background sync quando suportado
