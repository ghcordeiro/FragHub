# Phase 7: v1.0 — Produção - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning (autonomous mode)

<domain>
## Phase Boundary

Release público. Upgrade command com backup e migrations. CI/CD via GitHub Actions. Test suite completo. Security audit OWASP Top 10. Documentação e landing page.

### Features

1. **upgrade-command** — `fraghub upgrade` com backup automático, migrations, rollback
   - Spec: `.specs/features/upgrade-command/`

2. **ci-cd** — GitHub Actions: lint, ShellCheck, tests, release tags
   - Spec: `.specs/features/ci-cd/`

3. **tests-suite** — bats-core (bash), Jest+Supertest (API), Vitest (React), Playwright (e2e)
   - Spec: `.specs/features/tests-suite/`

4. **security-audit** — OWASP Top 10, JWT, cookies, RCON, permissões — zero Critical/High
   - Spec: `.specs/features/security-audit/`

5. **docs-release** — README, INSTALL, CONTRIBUTING, CHANGELOG, LICENSE, CODE_OF_CONDUCT
   - Spec: `.specs/features/docs-release/`

6. **landing-page** — Página pública, SEO, WCAG 2.1 AA, bilíngue PT/EN
   - Spec: `.specs/features/landing-page/`

</domain>

<decisions>
## Implementation Decisions

### Upgrade Strategy

- **Backup before upgrade:** Full database dump + app tarball
- **Rollback on failure:** Restore from backup if migrations fail
- **No downtime:** Update plugins while server is running, restart at completion
- **Version tracking:** Store current version in `.fraghub-version`

### CI/CD Pipeline

- **Triggers:** On PR (lint, test), on push to main (build, test, release)
- **Steps:** ShellCheck (bash scripts), ESLint (TS/React), Jest/Vitest (unit+integration), Playwright (e2e)
- **Release:** Create GitHub release + tag on version bump
- **Artifacts:** Build Docker images or dist packages

### Test Coverage

- **Installer scripts:** bats-core tests (bash unit testing)
- **API:** Jest + Supertest (endpoint integration tests)
- **Frontend:** Vitest (component unit tests)
- **End-to-end:** Playwright (user workflows: login → queue → match → profile)
- **Target:** > 80% code coverage

### Security Audit

- **OWASP Top 10:** SQL injection (Knex prevents), XSS (React escaping), CSRF (token validation), etc.
- **Auth:** JWT validation, refresh token rotation, password hashing (bcrypt)
- **API:** Rate limiting, input validation (zod), HTTPS enforcement
- **Frontend:** CSP headers, httpOnly cookies, XSS defenses
- **Game plugin:** No data exposure in console, command validation

### Documentation

- **README:** Overview, features, quick start, troubleshooting
- **INSTALL:** Detailed setup guide (mirrors installer wizard)
- **CONTRIBUTING:** How to contribute code, plugin development guide
- **CHANGELOG:** Version history, breaking changes
- **LICENSE:** GPL-3.0
- **CODE_OF_CONDUCT:** Community guidelines

### Landing Page

- **Content:** Overview, features, screenshots, getting started, roadmap
- **SEO:** Meta tags, structured data, sitemap
- **Accessibility:** WCAG 2.1 AA (contrast, keyboard nav, screen readers)
- **Languages:** Portuguese (PT-BR) and English (EN)
- **Hosting:** Static site via GitHub Pages or Netlify

</decisions>

<specifics>
## Specific Requirements

### Completion Criteria (Release Readiness)

- [ ] All tests passing (unit, integration, e2e)
- [ ] Security audit completed (zero Critical/High)
- [ ] Code coverage > 80%
- [ ] CI/CD pipeline green on main
- [ ] Documentation complete and reviewed
- [ ] Landing page live and indexed
- [ ] Upgrade command tested (backup, migrations, rollback)
- [ ] Performance benchmarks met (startup < 30s, API responses < 200ms)
- [ ] Internationalization working (PT-BR and EN)

</specifics>

</domain>
