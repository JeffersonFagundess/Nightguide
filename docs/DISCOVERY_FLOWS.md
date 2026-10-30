# Fluxos de descoberta: distância e período (app mobile)

## Fluxo para quem procura eventos

1. Na tela Descobrir, arraste a barra **Distância máxima dos eventos** ou use `−` e `+`. A primeira interação ativa o filtro e solicita GPS se ainda não houver posição salva. O raio vai de **0 a 100 km** e começa em 10 km.
2. Os resultados e a contagem aparecem logo abaixo da barra. Apenas eventos dentro do raio são exibidos, em ordem de proximidade. Em **0 km**, se nenhum evento estiver exatamente na posição do usuário, a contagem é **0** e aparece uma mensagem para ampliar o raio.
3. Toque em **Todas as distâncias** para remover o limite. Para usar a posição atual novamente, toque em **Atualizar localização (GPS)**. A última posição válida fica salva no aparelho para uso após reiniciar ou ficar offline.
4. Se o GPS for negado e não existir posição salva, a contagem do filtro fica em 0 e o app explica que precisa da localização. Sem filtro de distância, os demais filtros continuam disponíveis.

A distância é em linha reta, calculada com a fórmula de Haversine entre o GPS do usuário e o local do evento. Não representa o trajeto por ruas. Eventos sem coordenadas válidas não entram no resultado quando o filtro está ativo. Com Supabase conectado, uma lista vazia de eventos publicados permanece vazia, sem preencher os resultados com eventos de demonstração.

## Fluxo para quem publica eventos

1. No painel **Seu estabelecimento**, preencha latitude e longitude do ponto do local. Também é possível tocar em **Usar minha localização para este local** quando estiver fisicamente no estabelecimento.
2. Salve o estabelecimento. O app grava as coordenadas nos campos `venues.latitude` e `venues.longitude` do Supabase, que já existem no esquema atual.
3. Crie ou edite o evento. Ele usa `events.venue_id` para herdar as coordenadas do estabelecimento. A publicação pelo painel exige que as duas coordenadas estejam salvas no banco. Não há campo de distância fixa em `events`, pois o valor muda conforme a posição de cada usuário.

Se houver eventos antigos com locais sem coordenadas, preencha e salve a localização desses estabelecimentos. Não é necessária uma migração de banco para este recurso.

## Fluxo de descoberta por período

Na tela Descobrir, depois dos filtros de categoria, selecione **Todos**, **Hoje** ou **Próximos 7 dias**. **Hoje** mostra eventos que começam após o momento atual e antes da próxima meia-noite no fuso local do aparelho. **Próximos 7 dias** inclui hoje e os seis dias seguintes. A busca por texto, o filtro de categoria e o raio de GPS continuam valendo juntos.

Eventos do Supabase usam `events.starts_at`; a consulta busca apenas eventos publicados com início futuro. Eventos de demonstração recebem a próxima ocorrência do dia da semana indicado no cartão, permitindo testar o fluxo sem conectar ao Supabase. O filtro **Todos** preserva todos os eventos disponíveis na lista. Um evento sem data válida não aparece em **Hoje** ou **Próximos 7 dias**.

O app atualiza o horário de referência a cada minuto enquanto a tela está aberta, inclusive na mudança de dia. A opção escolhida fica ativa até a tela de descoberta ser desmontada.

## Verificação

Em `apps/mobile`, execute `node --experimental-strip-types --test tests/distance.test.mjs tests/event-period.test.mjs` e `pnpm typecheck`. No aparelho, conceda GPS, escolha um raio pequeno e confirme que o número de resultados diminui; aumente o raio e confirme que os eventos mais distantes voltam. Selecione **Hoje** e **Próximos 7 dias** e confira que as datas mudam os resultados, inclusive combinadas com o raio. Confira um evento publicado no Supabase e os mesmos fluxos offline com localização previamente salva.
