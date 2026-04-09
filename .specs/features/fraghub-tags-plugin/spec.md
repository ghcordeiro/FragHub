# FragHub Tags Plugin - Especificacao da Feature

## Summary
Desenvolver e distribuir plugins customizados de tags in-game para CS2 (CounterStrikeSharp/C#) e CS:GO (SourceMod/SourcePawn) que consultam a API do FragHub para exibir o nivel do jogador (`[N]`) ou a tag `[ADMIN]` no chat e scoreboard do servidor, com cache local e fallback silencioso.

## System Process Context
1. O jogador conecta ao servidor de CS2 ou CS:GO.
2. O plugin e carregado pelo servidor e, ao detectar a conexao do jogador, extrai o SteamID.
3. O plugin verifica o cache local em memoria: se houver entrada valida (menos de 5 minutos), usa o dado em cache; caso contrario, faz uma requisicao HTTP `GET /api/player/{steamid}` para a API do FragHub.
4. A API retorna `{ level: N, role: "player" | "admin" }`.
5. O plugin define a tag do jogador: `[ADMIN]` se `role == "admin"`, ou `[N]` onde N e o nivel (1-10) se `role == "player"`.
6. A tag e exibida no chat e no scoreboard do servidor durante a sessao do jogador.
7. Se a API estiver indisponivel ou retornar erro, nenhuma tag e exibida (fallback silencioso) — o jogo continua normalmente.
8. Os plugins sao instalados automaticamente nos diretorios corretos pelo `game-stack-baseline` ou por etapa nova do installer.

## Personas
- **Jogador**: ve sua propria tag de nivel no chat e scoreboard, ganhando senso de progressao in-game.
- **Administrador do servidor**: distinguido visualmente dos outros jogadores pela tag `[ADMIN]` sem configuracao adicional.
- **Operador FragHub**: instala o plugin uma unica vez via installer; sem manutencao manual de tags.

## Requisitos Funcionais

### TAGPLG-REQ-001 - Plugin CS2 (CounterStrikeSharp, C#)
Desenvolver plugin para CS2 usando CounterStrikeSharp (.NET 8, C#) que:
- Registra handler para o evento `OnClientAuthorized` (ou equivalente de pos-autenticacao do cliente).
- Usa o SteamID do jogador para consultar a API do FragHub via `HttpClient`.
- Exibe a tag no nome do jogador no chat e scoreboard usando as APIs do CounterStrikeSharp (ex: `player.TagName` ou mecanismo equivalente disponivel na versao utilizada).
- Carrega a URL da API do arquivo de configuracao `fraghub_tags.cfg`.

### TAGPLG-REQ-002 - Plugin CS:GO (SourceMod, SourcePawn)
Desenvolver plugin para CS:GO usando SourceMod/SourcePawn que:
- Registra hook para `OnClientPostAdminCheck` para obter o SteamID apos autenticacao.
- Realiza a requisicao HTTP usando a extensao `SteamWorks` ou `cURL` disponivel no SourceMod para chamar `GET /api/player/{steamid}`.
- Define a tag do jogador via `SetClientCookies`, `CS_SetClientClanTag` ou mecanismo equivalente disponivel no SourceMod para exibicao no scoreboard e chat.
- Carrega a URL da API do arquivo de configuracao `fraghub_tags.cfg` (formato KeyValues do SourceMod).

### TAGPLG-REQ-003 - Logica de Tag
A tag exibida deve seguir as regras:
- Se `role == "admin"`: exibir `[ADMIN]`.
- Se `role == "player"` e `level` entre 1-10: exibir `[N]` onde N e o valor de `level`.
- Se a API retornar erro ou o jogador nao for encontrado: nenhuma tag (string vazia).
A logica deve ser identica nos dois plugins.

### TAGPLG-REQ-004 - Cache Local por Jogador
O plugin deve manter um cache em memoria (dicionario/mapa indexado por SteamID) com TTL de 5 minutos. Ao reconectar dentro do TTL, o plugin usa o dado em cache sem nova requisicao HTTP. O cache e limpo automaticamente quando o jogador desconecta para evitar crescimento indefinido de memoria.

### TAGPLG-REQ-005 - Fallback Silencioso
Se a requisicao HTTP falhar (timeout, conexao recusada, HTTP 4xx/5xx), o plugin deve:
- Nao exibir nenhuma tag para o jogador afetado.
- Nao gerar erro, crash ou mensagem de erro para o jogador ou chat do servidor.
- Registrar o erro no log do servidor (nivel WARNING) com o SteamID e o motivo da falha.

### TAGPLG-REQ-006 - Timeout da Requisicao HTTP
A requisicao HTTP ao endpoint da API deve ter timeout maximo configuravel (padrao: 3 segundos para CS2; para CS:GO, limitado pelo mecanismo HTTP disponivel no SourceMod). Apos o timeout, o plugin aplica o fallback silencioso (TAGPLG-REQ-005).

### TAGPLG-REQ-007 - Arquivo de Configuracao
Cada plugin deve ler sua configuracao de um arquivo `.cfg`:
- `fraghub_tags.cfg` (CS2, formato JSON ou KeyValues compativel com CounterStrikeSharp).
- `fraghub_tags.cfg` (CS:GO, formato KeyValues do SourceMod).
- Chave obrigatoria: `api_url` — URL base da API do FragHub (ex: `http://localhost:3000`).
- O installer deve gerar este arquivo com a URL correta durante o setup.

### TAGPLG-REQ-008 - Distribuicao como Artefatos Pre-compilados
- O plugin CS2 deve ser distribuido como DLL pre-compilada (`.dll`) para evitar dependencia de ambiente .NET no servidor de producao. O codigo-fonte C# deve estar no repositorio para auditoria e recompilacao opcional.
- O plugin CS:GO deve ser distribuido como `.smx` pre-compilado para evitar dependencia do compilador `spcomp` no servidor. O codigo-fonte `.sp` deve estar no repositorio.
- O installer deve copiar os artefatos para os diretorios corretos:
  - CS2: `game/csgo/addons/counterstrikesharp/plugins/fraghub_tags/`
  - CS:GO: `cstrike/addons/sourcemod/plugins/fraghub_tags.smx`

### TAGPLG-REQ-009 - Instalacao Automatica pelo Installer
O `game-stack-baseline` ou uma nova etapa do installer deve:
- Detectar qual jogo esta instalado (CS2 ou CS:GO ou ambos).
- Copiar o artefato pre-compilado correto para o diretorio adequado.
- Gerar o arquivo `fraghub_tags.cfg` com a `api_url` baseada na configuracao do installer.
- Nao sobrescrever um `.cfg` existente com valores customizados (checar existencia antes de escrever).

### TAGPLG-REQ-010 - Endpoint da API Utilizado
O plugin consome exclusivamente o endpoint existente `GET /api/player/{steamid}` (provido por `players-api` + `steam-integration` + `elo-system`). A resposta deve conter ao menos os campos `level` (inteiro 1-10) e `role` (`"player"` ou `"admin"`). Nenhum endpoint novo precisa ser criado na API para esta feature.

## Requisitos Nao Funcionais

### TAGPLG-NFR-001 - Latencia In-Game
A consulta HTTP nao deve bloquear o thread principal do servidor de jogo. No CS2 (CounterStrikeSharp), a requisicao deve ser feita de forma assicrona (`async/await`). No CS:GO (SourceMod), usar o mecanismo de callback nao-bloqueante da extensao HTTP utilizada.

### TAGPLG-NFR-002 - Memoria
O cache em memoria deve ser limitado ao numero maximo de jogadores conectados simultaneamente (64 entradas maximas). Entradas devem ser removidas ao `OnClientDisconnect`.

### TAGPLG-NFR-003 - Compatibilidade
- CS2: compativel com a versao do CounterStrikeSharp utilizada pelo `game-stack-baseline`.
- CS:GO: compativel com SourceMod 1.11+ e SM Extensions necessarias ja instaladas pelo `game-stack-baseline`.

### TAGPLG-NFR-004 - Codigo-Fonte Auditavel
O codigo-fonte de ambos os plugins deve estar no repositorio FragHub sob `plugins/cs2/fraghub_tags/` e `plugins/csgo/fraghub_tags/` respectivamente, com instrucoes de compilacao no README do diretorio.

### TAGPLG-NFR-005 - Sem Dependencias Externas de Runtime
Os plugins nao devem depender de bibliotecas de terceiros alem do runtime do proprio framework (CounterStrikeSharp para CS2 e SourceMod + extensoes padrao para CS:GO).

## Criterios de Aceitacao

- **AC-001**: Jogador com `role=player` e `level=7` conecta ao servidor CS2 — a tag `[7]` e exibida no seu nome no scoreboard e chat em ate 3 segundos apos a conexao.
- **AC-002**: Jogador com `role=admin` conecta ao servidor CS2 — a tag `[ADMIN]` e exibida; nenhuma tag numerica e exibida para este jogador.
- **AC-003**: API do FragHub offline/inacessivel — jogador conecta, nenhuma tag e exibida, nenhuma mensagem de erro aparece no chat; o log do servidor contem uma entrada WARNING com o SteamID e motivo da falha.
- **AC-004**: Jogador reconecta dentro de 5 minutos — o plugin usa o cache local sem fazer nova requisicao HTTP (verificavel via log do servidor: ausencia de log de nova consulta HTTP para o mesmo SteamID).
- **AC-005**: Jogador desconecta — entrada do cache e removida; ao reconectar apos 5 minutos, nova requisicao HTTP e feita.
- **AC-006**: Os mesmos ACs (AC-001 a AC-005) valem para o plugin CS:GO com comportamento identico.
- **AC-007**: O installer copia os artefatos pre-compilados para os diretorios corretos e gera `fraghub_tags.cfg` com `api_url` preenchida; o servidor de jogo carrega o plugin sem erros no log de inicializacao.
- **AC-008**: Modificar `api_url` no `fraghub_tags.cfg` e reiniciar o servidor faz o plugin usar a nova URL sem necessidade de recompilacao.

## Out of Scope (esta feature)
- Tags customizadas definidas pelo proprio jogador (v2.0)
- Exibicao de ELO numerico exato in-game (apenas nivel 1-10 e `[ADMIN]`)
- Sincronizacao de clan tags com plataformas externas (Steam Groups, etc.)
- Plugin para outros jogos ou engines fora de CS2 e CS:GO
- Interface de administracao para gerenciar tags via portal web
- Suporte a servidores com autenticacao diferente de SteamID (LAN, bots)

## Dependencias
- `game-stack-baseline`: CS2 com CounterStrikeSharp instalado; CS:GO com SourceMod instalado; estrutura de diretorios do servidor de jogo criada
- `players-api`: endpoint `GET /api/player/{steamid}` deve existir e retornar `level` e `role`
- `steam-integration`: vinculacao de SteamID ao jogador, necessaria para o endpoint funcionar com SteamID como chave
- `elo-system`: campo `level` no retorno do endpoint de jogador e calculado pelo sistema de ELO
- `cli-installer`: deve ser extendido para copiar os artefatos do plugin e gerar o `.cfg` durante o setup

## Riscos Iniciais
- **Distribuicao de DLL pre-compilada**: a DLL do CS2 e compilada numa versao especifica do CounterStrikeSharp e do .NET 8 — atualizacoes do framework podem quebrar o plugin; o versionamento dos artefatos deve ser explicito no repositorio.
- **Compilador spcomp indisponivel**: distribuir o `.smx` pre-compilado mitiga, mas pull requests de contribuidores que modificam o `.sp` precisarao do compilador para gerar novo `.smx`; o CI pode ser configurado para compilar automaticamente (escopo de CI, nao desta feature).
- **Latencia HTTP causa micro-freeze**: mesmo com requisicao assincrona, uma latencia de rede elevada (>500ms) entre o servidor de jogo e a API pode causar percepcao de lentidao na atualizacao da tag; o cache de 5 minutos mitiga nos reconectas, mas nao na primeira conexao.
- **API URL desatualizada no .cfg**: se o dominio da API mudar apos a instalacao, o administrador deve atualizar manualmente o `fraghub_tags.cfg` em todos os servidores — nao ha mecanismo de auto-atualizacao nesta versao.
- **Extensao HTTP do SourceMod**: a disponibilidade da extensao `SteamWorks` ou `cURL` no CS:GO depende do ambiente; o `game-stack-baseline` deve garantir a instalacao da extensao correta.
