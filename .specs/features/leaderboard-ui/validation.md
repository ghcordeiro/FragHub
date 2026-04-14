# leaderboard-ui — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Leaderboard pública (ranking por ELO)
- [x] Paginação (25 players/página)
- [x] Filtro por nível (1-10)
- [x] Sort: ELO desc (padrão), wins, matches
- [x] SEO (meta tags, structured data)
- [x] Accessibility (WCAG 2.1 AA)
- [x] Mobile responsive
- [x] Cache (5 min)

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | Leaderboard público acessível | `GET /api/players?sort=elo_rating` — ✅ sem auth |
| AC-002 | Paginação funciona | `?page=1&limit=25` — ✅ metadados retornados |
| AC-003 | Filtro por nível | `?level=8` — ✅ filtra 1531-1750 ELO |
| AC-004 | Sort options | ELO desc, wins, matches — ✅ implementado |
| AC-005 | Rank position visível | `rank: 1, 2, 3...` — ✅ calculado |
| AC-006 | Level badges | Visual nível 1-10 — ✅ `LevelBadge.tsx` |
| AC-007 | Meta tags SEO | `og:title`, `og:description`, schema JSON-LD — ✅ adicionado |

## Components

```
src/pages/
└── LeaderboardPage.tsx

src/components/
├── LeaderboardTable.tsx
├── LevelFilter.tsx
├── SortSelect.tsx
└── Pagination.tsx
```

## SEO Metadata

```html
<title>Leaderboard — FragHub</title>
<meta name="description" content="Top players ranked by ELO...">
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Leaderboard"
  }
</script>
```

## Status

**✅ VALIDADO** — leaderboard público com ranking e filtros.
