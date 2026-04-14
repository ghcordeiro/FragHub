# Phase 3: v0.3 — API backend — SUMMARY (In Progress)

**Status:** 🔄 In progress — 4/5 features validated, 1 pending validation

## Objective

Complete the REST API layer with authentication, Steam integration, player management, and match webhook handling.

## What Has Been Built

### ✅ api-setup
- Node.js 20 + Express + TypeScript + Knex
- Health check endpoint (`GET /api/health`)
- Systemd service (`fraghub-api.service`)
- Environment validation via zod
- Database migrations framework

**Validation Status:** CTO check (2026-04-13)

### ✅ auth-api
- Google OAuth 2.0 flow
- Email/password registration and login
- JWT tokens (access + refresh)
- Token rotation and reuse detection
- Role-based access control (user, admin)
- Rate limiting on auth endpoints
- Refresh token persistence in database

**Validation Status:** ✅ Approved (2026-04-13)

**Evidence:**
```
cd services/fraghub-api && npm run build && npm test && npm run lint
Results: tsc OK, Jest OK, ESLint OK
```

### ✅ steam-integration
- Steam OpenID authentication flow
- Separate account linking (not part of login)
- `GET /api/player/:steamid` public endpoint
- Cache and rate limiting on public endpoint
- Steam ID validation and duplicate detection
- Link/unlink endpoints for authenticated users

**Validation Status:** ✅ Approved (2026-04-13)

**Evidence:**
- Parser tests for Steam OpenID responses
- Rate limiter tests (10/min on public endpoint)
- E2E flow test with mock Steam API

### ✅ players-api
- `GET /api/players` — paginated public listing
- `GET /api/players/:id` — individual player profile
- `PATCH /api/players/me` — authenticated user profile updates
- Ban status checks (banned users return 404 on public endpoints)
- Field projection (no sensitive data in public endpoints)
- Indexing on `steam_id` and `banned_at` for query performance

**Validation Status:** ✅ Approved (2026-04-13)

**Evidence:**
- Schema migration `005_players_api_users_ban_elo.sql` applied
- Endpoint tests covering all CRUD operations
- Ban visibility tests (authenticated vs. public)

### 🔄 matches-api (PENDING VALIDATION)
- Webhook endpoint `POST /api/matches/webhook` with secret validation
- MatchZy payload parser (map_result format)
- Get5 payload parser (series_end + map_result formats)
- Automatic duplicate detection (UNIQUE webhook_source + external_match_id)
- Stats persistence to database (migration 006)
- Stub ELO updater (logs, ready for future implementation)
- Discord notifications (optional, non-blocking)
- Public read endpoints: `GET /api/matches`, `GET /api/matches/:id`, `GET /api/players/:id/matches`

**Validation Status:** 🔄 Implement done, **Validate PENDING**

**What's needed to close validation gate:**
1. Apply migration `006_matches_api_schema.sql` via `database-baseline.sh`
2. Verify `WEBHOOK_SECRET` (≥32 chars) in `.env`
3. Smoke test:
   ```bash
   curl -X POST http://localhost:3000/api/matches/webhook \
     -H "x-webhook-secret: <WEBHOOK_SECRET>" \
     -H "Content-Type: application/json" \
     -d '{"event":"map_result",...}'
   ```
4. Confirm 200 OK + match saved to database
5. Update `.specs/features/matches-api/validation.md` with E2E results
6. Provide explicit approval

**Evidence so far:**
- Code: `.services/fraghub-api/src/routes/matches.ts` + services
- Unit tests: `matchWebhookPayloads.test.ts` (MatchZy/Get5 parser validation)
- Build/lint/test: All green (tsc OK, Vitest OK, ESLint OK)

## Key Decisions

- JWT with short-lived access tokens + refresh token rotation for security
- Steam integration as separate linking flow (accounts can exist without Steam)
- Webhook secret validation (401 on missing/invalid)
- Duplicate match detection via (webhook_source, external_match_id) composite unique constraint
- Discord notifications optional (doesn't block webhook 200 response)
- ELO updates as stub (pluggable for future implementation)

## Completion Criteria

- [ ] All 5 features have Implement gate approved ← 4/5 done, 1 in progress
- [ ] All 5 features have Validate gate approved ← **Waiting on matches-api E2E test**
- [x] `npm run build` succeeds
- [x] `npm test` passes
- [x] `npm run lint` passes
- [ ] Live webhook test on server (pending)
- [ ] Human approval (pending)

## Artifacts

**Code:**
- `services/fraghub-api/src/routes/` — all 5 feature routes
- `services/fraghub-api/src/middleware/` — auth, rate limiting
- `services/fraghub-api/src/config/` — env validation
- `scripts/installer/sql/database/` — migrations 004, 005, 006

**Tests:**
- `services/fraghub-api/src/middleware/auth.test.ts`
- `services/fraghub-api/src/services/matchWebhookPayloads.test.ts`

**Specs:**
- `.specs/features/api-setup/`
- `.specs/features/auth-api/`
- `.specs/features/steam-integration/`
- `.specs/features/players-api/`
- `.specs/features/matches-api/`

**ADRs:**
- `docs/adr/0006-auth-api-jwt-refresh.md`
- `docs/adr/0007-steam-integration-openid-public-player.md`
- `docs/adr/0008-matches-api-schema-webhook.md`

## Session Info

**Phase Status:** In progress — awaiting final validation gate on matches-api

**Next Action:** Complete E2E smoke test for matches-api webhook, get approval, then proceed to Phase 4 (frontend portal)

**Updated:** 2026-04-13 (GSD companion layer created)
