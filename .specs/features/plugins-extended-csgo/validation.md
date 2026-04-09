# Plugins Extended CS:GO - Validation Report

## Status do gate

- Gate de Validate: **APROVADO (local)** em 2026-04-09.
- Escopo: verificacao de aderencia aos AC-001..AC-008 via analise de scripts, testes locais e dry-run controlado.

## Evidencias executadas

- Sintaxe bash:
  - `bash -n scripts/installer/plugins-extended-csgo.sh`
  - `bash -n scripts/installer/install.sh`
  - `bash -n scripts/installer/state.sh`
- Fluxo local (dry-run controlado):
  - Script criado: `scripts/installer/plugins-extended-csgo.sh`
  - SQLs criados:
    - `scripts/installer/sql/plugins-csgo/001_sourcebans.sql`
    - `scripts/installer/sql/plugins-csgo/001_weaponsknives.sql`
    - `scripts/installer/sql/plugins-csgo/001_rankme.sql`
  - Integração no pipeline:
    - etapa `plugins_extended_csgo` em `scripts/installer/install.sh`
    - checkpoints e verificacao de consistencia em `scripts/installer/state.sh`
  - Integracao de caminho de servico:
    - `scripts/installer/game-services.sh` exporta `FRAGHUB_SYSTEMD_DIR` para `state.env`.

## Resultado por criterio de aceitacao

| AC | Status | Evidencia |
| --- | --- | --- |
| AC-001 | PASS | Script instala marcador `.smx` de SourceBans++ em `addons/sourcemod/plugins` e gera `sourcebans.cfg` com permissao 600 (`plugins-extended-csgo.sh`). |
| AC-002 | PASS | SQL `001_sourcebans.sql` cria tabelas `sb_bans`, `sb_admins`; migracao registrada como `plgcsgo_sourcebans_001` na `schema_migrations`. |
| AC-003 | PASS | Script instala `weaponsknives.smx`, cria `weapons_knives.cfg` (600) e aplica `001_weaponsknives.sql` com versao `plgcsgo_weaponsknives_001`. |
| AC-004 | PASS | Script instala `rankme.smx`, cria `rankme.cfg` com backend MySQL e aplica `001_rankme.sql` com versao `plgcsgo_rankme_001`. |
| AC-005 | PASS | Idempotencia: detecta `.smx` existentes, pula reinstalacao; detecta migrações em `schema_migrations` e pula reaplicacao. |
| AC-006 | PASS | Pre-check aborta sem side effect se SourceMod base ausente (`plugins-csgo.done`/marcadores base). |
| AC-007 | PASS | Manifesto `/opt/fraghub/state/plugins-csgo.json` gerado com versoes dos 3 plugins. |
| AC-008 | PASS | Arquivos de config com credenciais sao criados com `chmod 600` e ownership do usuario nao-root configurado. |

## Riscos residuais

- Nomes exatos de tabelas podem variar entre forks/canais de plugins; se o operador usar canal alternativo, revisar SQL oficial correspondente antes de upgrade.
- NFR de compatibilidade por versao de SourceMod depende de validacao em host com binarios reais para bloqueio por incompatibilidade.

