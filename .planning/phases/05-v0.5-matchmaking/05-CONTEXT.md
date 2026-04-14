# Phase 5: v0.5 — Sistema de matchmaking - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning (autonomous mode)
**Mode:** Auto-generated (autonomous workflow)

<domain>
## Phase Boundary

Queue e balanceamento de times. Fila 5v5, balanceamento por ELO, map veto, state machine. Discord webhook e banner no portal quando partida pronta.

### Scope

4 features in this phase:

1. **elo-system** — Glicko-2 simplificado, níveis 1-10 (ELO inicial 1000 = Nível 4)
   - Backend: ELO calculation service, level mapping
   - Database: Persist ELO ratings, update on match completion
   - Spec: `.specs/features/elo-system/`

2. **matchmaking-queue** — Fila 5v5, balanceamento por ELO, map veto, state machine
   - Backend: Queue management service, team balancer
   - State machine: Waiting → Veto → Ready → In-Progress → Complete
   - Frontend: Queue status display, map veto UI
   - Spec: `.specs/features/matchmaking-queue/`

3. **match-notifications** — Discord webhook, banner no portal quando partida pronta
   - Backend: Discord notifier service
   - Frontend: Match ready banner, toast notifications
   - Spec: `.specs/features/match-notifications/`

4. **fraghub-tags-plugin** — Plugin CS2 (C#) + CS:GO (SourcePawn) com tags [N]/[ADMIN]
   - CS2: CounterStrikeSharp plugin (C#)
   - CS:GO: SourcePawn plugin (SourcePawn/Pawn)
   - Tags: [1]-[10] for levels, [ADMIN] override
   - Integration: Fetch level from backend API
   - Spec: `.specs/features/fraghub-tags-plugin/`

</domain>

<decisions>
## Implementation Decisions

### ELO System

- **Algorithm:** Glicko-2 (simplified version, not full Glicko-2)
  - Accounts for rating uncertainty (RD — rating deviation)
  - Penalizes inactive players (RD decay)
  - More stable than basic ELO, better for small communities

- **Level Mapping:** 1000 ELO = Level 4 (middle)
  - Range: 600–1400 ELO spans Levels 1–10
  - Formula: level = 1 + (elo - 600) / 80, clamped to [1, 10]
  - Matches Faceit-style level system (familiar to players)

- **Initial ELO:** 1000 (Level 4) for new players
  - High RD (rating deviation) for new players → uncertain rating
  - RD decreases as player plays more matches
  - After ~30 matches, RD stabilizes

### Matchmaking Queue

- **State Machine:**
  - **Waiting** — Accepting players, queue size < 10
  - **Full** — 10 players gathered, transitioning to veto
  - **Veto** — Map voting phase, each team proposes/bans
  - **Ready** — Teams assigned, awaiting game server
  - **In-Progress** — Match ongoing on server
  - **Complete** — Match finished, ELO updates triggered

- **Team Balancing:**
  - Minimize ELO difference between teams (target: < 50 ELO)
  - Stack best/worst players evenly (if Teams[0] has best, Teams[1] gets second-best)
  - Re-balance every time queue changes (player joins/leaves)

- **Map Selection:**
  - Each team gets one ban, alternating veto order
  - BO1 (best-of-1) for casual/ladder matches
  - Pool: de_mirage, de_inferno, de_nuke, de_dust2, de_ancient, de_vertigo (configurable)

### Backend Integration (Phase 3 API Extension)

**New endpoints:**

- `POST /api/queue/join` — Add player to queue
- `DELETE /api/queue/leave` — Remove from queue
- `GET /api/queue/status` — Current queue state, teams, timer
- `POST /api/queue/vote-map` — Player votes in veto phase
- `POST /api/matches/ready` — Server confirms it's ready, webhook sent to Discord
- `POST /api/matches/complete` — Match finished, apply ELO updates

**Rate limiting:** 1 join per player per 30s (prevent spam)

### Frontend Integration (Phase 4 Extension)

**New pages/components:**

- **Queue page** — Join button, current queue size, estimated wait time, live team preview
- **Veto modal** — Map voting interface during veto phase
- **Match ready banner** — Toast notification when teams formed, "Join server now"
- **Queue status in sidebar** — Quick indicator: "In queue (3/10)" or "Match ready!"

**Real-time updates:** Poll `/api/queue/status` every 2s during waiting phase, every 1s during veto

### Game Plugin Architecture

**CS2 Plugin (fraghub-tags-c2):**
- Calls `GET /api/players/:steamid` to fetch user level
- On player join: set player scoreboard name to include level tag
- Example: `[6] PlayerName` or `[ADMIN] AdminName`
- Update tags every 30s (in case level changes mid-session, e.g., promotion/demotion)

**CS:GO Plugin (fraghub-tags-csgo):**
- Same approach: fetch level from backend
- SourcePawn implementation (existing SourceMod ecosystem)
- Cache level for 5 minutes to reduce API calls

### Dependencies & Integration

**Phase 4 dependency:**
- Frontend leaderboard must display level badges (Task 4 in Phase 4)
- Session management working (Task 2 in Phase 4)

**Phase 3 API (already exists):**
- `GET /api/players/:id` — Fetch player level (used by plugins)
- `GET /api/matches/:id` — Match history
- Player ELO field must exist in `users` table (or new `elo_ratings` table)

**Future (Phase 5+ enhancements, deferred):**
- Skill-based matchmaking (separate algorithm, future version)
- Anti-smurf (Faceit Prime-like verification, v2.0)
- Real-time WebSocket updates (instead of polling)
- Tournament mode (BO3, BO5)

</decisions>

<code_context>
## Existing Code Insights

### Phase 3 Database & API (from v0.3)

Tables available:
- `users` (id, steam_id, google_id, displayName, banned_at, created_at)
- `matches` (id, webhook_source, external_match_id, match_data, created_at)
- `stats` (id, user_id, match_id, kills, deaths, assists, etc.)

New tables needed:
- `elo_ratings` (id, user_id, elo, rd, volatility, last_updated)
- `queue_sessions` (id, state, created_at, updated_at)
- `queue_players` (id, queue_session_id, user_id, team_assignment)

### Tech Stack Continuity

- **Backend:** Node.js 20, Express, TypeScript, Knex (MariaDB) — same as Phase 3
- **Frontend:** React 18, Zustand, React Query — same as Phase 4
- **Plugins:** C# (CS2 CounterStrikeSharp), SourcePawn (CS:GO SourceMod)
- **Notifications:** Discord webhook (same pattern as Phase 3 matches-api)

### API Patterns to Reuse

- Rate limiting: Use existing `express-rate-limit` middleware from Phase 3
- Auth middleware: Protect `/api/queue/*` endpoints with authMiddleware
- Error responses: Use existing error format {error, code, statusCode}
- Pagination: If listing past queues/matches, use {data, meta} envelope from Phase 3

</code_context>

<specifics>
## Specific Requirements

### Phase Completion Criteria (from ROADMAP)

- [ ] Queue funcionando (players can join/leave)
- [ ] Teams balanceados por ELO (< 50 ELO diff target)
- [ ] Map veto implementado (teams vote on map)
- [ ] Tags in-game renderizam corretamente ([1]-[10], [ADMIN])
- [ ] Discord webhook enviado quando partida pronta
- [ ] ELO atualiza após match complete
- [ ] Frontend mostra status fila em tempo real
- [ ] Sem bugs de state machine (queue doesn't hang)

### Non-Functional Requirements

- Performance: Queue status API < 100ms response time
- Concurrency: Multiple players joining simultaneously handled safely (use transactions)
- State durability: Queue state persists across server restart (store in DB, not memory)
- Scalability: Backend ready for 20+ concurrent queue sessions
- Reliability: Plugin API fallback if Discord unavailable (don't block match ready)

### Integration Points

1. **Backend → Frontend:**
   - `/api/queue/status` called every 2s (during waiting), every 1s (during veto)
   - Real-time team composition visible to all players

2. **Backend → Game Servers:**
   - Plugins call `/api/players/:steamid` on join (GET, cached)
   - Backend provides no-auth public endpoint for tags fetching

3. **Backend → Discord:**
   - Webhook POST on match state change to "Ready"
   - Include team composition, map, ELO requirements

4. **Frontend → Plugins:**
   - Plugin sees tags set by server (no frontend call needed, tags sent from server)

</specifics>

<deferred>
## Deferred Ideas

- Skill-based matchmaking (use separate ML model, v2.0+)
- Anti-smurf system (phone verification, playtime check, v2.0)
- Real-time WebSocket updates (replace polling with WebSocket in v0.6+)
- Seasonal rankings (reset ELO each month, v1.0+)
- Tournament/bracket mode (BO3, BO5, events, v2.0+)
- Replay system (store and stream match replays, v2.0+)
- Cross-game queue (Dota 2, Valorant, etc., v2.0+)

</deferred>
