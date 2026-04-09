# Security Audit - Especificacao da Feature

## Summary
Auditoria de seguranca pre-release cobrindo OWASP Top 10 para a API REST, verificacoes de JWT, cookies, RCON, permissoes de arquivo, headers HTTP, rate limiting e dependencias, com entrega de documento `SECURITY-AUDIT.md` com checklist, findings e remediacoes.

## System Process Context
1. Auditor (mantenedor ou colaborador designado) executa o checklist de seguranca manualmente contra uma instancia FragHub em staging
2. Ferramentas automatizadas complementam a auditoria manual (npm audit, curl para headers, verificacao de permissoes)
3. Findings sao classificados por severidade (Critical, High, Medium, Low, Info)
4. Findings Critical ou High devem ser remediados antes do release v1.0
5. Resultado final e documentado em `docs/security/SECURITY-AUDIT.md` e commitado no repositorio
6. Uma nova auditoria deve ser conduzida a cada release major

## Personas
- **Mantenedor do projeto**: precisa garantir que o FragHub nao introduz vulnerabilidades na infra dos operadores
- **Operador de servidor**: precisa confiar que a aplicacao nao expoe dados de jogadores ou credenciais do servidor
- **Contribuidor de seguranca**: precisa de um baseline documentado para identificar regressoes em contribuicoes futuras

## Requisitos Funcionais

### SECAUDIT-REQ-001 - Checklist OWASP Top 10 para a API REST
A auditoria deve verificar cada categoria do OWASP Top 10 aplicavel a API REST do FragHub:
- **A01 Broken Access Control**: endpoints administrativos retornam 403 para usuarios com role `player`; IDOR em `/players/:id` nao permite acessar dados de outro jogador
- **A02 Cryptographic Failures**: senhas armazenadas com bcrypt (custo >= 12); nenhum dado sensivel em texto plano no banco
- **A03 Injection**: todos os inputs da API passam por parametrizacao ou ORM; nenhum SQL concatenado com input do usuario
- **A05 Security Misconfiguration**: modo debug desabilitado em producao; stack traces nao expostos em respostas de erro
- **A07 Identification and Authentication Failures**: tentativas de login com credenciais invalidas retornam 401 sem revelar qual campo esta errado (username ou senha)
- **A09 Security Logging and Monitoring Failures**: tentativas de login falhas sao registradas em log com IP e timestamp

### SECAUDIT-REQ-002 - Verificacao de configuracao JWT
A auditoria deve verificar: (1) algoritmo usado e HS256 com secret de no minimo 32 caracteres ou RS256, (2) token possui campo `exp` com validade maxima de 24 horas, (3) token possui campos obrigatorios `sub`, `iat`, `role`, (4) token nao e aceito apos expiracao, (5) secret do JWT nao esta hardcoded no codigo-fonte (apenas em variavel de ambiente).

### SECAUDIT-REQ-003 - Verificacao de cookies de sessao
A auditoria deve confirmar que cookies de autenticacao possuem os atributos: `HttpOnly` (impede acesso via JavaScript), `Secure` (apenas HTTPS), `SameSite=Strict` (protecao contra CSRF) e validade compativel com o tempo de expiracao do JWT.

### SECAUDIT-REQ-004 - Verificacao de seguranca do RCON
A auditoria deve confirmar que: (1) a senha RCON nunca aparece em logs da API, (2) a senha RCON nunca e retornada em nenhuma resposta de endpoint da API, (3) a senha RCON nunca aparece no HTML ou JavaScript enviado ao browser, (4) a senha RCON e armazenada apenas em `.env` com permissao 600.

### SECAUDIT-REQ-005 - Verificacao de permissoes de arquivo
A auditoria deve verificar que os seguintes arquivos possuem permissao maxima 600 e dono igual ao usuario do sistema (nao root): `.env`, `.my.cnf`, chaves privadas SSL/TLS (`*.key`, `*.pem`), e arquivos de backup em `/var/backups/fraghub/`.

### SECAUDIT-REQ-006 - Verificacao de headers HTTP de seguranca
A auditoria deve confirmar que o Nginx retorna os seguintes headers em todas as respostas: `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `Content-Security-Policy` bloqueando fontes nao autorizadas de scripts, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

### SECAUDIT-REQ-007 - Verificacao de rate limiting em endpoints criticos
A auditoria deve confirmar que rate limiting esta configurado e funcional nos seguintes endpoints: `POST /auth/login` (maximo 10 tentativas por minuto por IP), `POST /auth/register` (maximo 5 registros por hora por IP), qualquer endpoint que execute comandos RCON (maximo 30 requisicoes por minuto por usuario autenticado).

### SECAUDIT-REQ-008 - Auditoria de dependencias npm
A auditoria deve executar `npm audit --audit-level=high` em `api/` e `web/`. Nenhuma vulnerabilidade de severidade `high` ou `critical` deve estar presente sem remediacao documentada (upgrade ou justificativa de aceite de risco aprovada pelo mantenedor).

### SECAUDIT-REQ-009 - Documento SECURITY-AUDIT.md
O resultado da auditoria deve ser documentado em `docs/security/SECURITY-AUDIT.md` contendo: data da auditoria, versao auditada, metodologia, checklist completo com status (PASS/FAIL/N/A) para cada item, lista de findings com severidade e remediacao, e lista de itens aceitos como risco com justificativa.

### SECAUDIT-REQ-010 - Arquivo SECURITY.md com politica de divulgacao
Deve existir um arquivo `SECURITY.md` na raiz do repositorio descrevendo como reportar vulnerabilidades de seguranca (responsible disclosure), canal de contato e prazo de resposta esperado.

## Requisitos Nao Funcionais

### SECAUDIT-NFR-001 - Zero findings Critical ou High no release
Nenhum finding de severidade Critical ou High pode permanecer nao remediado no momento do release v1.0. Findings Medium ou inferiores podem ser documentados com plano de remediacao em versao futura.

### SECAUDIT-NFR-002 - Reproducibilidade da auditoria
O checklist deve ser estruturado de forma que qualquer colaborador consiga reproduzir a auditoria seguindo as instrucoes, sem ferramentas proprietarias.

### SECAUDIT-NFR-003 - Auditoria contra instancia real
A auditoria deve ser conduzida contra uma instancia FragHub completamente instalada (nao apenas analise estatica de codigo), com Nginx, API e banco ativos.

### SECAUDIT-NFR-004 - Rastreabilidade de findings
Cada finding documentado deve ter: ID unico, descricao, evidencia (comando executado + output), severidade, remediacao aplicada e status final (remediado/aceito).

## Criterios de Aceitacao
- **AC-001**: Dado que executo `curl -I https://{host}/api/auth/login`, entao a resposta contem os headers `Strict-Transport-Security`, `X-Frame-Options: DENY` e `X-Content-Type-Options: nosniff`.
- **AC-002**: Dado que executo 15 tentativas de login com credenciais invalidas no mesmo IP em menos de 1 minuto, entao a partir da 11a tentativa a API retorna 429 (Too Many Requests).
- **AC-003**: Dado que inspeciono o codigo-fonte e as variaveis de ambiente carregadas, entao a senha RCON nao aparece em nenhum log, resposta de API ou bundle JavaScript do frontend.
- **AC-004**: Dado que executo `ls -la .env .my.cnf` no servidor, entao ambos os arquivos possuem permissao `-rw-------` (600) e dono igual ao usuario do sistema (nao root).
- **AC-005**: Dado que executo `npm audit --audit-level=high` em `api/` e `web/`, entao a saida nao reporta nenhuma vulnerabilidade de severidade high ou critical sem remediacao documentada.
- **AC-006**: Dado que tento acessar `GET /api/admin/users` com um token JWT de role `player`, entao a API retorna 403 Forbidden sem expor dados.
- **AC-007**: Dado que o arquivo `docs/security/SECURITY-AUDIT.md` e gerado, entao ele contem checklist completo com status PASS/FAIL/N/A para cada item dos requisitos SECAUDIT-REQ-001 a SECAUDIT-REQ-008.
- **AC-008**: Dado que inspeciono o JWT emitido pelo endpoint de login, entao o payload contem os campos `sub`, `iat`, `exp` e `role`, e o campo `exp` corresponde a no maximo 24 horas a partir do `iat`.

## Out of Scope (esta feature)
- Pentest completo (penetration testing por empresa especializada)
- Analise de seguranca do LinuxGSM ou do proprio CS2 (componentes de terceiros)
- Varredura automatizada com ferramentas como Burp Suite, OWASP ZAP ou Nessus (auditoria e manual)
- Auditoria de seguranca fisica do servidor (fora do escopo do software)
- Compliance com normas especificas como PCI-DSS, ISO 27001 ou LGPD
- Analise de binarios ou reverse engineering de plugins CS2

## Dependencias
- Feature `auth-api` implementada (JWT, login, registro)
- Feature `admin-dashboard` implementada (endpoints administrativos com RBAC)
- Feature `server-management-ui` implementada (endpoints que executam RCON)
- Feature `nginx-ssl` implementada (HTTPS, headers de seguranca configurados)
- Instancia FragHub completamente instalada em ambiente de staging para auditoria
- Acesso SSH ao servidor de staging para verificacao de permissoes de arquivo

## Riscos Iniciais
- **Findings criticos bloqueiam release v1.0**: se a auditoria revelar vulnerabilidade critica de dificil correcao (ex: design falho de autenticacao), pode atrasar significativamente o release — mitigacao: conduzir auditoria parcial mais cedo no ciclo (pre-v1.0)
- **Auditoria feita tarde demais**: se realizada apenas apos todas as features estarem prontas, correcoes podem exigir refatoracao de varios modulos — mitigacao: checklist parcial aplicado durante desenvolvimento de cada feature
- **Falsa sensacao de seguranca**: checklist manual nao substitui pentest profissional — mitigacao: documentar explicitamente no `SECURITY-AUDIT.md` as limitacoes da auditoria interna
- **Dependencias com vulnerabilidades sem fix disponivel**: `npm audit` pode reportar vulnerabilidades em dependencias sem versao corrigida disponivel — mitigacao: avaliar caso a caso e documentar aceite de risco com data de revisao
