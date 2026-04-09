# Plugins Extended CS:GO - Tasks (TDAD)

## Convencoes

- `T-XX` = tarefa de teste/verificacao.
- `I-XX` = tarefa de implementacao.
- Cada `I-XX` deve mapear explicitamente ACs da spec.

## Backlog atomico

### T-01 - Plano de pre-check para plugins estendidos CS:GO

- What: validar dependencias de plugins base (MetaMod/SourceMod/Get5), conectividade DB e disco.
- Where: validacao no script `scripts/installer/plugins-extended-csgo.sh`.
- Done when:
  - [x] Bloqueios antes de side effects implementados (PLGCSGO-REQ-001).
  - [x] Mensagens acionaveis para falta de pre-condicao.

### I-01 - Implementar instalacao SourceBans++ (servidor)

- What: provisionar artefatos de plugin/config, sem escopo web panel.
- Where: `scripts/installer/plugins-extended-csgo.sh`.
- Done when:
  - [x] Artefatos `.smx` e `sourcebans.cfg` existem (PLGCSGO-REQ-002).
  - [x] Config DB com permissoes 600 e sem vazamento em logs.

### T-02 - Plano de migracao SourceBans++

- What: aplicar schema SQL e registrar em `schema_migrations`.
- Where: `scripts/installer/sql/plugins-csgo/001_sourcebans.sql`.
- Done when:
  - [x] Prefixo `plgcsgo_sourcebans_*` aplicado.
  - [x] Reexecucao detecta e pula migracao.

### I-02 - Implementar instalacao Weapons & Knives

- What: provisionar artefatos `.smx` e configuracao DB para plugin de skins.
- Where: `scripts/installer/plugins-extended-csgo.sh`.
- Done when:
  - [x] Arquivos do plugin e cfg presentes (PLGCSGO-REQ-004).
  - [x] Config nao e sobrescrita quando valida (PLGCSGO-REQ-009).

### T-03 - Plano de migracao Weapons & Knives

- What: criar tabelas do plugin e registrar versao em `schema_migrations`.
- Where: `scripts/installer/sql/plugins-csgo/001_weaponsknives.sql`.
- Done when:
  - [x] Prefixo `plgcsgo_weaponsknives_*` aplicado.
  - [x] Reexecucao nao reaplica schema.

### I-03 - Implementar instalacao RankMe com backend MySQL

- What: provisionar `.smx` + cfg do RankMe forçando backend MySQL.
- Where: `scripts/installer/plugins-extended-csgo.sh`.
- Done when:
  - [x] Config aponta para `driver = mysql` e `database = fraghub_db` (PLGCSGO-REQ-006).
  - [x] Permissoes 600 no arquivo de configuracao.

### T-04 - Plano de migracao RankMe

- What: criar schema minimo do RankMe com prefixo dedicado.
- Where: `scripts/installer/sql/plugins-csgo/001_rankme.sql`.
- Done when:
  - [x] Prefixo `plgcsgo_rankme_*` aplicado.
  - [x] Risco de conflito minimizado com tabela dedicada.

### I-04 - Implementar manifesto e verificacao final CS:GO

- What: registrar versoes instaladas em manifesto e validar tabelas/arquivos/permissoes.
- Where: `scripts/installer/plugins-extended-csgo.sh`.
- Done when:
  - [x] Manifesto `/opt/fraghub/state/plugins-csgo.json` criado (PLGCSGO-NFR-004, AC-007).
  - [x] Verificacao final cobre AC-001..AC-004 e AC-008.

## Ordem recomendada de execucao

1. T-01 + I-01
2. T-02
3. I-02 + T-03
4. I-03 + T-04
5. I-04
