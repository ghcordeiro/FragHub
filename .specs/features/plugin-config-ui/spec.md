# Plugin Config UI - Especificacao da Feature

## Summary
Implementar interface de configuracao de plugins de jogo no painel admin, permitindo leitura e escrita de arquivos `.cfg` pre-autorizados dos servidores via API com prevencao obrigatoria de path traversal.

## System Process Context
1. Admin acessa `/admin/servers/:id/config`; frontend solicita `GET /api/admin/servers/:id/config` e recebe a lista de plugins configuraveisdiasponíveis para aquele servidor.
2. Admin seleciona um plugin; frontend solicita `GET /api/admin/servers/:id/config/:plugin`; a API resolve o path do arquivo usando uma allowlist de mappings `{plugin -> caminho absoluto no host}` e retorna o conteudo como texto.
3. Admin edita o conteudo no editor de texto da UI e clica em "Aplicar".
4. Frontend envia `PUT /api/admin/servers/:id/config/:plugin` com o novo conteudo; a API valida que o `plugin` esta na allowlist, sobrescreve o arquivo com o novo conteudo e opcionalmente reinicia o servidor ou recarrega o plugin via RCON.
5. Se o servidor tiver jogadores conectados, a API retorna um aviso (nao um erro) e o frontend exibe uma confirmacao adicional antes de prosseguir.
6. A acao de escrita e recarregamento e registrada no audit log.

## Personas
- **Admin**: precisa ajustar configuracoes de plugins (ex: numero de rounds, tempo de warmup, configuracoes de SimpleAdmin) sem precisar de acesso SSH ao servidor
- **Infraestrutura (implicita)**: o filesystem do host onde os arquivos `.cfg` residem — nunca deve expor arquivos fora dos paths autorizados

## Requisitos Funcionais

### PLGCFG-REQ-001 - Allowlist de Plugins Configuraveiss
A API deve manter um mapeamento estatico (`plugin_slug -> caminho_absoluto_no_host`) definido em arquivo de configuracao da aplicacao, nunca em banco de dados ou como input do usuario. Os plugins iniciais suportados sao: `matchzy` (MatchZy), `get5` (Get5), `cs2-simpleadmin` (CS2-SimpleAdmin), `sourcebans` (SourceBans++). Qualquer `plugin` nao presente neste mapeamento deve resultar em 404.

### PLGCFG-REQ-002 - Leitura de Arquivo de Configuracao
Endpoint `GET /api/admin/servers/:id/config/:plugin` deve: (1) verificar que `server_id` existe e pertence ao ambiente; (2) verificar que `plugin` esta na allowlist; (3) ler o arquivo do path mapeado; (4) retornar o conteudo como texto plano com Content-Type `text/plain`. Se o arquivo nao existir no path esperado, retorna 404 com mensagem clara.

### PLGCFG-REQ-003 - Escrita de Arquivo de Configuracao com Path Traversal Prevention
Endpoint `PUT /api/admin/servers/:id/config/:plugin` deve: (1) verificar autorizacao `role=admin`; (2) verificar que `plugin` esta na allowlist; (3) resolver o path canonico do arquivo usando `path.resolve()` e confirmar que o resultado esta dentro do diretorio permitido para aquele servidor; (4) sobrescrever o arquivo com o novo conteudo. Se o path resolvido estiver fora do diretorio autorizado, retornar 400 e registrar tentativa no log de aplicacao. Esta validacao e obrigatoria e nao pode ser bypassada.

### PLGCFG-REQ-004 - Verificacao de Jogadores Conectados antes de Aplicar
Antes de sobrescrever o arquivo, a API deve verificar via RCON `status` se ha jogadores conectados no servidor. Se houver, a API retorna 200 com body `{warning: "Servidor com X jogadores conectados. Confirmar aplicacao?", players_connected: X}`. O frontend deve exibir modal de confirmacao; o admin deve confirmar explicitamente antes de reenviar a requisicao com header `X-Confirm-Override: true`.

### PLGCFG-REQ-005 - Recarregamento de Plugin apos Aplicacao
Apos sobrescrever o arquivo com sucesso, a API deve tentar recarregar a configuracao via RCON (comando especifico por plugin, ex: `css_reloadadmins` para CS2-SimpleAdmin, `get5_loadmatch` para Get5). Se o reload RCON falhar, a API retorna 207 (Multi-Status) indicando que o arquivo foi salvo mas o reload automatico falhou — o admin pode reiniciar o servidor manualmente.

### PLGCFG-REQ-006 - UI de Edicao de Configuracao
A rota `/admin/servers/:id/config` deve exibir: lista de plugins configuraveiss como tabs ou menu lateral; textarea de edicao monospacada para o arquivo selecionado; botao "Aplicar" que envia a requisicao de escrita; indicador de "nao salvo" quando o conteudo for editado sem salvar; feedback visual de sucesso ou erro apos aplicacao.

### PLGCFG-REQ-007 - Registro de Acoes no Audit Log
Toda leitura e escrita de arquivo de configuracao deve gerar registro no audit log (feature `admin-logs`) com: `action_type=plugin_config_read` ou `plugin_config_write`, `target_type=server`, `target_id`, plugin slug, tamanho do arquivo e resultado da operacao.

### PLGCFG-REQ-008 - Validacao de Tamanho de Arquivo
A API deve rejeitar escrita de arquivos maiores que 1MB (1.048.576 bytes) com status 413. Arquivos lidos maiores que 500KB devem ser truncados na resposta com aviso explicito.

## Requisitos Nao Funcionais

### PLGCFG-NFR-001 - Path Traversal Prevention Obrigatorio
**Critico.** Nenhuma entrada HTTP pode resultar em leitura ou escrita fora dos diretorios autorizados. A validacao deve usar `path.resolve()` comparando com o prefixo do diretorio autorizado; string matching simples nao e suficiente. Testes automatizados para payloads de path traversal (ex: `../../../etc/passwd`) sao obrigatorios.

### PLGCFG-NFR-002 - Permissoes de Filesystem
O usuario de sistema que executa o processo Node.js da API deve ter permissao de escrita apenas nos diretorios de configuracao de plugins dos servidores. O principio de menor privilegio e obrigatorio; o processo da API nunca deve rodar como root.

### PLGCFG-NFR-003 - Atomicidade da Escrita
A escrita do arquivo de configuracao deve ser atomica: escrever em arquivo temporario no mesmo diretorio e depois renomear (`rename`/`mv`) para o path final. Isso evita corrompimento do arquivo caso o processo seja interrompido durante a escrita.

### PLGCFG-NFR-004 - Conformidade com TypeScript Strict
Todo codigo novo deve compilar com `strict: true`. O mapeamento de allowlist deve ser tipado com um tipo especifico, nao `Record<string, string>` generico.

### PLGCFG-NFR-005 - Sem Browsing Livre de Filesystem
O usuario nao pode navegar livremente pelo filesystem do host. A UI deve exibir apenas os plugins pre-definidos na allowlist, sem qualquer campo de input livre de path.

## Criterios de Aceitacao

- **AC-001**: Uma requisicao `GET /api/admin/servers/1/config/../../../etc/passwd` retorna 404 (plugin nao encontrado na allowlist) e nao retorna o conteudo de nenhum arquivo do sistema.
- **AC-002**: Uma requisicao `PUT /api/admin/servers/1/config/matchzy` com conteudo valido sobrescreve corretamente o arquivo de configuracao do MatchZy e a API retorna 200.
- **AC-003**: Ao tentar aplicar uma configuracao com o servidor tendo 5 jogadores conectados, a API retorna o aviso e o frontend exibe o modal de confirmacao — sem o header `X-Confirm-Override: true` a escrita nao ocorre.
- **AC-004**: Uma requisicao para `GET /api/admin/servers/1/config/plugin-inexistente` retorna 404 com mensagem "Plugin nao configuravel".
- **AC-005**: Um usuario com `role=player` que tenta `PUT /api/admin/servers/1/config/matchzy` recebe 403.
- **AC-006**: Apos salvar uma configuracao, um registro `plugin_config_write` aparece no audit log em `/admin/logs`.
- **AC-007**: O conteudo editado na textarea e exibido com indicador visual "nao salvo" ate o admin clicar em "Aplicar" e receber confirmacao de sucesso.
- **AC-008**: Um arquivo de configuracao valido e sobrescrito atomicamente — se o processo for interrompido durante a escrita, o arquivo original permanece intacto.

## Out of Scope (esta feature)
- Navegacao livre pelo filesystem do host — apenas plugins pre-definidos na allowlist
- Edicao de arquivos de configuracao do sistema operacional ou do servidor web (Nginx)
- Versionamento ou historico de revisoes dos arquivos de configuracao — v2.0
- Validacao semantica do conteudo dos arquivos `.cfg` (ex: verificar se os valores sao validos para o plugin) — v2.0
- Suporte a plugins nao listados na allowlist inicial — requer atualizacao do mapeamento em arquivo de configuracao

## Dependencias
- `server-management-ui`: logica de proxy RCON reutilizada para o recarregamento de plugins; servidores ja listados
- `admin-logs` (feature paralela da v0.6): registro de leituras e escritas de configuracao
- `admin-dashboard`: middleware de autorizacao `role=admin`
- `game-stack-baseline`: plugins ja instalados e arquivos `.cfg` ja existentes nos paths esperados

## Riscos Iniciais
- **Critico — Path traversal**: input malicioso podendo acessar ou sobrescrever arquivos fora do escopo — mitigacao: allowlist de slugs + validacao de path canonico obrigatoria
- **Alto — Permissoes de filesystem inadequadas**: usuario da API com acesso de escrita alem do necessario — mitigacao: configurar permissoes restritas durante o deploy pelo installer
- **Medio — Interrupcao de partida em andamento**: salvar e recarregar configuracao durante uma partida pode crashar o servidor de jogo — mitigacao: verificacao de jogadores conectados com confirmacao explicita
- **Medio — Corrompimento de arquivo cfg**: falha de escrita a meio caminho pode deixar arquivo ilegivel pelo servidor de jogo — mitigacao: escrita atomica via arquivo temporario + rename
