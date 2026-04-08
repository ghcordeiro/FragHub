# Sistema de Níveis FragHub

> Baseado no sistema da Faceit, com 10 níveis + Challenger

## Tabela de níveis

| Nível | ELO Mínimo | ELO Máximo | Tag In-Game | Cor |
|-------|------------|------------|-------------|-----|
| 1 | 100 | 500 | `[1]` | Verde |
| 2 | 501 | 750 | `[2]` | Verde |
| 3 | 751 | 900 | `[3]` | Verde/Amarelo |
| 4 | 901 | 1050 | `[4]` | Amarelo |
| 5 | 1051 | 1200 | `[5]` | Amarelo |
| 6 | 1201 | 1350 | `[6]` | Amarelo |
| 7 | 1351 | 1530 | `[7]` | Laranja |
| 8 | 1531 | 1750 | `[8]` | Laranja |
| 9 | 1751 | 2000 | `[9]` | Vermelho |
| 10 | 2001 | 2571 | `[10]` | Vermelho |
| ⚡ | 2572 | ∞ | `[10+]` | Vermelho (Challenger) |

## ELO inicial

- Novos jogadores começam com **1000 ELO** (Nível 4)
- Calibração nas primeiras 10 partidas (ganhos/perdas maiores)

## Cálculo de ELO

Usando sistema **Glicko-2** simplificado:

```
Ganho base: +25 ELO por vitória
Perda base: -25 ELO por derrota

Modificadores:
- ELO médio do time adversário > seu time: +5 a +15 extra
- ELO médio do time adversário < seu time: -5 a -15 penalidade
- MVP da partida: +5 bônus
- Período de calibração (10 primeiras): ±50% modificador
```

## Tags especiais

Tags especiais **sobrepõem** o nível numérico:

| Role | Tag | Prioridade |
|------|-----|------------|
| Admin | `[ADMIN]` | Sempre mostra, ignora nível |
| Moderador | `[MOD]` | Sempre mostra, ignora nível |
| VIP | `[VIP]` | Opcional, jogador escolhe |

## Exemplo de scoreboard

```
[ADMIN] ghcordeiro      24  8  5  53
[6]     xNightmare      18 12  3  39
[9]     ProPlayer       22  6  4  48
[3]     NewbieCS         5 16  2  12
[---]   SemConta         3 18  1   7
```

## Cores no chat (CS2)

| Níveis | Cor do nome |
|--------|-------------|
| 1-3 | Verde |
| 4-6 | Amarelo |
| 7-8 | Laranja |
| 9-10+ | Vermelho |
| ADMIN | Roxo |

## Progressão visual

```
Nível 1   [████░░░░░░] 100-500
Nível 2   [████░░░░░░] 501-750
Nível 3   [████░░░░░░] 751-900
Nível 4   [████░░░░░░] 901-1050
Nível 5   [████░░░░░░] 1051-1200
Nível 6   [██████░░░░] 1201-1350  ← Você está aqui (1322)
Nível 7   [░░░░░░░░░░] 1351-1530    28 ELO para próximo nível
Nível 8   [░░░░░░░░░░] 1531-1750
Nível 9   [░░░░░░░░░░] 1751-2000
Nível 10  [░░░░░░░░░░] 2001-2571
⚡        [░░░░░░░░░░] 2572+
```

## Decay (opcional, v2.0)

- Inatividade > 30 dias: -25 ELO/semana
- Máximo decay: até o ELO mínimo do nível atual -1
- Jogar 1 partida reseta o timer
