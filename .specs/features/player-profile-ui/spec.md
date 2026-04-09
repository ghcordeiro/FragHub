# Player Profile UI - Especificacao da Feature

## Summary
Paginas de perfil de jogador no portal React: perfil publico `/players/:id` com stats, historico de partidas e badge de nivel Glicko-2 (1-10), e pagina `/players/me` com acoes do proprio usuario incluindo edicao de nome e vinculacao Steam.

## System Process Context
1. Qualquer visitante acessa `/players/:id` (sem login necessario)
2. Frontend chama `GET /api/players/:id` e `GET /api/players/:id/matches?page=1&limit=10`
3. Frontend renderiza perfil com: avatar (Steam ou placeholder), nome, badge de nivel, ELO atual, stats agregadas e tabela de historico de partidas paginada
4. Usuario autenticado acessa `/players/me`
5. Frontend chama `GET /api/players/me` para obter dados do proprio usuario
6. Se `steamId === null`, exibe secao de vinculacao Steam com CTA
7. Usuario clica em "Editar nome" → campo inline editavel aparece → usuario confirma → frontend chama `PATCH /api/players/me` → nome atualizado no perfil
8. Historico de partidas e paginado; usuario clica em proxima pagina → frontend chama endpoint com `?page=N` → tabela atualiza sem recarregar a pagina

## Personas
- **Visitante**: quer ver o perfil e stats de um jogador especifico (por link compartilhado)
- **Jogador**: quer acompanhar sua propria evolucao de ELO, nivel e historico de partidas
- **Jogador sem Steam**: quer saber que precisa vincular a conta Steam para jogar e tem CTA claro
- **Admin**: pode acessar o perfil de qualquer jogador para moderacao

## Requisitos Funcionais

### PROFUI-REQ-001 - Pagina de perfil publico (`/players/:id`)
A pagina deve exibir: avatar do jogador (imagem da Steam se `steamId` vinculado, ou avatar SVG placeholder com iniciais do nome), nome do jogador, badge de nivel (1-10 com cor correspondente), ELO atual, e as seguintes stats agregadas: total de partidas jogadas, total de vitorias, percentual de vitorias, K/D ratio, HS% (headshot percentage). A pagina deve ser acessivel sem autenticacao.

### PROFUI-REQ-002 - Badge de nivel visual (1-10)
O componente `LevelBadge` deve renderizar um badge circular com o numero do nivel e cor de fundo conforme tabela:
- Niveis 1-2: cinza (`#808080`)
- Niveis 3-5: verde (`#43a047`)
- Niveis 6-8: amarelo/dourado (`#fdd835`)
- Niveis 9-10: laranja/vermelho (`#e53935`)

O badge deve aceitar prop `size` (sm, md, lg) e ser reutilizavel no leaderboard.

### PROFUI-REQ-003 - Historico de partidas paginado
Abaixo das stats, deve existir uma tabela com as ultimas partidas do jogador, paginada em 10 por pagina. Colunas: data (formato `DD/MM/YYYY HH:mm`), mapa, resultado (`Vitoria` / `Derrota` / `Empate` com cor), kills, deaths, K/D da partida, HS%. Controles de paginacao devem exibir numero da pagina atual, botoes anterior/proximo, e total de paginas. A URL deve atualizar o query param `?page=N` para permitir compartilhamento de pagina especifica.

### PROFUI-REQ-004 - Pagina "Meu Perfil" (`/players/me`) — rota protegida
Identica ao perfil publico porem com as seguintes adicoes: botao "Editar nome" que abre edicao inline (campo input com confirmacao/cancelamento via botoes ou Enter/Escape), secao "Conta Steam" que exibe o nome da conta Steam se vinculada ou CTA "Vincular conta Steam" se nao vinculada (integra com fluxo da feature `auth-ui`). A rota e protegida (requer autenticacao).

### PROFUI-REQ-005 - Edicao inline de nome
Ao clicar em "Editar nome", o nome exibido deve ser substituido por um campo `<input>` pre-preenchido. Ao confirmar (botao ou Enter), deve chamar `PATCH /api/players/me` com `{ name }`, exibir estado de loading e atualizar o nome na UI apos resposta `200 OK`. Ao cancelar (botao ou Escape), deve restaurar o nome original sem chamar a API. Validacao: min 2 chars, max 32 chars.

### PROFUI-REQ-006 - Loading states
Durante o carregamento inicial, a pagina deve exibir skeleton loaders para: avatar (circulo), nome (barra), stats (grade de 6 cards), tabela de partidas (5 linhas com celulas simuladas). Nao deve exibir conteudo vazio enquanto os dados estao sendo carregados.

### PROFUI-REQ-007 - Empty states
Se o jogador nao tiver partidas registradas, deve exibir mensagem "Nenhuma partida registrada ainda" com icone e CTA para informacoes sobre como jogar. Se o jogador nao for encontrado (API retorna 404), deve exibir pagina de erro com mensagem "Jogador nao encontrado" e link para voltar ao leaderboard.

### PROFUI-REQ-008 - Avatar Steam com fallback gracioso
O componente `PlayerAvatar` deve tentar carregar a imagem do avatar da Steam via URL retornada pela API. Em caso de erro de carregamento (imagem nao disponivel), deve exibir avatar SVG placeholder com as iniciais do nome do jogador. Nao deve exibir imagem quebrada em hipotese alguma.

## Requisitos Nao Funcionais

### PROFUI-NFR-001 - Tempo de carregamento
A pagina de perfil deve ser interativa (LCP) em menos de 2 segundos em conexao de 10 Mbps. Os dados das stats e historico devem ser buscados em paralelo (requests simultaneos, nao sequenciais).

### PROFUI-NFR-002 - Acessibilidade
O badge de nivel deve ter `aria-label="Nivel X"`. A tabela de partidas deve ter `<thead>` com `scope="col"` em cada `<th>`. Os controles de paginacao devem ter `aria-label` descritivos ("Pagina anterior", "Proxima pagina"). A imagem do avatar deve ter `alt` descritivo.

### PROFUI-NFR-003 - Responsividade
A pagina deve ser utilizavel em telas a partir de 375px de largura. Em mobile, a tabela de partidas deve ter scroll horizontal ou colunas reduzidas (exibir apenas mapa, resultado e K/D em telas pequenas).

### PROFUI-NFR-004 - Cache de dados do perfil
Os dados do perfil publico podem ser mantidos em cache pelo browser por ate 30 segundos (header `Cache-Control: max-age=30` da API). A pagina `/players/me` nao deve usar cache (dados proprios devem ser sempre frescos).

## Criterios de Aceitacao
- **AC-001**: Acessar `/players/123` sem login exibe o perfil do jogador com nome, badge de nivel, ELO e stats; a pagina retorna 200 sem requer autenticacao
- **AC-002**: Acessar `/players/999999` (ID inexistente) exibe mensagem "Jogador nao encontrado" e nao quebra a aplicacao
- **AC-003**: Badge de nivel exibe a cor correta conforme o nivel (ex: nivel 7 exibe amarelo, nivel 10 exibe vermelho)
- **AC-004**: Tabela de historico de partidas exibe 10 partidas por pagina; clicar "Proxima pagina" carrega as 10 seguintes e a URL atualiza para `?page=2`
- **AC-005**: Usuario autenticado acessa `/players/me` e consegue editar o nome inline; apos confirmar, o novo nome e exibido sem recarregar a pagina
- **AC-006**: Usuario sem Steam vinculada ve a secao "Vincular conta Steam" com CTA funcional em `/players/me`
- **AC-007**: Enquanto os dados carregam, skeleton loaders sao exibidos (nao conteudo vazio ou layout quebrado)
- **AC-008**: Jogador sem nenhuma partida ve empty state com mensagem adequada em vez de tabela vazia sem contexto

## Out of Scope (esta feature)
- Edicao de avatar/foto de perfil (requer upload de imagem, feature futura)
- Grafico de evolucao de ELO ao longo do tempo (feature futura de analytics)
- Comparacao entre dois jogadores (feature futura)
- Detalhamento completo de uma partida especifica (coberto pela feature `matches-api` e futura pagina de match detail)
- Painel de administracao para soft delete ou banimento de jogadores (coberto por `admin-panel`)
- Configuracoes de privacidade do perfil (tornar perfil privado, etc.)

## Dependencias
- `auth-ui` concluida: componente `ProtectedRoute` e hook `useSession` disponivel para `/players/me`
- `matches-api` concluida: endpoints `GET /api/players/:id/matches` com paginacao e stats agregadas
- `players-api` concluida: endpoints `GET /api/players/:id`, `GET /api/players/me`, `PATCH /api/players/me`
- `steam-integration` concluida: URL do avatar Steam retornada pela API de perfil
- `frontend-setup` concluida: estrutura de pastas e componentes base configurados

## Riscos Iniciais
- **Avatar Steam e CORS**: a URL do avatar da Steam (`steamcdn-a.akamaihd.net`) deve estar na CSP da feature `nginx-ssl`; ja contemplado em `NGINXSSL-REQ-006`
- **Partidas sem dados de Steam**: partidas de jogadores sem Steam vinculada nao terao avatar; o componente `PlayerAvatar` deve ser robusto a dados nulos
- **Performance da tabela de partidas**: se o jogador tiver centenas de partidas, a paginacao server-side e obrigatoria para nao sobrecarregar o browser (nao usar paginacao client-side com todos os dados em memoria)
- **Sincronizacao do nome editado**: apos editar o nome em `/players/me`, o nome no header da aplicacao (se exibido via sessionStore) deve tambem ser atualizado
