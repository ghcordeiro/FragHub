# Auth UI - Especificacao da Feature

## Summary
Implementacao de todas as paginas e fluxos de autenticacao no portal React: login email/senha, registro, Google OAuth, vinculacao Steam pos-login, protecao de rotas autenticadas e gestao de sessao no cliente.

## System Process Context
1. Usuario acessa qualquer rota protegida e e redirecionado para `/login`
2. **Fluxo email/senha**: usuario preenche email e senha → frontend chama `POST /auth/login` → recebe access token + cookie httpOnly com refresh token → sessionStore atualizado → redireciona para rota original
3. **Fluxo Google OAuth**: usuario clica "Entrar com Google" → redirect para `GET /auth/google` → Google autentica → callback em `/auth/google/callback` → API retorna token → frontend armazena no sessionStore → redireciona
4. **Fluxo de registro**: usuario preenche nome, email, senha e confirmacao → frontend chama `POST /auth/register` → em sucesso faz login automatico → redireciona para home
5. **Fluxo de vinculacao Steam**: usuario autenticado acessa `/players/me` → clica "Vincular conta Steam" → redirect para `GET /auth/steam` → Steam OpenID autentica → callback em `/auth/steam/callback` → API vincula steamid ao usuario logado → pagina de perfil atualizada
6. **Refresh automatico**: qualquer chamada de API que retorna 401 dispara `POST /auth/refresh` usando o cookie httpOnly → novo access token armazenado no sessionStore → requisicao original refeita
7. **Logout**: usuario clica em "Sair" → frontend chama `POST /auth/logout` → sessionStore limpo → redireciona para `/login`

## Personas
- **Jogador novo**: quer se registrar rapidamente e comecar a jogar
- **Jogador retornante**: quer logar com email/senha ou Google sem fricao
- **Jogador com conta Steam**: quer vincular sua conta Steam ao perfil para entrar na queue
- **Admin**: pode criar contas manualmente via painel (fluxo admin separado do registro publico)

## Requisitos Funcionais

### AUTHUI-REQ-001 - Pagina de Login (`/login`)
A pagina deve conter: campo email (type=email, validacao client-side), campo senha (type=password), botao "Entrar" (submit), botao "Entrar com Google" (link externo para `/api/auth/google`), link "Criar conta" para `/register`. Ao submeter, deve exibir estado de loading no botao e desabilitar o formulario durante a requisicao.

### AUTHUI-REQ-002 - Pagina de Registro (`/register`)
A pagina deve conter: campo nome (min 2 chars), campo email, campo senha (min 8 chars), campo confirmar senha. Validacoes client-side devem verificar: formato de email valido, senha com ao menos 8 caracteres, senhas coincidentes. Em sucesso, deve fazer login automatico e redirecionar para `/`. Em falha de email ja cadastrado, deve exibir mensagem especifica sem expor se o email existe no sistema (mensagem generica de segurança).

### AUTHUI-REQ-003 - Fluxo Google OAuth (redirect-based)
Ao clicar "Entrar com Google", o usuario e redirecionado para `GET /api/auth/google`. A API gerencia o fluxo OAuth com o Google e redireciona para `/auth/callback?token=<access_token>` apos autenticacao. O frontend na rota `/auth/callback` deve: extrair o token da URL, armazenar no sessionStore, limpar o token da URL (history.replaceState) e redirecionar para `/`.

### AUTHUI-REQ-004 - Protecao de rotas autenticadas
O componente `ProtectedRoute` deve verificar `sessionStore.user !== null`. Se nao autenticado, deve redirecionar para `/login?redirect=<rota-original>`. Apos login bem-sucedido, deve redirecionar para a rota original salva no parametro `redirect`. As rotas `/players/me` e qualquer rota de admin devem ser protegidas.

### AUTHUI-REQ-005 - Gestao de sessao e refresh automatico de token
O hook `useSession` deve expor `user`, `isLoading` e `isAuthenticated`. Na inicializacao da app, deve tentar `POST /api/auth/refresh` para restaurar a sessao a partir do cookie httpOnly (sem exigir novo login apos reload). O modulo `src/services/http.ts` deve interceptar respostas 401 e executar o refresh automaticamente antes de retentar a requisicao original (uma unica vez para evitar loop infinito).

### AUTHUI-REQ-006 - Secao de vinculacao Steam no perfil
Na pagina `/players/me`, se `user.steamId === null`, deve exibir secao "Vincular conta Steam" com botao que redireciona para `GET /api/auth/steam`. Apos o callback de vinculacao em `/auth/steam/callback`, a pagina deve exibir confirmacao de sucesso e atualizar os dados do perfil. Se a conta Steam ja estiver vinculada a outro usuario, deve exibir mensagem de erro especifica.

### AUTHUI-REQ-007 - Feedback de erros tipados
Os seguintes erros devem exibir mensagens especificas (nao genericas):
- `401 Unauthorized` no login: "Email ou senha incorretos"
- `409 Conflict` no registro: "Este email ja esta em uso"
- Steam ja vinculada a outra conta: "Esta conta Steam ja esta associada a outro perfil"
- Erro de rede/timeout: "Nao foi possivel conectar ao servidor. Tente novamente."
- Erros desconhecidos: "Ocorreu um erro inesperado. Tente novamente."

### AUTHUI-REQ-008 - Logout
O botao "Sair" disponivel no header (quando autenticado) deve: chamar `POST /api/auth/logout`, limpar `sessionStore` (setando `user` e `accessToken` para null) e redirecionar para `/login`. O logout deve funcionar mesmo se a chamada de API falhar (limpar store localmente de qualquer forma).

### AUTHUI-REQ-009 - Formularios acessiveis
Todos os formularios de auth devem ter: labels associados via `htmlFor`/`id`, mensagens de erro vinculadas via `aria-describedby`, `aria-invalid="true"` em campos com erro, foco automatico no primeiro campo com erro apos submit falho, navegacao completa por teclado (Tab/Enter/Escape).

## Requisitos Nao Funcionais

### AUTHUI-NFR-001 - Access token exclusivamente em memoria
O `accessToken` deve ser armazenado apenas no Zustand store (memoria RAM), nunca em `localStorage`, `sessionStorage` ou cookies acessiveis a JavaScript. Essa e a principal defesa contra ataques XSS.

### AUTHUI-NFR-002 - Nenhuma informacao sensivel na URL
Tokens, senhas ou dados de sessao nunca devem aparecer em parametros de URL alem do fluxo OAuth callback (onde o token e imediatamente consumido e removido da URL via `history.replaceState`).

### AUTHUI-NFR-003 - Consistencia de estado entre abas
Ao fazer logout em uma aba, as demais abas devem detectar a invalidacao da sessao e redirecionar para `/login` na proxima chamada de API que retornar 401 (sem necessidade de sincronizacao em tempo real via BroadcastChannel).

### AUTHUI-NFR-004 - Tempo de resposta percebido
O estado de loading deve aparecer em no maximo 100ms apos o submit do formulario, evitando a percepcao de que o botao nao respondeu ao clique.

## Criterios de Aceitacao
- **AC-001**: Usuario com credenciais validas preenche email e senha em `/login`, clica "Entrar" e e redirecionado para `/` com o nome exibido no header
- **AC-002**: Usuario nao autenticado que acessa `/players/me` e redirecionado para `/login?redirect=/players/me` e, apos login, e redirecionado de volta para `/players/me`
- **AC-003**: Apos reload da pagina com sessao ativa, o usuario permanece logado (refresh token via cookie httpOnly restaura a sessao sem exigir novo login)
- **AC-004**: Usuario clica "Entrar com Google", autentica com Google e e redirecionado para `/` com sessao ativa; a URL nao contem o token apos o redirecionamento final
- **AC-005**: Usuario autenticado acessa `/players/me`, clica "Vincular conta Steam", autentica na Steam e retorna com `steamId` vinculado exibido no perfil
- **AC-006**: Usuario digita senha incorreta em `/login` e ve a mensagem "Email ou senha incorretos" sem que a pagina recarregue
- **AC-007**: Usuario tenta registrar com email ja existente e ve mensagem de conflito sem exposicao de dados de outros usuarios
- **AC-008**: Usuario clica "Sair", e redirecionado para `/login` e ao tentar acessar `/players/me` diretamente e novamente redirecionado para `/login`

## Out of Scope (esta feature)
- Pagina de recuperacao de senha ("Esqueci minha senha") — feature futura
- Autenticacao de dois fatores (2FA) — feature futura
- Fluxo de convite por link para comunidades privadas — feature futura
- Painel admin para criacao manual de contas — coberto por feature `admin-panel`
- Login via Steam como metodo primario (Steam e apenas vinculacao pos-login)
- Verificacao de email apos registro — postergado para versao posterior

## Dependencias
- `frontend-setup` concluida: projeto React com Zustand e React Router configurados
- `auth-api` concluida: endpoints `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/google`, `GET /auth/google/callback`
- `steam-integration` concluida: endpoints `GET /auth/steam`, `GET /auth/steam/callback`
- `nginx-ssl` concluida: Nginx servindo frontend e fazendo proxy para a API

## Riscos Iniciais
- **Fluxo OAuth em popup vs redirect**: usar redirect e mais simples e compativel com bloqueadores de popup; o estado pre-OAuth (rota de origem) deve ser preservado em sessionStorage temporario antes do redirect
- **Refresh token race condition**: multiplas abas fazendo refresh simultaneamente podem invalidar o cookie; implementar lock simples ou aceitar que uma das abas faca logout gracioso
- **Steam OpenID callback**: o callback da Steam chega com muitos parametros na URL; garantir que o frontend nao interprete esses parametros como erros
- **Cookie httpOnly nao acessivel a JS**: e seguro por design, mas exige que o endpoint `/auth/refresh` seja chamado proativamente na inicializacao da app para restaurar a sessao
