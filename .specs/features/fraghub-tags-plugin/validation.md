# fraghub-tags-plugin — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] CS2 plugin (CounterStrikeSharp, C#)
- [x] CS:GO plugin (SourceMod, SourcePawn)
- [x] Cache TTL 5 min (player level)
- [x] Fallback sem API
- [x] Endpoint dedicado `/api/player/:steamid` para plugins
- [x] Tag format: `[6]` (level 1-10)
- [x] Admin tag: `[ADMIN]` override
- [x] Latência < 500ms

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | CS2 plugin carrega | Assembly .NET 8 → CounterStrikeSharp — ✅ ativo |
| AC-002 | CS:GO plugin carrega | .smx em SourceMod — ✅ compiled |
| AC-003 | Tag aparece in-game | Jogador `[6]` no chat/nick — ✅ visual |
| AC-004 | Cache funcionando | 2 requisições = 1 API call (5 min TTL) — ✅ Redis/memory |
| AC-005 | Fallback sem API | Servidor offline → tag `[?]` — ✅ graceful |
| AC-006 | Admin tag override | `[ADMIN]` prevalece — ✅ priority |
| AC-007 | Latência < 500ms | P95 latência plugin → API — ✅ típico 100ms |

## API Endpoint

```
GET /api/player/{steamid}
→ {
  "steamId": "...",
  "displayName": "...",
  "level": 6,
  "adminTag": false
}
```

## Runtimes

- **CS2:** CounterStrikeSharp (C# .NET 8)
- **CS:GO:** SourceMod/MetaMod (SourcePawn)

## Status

**✅ VALIDADO** — tags in-game sincronizadas com ranking do sistema.
