# 🚀 DEPLOYMENT GUIDE — FragHub v1.0

**Status:** Production Ready ✅  
**Version:** v1.0 (Complete)  
**Date:** 2026-04-14

---

## 📋 PRÉ-REQUISITOS

### Sistema Operacional
- [x] **Ubuntu 22.04 LTS** (ou 24.04 LTS)
- [x] Internet connectivity
- [x] Sudo access

### Hardware Mínimo
| Component | Mínimo | Recomendado |
|-----------|--------|-------------|
| RAM | 4 GB | 8-16 GB |
| Disk | 65 GB | 100 GB |
| CPU | 2 cores | 4+ cores |
| Network | 100 Mbps | 1 Gbps |

### Software
- [x] `git` (para clonar o repositório)
- [x] `sudo` (instalação requer permissões)
- [x] UFW (firewall — será configurado automaticamente)

---

## 🔧 PASSO 1: Preparar o Servidor

```bash
# 1. Atualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar git
sudo apt install -y git

# 3. Clonar o repositório
git clone https://github.com/ghcordeiro/FragHub.git
cd FragHub

# 4. Verificar branch main
git branch -a
git checkout main  # Garantir que está na branch main
```

---

## 📦 PASSO 2: Executar o Instalador

O instalador é **interativo** e guiará você através de todas as etapas.

```bash
# Rodar o instalador principal
bash scripts/installer/install.sh
```

### O que o instalador faz:

1. **Verificações Prévias**
   - OS version check
   - Disk space check
   - Required tools check
   - Network connectivity

2. **Banco de Dados**
   - Instala MariaDB 10.5+
   - Cria banco `fraghub_db`
   - Aplica migrations SQL
   - Configura backup diário

3. **API Backend**
   - Instala Node.js 20 LTS
   - Compila TypeScript
   - Configura systemd service
   - Health check

4. **Game Stack** (Opcional)
   - CS2 com CounterStrikeSharp
   - CS:GO com SourceMod
   - Plugins essenciais
   - Configuração automática

5. **Web Portal** (Opcional)
   - React frontend
   - Nginx reverse proxy
   - SSL com Certbot

---

## 🎮 PASSO 3: Configurar Game Servers (Opcional)

Se você quer rodar os servidores de jogo:

```bash
# O instalador perguntará:
# "Enable CS2 server? (y/n)"
# "Enable CS:GO server? (y/n)"
# "API URL? (default: http://localhost:3000)"
# "Webhook secret? (min 32 chars)"
```

### Depois da instalação:

```bash
# Verificar status dos serviços
systemctl status fraghub-api
systemctl status fraghub-cs2    # Se habilitado
systemctl status fraghub-csgo   # Se habilitado
systemctl status nginx          # Se habilitado
```

---

## 🌐 PASSO 4: Configurar Nginx e SSL (Recomendado)

Se você não configurou durante a instalação:

```bash
# Executar configurador Nginx
bash scripts/installer/nginx.sh
```

O script perguntará:
- Seu domínio (ex: fraghub.example.com)
- Email para certificado SSL
- Porta HTTP (default: 80)
- Porta HTTPS (default: 443)

### Após a configuração:

```bash
# Testar configuração Nginx
sudo nginx -t

# Reiniciar
sudo systemctl restart nginx

# Verificar certificado SSL
sudo certbot certificates
```

---

## ✅ PASSO 5: Validação Pós-Instalação

### 1. Verificar Serviços

```bash
# API
curl http://localhost:3000/api/health
# Response: {"status":"ok","db":"connected","uptime":XXX}

# Nginx (se instalado)
curl -I http://localhost
# Response: HTTP/1.1 200 OK

# Database
sudo mariadb -u fraghub -p -e "SELECT VERSION();"
```

### 2. Verificar Logs

```bash
# API logs
sudo journalctl -u fraghub-api -n 50 -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Game server logs (se instalado)
sudo tail -f /opt/fraghub/cs2/logs/console.log
```

### 3. Testars Endpoints da API

```bash
# Health
curl http://localhost:3000/api/health

# Criar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "name": "Admin"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'

# Listar jogadores
curl -X GET http://localhost:3000/api/players \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔐 PASSO 6: Configuração de Segurança

### Firewall (UFW)

```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Permitir portas de jogo (se instalado)
sudo ufw allow 27015:27030/udp  # CS servers

# Ver status
sudo ufw status
```

### Variáveis de Ambiente

```bash
# Editar .env
sudo nano /opt/fraghub/api/.env

# Preencher obrigatórios:
# DATABASE_URL=
# JWT_SECRET= (min 32 chars)
# WEBHOOK_SECRET= (min 32 chars)
# DISCORD_WEBHOOK_URL= (opcional)
# GOOGLE_OAUTH_CLIENT_ID= (opcional)
# GOOGLE_OAUTH_CLIENT_SECRET= (opcional)
```

### Certificado SSL

```bash
# Renovação automática (habilitada por default)
sudo systemctl status certbot.timer

# Testar renovação (dry-run)
sudo certbot renew --dry-run

# Certificado está em:
sudo ls -la /etc/letsencrypt/live/your-domain/
```

---

## 🆙 PASSO 7: Upgrades e Maintenance

### Fazer Upgrade

```bash
# Atualizar código
cd /path/to/FragHub
git pull origin main

# Rodar upgrade (com backup automático)
bash scripts/upgrade.sh
# Perguntará confirmação: "yes" para prosseguir
```

### Fazer Backup Manual

```bash
# Backup database
sudo mysqldump --single-transaction fraghub_db > backup_$(date +%Y%m%d).sql

# Backup files
sudo tar -czf backup_files_$(date +%Y%m%d).tar.gz \
  /opt/fraghub/api \
  /opt/fraghub/portal

# Backup completo com encriptação
sudo tar -czf - /opt/fraghub | sudo openssl enc -aes-256-cbc -salt > backup_$(date +%Y%m%d).tar.gz.enc
```

### Restaurar Backup

```bash
# Se upgrade falhou (rollback automático):
bash scripts/upgrade.sh --rollback

# Restaurar database manual:
sudo mariadb fraghub_db < backup_YYYYMMDD.sql
```

---

## 📊 MONITORAMENTO

### Health Check

```bash
# Script de monitoramento
bash scripts/health-check.sh

# Saída esperada:
# ✅ API running
# ✅ Database connected
# ✅ Nginx responding
# ✅ All services healthy
```

### Logs Importantes

```bash
# API erros
sudo journalctl -u fraghub-api -p err -n 20

# Database erros
sudo journalctl -u mariadb -p err -n 20

# System erros
sudo journalctl -p err -n 50 | grep fraghub
```

---

## 🐛 TROUBLESHOOTING

### API não inicia

```bash
# Verificar logs
sudo journalctl -u fraghub-api -n 50 -e

# Validar configuração
sudo cat /opt/fraghub/api/.env

# Testar database connection
sudo mariadb -u fraghub -p -e "SELECT 1;"

# Reiniciar
sudo systemctl restart fraghub-api
```

### Database não conecta

```bash
# Verificar status MariaDB
sudo systemctl status mariadb

# Verificar usuário fraghub
sudo mariadb -e "SELECT user, host FROM mysql.user WHERE user='fraghub';"

# Resetar password
sudo mariadb -e "ALTER USER 'fraghub'@'localhost' IDENTIFIED BY 'new_password';"
```

### Nginx não responde

```bash
# Verificar configuração
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/error.log

# Verificar porta 80/443
sudo netstat -tulpn | grep LISTEN

# Reiniciar
sudo systemctl restart nginx
```

---

## 📞 SUPORTE

### Verificações Iniciais
1. Todos os serviços estão rodando? (`systemctl status`)
2. Database está acessível? (`mariadb -u fraghub -p`)
3. Logs de erro? (`journalctl -p err`)
4. Firewall bloqueando? (`ufw status`)

### Reporte de Bugs
- GitHub Issues: https://github.com/ghcordeiro/FragHub/issues
- Documentação: https://github.com/ghcordeiro/FragHub/tree/main/docs

---

## ✨ NEXT STEPS

Após instalação bem-sucedida:

1. **Criar primeiro usuário admin**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@domain.com","password":"SecurePass123!","name":"Admin"}'
   ```

2. **Acessar portal**
   - http://localhost:3000 (local)
   - http://your-domain.com (público, se Nginx configurado)

3. **Configurar Discord webhooks** (opcional)
   - Criar webhook no Discord server
   - Adicionar URL em `/opt/fraghub/api/.env`

4. **Configurar Google OAuth** (opcional)
   - Criar app em Google Cloud Console
   - Adicionar credentials em `/opt/fraghub/api/.env`

5. **Testar fluxo completo**
   - Login → Profile → Leaderboard
   - Admin → Dashboard → Player Management

---

**Instalação completa! Aproveite o FragHub! 🎮**

_Para dúvidas ou problemas, veja docs/ ou abra uma issue no GitHub._
