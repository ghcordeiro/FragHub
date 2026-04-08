# FragHub Dependencies

## Classificação

| Tipo | Descrição |
|------|-----------|
| 🟢 Auto | Instalado automaticamente pelo installer |
| 🟡 Setup | Requer input do usuário durante instalação |
| 🟠 Manual | Responsabilidade do usuário (pré-requisito) |
| ⚪ Opcional | Funcionalidade extra, não obrigatório |

---

## Dependências do sistema

| Dependência | Tipo | Versão | Notas |
|-------------|------|--------|-------|
| Ubuntu Server | 🟠 Manual | 22.04 ou 24.04 LTS | x86_64 apenas |
| Acesso root/sudo | 🟠 Manual | - | Para instalação inicial |
| Conexão internet | 🟠 Manual | - | Download de pacotes |
| Portas abertas | 🟠 Manual | Ver tabela abaixo | Firewall/roteador |

---

## Stack de servidor de jogos

### Base (ambos os jogos)

| Dependência | Tipo | Fonte | Notas |
|-------------|------|-------|-------|
| LinuxGSM | 🟢 Auto | linuxgsm.sh | Gerenciamento base |
| SteamCMD | 🟢 Auto | Via LinuxGSM | Download dos jogos |
| lib32gcc-s1 | 🟢 Auto | apt | Dependência SteamCMD |
| lib32stdc++6 | 🟢 Auto | apt | Dependência SteamCMD |

### CS2

| Dependência | Tipo | Fonte | Notas |
|-------------|------|-------|-------|
| CS2 Dedicated Server | 🟢 Auto | Steam (app 730) | ~35GB |
| MetaMod:Source | 🟢 Auto | GitHub releases | Framework |
| CounterStrikeSharp | 🟢 Auto | GitHub releases | .NET 8 runtime |
| .NET 8 Runtime | 🟢 Auto | Microsoft repos | Para CSSharp |
| MatchZy | 🟢 Auto | GitHub releases | Sistema de partidas |
| CS2-SimpleAdmin | 🟢 Auto | GitHub releases | Admin/bans |
| WeaponPaints | 🟢 Auto | GitHub releases | Skins |
| cs2-demo-recorder | 🟢 Auto | GitHub releases | Demos |
| FragHub-Tags | 🟢 Auto | Interno | Tags de nível |

### CS:GO Legacy

| Dependência | Tipo | Fonte | Notas |
|-------------|------|-------|-------|
| CS:GO Dedicated Server | 🟢 Auto | Steam (app 740) | ~25GB |
| MetaMod:Source | 🟢 Auto | GitHub releases | Framework |
| SourceMod | 🟢 Auto | sourcemod.net | Framework plugins |
| Get5 | 🟢 Auto | GitHub releases | Sistema de partidas |
| SourceBans++ | 🟢 Auto | sbpp.dev | Admin/bans |
| Weapons & Knives | 🟢 Auto | AlliedMods | Skins |
| RankMe (Kento) | 🟢 Auto | GitHub releases | Stats |
| FragHub-Tags | 🟢 Auto | Interno | Tags de nível |

---

## Stack do portal web

| Dependência | Tipo | Fonte | Notas |
|-------------|------|-------|-------|
| Node.js | 🟢 Auto | NodeSource | v20 LTS |
| npm | 🟢 Auto | Com Node.js | Package manager |
| MariaDB | 🟢 Auto | apt | 10.6+ |
| Nginx | 🟢 Auto | apt | Reverse proxy |
| PM2 | 🟢 Auto | npm | Process manager |
| certbot | ⚪ Opcional | apt | SSL (se domínio) |

---

## Configurações do usuário

| Item | Tipo | Validação | Default |
|------|------|-----------|---------|
| Steam Web API Key | 🟡 Setup | Formato válido | Obrigatório |
| Server hostname | 🟡 Setup | String não vazia | `FragHub Server` |
| RCON password | 🟡 Setup | Min 8 chars | Gerado se vazio |
| Database password | 🟡 Setup | Min 8 chars | Gerado se vazio |
| Admin email | 🟡 Setup | Email válido | Obrigatório |
| Admin password | 🟡 Setup | Min 8 chars | Obrigatório |
| Domínio | ⚪ Opcional | FQDN válido | Nenhum (HTTP) |
| Discord Webhook | ⚪ Opcional | URL válida | Nenhum |
| Google OAuth credentials | ⚪ Opcional | Client ID/Secret | Nenhum |

---

## Portas

| Porta | Protocolo | Serviço | Obrigatória |
|-------|-----------|---------|-------------|
| 27015 | TCP + UDP | CS2/CS:GO Game Server | ✅ Sim |
| 27005 | UDP | CS2/CS:GO Client | ✅ Sim |
| 27020 | UDP | SourceTV | ⚪ Opcional |
| 3000 | TCP | API (interno) | 🔒 Localhost |
| 80 | TCP | HTTP (Nginx) | ✅ Sim |
| 443 | TCP | HTTPS (Nginx) | ⚪ Se SSL |
| 3306 | TCP | MariaDB | 🔒 Localhost |

---

## Regras UFW (auto-configuradas)

```bash
# Game servers
ufw allow 27015/tcp
ufw allow 27015/udp
ufw allow 27005/udp
ufw allow 27020/udp  # SourceTV

# Web
ufw allow 80/tcp
ufw allow 443/tcp  # Se SSL

# SSH (mantém acesso)
ufw allow 22/tcp

# Ativar
ufw enable
```

---

## Espaço em disco estimado

| Componente | Tamanho |
|------------|---------|
| CS2 Dedicated Server | ~35 GB |
| CS:GO Dedicated Server | ~25 GB |
| MariaDB (dados) | ~1 GB inicial |
| Node.js + dependências | ~500 MB |
| Demos (por partida) | ~50-100 MB |
| **Total mínimo** | **~65 GB** |
| **Recomendado** | **~100 GB** |

---

## RAM recomendada

| Configuração | RAM |
|--------------|-----|
| Apenas CS2 (10 slots) | 4 GB |
| Apenas CS:GO (10 slots) | 2 GB |
| CS2 + CS:GO + Portal | 8 GB |
| Produção recomendada | 16 GB |
