# Game Services - Validation Plan (T-05)

## Objetivo

Validar criacao e operacao baseline das unidades `fraghub-cs2.service` e `fraghub-csgo.service`.

## Casos de teste

### GSV-01 - Units criadas e detectaveis

- Setup: `plugins-cs2.done` e `plugins-csgo.done` presentes.
- Execucao: `bash scripts/installer/game-services.sh`.
- Esperado:
  - arquivos de unit criados (`fraghub-cs2.service`, `fraghub-csgo.service`);
  - `game-services.done` criado.

### GSV-02 - Operacoes basicas

- Setup: units instaladas no systemd.
- Execucao:
  - `systemctl status fraghub-cs2`
  - `systemctl status fraghub-csgo`
- Esperado:
  - comandos executam sem erro de unit inexistente.

### GSV-03 - Logs de servico

- Setup: units instaladas.
- Execucao:
  - `journalctl -u fraghub-cs2 --no-pager -n 20`
  - `journalctl -u fraghub-csgo --no-pager -n 20`
- Esperado:
  - logs acessiveis para diagnostico.

## Critérios de aceite da task T-05

- Cenarios operacionais e de falha documentados.
- Criterios de PASS/FAIL para servicos de cada jogo definidos.
