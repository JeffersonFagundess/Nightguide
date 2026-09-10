# Roteiro de entrega e demonstração

Este roteiro cobre os oito itens exigidos para a apresentação do NightGuide.

## 1. Aplicativo executando

1. Instale o arquivo `NightGuide.apk` no Android.
2. Abra o aplicativo e mostre as abas Descobrir, Mapa, Ingressos e Conta.
3. Entre com uma conta normal de e-mail e senha.

O APK é independente do Metro/Expo Go e pode ser executado diretamente no aparelho.

## 2. Funcionalidades principais

- Cadastro e login com e-mail e senha; Google permanece opcional.
- Descoberta, busca, filtros e favoritos de eventos.
- Mapa, localização do usuário, perfil do estabelecimento e rota externa.
- Compra demonstrativa, ingresso persistido e QR Code.
- Publicações por estabelecimento com nota, comentário, galeria ou câmera.
- Feed público com comentários/fotos de outras pessoas.
- Edição de publicação, idiomas PT/EN e feedback de estados.

## 3. Persistência de dados

Demonstre pelo menos duas destas opções, feche completamente e reabra o app:

1. Favoritar um evento.
2. Criar um ingresso demonstrativo.
3. Criar ou editar uma publicação com foto.

Favoritos, ingressos e publicações são persistidos localmente com AsyncStorage. Fotos pendentes são copiadas para o diretório permanente do aplicativo.

## 4. Offline First

1. Entre na conta enquanto houver internet.
2. Ative o modo avião.
3. Favorite um evento e crie uma publicação com comentário/foto.
4. Feche e reabra o aplicativo.
5. Mostre que os dados continuam visíveis e que aparece o aviso `Offline • alteração salva`.

Os dados de descoberta e os comentários já carregados também ficam em cache para consulta offline.

## 5. Sincronização

1. Com uma alteração pendente, desative o modo avião.
2. Aguarde o aviso `Enviando...` e depois `alteração enviada`.
3. Abra novamente o perfil do estabelecimento.
4. Mostre a publicação sincronizada no feed.

A fila compacta alterações repetidas e tenta novamente quando a rede volta ou quando o app retorna ao primeiro plano.

## 6. Interface e experiência

- Navegação inferior com quatro áreas claras.
- Estados de carregamento, vazio e erro.
- Confirmação de sucesso ao publicar.
- Banner global de offline, pendência e sincronização.
- Permissões explicadas antes de câmera, galeria, localização e notificações.
- Conteúdo rolável em telas pequenas sem cortar botões ou fotos.

## 7. Repositório GitHub

- Código web e nativo na branch `main`.
- Aplicativo nativo em `apps/mobile`.
- Banco e políticas em `supabase`.
- Documentação em `docs`.
- Workflow de APK em `.github/workflows/build-android-apk.yml`.
- Histórico incremental de commits preservado.

## 8. APK

Cada alteração relevante do aplicativo nativo dispara o workflow **Build Android APK** no GitHub Actions.

Para baixar manualmente:

1. Abra o repositório no GitHub.
2. Entre em **Actions** e abra a execução mais recente de **Build Android APK**.
3. Em **Artifacts**, baixe `NightGuide-Android-APK`.
4. Extraia o ZIP e instale `app-release.apk`.

Também é possível gerar pelo EAS com `pnpm build:apk`, após executar `eas login` uma vez.

