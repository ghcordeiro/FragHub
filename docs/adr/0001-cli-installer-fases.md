# ADR-0001: Pipeline de instalacao em fases

## Status

Accepted

## Contexto

O instalador do FragHub precisa ser previsivel para operadores com diferentes niveis tecnicos e precisa reduzir erros durante setup inicial.

## Decisao

Adotar uma arquitetura em pipeline com fases explicitas:
`precheck -> collect_input -> bootstrap -> configure -> verify -> summarize`.

## Consequencias

### Positivas

- Fluxo mais facil de observar e depurar.
- Permite checkpoints claros para retentativa.
- Facilita evolucao incremental por modulo.

### Negativas

- Requer disciplina para manter contratos entre fases.
- Pode aumentar complexidade de controle de estado.

## Alternativas consideradas

1. Script monolitico unico sem fases formais.
   - Rejeitada por baixa manutenibilidade e baixa observabilidade.
2. Orquestracao via ferramenta externa de provisioning.
   - Rejeitada em v0.1 para reduzir dependencia adicional.

