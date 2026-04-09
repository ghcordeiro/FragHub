# Plugins Extended CS2 - Plan

## Objetivo de arquitetura

Estender a trilha CS2 com CS2-SimpleAdmin, WeaponPaints e demo-recorder pós-partida, com schema rastreável em `schema_migrations`.

## Módulos e responsabilidades

1. `scripts/installer/plugins-extended-cs2.sh`
   - pre-check de dependências (plugins base + DB + disco + rede);
   - instalação/configuração dos plugins;
   - aplicação de schema versionado (`plgcs2_*`);
   - configuração de demos e manifesto local.
2. `scripts/installer/sql/plugins-cs2/*.sql`
   - SQL de schema para SimpleAdmin e WeaponPaints.
3. integração de pipeline/estado
   - etapa `plugins_extended_cs2` em `install.sh` + `state.sh`.

## Estratégia de idempotência

- skip de instalação se arquivo de plugin já existir;
- skip de schema por presença em `schema_migrations`;
- preservação de config existente válida.

## Critérios de saída

- [x] Script de instalação de plugins estendidos CS2 implementado.
- [x] Registro de versões em `/opt/fraghub/state/plugins-cs2.json`.
- [x] Verificações de diretório de demos e tabelas implementadas.
- [ ] Gate humano de revisão/approve.
