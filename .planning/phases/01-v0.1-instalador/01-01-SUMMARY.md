# Phase 1: v0.1 — Instalador básico — SUMMARY

**Status:** ✅ Complete

## Objective

Servidor CS2 e CS:GO funcionando com plugins essenciais, instalados via wizard interativo.

## What Was Built

### cli-installer
- Wizard interativo com pré-checks (sudo, internet, Linux distro)
- LinuxGSM setup (download, install, config)
- UFW firewall rules (27015/UDP, 27020/UDP para RCON)
- systemd services para CS2 e CS:GO (auto-start no boot)
- `fraghub install` entry point

### game-stack-baseline
- **CS2 Stack:**
  - MetaMod:Source (core)
  - CounterStrikeSharp (framework)
  - MatchZy (sistema de partidas)
  - WeaponPaints (skins)
  - CS2-SimpleAdmin (admin)
  - Demo recorder automático

- **CS:GO Stack:**
  - SourceMod (core)
  - SourcePawn (scripting)
  - Get5 (sistema de partidas)
  - Weapons & Knives (skins)
  - SourceBans++ (admin + web panel)
  - RankMe (stats locais)

- systemd service units para ambos os jogos (CS2 e CS:GO)

## Key Decisions

- Suporte dual CS2+CS:GO na mesma instalação (não exclusivo)
- LinuxGSM como base (community-maintained, well-tested)
- systemd para lifecycle management (mais robusto que tmux)
- MatchZy (simpler) para CS2; Get5 (battle-tested) para CS:GO

## Completion Criteria

✅ Servidor CS2 rodando com partidas funcionando
✅ Servidor CS:GO rodando com partidas funcionando
✅ Ambos os servidores iniciam ao boot via systemd

## Artifacts

- `scripts/installer/` — instalador + shell scripts
- `services/` — systemd service files
- Código: `/services/fraghub-installer/`
- Specs: `.specs/features/cli-installer/`, `.specs/features/game-stack-baseline/`

## Session Info

**Completed:** v0.1 was delivered before this GSD layer was added.
**Date:** Snapshot created 2026-04-13
