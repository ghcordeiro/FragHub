# FragHub GSD Companion Layer

This `.planning/` directory is the **GSD (Get Shit Done) orchestration layer** for the FragHub project.

## Hybrid Architecture

FragHub uses a **spec-driven + GSD hybrid approach**:

```
┌─────────────────────────────────────────────────────────────┐
│                    FragHub Development                       │
├──────────────────────────┬──────────────────────────────────┤
│   .specs/                │   .planning/                     │
│   (Detailed Specs)       │   (GSD Orchestration)            │
├──────────────────────────┼──────────────────────────────────┤
│ • Specify                │ • Project vision                 │
│ • Plan (detailed)        │ • Phase breakdown                │
│ • SDD gates              │ • Progress tracking              │
│ • Acceptance criteria    │ • Autonomous execution           │
│ • Validation evidence    │ • Phase coordination             │
│ • Architecture docs      │                                  │
│ • ADRs                   │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

**Why both?**

- **`.specs/`** = Source of truth for detailed requirements, architecture decisions, validation criteria
- **`.planning/`** = GSD automation layer — reads specs, coordinates phases, executes autonomously

## File Structure

```
.planning/
├── PROJECT.md           # Project vision (mirrors .specs/project/PROJECT.md)
├── ROADMAP.md          # GSD phase breakdown
├── STATE.md            # Current progress, blockers, decisions
├── config.json         # GSD workflow configuration
├── phases/
│   ├── 01-v0.1-instalador/
│   │   └── 01-01-SUMMARY.md    # Complete
│   ├── 02-v0.2-database-plugins/
│   │   └── 02-01-SUMMARY.md    # Complete
│   ├── 03-v0.3-api-backend/
│   │   ├── 03-01-PLAN.md       # In progress
│   │   └── 03-01-SUMMARY.md    # (being updated)
│   ├── 04-v0.4-frontend-portal/
│   ├── 05-v0.5-matchmaking/
│   ├── 06-v0.6-admin-panel/
│   └── 07-v1.0-production/
└── README.md           # This file
```

## Current Status

**Milestone:** v0.3 — API backend
**Phase:** 3 of 7
**Progress:** 4/5 features validated, 1 awaiting validation

| Feature | Status | Spec |
|---------|--------|------|
| api-setup | CTO check | `.specs/features/api-setup/` |
| auth-api | ✅ Validated | `.specs/features/auth-api/` |
| steam-integration | ✅ Validated | `.specs/features/steam-integration/` |
| players-api | ✅ Validated | `.specs/features/players-api/` |
| matches-api | 🔄 E2E pending | `.specs/features/matches-api/` |

**Next action:** Complete E2E validation for matches-api → Phase 3 complete → proceed to Phase 4 (frontend)

## How to Use This Layer

### Check Progress

```bash
/gsd-progress     # See current phase, recent work, what's next
```

### Review Phase Plan

```bash
cat .planning/phases/03-v0.3-api-backend/03-01-PLAN.md
```

### Autonomous Execution (after Phase 3 validation)

```bash
/gsd-autonomous --from 4  # Start Phase 4 autonomously through completion
/gsd-autonomous --only 4   # Execute only Phase 4
```

### Manual Phase Execution

```bash
/gsd-plan-phase 4    # Create detailed plan for Phase 4
/gsd-execute-phase 4 # Execute all plans in Phase 4
```

### Update Progress Manually

Edit `.planning/STATE.md` to update blockers, decisions, or next actions.

## Mapping Specs to GSD Phases

Each GSD phase references one or more `.specs/features/`:

| Phase | Specs | Link |
|-------|-------|------|
| 1 | cli-installer, game-stack-baseline | `.specs/features/cli-installer/`, `.specs/features/game-stack-baseline/` |
| 2 | database-baseline, plugins-extended-cs2/csgo, database-backup | `.specs/features/database-baseline/`, `.specs/features/plugins-extended-*/` |
| 3 | api-setup, auth-api, steam-integration, players-api, matches-api | `.specs/features/api-setup/`, etc. |
| 4 | frontend-setup, nginx-ssl, auth-ui, player-profile-ui, leaderboard-ui | `.specs/features/frontend-setup/`, etc. |
| 5 | elo-system, matchmaking-queue, match-notifications, fraghub-tags-plugin | `.specs/features/elo-system/`, etc. |
| 6 | admin-dashboard, server-management-ui, admin-logs, plugin-config-ui | `.specs/features/admin-dashboard/`, etc. |
| 7 | upgrade-command, ci-cd, tests-suite, security-audit, docs-release, landing-page | `.specs/features/upgrade-command/`, etc. |

**Design principle:** Each spec is the detailed requirements. GSD phases are the orchestration units that group specs into logical milestones for autonomous execution.

## Workflow

### Standard Flow

1. **Read specs** in `.specs/features/{slug}/spec.md` (detailed requirements)
2. **Review gate status** in `.specs/features/{slug}/tasks.md` (SDD gates: Specify/Plan/Implement/Validate)
3. **Check GSD phase plan** in `.planning/phases/{N}/PLAN.md` (orchestration overview)
4. **Execute via GSD** (`/gsd-execute-phase N` or `/gsd-autonomous --from N`)
5. **Update `.planning/STATE.md`** when blockers resolve

### Decision Making

- **Architecture/design decisions** → documented in `.specs/features/{slug}/spec.md` + `.specs/project/STATE.md`
- **Phase-level blockers** → tracked in `.planning/STATE.md`
- **ADRs** → `.docs/adr/` (referenced from specs and GSD PLANs)

## When to Edit Each File

### `.specs/` (Detailed Specs)
- Feature requirements change
- Acceptance criteria need refinement
- SDD gates progress (Specify→Plan→Implement→Validate)
- Architecture decisions need documentation

### `.planning/` (GSD Orchestration)
- Phase status changes (complete, blocker found)
- Coordination across specs (e.g., phase dependencies)
- Progress snapshots between sessions
- GSD-specific configuration (model profile, agents)

## Commands

**Progress & Status**
```bash
/gsd-progress              # Current position, recent work, next steps
/gsd-resume-work           # Resume from previous session
```

**Planning**
```bash
/gsd-plan-phase 4          # Create plan for Phase 4
/gsd-list-phase-assumptions 4   # See Claude's intended approach
```

**Execution**
```bash
/gsd-execute-phase 4       # Execute Phase 4 plans
/gsd-autonomous --from 4   # Run Phase 4+ autonomously to completion
/gsd-autonomous --only 4   # Run only Phase 4
```

**Debugging**
```bash
/gsd-debug "issue description"  # Start a debug session
/gsd-debug                      # Resume active debug session
```

## Notes

- GSD commands work alongside your existing spec-driven process — they don't replace it
- Specs remain the source of truth; GSD phases orchestrate their execution
- SDD gates (in `.specs/`) are independent of GSD phases — both systems track progress
- This hybrid approach scales: add specs without touching GSD, or reorganize GSD phases without changing specs

---

**Last updated:** 2026-04-13
**Next milestone:** v0.3 completion (matches-api validation) → Phase 4 (frontend portal)
