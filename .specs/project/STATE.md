# FragHub State

> Registro de decisões e estado atual do projeto

## Decisões tomadas

### Stack e arquitetura

| Decisão | Escolha | Data | Rationale |
|---------|---------|------|-----------|
| Suporte a jogos | CS2 + CS:GO Legacy | 2026-04-08 | Maximizar alcance da comunidade |
| Base de servidor | LinuxGSM | 2026-04-08 | Já resolve install/update/monitor |
| Banco de dados | MariaDB | 2026-04-08 | Open source, compatível MySQL |
| Framework CS2 | CounterStrikeSharp | 2026-04-08 | Padrão da comunidade |
| Framework CS:GO | SourceMod | 2026-04-08 | Padrão estabelecido |
| Match system CS2 | MatchZy (original) | 2026-04-08 | Mais simples, suficiente |
| Match system CS:GO | Get5 | 2026-04-08 | Padrão para competitivo |
| Admin CS2 | CS2-SimpleAdmin | 2026-04-08 | Mais completo, MySQL |
| Admin CS:GO | SourceBans++ | 2026-04-08 | Web panel incluso |
| Skins CS2 | WeaponPaints | 2026-04-08 | Mais popular |
| Skins CS:GO | Weapons & Knives | 2026-04-08 | Padrão |

### Autenticação

| Decisão | Escolha | Data | Rationale |
|---------|---------|------|-----------|
| Métodos de login | Google OAuth + Email/Senha | 2026-04-08 | Flexibilidade |
| Vinculação Steam | Separada do login | 2026-04-08 | Conta primeiro, Steam depois |
| Steam obrigatória | Só para jogar | 2026-04-08 | Pode navegar sem Steam |
| Admin criar contas | Sim | 2026-04-08 | Útil para adicionar amigos |
| Sessões | JWT (access + refresh) | 2026-04-08 | Stateless, escalável |

### Sistema de níveis

| Decisão | Escolha | Data | Rationale |
|---------|---------|------|-----------|
| Sistema de ranking | Níveis 1-10 (estilo Faceit) | 2026-04-08 | Familiar, visual |
| Faixas de ELO | Baseado na Faceit | 2026-04-08 | Referência do print |
| Formato da tag | `[6]` (só número) | 2026-04-08 | Clean, simples |
| Tag de admin | `[ADMIN]` sempre | 2026-04-08 | Prioridade sobre nível |
| ELO inicial | 1000 (Nível 4) | 2026-04-08 | Meio da tabela |
| Algoritmo | Glicko-2 simplificado | 2026-04-08 | Mais preciso que ELO puro |

### Plugins e features

| Decisão | Escolha | Data | Rationale |
|---------|---------|------|-----------|
| Demo recording | Automático | 2026-04-08 | Essencial para disputas |
| Tags in-game | Plugin customizado | 2026-04-08 | Integração com API |
| Discord integration | Webhooks | 2026-04-08 | Notificações de partida |

---

## Questões em aberto

| Questão | Status | Notas |
|---------|--------|-------|
| Domínio (fraghub.gg?) | Pendente | Verificar disponibilidade |
| Decay de ELO | v2.0 | -25/semana após 30 dias inativo |
| Anti-smurf | v2.0 | Verificação de horas/Prime |
| Mobile app | v2.0+ | React Native |

---

## Histórico de sessões

### 2026-04-08 — Sessão inicial
- Definido stack completo CS2 + CS:GO
- Sistema de auth (Google/Email + Steam)
- Sistema de níveis 1-10 baseado na Faceit
- Tags in-game: `[N]` para nível, `[ADMIN]` para admins
- Criados specs: CONSTITUTION, PROJECT, STACK, LEVELS, AUTH, ROADMAP, DEPENDENCIES

---

## Próximos passos

1. **Specify**: Feature "CLI Installer" (wizard interativo)
2. **Plan**: Arquitetura detalhada do installer
3. **Implement**: Começar v0.1

---

## Contato

- **Autor**: Guilherme Cordeiro
- **GitHub**: @ghcordeiro
