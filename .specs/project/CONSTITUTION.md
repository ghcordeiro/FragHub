# FragHub Constitution

> Regras imutáveis do projeto. Mudanças aqui exigem consenso explícito.

## Identidade

- **Nome**: FragHub
- **Tagline**: All-in-one open source toolkit for CS2/CS:GO community servers
- **Licença**: GPL-3.0 (alinhado com ecossistema SourceMod)
- **Autor**: Guilherme Cordeiro (@ghcordeiro)

## Regras técnicas imutáveis

### Sistema operacional
- Ubuntu 22.04 LTS ou 24.04 LTS apenas
- Arquitetura x86_64 apenas
- Sem suporte Windows na v1.0

### Stack obrigatório
- **Gerenciamento de servidor**: LinuxGSM (base)
- **CS2**: MetaMod + CounterStrikeSharp (.NET 8)
- **CS:GO Legacy**: MetaMod + SourceMod
- **Banco de dados**: MariaDB 10.6+ ou MySQL 8.0+
- **Backend**: Node.js 20 LTS + Express
- **Frontend**: React 18+ + TypeScript
- **Autenticação**: Google OAuth + Email/Senha + Steam OpenID (vinculação)
- **Reverse proxy**: Nginx
- **Firewall**: UFW
- **SSL**: Let's Encrypt (via certbot, opcional)
- **Serviços**: systemd

### Padrões de código
- ShellCheck obrigatório para scripts bash
- TypeScript strict mode obrigatório
- ESLint + Prettier no frontend/backend
- UTF8MB4 para todas as tabelas MySQL
- Migrações de banco versionadas

### Segurança
- Nunca executar como root
- Senhas geradas automaticamente se não fornecidas
- RCON password obrigatório
- JWT para sessões (access + refresh tokens)
- Cookies httpOnly, secure, sameSite

### Arquitetura de auth
- Login: Google OAuth OU Email/Senha
- Steam: vinculação posterior (obrigatório para jogar)
- Roles: player, admin
- Steam obrigatória apenas para entrar na queue/jogar
