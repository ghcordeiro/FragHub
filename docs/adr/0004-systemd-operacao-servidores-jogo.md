# ADR-0004: Operacao baseline via unidades systemd por servidor

## Status

Accepted

## Contexto

Para operacao minima em producao, os servidores de jogo precisam de comandos padrao, reinicio previsivel e diagnostico simples apos reboot/falha. Depender apenas de invocacao manual aumenta risco operacional.

## Decisao

Criar unidades systemd dedicadas por servidor de jogo:

- `fraghub-cs2.service`
- `fraghub-csgo.service`

As unidades expõem ciclo basico (`start/stop/restart/status`) e logs centralizados via `journalctl`, com habilitacao de boot controlada por verificacao de health.

## Consequencias

### Positivas

- Operacao diaria simplificada para admins.
- Melhor integracao com padroes nativos do Ubuntu.
- Diagnostico mais rapido com logs de servico centralizados.

### Negativas

- Acrescenta superficie de configuracao para unidades.
- Requer cuidado com usuario/permissoes para evitar elevacao indevida.

## Alternativas consideradas

1. Operacao apenas com scripts ad-hoc.
   - Rejeitada por baixa padronizacao e pouca resiliencia em reboot.
2. PM2/supervisor para processos de jogo.
   - Rejeitada por desalinhamento com stack nativa definida na constituicao (`systemd`).
