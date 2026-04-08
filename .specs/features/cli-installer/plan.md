# CLI Installer - Plan

## Objetivo de arquitetura

Entregar um instalador confiavel, idempotente e seguro para provisionar o baseline do FragHub em Ubuntu suportado com baixo risco operacional.

## Escopo deste plano

- Orquestracao do fluxo de instalacao em fases.
- Modelo de estado para idempotencia basica e retomada segura.
- Estrategia de validacao e rollback pragmatico.
- Estrutura de logs e mascaramento de segredos.

## Arquitetura proposta

### Modulos

1. `precheck`
   - valida SO, arquitetura, sudo, disco, RAM e rede.
2. `collect_input`
   - wizard de configuracao com validacoes de entrada.
3. `bootstrap`
   - instala dependencias base e prepara estrutura de diretorios.
4. `configure`
   - aplica configuracoes de servicos, firewall e segredos.
5. `verify`
   - executa health checks e confirma estado minimo pronto.
6. `summarize`
   - gera relatorio de conclusao, pendencias e proximos passos.

### Contratos internos

- Cada modulo retorna `OK`, `WARN` ou `FAIL`.
- `FAIL` interrompe pipeline e encaminha para rotina de diagnostico.
- `WARN` permite continuidade, mas registra risco no resumo final.

## Estrategia de idempotencia

- Persistir estado por etapa em arquivo local de estado do installer.
- Antes de executar uma etapa, verificar marcador de conclusao e consistencia minima.
- Reaplicar apenas etapas incompletas ou invalidadas.
- Evitar "skip cego": validacao de pre-condicao antes de pular etapa.

## Estrategia de rollback

- Rollback sera **best-effort** em v0.1:
  - remover artefatos temporarios da etapa falha
  - nao desmontar componentes ja estaveis sem necessidade
- Falha sempre produz instrucoes de recuperacao manual.

## Observabilidade e seguranca

- Logs estruturados por etapa (`INFO/WARN/ERROR`).
- Segredos mascarados no stdout e em logs.
- Arquivos sensiveis com permissoes restritas.

## Entregaveis obrigatorios desta fase

- `spec.md` (ja produzido)
- ADR-0001: arquitetura em fases
- ADR-0002: estado local para idempotencia
- C4 L1 (Context) e L2 (Container)

## Riscos e mitigacoes

- **Dependencias externas instaveis** -> retries com limite e mensagens acionaveis.
- **Ambientes heterogeneos** -> prechecks fortes e abort precoce.
- **Erros parciais** -> estado por etapa + resumo de recuperacao.

## Critérios de saída da fase Plan

- [x] Arquitetura documentada e consistente com `CONSTITUTION.md`
- [x] Decisoes significativas registradas em ADR
- [x] Diagramas C4 L1 e L2 publicados
- [ ] Gate humano para avancar para `tasks.md`
