# Frontend Setup - Especificacao da Feature

## Summary
Bootstrap do projeto React 18+ com TypeScript strict, Vite, ESLint, Prettier, React Router v6 e Zustand no diretorio `/opt/fraghub/portal/`, com build de producao servido pelo Nginx.

## System Process Context
1. Operador executa etapa `frontend_setup` do installer bash
2. Installer instala Node.js 20 LTS (caso ainda nao presente) e cria diretorio `/opt/fraghub/portal/`
3. Installer executa `npm create vite@latest` com template React + TypeScript
4. Installer instala dependencias: `react-router-dom`, `zustand`; devDependencias: `eslint`, `prettier`, `@typescript-eslint/*`
5. Installer copia arquivos de configuracao base (`.eslintrc`, `.prettierrc`, `tsconfig.json` strict)
6. Installer executa `npm run build` e valida que o diretorio `dist/` foi gerado
7. Nginx (via feature `nginx-ssl`) passa a servir o `dist/` como arquivos estaticos
8. Developer acessa `http(s)://<host>/` e ve a pagina inicial do portal

## Personas
- **Operador**: precisa de um portal web funcional apos executar o installer uma unica vez
- **Developer contributor**: precisa de um projeto frontend bem estruturado, com linting e formatacao configurados, para contribuir com novas paginas e componentes
- **Admin**: precisa acessar o portal pelo browser para gerenciar o servidor

## Requisitos Funcionais

### FESETUP-REQ-001 - Scaffold do projeto Vite + React + TypeScript
O installer deve criar um projeto Vite com template `react-ts` em `/opt/fraghub/portal/`. O `tsconfig.json` deve ter `"strict": true`, `"noImplicitAny": true` e `"strictNullChecks": true`. O arquivo `vite.config.ts` deve ser gerado com suporte a aliases de caminho (`@/` → `src/`).

### FESETUP-REQ-002 - Estrutura de pastas padronizada
O projeto deve conter os seguintes diretorios dentro de `src/`:
- `pages/` — componentes de pagina mapeados a rotas
- `components/` — componentes reutilizaveis e atomicos
- `hooks/` — custom hooks React
- `services/` — modulos de chamada a API usando fetch nativa
- `store/` — slices Zustand para estado global

Cada diretorio deve conter um arquivo `index.ts` de barrel export.

### FESETUP-REQ-003 - ESLint e Prettier configurados
Deve existir `.eslintrc.cjs` com as regras: `@typescript-eslint/recommended`, `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`. Deve existir `.prettierrc` com `singleQuote: true`, `semi: false`, `printWidth: 100`. O script `npm run lint` deve rodar sem erros no codigo inicial gerado.

### FESETUP-REQ-004 - Roteamento SPA com React Router v6
O arquivo `src/router.tsx` deve definir as rotas da aplicacao usando `createBrowserRouter`. A rota `/` deve renderizar uma pagina `HomePage` placeholder. O Nginx deve ser configurado (via feature `nginx-ssl`) para redirecionar qualquer path desconhecido para `index.html` (suporte a SPA routing).

### FESETUP-REQ-005 - Estado global de sessao com Zustand
Deve existir `src/store/sessionStore.ts` com slice Zustand contendo: `accessToken: string | null`, `user: { id, name, email, role } | null`, acoes `setSession`, `clearSession`. O access token deve ser armazenado exclusivamente em memoria (Zustand), nunca em `localStorage` ou `sessionStorage`.

### FESETUP-REQ-006 - Variaveis de ambiente via arquivo .env
O projeto deve ler `VITE_API_URL` de arquivo `.env` (e `.env.production` para build de producao). O installer deve gerar o `.env` com o valor correto baseado no host configurado. Todas as chamadas de API em `src/services/` devem usar `import.meta.env.VITE_API_URL` como base URL.

### FESETUP-REQ-007 - Build de producao funcional
O script `npm run build` deve gerar o diretorio `dist/` sem erros. O installer deve executar o build automaticamente ao final do setup e validar a existencia de `dist/index.html`. O diretorio `dist/` deve ser o docroot servido pelo Nginx.

### FESETUP-REQ-008 - Cliente HTTP sem dependencias externas
O modulo `src/services/http.ts` deve implementar um wrapper sobre a `fetch` nativa com: injecao automatica do `Authorization: Bearer <token>` a partir do sessionStore, tratamento de respostas nao-2xx lancando erros tipados, suporte a refresh automatico de token (chama `/auth/refresh` em caso de 401 e retentar a requisicao original uma vez).

## Requisitos Nao Funcionais

### FESETUP-NFR-001 - Tamanho do bundle inicial
O bundle inicial (JS + CSS) nao deve exceder 300 KB gzip apos build de producao para a pagina inicial, garantindo carregamento rapido mesmo em conexoes lentas.

### FESETUP-NFR-002 - Compatibilidade de browsers
O projeto deve compilar para targets modernos (`es2020`, `chrome90`, `firefox88`, `safari14`). Nao e necessario suporte a IE11.

### FESETUP-NFR-003 - Tempo de build
O `npm run build` deve concluir em menos de 60 segundos em hardware equivalente ao servidor minimo suportado (2 vCPU, 4 GB RAM).

### FESETUP-NFR-004 - Nenhuma dependencia de runtime desnecessaria
O `package.json` nao deve incluir `axios`, `lodash`, `moment` ou qualquer biblioteca de utilitarios generalistas. Preferir APIs nativas do browser e do Node.js.

## Criterios de Aceitacao
- **AC-001**: Apos executar o installer, o diretorio `/opt/fraghub/portal/dist/index.html` existe e o Nginx serve `200 OK` na raiz `/`
- **AC-002**: `npm run lint` executado em `/opt/fraghub/portal/` retorna exit code 0 sem erros nem warnings no codigo gerado
- **AC-003**: `npm run build` conclui com exit code 0 e o diretorio `dist/` e criado com ao menos `index.html` e arquivos JS/CSS hasheados
- **AC-004**: Acessar `/qualquer-rota-inexistente` no browser retorna o `index.html` do portal (SPA routing funcionando via Nginx)
- **AC-005**: O `src/store/sessionStore.ts` exporta `useSessionStore` e o estado `accessToken` nao persiste apos reload da pagina (nao usa localStorage)
- **AC-006**: O arquivo `.env` gerado pelo installer contem `VITE_API_URL=http(s)://<host>/api` e o build de producao incorpora o valor corretamente
- **AC-007**: `tsc --noEmit` executado no projeto retorna exit code 0 sem erros de tipo

## Out of Scope (esta feature)
- Implementacao de paginas reais de autenticacao, perfil ou leaderboard (cobertas por features subsequentes)
- Configuracao do Nginx ou SSL (coberta pela feature `nginx-ssl`)
- Testes automatizados unitarios ou E2E do frontend (cobertos por feature dedicada futura)
- Server-side rendering (SSR) ou Static Site Generation (SSG)
- Internacionalizacao (i18n) ou suporte a multiplos idiomas
- Design system ou biblioteca de componentes UI (Tailwind, MUI, etc.) — decisao postergada para feature de UI components

## Dependencias
- `api-setup` concluida: API Node.js rodando em `localhost:3000` com `GET /health` respondendo
- Node.js 20 LTS disponivel no servidor (instalado pelo `cli-installer`)
- Feature `nginx-ssl` deve ser executada em seguida para servir o `dist/`

## Riscos Iniciais
- **Base path do Vite**: se o portal for servido em subpath (ex: `/app/`), o `vite.config.ts` deve ter `base: '/app/'` configurado; installer deve parametrizar isso
- **Variaveis de ambiente no build**: `VITE_` prefix e necessario para que o Vite exponha a variavel ao bundle; variaveis sem esse prefix sao ignoradas silenciosamente
- **Permissoes de diretorio**: o diretorio `/opt/fraghub/portal/` deve pertencer ao usuario `fraghub` (nao root); o installer deve garantir isso antes do `npm install`
