# Fluxos de descoberta: distância e período (app mobile)

## Fluxo para quem procura eventos

1. Na tela Descobrir, o carrossel de eventos aparece primeiro. Toque em **Filtrar por distância** logo abaixo para abrir o controle. Arraste a barra ou use `−` e `+`; o raio vai de **0 a 100 km** e começa em 10 km.
2. Os resultados e a contagem aparecem logo após o controle. Apenas eventos dentro do raio são exibidos, em ordem de proximidade. Em **0 km**, se nenhum evento estiver exatamente no ponto de referência, a contagem é **0** e aparece uma mensagem para ampliar o raio.
3. Toque em **Todas as distâncias** para remover o limite. Toque em **Usar meu GPS** para calcular a distância real de eventos publicados e locais. Eventos **DEMO** continuam usando o ponto fictício. A última posição válida fica salva para consultas futuras, mas não ativa o filtro automaticamente ao abrir a tela.
4. Sem GPS ativo, o filtro usa um ponto de referência de demonstração em Saquarema para calcular as distâncias dos eventos e locais. A interface identifica essas distâncias como demonstração. Se o usuário escolher GPS real e a solicitação falhar, a posição de demonstração continua disponível.

A distância é em linha reta, calculada com a fórmula de Haversine entre o ponto de referência (fictício ou GPS real) e o local do evento. Não representa o trajeto por ruas. Eventos sem coordenadas válidas não entram no resultado quando o filtro está ativo. Os eventos publicados do Supabase aparecem junto dos eventos de demonstração, que têm o indicador **DEMO**; IDs duplicados não são exibidos duas vezes. O carrossel contém eventos e aparece antes dos estabelecimentos. Mesmo em demonstração, o filtro de 0 km pode mostrar 0 resultados.

## Fluxo para quem publica eventos

1. No painel **Seu estabelecimento**, preencha latitude e longitude do ponto do local. Também é possível tocar em **Usar minha localização para este local** quando estiver fisicamente no estabelecimento.
2. Salve o estabelecimento. O app grava as coordenadas nos campos `venues.latitude` e `venues.longitude` do Supabase, que já existem no esquema atual.
3. Crie ou edite o evento. Ele usa `events.venue_id` para herdar as coordenadas do estabelecimento. A publicação pelo painel exige que as duas coordenadas estejam salvas no banco. Não há campo de distância fixa em `events`: a distância real muda conforme a posição do usuário, enquanto os eventos DEMO usam a referência fictícia.

Se houver eventos antigos com locais sem coordenadas, preencha e salve a localização desses estabelecimentos. Não é necessária uma migração de banco para este recurso.

## Fluxo de descoberta por período

Na tela Descobrir, depois dos filtros de categoria, selecione **Todos**, **Hoje** ou **Próximos 7 dias**. **Hoje** mostra eventos que começam após o momento atual e antes da próxima meia-noite no fuso local do aparelho. **Próximos 7 dias** inclui hoje e os seis dias seguintes. A busca por texto, o filtro de categoria e o raio de GPS continuam valendo juntos.

Eventos do Supabase usam `events.starts_at`; a consulta busca apenas eventos publicados com início futuro. Eventos de demonstração recebem a próxima ocorrência do dia da semana indicado no cartão, permitindo testar o fluxo sem conectar ao Supabase. O filtro **Todos** preserva todos os eventos disponíveis na lista. Um evento sem data válida não aparece em **Hoje** ou **Próximos 7 dias**.

O app atualiza o horário de referência a cada minuto enquanto a tela está aberta, inclusive na mudança de dia. A opção escolhida fica ativa até a tela de descoberta ser desmontada.

## Verificação

Em `apps/mobile`, execute `node --experimental-strip-types --test tests/distance.test.mjs tests/event-period.test.mjs` e `pnpm typecheck`. No aparelho, conceda GPS, escolha um raio pequeno e confirme que o número de resultados diminui; aumente o raio e confirme que os eventos mais distantes voltam. Selecione **Hoje** e **Próximos 7 dias** e confira que as datas mudam os resultados, inclusive combinadas com o raio. Confira um evento publicado no Supabase e os mesmos fluxos offline com localização previamente salva.
