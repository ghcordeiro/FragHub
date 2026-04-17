# C4 Architecture — Frontend Refactor Stitch

**Feature:** `frontend-refactor-stitch`
**Date:** 2026-04-17
**Levels:** L1 (Context) + L2 (Container)

---

## L1 — Context Diagram

```mermaid
C4Context
  title FragHub — System Context

  Person(player, "Player / Visitor", "CS2/CS:GO community member")
  Person(admin, "Admin", "Server administrator")

  System(fraghub_web, "FragHub Web", "React 18 SPA — leaderboard, profiles, auth, matchmaking queue")
  System_Ext(fraghub_api, "FragHub API", "Node.js/Express REST API — auth, players, matches, admin")
  System_Ext(google_oauth, "Google OAuth", "Authentication provider")
  System_Ext(steam_openid, "Steam OpenID", "Game account linking")

  Rel(player, fraghub_web, "Acessa via browser", "HTTPS")
  Rel(admin, fraghub_web, "Gerencia servidor", "HTTPS")
  Rel(fraghub_web, fraghub_api, "Consome REST API", "JSON/HTTPS")
  Rel(fraghub_web, google_oauth, "Redireciona para OAuth", "HTTPS")
  Rel(fraghub_web, steam_openid, "Redireciona para OpenID", "HTTPS")
```

---

## L2 — Container Diagram

```mermaid
C4Container
  title FragHub Web — Container View (pós-refactor)

  Person(user, "Usuário")

  Container_Boundary(spa, "fraghub-web (React SPA)") {
    Component(router, "React Router v6", "Roteamento client-side. Layout wraps rotas públicas.")
    Component(layout, "Layout + NavBar", "Shell persistente. Glassmorphism. Links + auth CTAs.")

    Component(home, "HomePage", "Hero + Stats + FeatureCards")
    Component(leaderboard, "LeaderboardPage", "Podium + RankingTable + filtros/paginação")
    Component(auth, "LoginPage / RegisterPage", "Auth forms com Button + InputField + ErrorAlert")
    Component(profile, "ProfilePage / PublicProfilePage", "Stats grid + match history + LevelBadge")
    Component(admin, "Admin Pages", "Dashboard, Players, Servers, Logs (tokens herdados)")

    Component(design_system, "Design System", "index.css — 34+ CSS custom properties Tactical Monolith")
    Component(ui_atoms, "UI Atoms (ui/)", "Button, InputField, ErrorAlert, LoadingSpinner")
    Component(visual, "Visual Components", "LevelBadge, PlayerAvatar, RankingTable, PodiumSection")

    Component(store, "Zustand Store", "sessionStore — JWT, user state")
    Component(services, "Services", "httpClient, playerService, leaderboardService")
  }

  System_Ext(api, "FragHub API", "Node.js REST")
  System_Ext(nginx, "Nginx", "Static file serving + reverse proxy")

  Rel(user, nginx, "HTTPS request")
  Rel(nginx, spa, "Serve static SPA")
  Rel(router, layout, "Outlet via Layout")
  Rel(layout, home, "Route /")
  Rel(layout, leaderboard, "Route /leaderboard")
  Rel(layout, auth, "Route /login /register")
  Rel(layout, profile, "Route /players/*")
  Rel(admin, design_system, "Herda tokens CSS")
  Rel(home, ui_atoms, "usa Button")
  Rel(leaderboard, visual, "usa RankingTable, LevelBadge, PodiumSection")
  Rel(auth, ui_atoms, "usa Button, InputField, ErrorAlert")
  Rel(profile, visual, "usa LevelBadge, PlayerAvatar")
  Rel(services, api, "REST/JSON", "HTTPS")
  Rel(store, services, "Gerencia tokens JWT")
```

---

## Sequence Diagram — Login Flow (feature-scoped)

```mermaid
sequenceDiagram
  actor U as Usuário
  participant NB as NavBar
  participant LP as LoginPage
  participant S as sessionStore
  participant API as FragHub API

  U->>NB: Clica "LOGIN"
  NB->>LP: navigate('/login')
  U->>LP: Preenche email + senha
  LP->>API: POST /auth/login
  API-->>LP: { accessToken, user }
  LP->>S: setSession(token, user)
  LP->>NB: navigate('/') — NavBar re-renders com avatar
  NB-->>U: Exibe avatar + "JOIN QUEUE"
```
