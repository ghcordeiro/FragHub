#!/usr/bin/env bash
# Funções reutilizáveis: download de releases GitHub/AlliedModders e deploy para árvore CS2.
# Se GITHUB_TOKEN estiver definido, é usado em todos os pedidos à API GitHub
# para evitar rate limiting (60 req/h anonimo → 5000 req/h autenticado).

_fraghub_python_gh_fetch() {
  # Executes an inline Python snippet with GITHUB_TOKEN forwarded.
  FRAGHUB_GH_TOKEN="${GITHUB_TOKEN:-}" python3 "$@"
}

# Resolve URL do asset .zip principal do CS2-SimpleAdmin (exclui StatusBlocker).
fraghub_github_cs2_simpleadmin_zip_url() {
  _fraghub_python_gh_fetch - <<'PYEOF'
import json, sys, os, urllib.request
token = os.environ.get('FRAGHUB_GH_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'fraghub-installer'}
if token:
    headers['Authorization'] = f'Bearer {token}'
url = 'https://api.github.com/repos/daffyyyy/CS2-SimpleAdmin/releases/latest'
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=60) as r:
    data = json.load(r)
for a in data.get('assets', []):
    n = a.get('name', '')
    if n.startswith('CS2-SimpleAdmin-') and n.endswith('.zip') and 'StatusBlocker' not in n:
        print(a['browser_download_url'])
        sys.exit(0)
sys.exit(1)
PYEOF
}

fraghub_metamod_tar_url() {
  _fraghub_python_gh_fetch - <<'PYEOF'
import json, sys, os, urllib.request
token = os.environ.get('FRAGHUB_GH_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'fraghub-installer'}
if token:
    headers['Authorization'] = f'Bearer {token}'
url = 'https://api.github.com/repos/alliedmodders/metamod-source/releases'
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=60) as r:
    releases = json.load(r)
for release in releases:
    if not release.get('tag_name', '').startswith('2.'):
        continue
    for a in release.get('assets', []):
        n = a.get('name', '')
        if n.startswith('mmsource-2.') and n.endswith('-linux.tar.gz'):
            print(a['browser_download_url'])
            sys.exit(0)
sys.exit(1)
PYEOF
}

fraghub_css_zip_url() {
  _fraghub_python_gh_fetch - <<'PYEOF'
import json, sys, os, urllib.request
token = os.environ.get('FRAGHUB_GH_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'fraghub-installer'}
if token:
    headers['Authorization'] = f'Bearer {token}'
url = 'https://api.github.com/repos/roflmuffin/CounterStrikeSharp/releases/latest'
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=60) as r:
    data = json.load(r)
for a in data.get('assets', []):
    n = a.get('name', '')
    if 'with-runtime' in n and 'linux' in n and n.endswith('.zip'):
        print(a['browser_download_url'])
        sys.exit(0)
sys.exit(1)
PYEOF
}

fraghub_matchzy_zip_url() {
  _fraghub_python_gh_fetch - <<'PYEOF'
import json, sys, os, urllib.request
token = os.environ.get('FRAGHUB_GH_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'fraghub-installer'}
if token:
    headers['Authorization'] = f'Bearer {token}'
url = 'https://api.github.com/repos/shobhit-pathak/MatchZy/releases/latest'
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=60) as r:
    data = json.load(r)
for a in data.get('assets', []):
    n = a.get('name', '')
    if n.startswith('MatchZy-') and n.endswith('.zip') and 'with-cssharp' not in n:
        print(a['browser_download_url'])
        sys.exit(0)
sys.exit(1)
PYEOF
}

fraghub_github_weaponpaints_zip_url() {
  _fraghub_python_gh_fetch - <<'PYEOF'
import json, sys, os, urllib.request
token = os.environ.get('FRAGHUB_GH_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'fraghub-installer'}
if token:
    headers['Authorization'] = f'Bearer {token}'
url = 'https://api.github.com/repos/Nereziel/cs2-WeaponPaints/releases/latest'
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=120) as r:
    data = json.load(r)
for a in data.get('assets', []):
    if a.get('name') == 'WeaponPaints.zip':
        print(a['browser_download_url'])
        sys.exit(0)
sys.exit(1)
PYEOF
}
