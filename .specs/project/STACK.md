# FragHub Stack Técnico

## Visão geral

FragHub suporta **CS2** e **CS:GO Legacy** simultaneamente, com plugins equivalentes em cada plataforma e um portal web unificado.

---

## CS2 Stack

### Framework
- **MetaMod:Source** (latest)
- **CounterStrikeSharp** (.NET 8)

### Plugins obrigatórios

| Plugin | Função | Repositório |
|--------|--------|-------------|
| **MatchZy** | Sistema de partidas, knife round, ready, demos | [shobhit-pathak/MatchZy](https://github.com/shobhit-pathak/MatchZy) |
| **CS2-SimpleAdmin** | Admin, bans, kicks, mutes, menu | [daffyyyy/CS2-SimpleAdmin](https://github.com/daffyyyy/CS2-SimpleAdmin) |
| **WeaponPaints** | Skins de armas, facas, luvas | [Nereziel/cs2-WeaponPaints](https://github.com/Nereziel/cs2-WeaponPaints) |
| **cs2-demo-recorder** | Gravação automática de demos | [Kandru/cs2-demo-recorder](https://github.com/Kandru/cs2-demo-recorder) |
| **FragHub-Tags** | Tags de nível/admin (plugin customizado) | Desenvolvido internamente |

### Plugins opcionais

| Plugin | Função | Repositório |
|--------|--------|-------------|
| CSSharp-Fixes | Correções de bugs do CS2 | [darkerz7/CSSharp-Fixes](https://github.com/darkerz7/CSSharp-Fixes) |
| AFKManager | Kick automático de AFK | Comunidade |
| GameBanFix | Corrige bug de ban ao conectar | [Cruze03/GameBanFix](https://github.com/Cruze03/GameBanFix) |

---

## CS:GO Legacy Stack

### Framework
- **MetaMod:Source** (1.11+)
- **SourceMod** (1.11+)

### Plugins obrigatórios

| Plugin | Função | Repositório |
|--------|--------|-------------|
| **Get5** | Sistema de partidas, knife, ready, demos | [splewis/get5](https://github.com/splewis/get5) |
| **SourceBans++** | Admin, bans, kicks, mutes, web panel | [sbpp.dev](https://sbpp.dev) |
| **Weapons & Knives** | Skins de armas e facas | AlliedMods |
| **Gloves** | Skins de luvas | AlliedMods |
| **RankMe (Kento)** | Stats e ranking | [rogeraabbccdd/Kento-Rankme](https://github.com/rogeraabbccdd/Kento-Rankme) |
| **FragHub-Tags** | Tags de nível/admin (plugin customizado) | Desenvolvido internamente |

### Plugins opcionais

| Plugin | Função | Repositório |
|--------|--------|-------------|
| Splewis Practice | Modo treino de granadas | [splewis/csgo-practice-mode](https://github.com/splewis/csgo-practice-mode) |
| AFKManager | Kick automático de AFK | AlliedMods |

---

## Portal Web Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **ORM**: Prisma (ou Knex.js)
- **Auth**: Passport.js (Google, Steam strategies)
- **Sessões**: JWT (access + refresh tokens)
- **Validação**: Zod

### Frontend
- **Framework**: React 18+
- **Linguagem**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State**: Zustand ou React Query
- **Build**: Vite

### Infraestrutura
- **Banco de dados**: MariaDB 10.6+ / MySQL 8.0+
- **Reverse proxy**: Nginx
- **SSL**: Let's Encrypt (certbot)
- **Process manager**: PM2 ou systemd
- **Firewall**: UFW

---

## Banco de dados compartilhado

O portal web e os plugins de ambos os jogos compartilham o mesmo banco MariaDB:

```
fraghub_db
├── users              # Contas do portal
├── matches            # Partidas (CS2 + CS:GO)
├── match_players      # Stats por partida
├── player_stats       # Stats agregadas
├── bans               # Bans sincronizados
└── servers            # Servidores registrados
```

---

## Plugin FragHub-Tags (customizado)

Plugin que consulta a API do portal e aplica tags in-game baseadas no nível/role.

### Fluxo
1. Jogador conecta no servidor
2. Plugin faz request: `GET /api/player/{steamid64}`
3. API retorna: `{ level: 6, role: "player", elo: 1322 }`
4. Plugin aplica clan tag: `[6]` ou `[ADMIN]`

### Versões
- **CS2**: CounterStrikeSharp (.NET 8)
- **CS:GO**: SourceMod (SourcePawn)
