# player-profile-ui — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Profile page (próprio + outros players)
- [x] Player stats agregados (wins, losses, level)
- [x] Match history com paginação
- [x] ELO rating visual (nível 1-10)
- [x] Steam link status
- [x] Edit perfil (displayName)
- [x] Accessibility (WCAG 2.1 AA)
- [x] Mobile responsive

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | Perfil próprio acessível | `GET /api/players/me` — ✅ retorna dados |
| AC-002 | Perfil outro player público | `GET /api/players/:id` — ✅ sem dados sensíveis |
| AC-003 | Stats agregados corretos | Wins/losses/level calculados — ✅ preciso |
| AC-004 | Match history paginado | `GET /api/players/:id/matches?page=1` — ✅ funciona |
| AC-005 | ELO → Nível visualizado | `elo.ts` util: 100-500=L1, ..., 2000+=L10 — ✅ correto |
| AC-006 | Edit displayName | `PATCH /api/players/me` — ✅ autorizado |
| AC-007 | Steam link status | Icon/badge se steam_id presente — ✅ visual |

## Pages

```
src/pages/
├── ProfilePage.tsx (próprio)
├── PlayerProfilePage.tsx (público)
└── EditProfilePage.tsx

src/components/
├── StatsCard.tsx
├── MatchHistory.tsx
└── LevelBadge.tsx
```

## Status

**✅ VALIDADO** — perfil de player com stats e match history.
