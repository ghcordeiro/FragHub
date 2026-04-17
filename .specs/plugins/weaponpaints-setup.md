# WeaponPaints CS2 — Setup & Troubleshooting

**Plugin:** [Nereziel/cs2-WeaponPaints](https://github.com/Nereziel/cs2-WeaponPaints)  
**Script de instalação:** `scripts/installer/plugins-extended-cs2.sh`

---

## Dependências obrigatórias (ordem de instalação)

| Plugin | Repo | Destino |
|--------|------|---------|
| AnyBaseLibCS2 | NickFox007/AnyBaseLibCS2 | `shared/AnyBaseLib/` |
| PlayerSettingsCS2 | NickFox007/PlayerSettingsCS2 | `plugins/PlayerSettings/` |
| MenuManagerCS2 | NickFox007/MenuManagerCS2 | `plugins/MenuManagerCore/` |
| **WeaponPaints** | Nereziel/cs2-WeaponPaints | `plugins/WeaponPaints/` |

A ordem importa: AnyBaseLib → PlayerSettings → MenuManager → WeaponPaints.

---

## Configuração obrigatória

### `configs/plugins/WeaponPaints/WeaponPaints.json`

Gerado pelo installer com as credenciais do `fraghub_app`. Chaves que o plugin espera (diferente de outros plugins que usam `host`/`username`):

```json
{
  "DatabaseHost": "127.0.0.1",
  "DatabasePort": 3306,
  "DatabaseUser": "fraghub_app",
  "DatabasePassword": "...",
  "DatabaseName": "fraghub_db",
  "Website": "",
  "KnifeEnabled": true,
  "GloveEnabled": true,
  "AgentEnabled": true,
  "MusicEnabled": true,
  "PinsEnabled": true,
  "StickerInfo": true,
  "KeyChainInfo": true,
  "StatTrak": true,
  "CmdRefreshCooldownSeconds": 5
}
```

`Website: ""` desativa o modo web — toda a seleção é feita por menus in-game.

### `configs/core.json`

```json
{ "FollowCS2ServerGuidelines": false }
```

Necessário para WeaponPaints aplicar facas e luvas (usa APIs internas do CS2).

### `gamedata/weaponpaints.json`

O ficheiro deve ser **copiado** da pasta do plugin (`plugins/WeaponPaints/gamedata/weaponpaints.json`) para `gamedata/`. Adicionalmente, as suas assinaturas devem ser **mergeadas** no `gamedata.json` principal — o CSS v1.0.x não carrega gamedata de plugins automaticamente.

Ambas as operações são feitas pela função `configure_weaponpaints_gamedata` no installer.

---

## Schema da base de dados

O plugin cria as suas próprias tabelas no primeiro arranque via `CheckDatabaseTables()`. O ficheiro `sql/plugins-cs2/001_weaponpaints.sql` serve como referência e é aplicado pelo installer para garantir idempotência.

**6 tabelas criadas pelo plugin:**

| Tabela | Chave primária |
|--------|---------------|
| `wp_player_skins` | `steamid`, `weapon_team`, `weapon_defindex` |
| `wp_player_knife` | `steamid`, `weapon_team` |
| `wp_player_gloves` | `steamid`, `weapon_team` |
| `wp_player_agents` | `steamid` |
| `wp_player_music` | `steamid`, `weapon_team` |
| `wp_player_pins` | `steamid`, `weapon_team` |

**Nota:** O campo de identificação do jogador chama-se `steamid` (sem underscore). Uma versão anterior do SQL usava `steam_id` incorretamente.

---

## Comandos in-game

| Comando | Função |
|---------|--------|
| `!skins` / `/skins` | Menu de skins por arma |
| `!knife` / `/knife` | Menu de facas |
| `!gloves` / `/gloves` | Menu de luvas |
| `!agents` / `/agents` | Menu de agentes |
| `!music` / `/music` | Menu de kits de música |
| `!pins` / `/pins` | Menu de pins |
| `!wp` / `/wp` | Refresh manual (cooldown: 5s) |

`/ws` mostra a mensagem configurada em `Website` — com `Website: ""` não faz nada útil.

---

## Problemas encontrados e resoluções

### 1. `TypeInitializationException: Method CAttributeList_SetOrAddAttributeValueByName not found`

**Causa:** CSS v1.0.x não carrega gamedata de plugins automaticamente.  
**Solução:** Copiar `weaponpaints.json` para `gamedata/` e mergear no `gamedata.json` principal.

### 2. `KeyNotFoundException: The given key 'menu:nfcore'`

**Causa:** MenuManagerCS2 (e as suas dependências) não estavam instalados.  
**Solução:** Instalar AnyBaseLibCS2 → PlayerSettingsCS2 → MenuManagerCS2 antes do WeaponPaints.

### 3. `Unknown column 'steamid' in 'WHERE'`

**Causa:** A migração SQL inicial criava a tabela com `steam_id` em vez de `steamid`, e faltavam 5 das 6 tabelas necessárias.  
**Solução:** Remover a tabela incorreta e deixar o plugin recriar todas as tabelas no arranque.

### 4. "You can't refresh weapon paints right now"

**Causa:** `CmdRefreshCooldownSeconds` estava a 60 segundos.  
**Solução:** Valor reduzido para 5 (padrão do plugin).
