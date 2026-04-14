# match-notifications — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Notificações browser (polling + events)
- [x] Discord webhook para match ready
- [x] Discord webhook para match complete
- [x] Email opcional
- [x] In-game notifications via plugin
- [x] Retry logic (3 tentativas)

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | Match ready → notificação browser | Event emitted → browser — ✅ SSE |
| AC-002 | Discord webhook chamado | Match veto completo → webhook URL — ✅ POST |
| AC-003 | Retry em falha | 3× com backoff exponencial — ✅ implementado |
| AC-004 | In-game notify | Plugin recebe evento → HUD message — ✅ integrado |
| AC-005 | Email opcional | `NOTIFY_EMAIL=true` desabilita — ✅ config |

## Webhook Payload (Discord)

```json
{
  "embeds": [
    {
      "title": "Match Ready",
      "fields": [
        {"name": "Team A", "value": "Player1, Player2..."},
        {"name": "Team B", "value": "Player3, Player4..."},
        {"name": "Map", "value": "de_mirage"}
      ]
    }
  ]
}
```

## Status

**✅ VALIDADO** — notificações integradas (browser, Discord, in-game).
