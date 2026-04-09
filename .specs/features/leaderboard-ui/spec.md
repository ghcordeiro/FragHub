# Leaderboard UI - Especificacao da Feature

## Summary
Pagina publica `/leaderboard` com ranking de jogadores por ELO, tabela paginada com filtros por jogo e periodo, destaque para o usuario logado e meta tags OG para compartilhamento em redes sociais.

## System Process Context
1. Qualquer visitante (autenticado ou nao) acessa `/leaderboard`
2. Frontend chama `GET /api/players?sort=elo&order=desc&page=1&limit=25&game=all&period=all`
3. API retorna lista paginada com: posicao global, id, nome, steamId, avatarUrl, nivel, ELO, total de partidas, percentual de vitorias
4. Frontend renderiza tabela com paginacao e filtros
5. Se usuario estiver autenticado e seu ID estiver na pagina atual, sua linha recebe destaque visual
6. Usuario altera filtro de jogo ou periodo → frontend refaz a requisicao com os novos parametros → tabela atualiza; URL atualiza com query params para compartilhamento
7. Usuario clica no nome de um jogador → navega para `/players/:id`

## Personas
- **Visitante anonimo**: quer ver quem sao os melhores jogadores da comunidade sem precisar criar conta
- **Jogador competitivo**: quer verificar sua posicao no ranking e comparar com outros jogadores
- **Admin/Gestor da comunidade**: quer compartilhar o link do leaderboard nas redes sociais para atrair novos jogadores
- **Recrutador de time**: quer filtrar os melhores jogadores por jogo para formar times

## Requisitos Funcionais

### LBOARD-REQ-001 - Tabela de ranking paginada
A tabela deve exibir 25 jogadores por pagina com as seguintes colunas: posicao global (numero), avatar (imagem circular 32px ou placeholder), nome (link para `/players/:id`), badge de nivel (componente `LevelBadge` reutilizado da feature `player-profile-ui`), ELO, partidas jogadas, percentual de vitorias (formatado como `XX.X%`). A posicao global deve levar em conta a paginacao (ex: pagina 2, primeiro item = posicao 26).

### LBOARD-REQ-002 - Controles de paginacao
Devem existir controles de paginacao com: botoes "Anterior" e "Proximo", exibicao do numero da pagina atual e total de paginas (ex: "Pagina 2 de 8"), e botoes de paginas adjacentes (ex: 1, 2, **3**, 4, 5 com ellipsis para paginas distantes). A URL deve atualizar com `?page=N` ao mudar de pagina, permitindo compartilhar ou favoritar uma pagina especifica do ranking.

### LBOARD-REQ-003 - Filtro por jogo
Deve existir seletor de jogo com as opcoes: "Todos", "CS2", "CS:GO". Ao alterar, o frontend refaz a requisicao com `?game=cs2`, `?game=csgo` ou sem parametro (todos). O filtro selecionado deve ser persistido na URL como `?game=cs2` para compartilhamento.

### LBOARD-REQ-004 - Filtro por periodo
Deve existir seletor de periodo com as opcoes: "Todo o tempo", "Ultimo mes". Ao selecionar "Ultimo mes", o frontend envia `?period=30d` na requisicao. O filtro deve ser persistido na URL como `?period=30d`.

### LBOARD-REQ-005 - Destaque do usuario logado
Se o usuario estiver autenticado e seu ID aparecer em qualquer linha da pagina atual, essa linha deve receber estilo visual destacado (ex: fundo levemente colorido, borda lateral, ou texto em negrito). O destaque nao deve interferir na legibilidade das demais linhas.

### LBOARD-REQ-006 - Link para perfil de cada jogador
O nome de cada jogador na tabela deve ser um link `<a href="/players/:id">` navegando para o perfil publico. O clique deve usar navegacao SPA do React Router (sem reload completo da pagina).

### LBOARD-REQ-007 - Meta tags OG para compartilhamento
O `<head>` da pagina `/leaderboard` deve incluir: `og:title` com "Ranking FragHub — CS2/CS:GO", `og:description` descrevendo o leaderboard da comunidade, `og:url` com a URL canonica da pagina, `og:type: website`. As meta tags devem ser estaticas (definidas no `index.html` base ou via `document.title` + `document.querySelector` no componente), dado que nao ha SSR.

### LBOARD-REQ-008 - Loading state e empty state
Durante o carregamento dos dados, deve exibir skeleton loaders para as 25 linhas da tabela. Se nenhum jogador for encontrado com os filtros aplicados (ex: sem partidas no ultimo mes), deve exibir empty state com mensagem "Nenhum jogador encontrado para os filtros selecionados" e botao "Limpar filtros".

## Requisitos Nao Funcionais

### LBOARD-NFR-001 - Performance de carregamento
O leaderboard deve ser interativo (TTI) em menos de 2 segundos em conexao de 10 Mbps. A primeira pagina de 25 jogadores nao deve exceder 50 KB de dados JSON da API.

### LBOARD-NFR-002 - SEO basico
A pagina deve ter `<title>` descritivo (`Ranking | FragHub`), `<meta name="description">` com resumo da pagina e as meta tags OG do `LBOARD-REQ-007`. Dado que nao ha SSR, o SEO e limitado a crawlers que executam JavaScript; esse e o limite aceito pela arquitetura atual.

### LBOARD-NFR-003 - Responsividade
Em telas mobile (< 640px), a tabela deve ocultar colunas menos essenciais (percentual de vitorias, partidas jogadas) e manter: posicao, avatar, nome, badge de nivel e ELO. Deve existir scroll horizontal como fallback se necessario.

### LBOARD-NFR-004 - Acessibilidade da tabela
A tabela deve ter `<caption>` descritivo, `<thead>` com `<th scope="col">` em cada coluna, `aria-sort` nos cabecalhos ordenados e `aria-label` nos controles de paginacao. O contraste das cores de destaque do usuario logado deve atender WCAG AA (ratio >= 4.5:1 para texto normal).

### LBOARD-NFR-005 - URL como fonte da verdade de estado
Todos os parametros de estado da pagina (pagina atual, filtro de jogo, filtro de periodo) devem ser lidos da URL ao montar o componente e atualizados na URL ao mudar. Isso garante que o usuario possa compartilhar ou favoritar qualquer estado do leaderboard e retornar ao mesmo estado.

## Criterios de Aceitacao
- **AC-001**: Acessar `/leaderboard` sem login retorna a pagina com a tabela de ranking renderizada e o header exibe "Ranking" sem exigir autenticacao
- **AC-002**: A tabela exibe 25 jogadores na primeira pagina; clicar em "Proxima pagina" exibe os proximos 25 e a URL atualiza para `?page=2`
- **AC-003**: Selecionar o filtro "CS2" refaz a requisicao com `?game=cs2`, a URL atualiza e a tabela exibe apenas jogadores com partidas de CS2
- **AC-004**: Usuario logado que esta na posicao 15 acessa o leaderboard e sua linha aparece visivelmente destacada em relacao as demais
- **AC-005**: Clicar no nome de um jogador navega para `/players/:id` sem recarregar a pagina inteira (navegacao SPA)
- **AC-006**: Acessar `/leaderboard?page=2&game=cs2&period=30d` diretamente no browser renderiza a pagina 2 do ranking de CS2 do ultimo mes (URL como fonte da verdade)
- **AC-007**: Em mobile (375px), a tabela e legivel e as colunas essenciais (posicao, nome, nivel, ELO) sao visiveis sem scroll horizontal
- **AC-008**: O `<head>` da pagina `/leaderboard` contem `og:title` e `og:description` com conteudo relevante (verificavel via DevTools ou curl)

## Out of Scope (esta feature)
- Grafico de evolucao de ELO ao longo do tempo ou historico de posicoes no ranking
- Leaderboard por time ou squad (feature futura)
- Notificacoes em tempo real de mudancas de posicao (WebSockets — feature futura)
- Exportacao do ranking em CSV ou PDF
- Sitemap XML automatico (gerado manualmente ou por feature dedicada futura)
- Filtros adicionais por mapa, agente ou arma favorita

## Dependencias
- `players-api` concluida: endpoint `GET /api/players?sort=elo&order=desc&page=N&limit=25` com suporte a filtros `game` e `period`, retornando nivel calculado pelo Glicko-2 e stats agregadas
- `frontend-setup` concluida: projeto React com React Router e Zustand configurados
- Componente `LevelBadge` implementado na feature `player-profile-ui` e exportado para reuso

## Riscos Iniciais
- **SEO com SPA**: crawlers como Googlebot executam JavaScript, mas outros compartilhadores (WhatsApp, Telegram, iMessage) usam scrapers sem JS e nao verao o conteudo dinamico; as meta tags OG estaticas mitigam isso para compartilhamento, mas o conteudo da tabela nao sera indexado por scrapers sem JS
- **Performance com muitos jogadores**: se a comunidade crescer para centenas de jogadores, a query de ranking com calculos de percentual de vitorias pode ser lenta; recomendar que a API implemente cache da resposta do leaderboard por 60 segundos
- **Posicao global com filtros**: quando filtros sao aplicados, a posicao exibida deve ser a posicao dentro do filtro (nao a global); a API deve retornar o campo correto de acordo com os parametros enviados — isso deve ser validado na integracao
- **Dependencia circular de componentes**: `LevelBadge` e definido em `player-profile-ui` mas necessario aqui; garantir que o componente seja extraido para `src/components/` no `frontend-setup` ou que `player-profile-ui` seja implementado antes desta feature
