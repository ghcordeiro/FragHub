# FragHub Roadmap

## Milestones

### v0.1 — Instalador básico
> Servidor funcionando com plugins essenciais

- [x] Script de instalação interativo (bash)
- [x] Detecção de OS, RAM, disco
- [x] Instalação LinuxGSM
- [x] CS2: MetaMod + CounterStrikeSharp + MatchZy
- [x] CS:GO: MetaMod + SourceMod + Get5
- [x] Serviços systemd básicos
- [x] UFW configurado automaticamente

**Critério de conclusão**: servidor CS2 e CS:GO rodando, partidas funcionando

---

### v0.2 — Banco de dados e plugins
> Persistência de dados e plugins completos

- [ ] Instalação MariaDB
- [ ] Schema inicial (users, matches, stats)
- [ ] CS2: SimpleAdmin, WeaponPaints, demo-recorder
- [ ] CS:GO: SourceBans++, Weapons&Knives, RankMe
- [ ] Backup automático do banco
- [ ] Migrações versionadas

**Critério de conclusão**: stats salvando no banco, bans sincronizados

---

### v0.3 — API backend
> API REST para o portal

- [ ] Setup Node.js + Express + TypeScript
- [ ] Autenticação: Google OAuth + Email/Senha
- [ ] Vinculação Steam OpenID
- [ ] CRUD usuários
- [ ] Endpoints de partidas e stats
- [ ] Endpoint `/api/player/{steamid}` para plugins
- [ ] JWT (access + refresh tokens)

**Critério de conclusão**: login funcionando, API respondendo

---

### v0.4 — Frontend portal
> Interface web básica

- [ ] Setup React + TypeScript + Vite
- [ ] Páginas: Home, Login, Registro
- [ ] Perfil do jogador (stats, histórico)
- [ ] Leaderboard (ranking por ELO)
- [ ] Detalhes de partida
- [ ] Vinculação Steam na UI

**Critério de conclusão**: usuário consegue logar e ver próprio perfil

---

### v0.5 — Sistema de matchmaking
> Queue e balanceamento de times

- [ ] Fila de matchmaking no portal
- [ ] Algoritmo de balanceamento por ELO
- [ ] Sistema de níveis 1-10
- [ ] Map veto na UI
- [ ] Notificação quando partida pronta
- [ ] Plugin FragHub-Tags (CS2 + CS:GO)
- [ ] Discord webhook: partida iniciada/finalizada

**Critério de conclusão**: queue funcionando, times balanceados, tags in-game

---

### v0.6 — Painel admin
> Gerenciamento completo

- [ ] Dashboard admin
- [ ] CRUD usuários (criar, editar, banir)
- [ ] Gerenciar servidores
- [ ] RCON via web
- [ ] Logs de ações
- [ ] Configuração de plugins via UI

**Critério de conclusão**: admin consegue gerenciar tudo pela web

---

### v1.0 — Produção
> Release público

- [ ] Documentação completa
- [ ] Testes automatizados (unit + e2e)
- [ ] Comando `fraghub upgrade`
- [ ] CI/CD (GitHub Actions)
- [ ] Security audit
- [ ] README, CONTRIBUTING, LICENSE
- [ ] Website/landing page

**Critério de conclusão**: projeto pronto para uso público

---

## Futuro (v2.0+)

- [ ] Sistema anti-smurf (verificação de horas, Prime)
- [ ] Demo viewer no browser
- [ ] Heatmaps de posicionamento
- [ ] Sistema de seasons (rankings sazonais)
- [ ] Discord bot completo (queue via Discord)
- [ ] Mobile app (React Native)
- [ ] Múltiplos servidores (cluster)
- [ ] Decay de ELO por inatividade

---

## Legenda

- [ ] Não iniciado
- [~] Em progresso
- [x] Concluído
