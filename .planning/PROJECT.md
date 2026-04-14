# FragHub Project

## Vision

**Um comando, stack completo.** FragHub é um toolkit open source que permite qualquer pessoa criar um servidor de CS2/CS:GO com matchmaking, portal web e sistema de ranking em minutos.

## Problem

Configurar um servidor de CS competitivo com todos os plugins, banco de dados, portal web e sistema de ELO é complexo e demorado. Requer conhecimento de Linux, SourceMod/CounterStrikeSharp, MySQL, Node.js, React, Nginx... A maioria das comunidades desiste ou usa soluções incompletas.

## Solution

FragHub oferece:
1. **Instalador interativo** que configura tudo automaticamente
2. **Suporte dual** CS2 + CS:GO Legacy na mesma instalação
3. **Portal web** com login, perfis, leaderboard, matchmaking
4. **Sistema de ELO** com níveis 1-10 (estilo Faceit)
5. **Tags in-game** mostrando nível ou role do jogador
6. **Painel admin** para gerenciar servidores, jogadores e bans

## Target Audience

- Comunidades privadas de CS (LAN/amigos)
- Grupos de 5-50 jogadores
- Foco inicial: cena brasileira de CS
- Não é: hosting provider, competidor do Faceit/GC

## Principles

1. **Simplicidade**: instalação em um comando, configuração via wizard
2. **Completude**: tudo que uma comunidade precisa, integrado
3. **Abertura**: GPL-3.0, código aberto, forkável
4. **Qualidade**: nível profissional (estilo GC/Faceit)

## Success Metrics

- Instalação completa em < 30 minutos
- Zero erros no wizard de instalação
- Uptime > 99% dos serviços
- Comunidade ativa no GitHub

## Out of Scope

- Não é um serviço de hosting (você roda no seu servidor)
- Não é competidor do Faceit/GC (é para comunidades privadas)
- Não suporta Windows (apenas Linux)
- Não tem anti-cheat proprietário (usa plugins da comunidade)

---

## Workflow

This project uses a **hybrid spec-driven + GSD approach**:
- `.specs/` — detailed specifications, SDD gates (Specify/Plan/Implement/Validate)
- `.planning/` — GSD phase orchestration, autonomous execution, progress tracking

See `.planning/ROADMAP.md` for phase breakdown and `.specs/planning/PLANNING.md` for feature scope.
