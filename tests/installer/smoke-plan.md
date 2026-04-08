# Plano de smoke — baseline pós-bootstrap (T-05)

## Objetivo

Definir verificação mínima após `bootstrap.sh` / `verify.sh`, alinhada a **CLI-REQ-004**, **CLI-REQ-006** e **I-05**.

## Componentes obrigatórios (v0.1 baseline)

| Componente | Verificação | PASS |
| --- | --- | --- |
| Nginx | `systemctl is-active nginx` (ou equivalente) | `active` |
| MariaDB | `systemctl is-active mariadb` | `active` |
| Node.js 20 | `node -v` | prefixo `v20.` |
| UFW | `ufw status` | `active` (ou regras listadas após enable) |
| LinuxGSM | ficheiro `linuxgsm.sh` executável no diretório configurado | existe |
| Utilizador `fraghub` | `id fraghub` | utilizador de sistema existe |

## Componentes pendentes / opcionais (esperado em v0.1)

- Servidor de jogo CS2/CS:GO instalado via SteamCMD/LinuxGSM (próximas milestones).
- SSL / certbot (domínio opcional no wizard).
- Portal Node em produção com PM2/systemd (próxima fase).

## Critérios PASS/FAIL do smoke (`verify.sh`)

- **PASS**: todas as verificações obrigatórias acima OK; criado marcador local `verify.passed` (ver `verify.sh`).
- **FAIL**: qualquer verificação obrigatória falha; exit ≠ 0; marcador não criado ou removido.

## Execução manual sugerida

1. `sudo ./scripts/installer/install.sh` até concluir `secrets` (ou ambiente de teste com `effective.env`).
2. Garantir que `bootstrap.sh` correu com sucesso em Ubuntu real.
3. `./scripts/installer/verify.sh` ou pipeline completo.
4. Confirmar portas esperadas no resumo (`summary.sh`): 80 (HTTP), 22 (SSH), 27015 (jogo quando existir).

## Critérios de conclusão do T-05

- [x] Lista de componentes obrigatórios definida
- [x] Critérios de PASS/FAIL claros
