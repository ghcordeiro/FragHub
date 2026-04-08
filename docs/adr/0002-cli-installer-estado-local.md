# ADR-0002: Estado local para idempotencia basica

## Status

Accepted

## Contexto

O installer sera executado em ambientes reais sujeitos a falhas de rede, timeout e interrupcoes manuais. Sem controle de estado, a reexecucao pode duplicar ou corromper configuracoes.

## Decisao

Persistir estado local por etapa concluida em arquivo controlado pelo installer.
Cada etapa so pode ser "pulada" apos verificar consistencia minima de saida.

## Consequencias

### Positivas

- Reexecucao mais segura e previsivel.
- Menor tempo de recuperacao apos falha parcial.
- Melhor base para diagnostico e suporte.

### Negativas

- Introduz necessidade de manter compatibilidade de schema de estado.
- Pode exigir comandos de reparo quando estado ficar inconsistente.

## Alternativas consideradas

1. Sem estado persistido, apenas execucao linear.
   - Rejeitada por risco alto de repeticao destrutiva.
2. Estado remoto em banco de dados desde v0.1.
   - Rejeitada por complexidade adicional prematura.

