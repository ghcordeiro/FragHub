# Plugins Extended CS2 - Validation Report

## Status do gate

- Gate de Validate: **EM PROGRESSO**.
- Escopo: AC-001..AC-007 de `.specs/features/plugins-extended-cs2/spec.md`.

## Evidencias executadas

- `bash -n scripts/installer/*.sh`
- Revisao estatica de:
  - `scripts/installer/plugins-extended-cs2.sh`
  - `scripts/installer/sql/plugins-cs2/001_simpleadmin.sql`
  - `scripts/installer/sql/plugins-cs2/001_weaponpaints.sql`
- Verificacao de rastreio de versao em `/opt/fraghub/state/plugins-cs2.json`.

## Resultado por criterio de aceitacao

| AC | Status | Resultado |
| --- | --- | --- |
| AC-001 | PASS (estatico) | Instala artefatos de plugin no caminho CounterStrikeSharp e gera `CS2-SimpleAdmin.json` com DB local. |
| AC-002 | PASS (estatico) | Aplica schema SimpleAdmin e registra `plgcs2_simpleadmin_*` em `schema_migrations`. |
| AC-003 | PASS (estatico) | Instala WeaponPaints, gera config, cria tabela e registra migração prefixada. |
| AC-004 | PASS (estatico) | Cria `/opt/fraghub/demos/cs2` com permissão 700 e hook MatchZy para partidas finalizadas/abandonadas. |
| AC-005 | PASS (estatico) | Idempotência por sentinela de plugin + `schema_migrations`; configs não são sobrescritas. |
| AC-006 | PASS (estatico) | Pre-check aborta se base CS2 não existe antes de qualquer alteração. |
| AC-007 | PASS (estatico) | Manifesto JSON com versões instaladas é gravado em `/opt/fraghub/state/plugins-cs2.json`. |

## Riscos residuais

- Estrutura de release no GitHub pode mudar; script depende de URLs estáveis de asset.
