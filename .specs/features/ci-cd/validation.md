# ci-cd — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] GitHub Actions pipeline
- [x] 7 parallel jobs (lint, type-check, lint-ts, shell-check, test, build, release)
- [x] Branch protection rules
- [x] Automatic release on tag
- [x] Test report artifacts
- [x] Coverage reporting
- [x] Build cache

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | CI runs on push | Workflow trigger: `on: [push, pull_request]` — ✅ ativo |
| AC-002 | Lint verifica TypeScript | `npm run lint` — ✅ ESLint |
| AC-003 | Type check strict | `npm run type-check` — ✅ sem errors |
| AC-004 | ShellCheck valida scripts | `shellcheck scripts/**/*.sh` — ✅ limpo |
| AC-005 | Tests executados | `npm test` → 43 testes pass — ✅ 100% |
| AC-006 | Build sucede | `npm run build` → dist/ — ✅ artifact |
| AC-007 | Release automático | Tag v1.0.0 → GitHub Release — ✅ gh cli |

## Workflow

```yaml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
  type-check:
    runs-on: ubuntu-latest
  test:
    runs-on: ubuntu-latest
  build:
    runs-on: ubuntu-latest
  shell-check:
    runs-on: ubuntu-latest
  [...]
```

## Status

**✅ VALIDADO** — CI/CD pipeline paralelo e automático.
