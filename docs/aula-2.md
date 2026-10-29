# Aula 2 — Projeto e documentação de testes

## Equipe

- Projeto: NightGuide.
- Integrantes: nomes e matrículas não informados.
- Repositório: https://github.com/JeffersonFagundess/Nightguide
- Ambiente de execução manual: aparelho ou emulador e versão do Android não informados.

## Primeiro Fluxo

**RF01 — Capturar e salvar a localização para encontrar eventos próximos.** Na tela inicial do aplicativo Android, o usuário toca em **Eventos perto de mim (GPS)**, concede a permissão de localização, recebe as coordenadas do aparelho e as salva localmente para filtrar eventos e estabelecimentos pelo raio escolhido. As coordenadas e a confirmação de salvamento aparecem na tela. Ao voltar ao aplicativo, a última localização salva é recuperada.

**Critério de aceite:** com permissão concedida e GPS disponível, latitude e longitude válidas aparecem na tela, ficam associadas à busca e persistem após reabrir o app. Se a permissão for negada, se o usuário cancelar enquanto a localização é obtida ou se o GPS/armazenamento falhar, a localização anterior permanece e o app informa o ocorrido sem travar. Uma nova captura substitui a localização salva.

## Recurso Nativo

- Recurso: GPS/localização em primeiro plano via `expo-location`.
- Início: botão de GPS na aba inicial; controle de raio de 1 a 100 km.
- Meio: solicitação nativa de permissão em tempo de execução e leitura das coordenadas. Durante a busca, há indicador de progresso e botão **Cancelar**. O cancelamento ignora qualquer resposta posterior da leitura em andamento.
- Fim: coordenadas válidas são gravadas no armazenamento local do aparelho; depois da gravação, a tela exibe latitude, longitude, raio e horário do registro. O botão **Atualizar localização (GPS)** permite substituir o dado.
- Desvios: permissão negada mostra alerta; cancelamento não altera a localização exibida; falha na leitura ou gravação mostra erro e preserva o registro anterior.

## Técnicas

- **T01 — Particionamento de Equivalência:** separar permissão concedida, permissão negada e falha de obtenção/gravação, pois cada classe deve produzir uma resposta diferente e verificável.
- **T02 — Transição de Estados:** verificar a passagem de estado inicial para solicitação de permissão, captura, registro salvo e substituição; o cancelamento deve retornar ao estado anterior sem alterar os dados.

## Evidências

Os casos CT01 a CT04 estão na planilha `NightGuide_Testes.xlsx`. A aba **Exemplo** mantém a referência ilustrativa de câmera do modelo; as abas de entrega descrevem o fluxo de GPS do NightGuide. As execuções EX01–EX04 estão registradas como **Bloqueado**, pois não houve teste em aparelho ou emulador Android nesta etapa. Não há capturas de tela nem casos marcados como aprovados. Os caminhos previstos para as evidências estão na aba **Execucoes** e em `docs/evidencias/`. Defeitos observados durante a execução devem ser registrados na aba **Defeitos** com os passos de reprodução e uma nova execução após a correção.

## Próximos Passos

1. Registrar nomes e matrículas dos integrantes e identificar o aparelho ou emulador e a versão do Android.
2. Executar CT01–CT04 no Android e registrar data, resultado observado e capturas de tela.
3. Registrar e corrigir os defeitos encontrados, com reexecução dos casos afetados.
