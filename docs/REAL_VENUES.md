# Locais de Saquarema

Catálogo conferido em 10/09/2026. Coordenadas de estabelecimentos: OpenStreetMap (ODbL, © colaboradores do OpenStreetMap); referências individuais em apps/mobile/src/data/real-venues.json. Saquasuco e praias: Waze, a partir da página https://www.waze.com/live-map/directions/saquasuco-av.-min.-salgado-filho-178-saquarema?to=place.w.208078371.2080783707.4803560 e seus locais relacionados.

Endereços de restaurantes e categorias também conferidos no portal estadual https://www.turismo.rj.gov.br/cidades/saquarema/ e no cadastro municipal https://www.saquarema.rj.gov.br/wp-content/uploads/2023/07/CADASTRO-RESTAURANTES.pdf.

Não se presume que o estabelecimento seja parceiro, esteja aberto agora ou ofereça eventos. Horários e preços devem ser confirmados diretamente. Notas são somente de usuários do NightGuide.

Os locais fictícios anteriores são arquivados (não apagados), preservando publicações e ingressos antigos. Publicações demonstrativas são locais, rotuladas como exemplos e não alteram notas reais. Fotos ilustrativas não são apresentadas como fotografias dos estabelecimentos.

## Fotografias

As fotos reais foram fornecidas pelo responsável do projeto em pastas separadas por local em 11/09/2026. Cada uma foi copiada para `apps/mobile/assets/venues` com nome normalizado e vinculada somente ao estabelecimento da pasta correspondente. Uma imagem atua como capa e todas as demais aparecem na galeria do local; parte delas também é usada nas publicações demonstrativas.

As imagens ficam empacotadas no APK e não dependem de um servidor para serem exibidas. As capas genéricas antigas continuam somente como fallback para um estabelecimento futuro que ainda não tenha uma pasta própria.

## Versão Android 1.1.4

O mapa usa OpenStreetMap dentro de WebView, sem exigir chave Google Maps no APK. Seleção de local muda o marcador; Traçar rota abre o serviço externo. As ruas exigem internet. Catálogo, textos e capas dos locais ficam disponíveis offline; fotos de publicações remotas dependem do cache do dispositivo.

As capas do catálogo são empacotadas no APK para carregarem sem depender de servidores externos e permanecerem visíveis offline. A barra de navegação respeita a área segura dos gestos/botões do Android. O carrossel de destaques usa a largura útil da tela e encaixa um cartão completo por vez.

O botão de rota envia ao Google Maps as coordenadas GPS armazenadas, com navegação nativa no Android e fallback pelo navegador. As avaliações aparecem em lotes de cinco, com controle para mostrar mais ou recolher. O cabeçalho oferece temas Escuro/Claro persistentes e o seletor PT-BR/EN traduz a navegação e as principais telas do fluxo do usuário.

As fotos das publicações usam altura responsiva limitada para não ocuparem a tela inteira em celulares. A lista Explore Saquarema mostra cinco estabelecimentos inicialmente e oferece controles para carregar mais cinco ou recolher novamente.

O mapa aproxima o quarteirão e centraliza o marcador nas coordenadas verificadas do estabelecimento. O perfil oferece ações separadas para abrir o ponto exato e para iniciar a rota; ao entrar no mapa por um perfil, o local correto já fica selecionado. Os 12 pontos de estabelecimentos foram reconferidos diretamente pela API do OpenStreetMap em 11/09/2026 e coincidem com os dados locais.

Restaurante Marisco, Villa Bistrô e P22 também aparecem no carrossel como locais em destaque, sem inventar eventos ou horários. Os textos longos em inglês da busca, dos cartões e das mensagens de demonstração foram encurtados e receberam limites de quebra adequados para telas pequenas.

As miniaturas da galeria abrem um visualizador em tela cheia. O usuário pode deslizar horizontalmente entre as imagens, fechar pelo botão superior ou usar o botão Voltar do Android; o título da galeria não exibe contagem.
