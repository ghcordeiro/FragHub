# Plugins Extended CS:GO - Plan

## Objetivo de arquitetura

Estender a trilha CS:GO Legacy com SourceBans++ (somente componente servidor), Weapons & Knives e RankMe (MySQL), com schema rastreável em `schema_migrations`.

## Módulos e responsabilidades

1. `scripts/installer/plugins-extended-csgo.sh`
   - pre-check de dependências (plugins base + DB + disco + rede);
   - instalação/configuração dos plugins SourceMod;
   - aplicação de schema versionado (`plgcsgo_*`);
   - geração de manifesto local e validação de permissões 600.
2. `scripts/installer/sql/plugins-csgo/*.sql`
   - SQL para SourceBans++, Weapons & Knives e RankMe.
3. integração em pipeline/estado
   - etapa `plugins_extended_csgo` em `install.sh` + `state.sh`.

## Estratégia de idempotência

- skip de instalação se `.smx` já existir;
- skip de schema por `schema_migrations`;
- preservação de configs existentes.

## Critérios de saída

- [x] Script de instalação de plugins estendidos CS:GO implementado.
- [x] Configs de DB com permissão 600 validadas.
- [x] Manifesto em `/opt/fraghub/state/plugins-csgo.json` implementado.
- [ ] Gate humano de revisão/approve.
