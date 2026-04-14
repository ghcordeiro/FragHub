# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Production release foundation infrastructure
- Upgrade command with backup, migration, and rollback support
- CI/CD pipeline with ShellCheck, TypeScript, ESLint, Prettier validation
- Comprehensive test suite with unit and integration tests
- Test coverage reporting (vitest with coverage-v8)

## [1.0.0] - 2026-04-14

### Added
- Initial public release
- FragHub — all-in-one toolkit for CS2/CS:GO community servers
- Interactive installer with pre-checks and dependency management
- HTTP API (Express, TypeScript, JWT auth, Google OAuth)
- MariaDB baseline with versioned migrations
- Admin panel with player management, server control, and audit logging
- Web portal (React 18, Vite, TypeScript)
- Nginx reverse proxy with automatic SSL (Certbot)
- ELO-style ranking system (Glicko-2)
- Player profiles with match history
- Leaderboard with pagination and filtering
- Admin dashboard with real-time metrics
- Security features: rate limiting, CSRF protection, command validation

### Infrastructure
- GitHub Actions CI/CD pipeline
- Automated testing (unit + integration)
- Automated releases on version tags
- Code quality gates (ShellCheck, TypeScript, ESLint, Prettier)
- Comprehensive logging and monitoring

## Features by Version

### v0.1 — Game Stack Baseline
- Game server provisioning (CS2/CS:GO)
- SourceMod/CounterStrikeSharp plugin infrastructure

### v0.2 — Database & Auth API
- MariaDB with migrations
- User authentication (email/password + Google OAuth)
- JWT tokens with refresh rotation
- Steam linking foundation

### v0.3 — Core APIs
- Players API (profiles, stats)
- Matches API (webhook integration, result recording)
- ELO calculation engine

### v0.4 — Web Portal
- React 18 frontend (Vite, TypeScript)
- Login/Register pages
- Player profiles (private + public)
- Leaderboard with pagination
- Nginx reverse proxy with SSL automation

### v0.5 — Matchmaking Queue
- Queue service with balancing
- ELO-based team formation
- Match notifications (Discord webhooks)

### v0.6 — Admin Panel
- Admin dashboard with metrics
- Player management (ban/unban)
- Server control (RCON, restart)
- Plugin configuration
- Immutable audit logging

### v1.0 — Production Release
- Upgrade command with backup and rollback
- CI/CD pipeline for automated quality gates
- Comprehensive test suite
- Documentation (README, CONTRIBUTING, LICENSE)
- Community guidelines (CODE_OF_CONDUCT)

## [0.6.0] - 2026-04-14

### Added
- Admin panel with dashboard, player management, server control
- Admin API with 12 endpoints
- RCON service with command validation
- Plugin configuration management
- Immutable audit logging system
- Role-based access control

### Fixed
- Path traversal vulnerability in plugin config paths
- Command injection prevention with blocklist validation
- Self-ban prevention in admin endpoints

## [0.5.0] - 2026-04-10

### Added
- Queue service foundation
- ELO-based team balancing algorithm
- Match notifications system
- Discord webhook integration

## [0.4.0] - 2026-04-08

### Added
- React 18 web portal with Vite
- Session management with JWT
- Login/Register pages with validation
- Player profile pages
- Leaderboard component
- Nginx reverse proxy configuration
- SSL automation with Certbot

### Security
- HttpOnly refresh token cookies
- CORS protection
- Rate limiting on auth endpoints

## [0.3.0] - 2026-04-05

### Added
- Players API with profile endpoints
- Matches API with webhook support
- ELO calculation engine (Glicko-2)
- Match result recording
- Player statistics aggregation

## [0.2.0] - 2026-03-30

### Added
- MariaDB setup and migrations system
- User authentication API (email/password)
- Google OAuth integration
- JWT token generation and validation
- Refresh token rotation
- Rate limiting middleware

## [0.1.0] - 2026-03-20

### Added
- Interactive installer script
- Game server provisioning (CS2 and CS:GO)
- SourceMod and CounterStrikeSharp support
- Pre-checks for OS, architecture, resources
- Systemd service configuration
- UFW firewall setup
