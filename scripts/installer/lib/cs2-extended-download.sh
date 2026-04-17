#!/usr/bin/env bash
# Funções reutilizáveis: download de releases GitHub e deploy para árvore CS2 (CounterStrikeSharp).

# Resolve URL do asset .zip principal do CS2-SimpleAdmin (exclui StatusBlocker).
fraghub_github_cs2_simpleadmin_zip_url() {
  python3 -c "
import json, sys, urllib.request
url = 'https://api.github.com/repos/daffyyyy/CS2-SimpleAdmin/releases/latest'
req = urllib.request.Request(url, headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'fraghub-installer'})
with urllib.request.urlopen(req, timeout=60) as r:
    data = json.load(r)
for a in data.get('assets', []):
    n = a.get('name', '')
    if n.startswith('CS2-SimpleAdmin-') and n.endswith('.zip') and 'StatusBlocker' not in n:
        print(a['browser_download_url'])
        sys.exit(0)
sys.exit(1)
"
}

fraghub_github_weaponpaints_zip_url() {
  python3 -c "
import json, sys, urllib.request
url = 'https://api.github.com/repos/Nereziel/cs2-WeaponPaints/releases/latest'
req = urllib.request.Request(url, headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'fraghub-installer'})
with urllib.request.urlopen(req, timeout=120) as r:
    data = json.load(r)
for a in data.get('assets', []):
    if a.get('name') == 'WeaponPaints.zip':
        print(a['browser_download_url'])
        sys.exit(0)
sys.exit(1)
"
}
