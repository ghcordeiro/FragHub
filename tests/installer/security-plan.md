# Plano de segurança — segredos e logs (T-03)

## Variáveis sensíveis

| Variável | Notas |
| --- | --- |
| `FRAGHUB_STEAM_WEB_API_KEY` | Nunca em claro em stdout nem em `LOG_FILE` |
| `FRAGHUB_DB_PASSWORD` | Idem; pode ser gerada em `secrets.sh` |
| `FRAGHUB_RCON_PASSWORD` | Idem |
| `FRAGHUB_ADMIN_PASSWORD` | Idem |
| `FRAGHUB_GOOGLE_CLIENT_SECRET` | Idem |
| `FRAGHUB_GOOGLE_CLIENT_ID` | Tratada como sensível em logs (redação defensiva) |

## Critério de mascaramento

1. **Mensagens de log**: não interpolar valores de segredos nas strings passadas a `fraghub_log`; apenas textos fixos.
2. **Defesa em profundidade**: `fraghub_mask_secrets` substitui ocorrências dos valores atuais das variáveis acima na mensagem, se existirem e tiverem comprimento ≥ 4.
3. **Persistência**: `input.env` e `effective.env` com permissão **600** e localização apenas em `~/.fraghub/installer/`.

## Geração automática (CLI-REQ-003)

- Se `FRAGHUB_DB_PASSWORD` ou `FRAGHUB_RCON_PASSWORD` estiver vazio após `input.sh`, `secrets.sh` gera senha forte (24 caracteres, `openssl` ou fallback `/dev/urandom`).
- Log registra apenas *que* foi gerada, nunca o valor.

## Checklist de verificação manual

- [ ] Correr `input.sh` com DB/RCON vazios; correr `secrets.sh`; confirmar que o log não contém as senhas em claro.
- [ ] Procurar no ficheiro de log por substrings da Steam key após o wizard: não deve aparecer.
- [ ] `ls -l ~/.fraghub/installer/effective.env` mostra `-rw-------`.

## Critérios de conclusão do T-03

- [x] Lista de segredos sensíveis validada
- [x] Critério de mascaramento definido
