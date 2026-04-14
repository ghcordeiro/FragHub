# nginx-ssl — Validation

> **Gate:** Validate ✅  
> **Aprovador:** utilizador  
> **Data:** 2026-04-14

## Checklist de Validação

- [x] Nginx reverse proxy configurado
- [x] Certbot SSL/TLS integrado no installer
- [x] Suporte a HTTP → HTTPS redirect
- [x] Certificado automático (Let's Encrypt)
- [x] Renovação automática de certificado
- [x] API backend proxy (port 3000)
- [x] Frontend static proxy

## Acceptance Criteria (SDD)

| AC | Descrição | Evidência |
|----|-----------|-----------| 
| AC-001 | Nginx configuration válida | `nginx -t` — ✅ passa |
| AC-002 | SSL/TLS habilitado | Certbot configurado — ✅ ativo |
| AC-003 | API proxy funciona | Requests → `http://127.0.0.1:3000` — ✅ direto |
| AC-004 | Frontend static servido | `dist/` → Nginx root — ✅ configurado |
| AC-005 | Auto-renewal ativo | `systemctl status certbot.timer` — ✅ enabled |

## Network Configuration

```
80 (HTTP)  → 443 (HTTPS) redirect
443 (HTTPS) → nginx reverse proxy
           ├── /api/* → API backend (3000)
           └── /* → Frontend static (dist/)
```

## Status

**✅ VALIDADO** — reverse proxy pronto para produção com SSL automático.
