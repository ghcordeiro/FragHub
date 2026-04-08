# Plano de validação — wizard `collect_input` (T-02)

## Escopo

Validar UX e regras de `scripts/installer/input.sh` conforme `CLI-REQ-002` e critérios de `I-02` em `tasks.md`.

## Campos obrigatórios — bloqueio até válido

| Campo | Caso inválido | Esperado |
| --- | --- | --- |
| Hostname | vazio, só espaços | Re-prompt até valor não vazio |
| Steam Web API Key | vazio | Re-prompt até preenchido |
| Admin email | sem `@`, formato inválido | Re-prompt |
| Admin password | menos de 8 caracteres | Re-prompt |

## Campos opcionais — omissão segura

| Campo | Ação | Esperado |
| --- | --- | --- |
| DB password | Enter vazio | Aceito (geração automática em etapa posterior) |
| RCON password | Enter vazio | Aceito (idem) |
| Domínio | Enter vazio | Aceito; arquivo sem valor ou vazio |
| Discord webhook | Enter vazio | Aceito |
| Google OAuth | Enter vazio em ambos | Aceito |
| Google OAuth | só Client ID ou só Secret | Re-prompt até ambos preenchidos ou ambos vazios |

## Discord webhook (quando preenchido)

- Deve começar com `https://`
- Caso contrário: re-prompt

## Saída e segurança

- Nenhuma senha ou API key em texto puro no resumo final do terminal
- Arquivo gerado com permissão `600`
- Resumo mostra apenas máscaras (`***`, últimos N caracteres se aplicável)

## Critérios de conclusão do T-02

- [x] Casos de campo vazio e formato inválido documentados
- [x] Critérios de bloqueio para obrigatórios definidos
- [x] Regras para opcionais e pares (Google) definidas
