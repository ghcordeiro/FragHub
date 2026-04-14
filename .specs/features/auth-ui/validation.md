# auth-ui — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Login page (email/password)
- [x] Register page
- [x] Google OAuth flow
- [x] Steam linking page
- [x] Session management (JWT + refresh tokens)
- [x] Error feedback multi-provider
- [x] Redirect on unauthorized
- [x] Accessibility (WCAG 2.1 AA)
- [x] Mobile responsive

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | Login funciona (email/pass) | API `/auth/login` → JWT token — ✅ testado |
| AC-002 | Register funciona | API `/auth/register` → account criada — ✅ testado |
| AC-003 | Google OAuth flow | Redirect → Google → callback → session — ✅ integrado |
| AC-004 | Steam linking pós-login | `POST /auth/steam/link` → account.steam_id — ✅ integrado |
| AC-005 | Error messages claros | Multi-provider feedback (auth, network, server) — ✅ implementado |
| AC-006 | Session persistence | JWT em memory + refresh rotation — ✅ ativo |
| AC-007 | Redirect unauthorized | Protected routes → `/login` — ✅ middleware |

## Components

```
src/pages/
├── LoginPage.tsx
├── RegisterPage.tsx
├── SteamLinkPage.tsx
└── AuthCallback.tsx

src/hooks/
└── useAuth.ts (Zustand store)
```

## Status

**✅ VALIDADO** — autenticação frontend completa com segurança padrão.
