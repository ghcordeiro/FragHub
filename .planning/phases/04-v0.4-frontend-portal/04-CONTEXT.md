# Phase 4: v0.4 — Frontend portal - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning (autonomous mode)
**Mode:** Auto-generated (autonomous workflow)

<domain>
## Phase Boundary

Interface web básica com login, perfis e leaderboard. Usuário consegue logar e ver próprio perfil (completion criteria).

### Scope

5 features in this phase:

1. **frontend-setup** — React 18+ + TypeScript + Vite, Zustand, React Router v6
   - Project structure, build tooling, dev/prod configuration
   - Spec: `.specs/features/frontend-setup/`

2. **nginx-ssl** — Reverse proxy Nginx, SSL certbot, security headers
   - Production deployment layer, HTTPS, headers
   - Spec: `.specs/features/nginx-ssl/`

3. **auth-ui** — Login, Registro, Google OAuth, vinculação Steam, gestão de sessão
   - Auth pages, form validation, session persistence
   - Spec: `.specs/features/auth-ui/`

4. **player-profile-ui** — Perfil público, stats, histórico, badge nível 1-10
   - User profile page, stats display, level badge rendering
   - Spec: `.specs/features/player-profile-ui/`

5. **leaderboard-ui** — Ranking público por ELO, paginado, filtros
   - Leaderboard page, sorting, pagination, filtering
   - Spec: `.specs/features/leaderboard-ui/`

</domain>

<decisions>
## Implementation Decisions

### Framework Stack
- **React 18+** — Modern component model, hooks, TypeScript support
- **TypeScript** — Type safety for all components and state management
- **Vite** — Fast build tool, dev server, modern tooling
- **Zustand** — Lightweight state management (vs Redux, simpler for MVP phase)
- **React Router v6** — Modern routing, nested routes, data loaders

### Build & Deployment
- **Node.js 20 LTS** — Match backend API server version
- **Nginx** — Reverse proxy, static file serving, SSL termination
- **Certbot** — Let's Encrypt SSL certificate automation
- **Security headers** — HSTS, CSP, X-Frame-Options (spec in nginx-ssl)

### Reusable Patterns from v0.3 (API Backend)

- **Auth middleware** — JWT validation on API calls (already implemented in auth-api)
- **Environment config** — Use `.env.local` for API_URL, OAuth endpoints
- **API integration** — Axios or fetch with error handling
- **Session persistence** — localStorage for tokens (with httpOnly flags consideration)

### Design Decisions (TBD during Planning)

- **UI/UX framework** — Will be locked in `/gsd-ui-phase 4` (UI-SPEC.md generation)
- **Component library** — TBD (Shadcn, Material-UI, Tailwind components, etc.)
- **Form handling** — React Hook Form vs Formik vs custom
- **API client** — Axios vs fetch (wrapper)

</decisions>

<code_context>
## Existing Code Insights

### Backend APIs Available (Phase 3 — v0.3)

- `GET /api/health` — Health check
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`
- `GET /auth/google`, callback flow for OAuth
- `POST /auth/steam/link`, `DELETE /auth/steam/link`
- `GET /api/player/:steamid` — Public player profile
- `GET /api/players`, `GET /api/players/:id`, `PATCH /api/players/me`
- `GET /api/matches`, `GET /api/matches/:id`, `GET /api/players/:id/matches`

### Tech Stack (Phase 1-3)

- **Backend:** Node.js 20, Express, TypeScript, Knex (MariaDB)
- **Game servers:** CS2 (CounterStrikeSharp) + CS:GO (SourceMod)
- **Database:** MariaDB, migrations via Knex
- **Deployment:** systemd services, Nginx reverse proxy

### Project Structure (for reference)

```
services/
├── fraghub-api/          # v0.3 API (TypeScript)
│   ├── src/
│   │   ├── routes/       # auth, steam, players, matches, admin
│   │   ├── middleware/   # auth, rate limits
│   │   ├── services/     # business logic
│   │   └── config/       # env validation, database
│   └── package.json

fraghub-web/             # NEW — Phase 4 frontend
  ├── src/
  │   ├── components/
  │   ├── pages/
  │   ├── hooks/
  │   ├── stores/         # Zustand state
  │   ├── api/            # API client
  │   └── types/
  ├── public/
  ├── vite.config.ts
  └── package.json
```

</code_context>

<specifics>
## Specific Requirements

### Phase Completion Criteria (from ROADMAP)

- [ ] Usuário consegue logar
- [ ] Usuário consegue ver próprio perfil
- [ ] Leaderboard carrega e exibe ranking
- [ ] Tags/badges de nível renderizam corretamente
- [ ] Sessão persiste entre refreshes
- [ ] Nginx reverse proxy redireciona para React app
- [ ] SSL certificate obtido via certbot
- [ ] Zero auth-related console errors
- [ ] Mobile-responsive (basic, MVP-level)

### Non-Functional Requirements (Draft)

- Performance: First Contentful Paint < 2s on 4G
- Accessibility: WCAG 2.1 AA (basic, TBD in UI-SPEC)
- Browser support: Modern browsers (Chrome, Firefox, Safari, Edge)
- SEO: Meta tags, Open Graph (TBD)

### Integration Points with v0.3 API

1. **Auth flow:** Frontend redirects to `/auth/google`, handles callback, stores JWT
2. **Session:** Access token in headers, refresh token rotation
3. **Player data:** Fetch from `GET /api/players/:id`, cache in Zustand
4. **Leaderboard:** Poll `GET /api/players?page=1&limit=50`, sort by ELO
5. **Steam linking:** Redirect to `/auth/steam/link`, update profile UI on success

</specifics>

<deferred>
## Deferred Ideas

- Advanced filtering/search on leaderboard (implement after MVP)
- Player match history UI (separate phase, v0.5+)
- Real-time updates (WebSockets — v0.5 or later)
- Dark mode toggle (nice-to-have, v1.0+)
- Mobile native app (v2.0+)

</deferred>
