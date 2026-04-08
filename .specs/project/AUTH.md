# Sistema de Autenticação FragHub

## Visão geral

FragHub usa um sistema de auth em duas etapas:
1. **Criar conta**: via Google OAuth ou Email/Senha
2. **Vincular Steam**: obrigatório apenas para jogar

---

## Métodos de login

### Google OAuth
- Login com um clique
- Obtém: email, nome, avatar
- `auth_provider = 'google'`
- `google_id` armazenado

### Email/Senha (local)
- Cadastro tradicional
- Senha hashada com bcrypt (12 rounds)
- Verificação de email (opcional v1.0)
- `auth_provider = 'local'`

---

## Vinculação Steam

### Fluxo
1. Usuário logado clica em "Vincular Steam"
2. Redirect para Steam OpenID
3. Steam retorna `steamid64`
4. Portal salva: `steamid64`, `steam_name`, `steam_avatar`
5. Usuário pode jogar

### Regras
- Steam é **obrigatória** para: entrar na queue, jogar partidas
- Steam é **opcional** para: ver leaderboard, perfis, configurações
- Um `steamid64` só pode ser vinculado a **uma conta**
- Admin pode desvincular Steam de um usuário

---

## Níveis de acesso

### Visitante (sem login)
- Ver leaderboard público
- Ver perfis públicos
- Ver partidas recentes
- Ver estatísticas gerais

### Usuário logado (sem Steam)
- Tudo de visitante, mais:
- Editar próprio perfil
- Configurações de conta
- Receber notificações
- ❌ Não pode: jogar, entrar na queue

### Jogador (Steam vinculada)
- Tudo de usuário, mais:
- Entrar na queue de matchmaking
- Jogar partidas
- Ver próprias stats detalhadas
- Histórico de partidas
- Ver ELO e nível

### Admin
- Tudo de jogador, mais:
- Criar/editar/banir usuários
- Gerenciar servidores (RCON web)
- Ver logs do sistema
- Configurar plugins
- Promover/rebaixar usuários
- Pode jogar (se tiver Steam vinculada)

---

## Modelo de dados

```sql
CREATE TABLE users (
  id              CHAR(36) PRIMARY KEY,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NULL,
  name            VARCHAR(100) NOT NULL,
  avatar_url      VARCHAR(500) NULL,
  
  -- Auth provider
  auth_provider   ENUM('local', 'google') NOT NULL DEFAULT 'local',
  google_id       VARCHAR(255) NULL,
  
  -- Role e status
  role            ENUM('player', 'admin') NOT NULL DEFAULT 'player',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      CHAR(36) NULL REFERENCES users(id),
  
  -- Steam (vinculado depois)
  steamid64       VARCHAR(20) NULL UNIQUE,
  steam_name      VARCHAR(100) NULL,
  steam_avatar    VARCHAR(500) NULL,
  steam_linked_at TIMESTAMP NULL,
  
  -- Gaming stats
  elo_rating      INT NOT NULL DEFAULT 1000,
  games_played    INT NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at   TIMESTAMP NULL,
  
  INDEX idx_steamid (steamid64),
  INDEX idx_elo (elo_rating DESC)
);
```

---

## Sessões (JWT)

### Access Token
- Duração: 15 minutos
- Payload: `{ userId, role, steamid64 }`
- Enviado em: `Authorization: Bearer <token>`

### Refresh Token
- Duração: 7 dias
- Armazenado em: httpOnly cookie
- Usado para renovar access token

### Cookies
```
Set-Cookie: refresh_token=xxx; HttpOnly; Secure; SameSite=Strict; Path=/api/auth
```

---

## Admin: criar conta manualmente

Admin pode criar conta para jogadores:

```
POST /api/admin/users
{
  "email": "amigo@email.com",
  "name": "Nome do Amigo",
  "password": "senhaTemporaria123",  // ou gerada automaticamente
  "role": "player"
}
```

- Jogador recebe email com credenciais (ou admin passa pessoalmente)
- Jogador ainda precisa vincular Steam para jogar

---

## Endpoints de auth

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Cadastro local |
| POST | `/api/auth/login` | Login local |
| GET | `/api/auth/google` | Início OAuth Google |
| GET | `/api/auth/google/callback` | Callback Google |
| GET | `/api/auth/steam` | Início vinculação Steam |
| GET | `/api/auth/steam/callback` | Callback Steam |
| POST | `/api/auth/refresh` | Renovar tokens |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Dados do usuário atual |
