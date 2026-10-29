# Fluxos de descoberta: distância e período (app mobile)

## Fluxo para quem procura eventos

1. Na tela Descobrir, toque em **Eventos perto de mim (GPS)** e permita o acesso à localização. O app salva a última posição neste aparelho para que o filtro continue disponível após reiniciar ou ficar offline.
2. Arraste a barra **Distância máxima dos eventos** ou use os botões `−` e `+`. O raio vai de 1 a 100 km e começa em 10 km.
3. A lista de eventos, os destaques e os estabelecimentos mostram apenas itens dentro do raio. Os eventos aparecem do mais próximo para o mais distante. A distância calculada aparece no cartão e nos detalhes do evento; os estabelecimentos também exibem a distância.
4. Para usar a posição atual novamente, toque em **Atualizar localização (GPS)**. Se o GPS for negado ou falhar, a última posição salva continua válida. Sem posição salva, a busca por texto e os demais filtros funcionam normalmente, mas o raio ainda não é aplicado.

A distância é em linha reta, calculada com a fórmula de Haversine entre o GPS do usuário e o local do evento. Não representa o trajeto por ruas. Eventos sem coordenadas válidas não entram no resultado quando o filtro por localização está ativo; o app não mostra uma distância inventada.

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
