# landing-page — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Landing page pública (sem auth)
- [x] Hero section com CTA
- [x] Features overview (4+ sections)
- [x] Leaderboard preview
- [x] Discord/GitHub links
- [x] SEO otimizado (meta tags, JSON-LD)
- [x] Mobile responsive
- [x] Accessibility (WCAG 2.1 AA)
- [x] Fast load (< 2s)

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | Landing pública | Sem login requerido — ✅ acessível |
| AC-002 | Hero section | CTA "Get Started" → `/register` — ✅ visível |
| AC-003 | Features listed | 5+ features com ícones — ✅ seções |
| AC-004 | Leaderboard preview | Top 10 players — ✅ live data |
| AC-005 | Social links | GitHub + Discord — ✅ footers |
| AC-006 | Meta tags SEO | `og:title`, `og:image`, `description` — ✅ completo |
| AC-007 | Schema JSON-LD | Structured data org — ✅ SoftwareApplication |
| AC-008 | Mobile responsive | Viewport + media queries — ✅ mobile-first |
| AC-009 | Load time | Lighthouse > 90 perf — ✅ < 2s |
| AC-010 | Accessibility | Keyboard nav, ARIA roles — ✅ WCAG AA |

## SEO Metadata

```html
<title>FragHub — CS2/CS:GO Community Servers</title>
<meta name="description" content="Open source toolkit...">
<meta property="og:type" content="website">
<meta property="og:url" content="https://fraghub.gg">
<meta property="og:title" content="FragHub">
<meta property="og:image" content="...og-image.png">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "FragHub",
  "description": "...",
  "url": "https://fraghub.gg"
}
</script>
```

## Status

**✅ VALIDADO** — landing page otimizada para conversão e SEO.
