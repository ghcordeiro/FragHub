# Nginx SSL - Especificacao da Feature

## Summary
Configuracao do Nginx como reverse proxy com SSL opcional via Let's Encrypt (certbot), roteando `/api/*` para a API Node.js e `/` para o frontend React, com headers de seguranca e integracao ao installer bash existente.

## System Process Context
1. Operador executa etapa `nginx_setup` do installer bash (apos `frontend-setup` e `api-setup` concluidos)
2. Installer instala Nginx e certbot via `apt-get` se nao presentes
3. Installer pergunta ao operador se possui dominio configurado com DNS propagado
4. **Caminho com dominio**: installer executa `certbot --nginx -d <dominio>` e configura HTTPS; cria timer systemd para renovacao automatica
5. **Caminho sem dominio (fallback HTTP)**: installer configura Nginx apenas com HTTP na porta 80, sem SSL
6. Installer escreve arquivo de configuracao em `/etc/nginx/sites-available/fraghub` e cria symlink em `sites-enabled/`
7. Installer habilita e inicia a unidade systemd `nginx` (alias `fraghub-nginx`)
8. Installer executa `nginx -t` para validar configuracao antes de aplicar
9. Nginx passa a rotear: `GET /api/*` → `http://127.0.0.1:3000`, `GET /*` → arquivos estaticos em `/opt/fraghub/portal/dist/`
10. Requisicoes a rotas SPA desconhecidas retornam `index.html` (try_files fallback)

## Personas
- **Operador sem dominio**: quer subir o servidor localmente ou em LAN sem configurar DNS; aceita HTTP
- **Operador com dominio**: quer HTTPS valido com renovacao automatica para expor o portal publicamente
- **Developer contributor**: precisa entender o mapeamento de rotas para depurar problemas de proxy

## Requisitos Funcionais

### NGINXSSL-REQ-001 - Arquivo de configuracao Nginx gerado pelo installer
O installer deve gerar o arquivo `/etc/nginx/sites-available/fraghub` a partir de um template parametrizado com: `SERVER_NAME` (dominio ou `_`), `API_PORT` (padrao 3000), `PORTAL_DIST` (padrao `/opt/fraghub/portal/dist`). O arquivo deve ser idempotente: executar o installer duas vezes nao deve duplicar blocos de configuracao.

### NGINXSSL-REQ-002 - Reverse proxy para a API
O bloco `location /api/` deve fazer proxy para `http://127.0.0.1:3000/` com os headers: `Host $host`, `X-Real-IP $remote_addr`, `X-Forwarded-For $proxy_add_x_forwarded_for`, `X-Forwarded-Proto $scheme`. O Nginx deve repassar o corpo completo das requisicoes POST/PUT sem truncamento (`client_max_body_size 10m`).

### NGINXSSL-REQ-003 - Servir frontend estatico com SPA fallback
O bloco `location /` deve servir arquivos do diretorio `dist/` com `try_files $uri $uri/ /index.html`. Assets com hash no nome (`.js`, `.css`) devem ter `Cache-Control: public, max-age=31536000, immutable`. O `index.html` deve ter `Cache-Control: no-cache`.

### NGINXSSL-REQ-004 - SSL via certbot (caminho com dominio)
Quando o operador fornecer um dominio, o installer deve: (a) executar `certbot --nginx -d <dominio> --non-interactive --agree-tos -m <email>` e (b) criar um systemd timer `certbot-renew.timer` que executa `certbot renew --quiet` diariamente. O bloco HTTPS deve incluir redirect permanente de HTTP para HTTPS.

### NGINXSSL-REQ-005 - Fallback HTTP para ambiente local
Quando o operador nao fornecer dominio ou a geracao do certificado falhar, o installer deve configurar Nginx apenas na porta 80 sem SSL. Deve exibir aviso claro ao operador sobre a ausencia de HTTPS.

### NGINXSSL-REQ-006 - Headers de seguranca
O arquivo de configuracao deve incluir os seguintes headers em todas as respostas:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains` (apenas em HTTPS)
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://steamcdn-a.akamaihd.net`

### NGINXSSL-REQ-007 - Integracao com installer bash existente
O installer deve expor a funcao `nginx_setup` em `scripts/installer/nginx.sh`, seguindo o padrao dos modulos existentes (`logging.sh`, `state.sh`, `precheck.sh`). A etapa deve ser registrada no sistema de estado do installer (idempotencia via `state.sh`).

### NGINXSSL-REQ-008 - Validacao da configuracao antes de aplicar
O installer deve executar `nginx -t` apos gerar o arquivo de configuracao e antes de executar `systemctl reload nginx`. Se `nginx -t` falhar, o installer deve exibir o erro, reverter para a configuracao anterior (se existir backup) e encerrar com exit code nao-zero.

## Requisitos Nao Funcionais

### NGINXSSL-NFR-001 - Tempo de resposta do proxy
O Nginx nao deve adicionar mais de 5 ms de latencia ao passar a requisicao para a API em condicoes normais de carga (medido via `curl` com `-w "%{time_total}"`).

### NGINXSSL-NFR-002 - Renovacao automatica de certificado
O timer de renovacao deve garantir que o certificado seja renovado antes de expirar (certbot renova com 30+ dias de antecedencia por padrao). Falhas na renovacao devem ser logadas em `/var/log/fraghub/certbot-renew.log`.

### NGINXSSL-NFR-003 - Configuracao minima de seguranca TLS
Quando SSL estiver ativo, o Nginx deve aceitar apenas TLS 1.2 e 1.3 (`ssl_protocols TLSv1.2 TLSv1.3`). Ciphers fracos devem ser explicitamente desabilitados.

### NGINXSSL-NFR-004 - Idempotencia do installer
Executar `nginx_setup` multiplas vezes no mesmo servidor deve resultar no mesmo estado final sem erros, sem duplicacao de blocos de configuracao e sem gerar novos certificados desnecessariamente.

## Criterios de Aceitacao
- **AC-001**: `curl -s http://<host>/api/health` retorna `200 OK` com body JSON `{"status":"ok"}` (proxy para API funcionando)
- **AC-002**: `curl -s http://<host>/` retorna `200 OK` com o `index.html` do portal React (frontend estatico servido)
- **AC-003**: `curl -s http://<host>/qualquer-rota` retorna `200 OK` com o `index.html` (SPA fallback funcionando)
- **AC-004**: Em instalacao com dominio, `curl -I https://<dominio>/` retorna `200 OK` e o header `Strict-Transport-Security` esta presente
- **AC-005**: Em instalacao com dominio, `curl -I http://<dominio>/` retorna `301 Moved Permanently` redirecionando para HTTPS
- **AC-006**: `nginx -t` retorna exit code 0 apos a instalacao (configuracao valida)
- **AC-007**: Executar `nginx_setup` duas vezes nao duplica blocos no arquivo de configuracao e nao retorna erros

## Out of Scope (esta feature)
- Configuracao de load balancing ou multiplas instancias da API
- WAF (Web Application Firewall) ou rate limiting no nivel do Nginx
- Configuracao de CDN ou cache de borda (CloudFlare, etc.)
- Suporte a wildcards SSL ou multi-dominio
- HTTP/2 Push ou configuracoes avancadas de performance do Nginx
- Monitoramento ou alertas de expiracao de certificado alem do log

## Dependencias
- `frontend-setup` concluida: diretorio `/opt/fraghub/portal/dist/` existindo com `index.html`
- `api-setup` concluida: API Node.js rodando e respondendo em `localhost:3000/health`
- UFW configurado pelo `cli-installer` permitindo portas 80 e 443
- `apt-get` com acesso a internet para instalar `nginx` e `certbot`

## Riscos Iniciais
- **DNS nao propagado**: certbot falha silenciosamente se o dominio nao resolve para o IP do servidor; installer deve detectar e cair no fallback HTTP
- **Conflito com Nginx pre-existente**: servidor pode ter Nginx instalado com configuracao customizada; installer deve detectar e avisar antes de sobrescrever
- **Renovacao do certificado**: se o timer systemd nao estiver ativo, o certificado expira em 90 dias; validar que o timer esta `enabled` apos instalacao
- **Caminho do dist/**: se o `frontend-setup` mudar o diretorio de saida do Vite, o template do Nginx precisa ser atualizado em sincronia
