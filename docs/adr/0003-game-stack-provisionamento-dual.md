# ADR-0003: Provisionamento dual por trilhas de jogo

## Status

Accepted

## Contexto

A feature `game-stack-baseline` precisa provisionar CS2 e CS:GO Legacy no mesmo host, com requisitos e plugins distintos por jogo. Um fluxo unico sem separacao por trilha aumenta risco de falha cruzada e dificulta retomada.

## Decisao

Adotar provisionamento em trilhas explicitas por jogo dentro de um pipeline comum:

`game_precheck -> game_bootstrap -> (cs2_bundle) -> (csgo_bundle) -> service_config -> game_verify -> game_summary`

Cada trilha de jogo executa com verificacao minima propria e checkpoint independente.

## Consequencias

### Positivas

- Isola falhas por jogo e reduz impacto cruzado.
- Melhora reexecucao parcial com checkpoints mais granulares.
- Facilita manutencao incremental de bundles de plugins.

### Negativas

- Aumenta volume de controle de estado por etapa.
- Exige disciplina para manter contratos simetricos entre trilhas.

## Alternativas consideradas

1. Fluxo monolitico unico para ambos os jogos.
   - Rejeitada por baixa observabilidade e maior risco de estado parcial opaco.
2. Dois instaladores independentes (um por jogo) desde v0.1.
   - Rejeitada por friccao operacional maior para onboarding inicial.
