# auth-api — Plan

> Fase **Plan** (SDD). Requisitos normativos: `spec.md`. Decisão arquitetural: `docs/adr/0006-auth-api-jwt-oauth-refresh.md`. Diagramas: `docs/architecture/auth-api-context-l1.md`, `docs/architecture/auth-api-container-l2.md`.

## 1. Objectivo

Entregar autenticação REST em Express (TypeScript strict) sobre o scaffold **api-setup**: registro/login email+senha, Google OAuth, JWT access/refresh com rotação, middlewares de auth e role, rate limiting, logout, criação de utilizador por admin — alinhado à Constituição e ao schema MariaDB após migrations **AUTHAPI-REQ-013**.

## 2. Componentes (alto nível)

| Componente | Responsabilidade | Ficheiros previstos (indicativos) |
|------------|------------------|-----------------------------------|
| Rotas HTTP `/auth/*` | Registo, login, refresh, logout, OAuth, admin create-user | `src/routes/auth.ts` (ou divisão por domínio) |
| Serviço de tokens | Emitir/validar JWT access e refresh; hashing SHA-256 para persistência | `src/services/tokenService.ts` |
| Serviço OAuth Google | Montar URL de autorização, trocar code, obter perfil | `src/services/googleOAuthService.ts` |
| Serviço de utilizadores | CRUD mínimo sobre Knex (`users`, `refresh_tokens`) | `src/services/userService.ts` |
| Middlewares | `authMiddleware`, `requireRole` | `src/middleware/auth.ts` |
| Validação env startup | zod para variáveis obrigatórias | `src/config/env.ts` |
| Migrations SQL | `google_id`, `refresh_tokens` | `scripts/installer/sql/database/00x_*.sql` + registo em `schema_migrations` |
| Testes | Unitários middlewares (**AUTHAPI-NFR-005**) | `src/**/*.test.ts` ou `tests/unit/…` (convencionar com repo) |

## 3. Integração com o projeto existente

- **Entrada HTTP:** montar router de auth em `src/index.ts` (prefixo `/auth`), sem quebrar `GET /health`.
- **Knex:** reutilizar instância em `src/db/index.ts`; queries em serviços.
- **Installer:** novas migrations no mesmo diretório que `001_create_users.sql` para `database-baseline.sh` as aplicar em instalações novas; ambientes já provisionados precisam de passo de migration (documentar em `validation.md` da feature).

## 4. Ordem de implementação sugerida

1. Migrations SQL + tipos TS para `users` estendido e `refresh_tokens`.
2. `env` validation + dependências npm (`bcrypt`, `jsonwebtoken`, `express-rate-limit`, cliente OAuth — ex.: `google-auth-library` ou fluxo manual com `fetch`).
3. Serviços token + user + refresh persistence.
4. Rotas register/login/refresh/logout + limiters.
5. Middlewares + rota de exemplo protegida (smoke interno ou rota mínima `GET /auth/me` se adicionada à spec — *opcional fora do spec atual*).
6. Google OAuth + state CSRF.
7. Rota admin create-user.
8. Testes unitários dos middlewares.

## 5. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Token na URL pós-OAuth | TTL curto na spec; frontend deve consumir imediatamente; considerar evolução futura para fragment ou POST message |
| Corrida em refresh | Transação DB na rotação (REQ + ADR) |
| Enumeracao de emails | Mensagens genéricas (NFR-002) |

## 6. Fora deste plano

Ver **Out of Scope** em `spec.md` (Steam, 2FA, forgot password, etc.).

## 7. Critérios de saída da fase Implement

Todos os **AC-001..AC-011** em `spec.md` com evidência em `validation.md`, mais revisão de segurança básica (cookies, secrets, logs sem passwords).
