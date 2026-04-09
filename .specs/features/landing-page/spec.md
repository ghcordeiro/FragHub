# Landing Page - Especificacao da Feature

## Summary
Landing page publica do projeto FragHub com hero, funcionalidades, comando de instalacao copiavel, links para documentacao e GitHub, SEO completo, acessibilidade WCAG 2.1 AA e suporte a ingles e portugues.

## System Process Context
1. Visitante acessa a URL publica do FragHub (GitHub Pages ou dominio proprio)
2. A pagina apresenta o projeto, demonstra o comando de instalacao e direciona para documentacao e repositorio
3. A decisao de hospedagem (GitHub Pages vs Nginx do servidor FragHub) e uma gray area arquitetural a ser definida no Plan — ambas as opcoes devem ser consideradas no design
4. A decisao de implementacao (HTML estatico vs React) tambem e gray area a ser definida no Plan — especificacao e neutra em relacao a tecnologia
5. Alteracoes de conteudo devem ser simples o suficiente para qualquer colaborador fazer sem conhecimento profundo de frontend

## Personas
- **Administrador de comunidade CS2**: descobre o projeto por indicacao ou busca, precisa entender em 10 segundos o que e e se consegue instalar no proprio servidor
- **Desenvolvedor open source**: avalia o projeto para contribuir, precisa encontrar rapidamente link para repositorio GitHub e guia de contribuicao
- **Jogador curioso**: indicado por um amigo, quer saber o que e o FragHub antes de pedir ao admin para instalar no servidor da comunidade

## Requisitos Funcionais

### LANDING-REQ-001 - Secao hero com tagline e call to action
A pagina deve ter uma secao hero visualmente destacada contendo: tagline que descreve o FragHub em uma frase, subtitulo explicando o publico-alvo e o beneficio principal, e dois botoes de call to action: "Install now" (ancora para secao de instalacao) e "View on GitHub" (link externo para o repositorio).

### LANDING-REQ-002 - Secao de funcionalidades principais
A pagina deve apresentar as funcionalidades principais do FragHub (matchmaking, portal web, ranking, instalacao em 1 comando) com icone ou ilustracao, titulo e descricao breve para cada funcionalidade. Minimo de 4 funcionalidades destacadas.

### LANDING-REQ-003 - Secao de pre-requisitos
A pagina deve listar claramente os pre-requisitos de sistema: Ubuntu 22.04 LTS ou 24.04 LTS, x86_64, requisitos minimos de hardware (RAM, disco, CPU) e acesso SSH com usuario nao-root.

### LANDING-REQ-004 - Secao de instalacao com comando copiavel
A pagina deve exibir o comando de instalacao em 1 linha num bloco de codigo com botao de copia com 1 clique (funcao `navigator.clipboard.writeText` ou equivalente). O botao deve dar feedback visual ao usuario apos a copia (ex: icone muda para "copiado").

### LANDING-REQ-005 - Screenshots ou GIF do produto
A pagina deve exibir ao menos 1 screenshot ou GIF animado demonstrando o installer em execucao ou o portal web do FragHub, para dar ao visitante uma impressao visual do produto antes de instalar.

### LANDING-REQ-006 - Links para documentacao e GitHub
A pagina deve conter links visiveis para: repositorio GitHub, documentacao completa (`docs/INSTALL.md` ou equivalente), `CONTRIBUTING.md` e a secao de issues do GitHub para reporte de bugs.

### LANDING-REQ-007 - Footer com informacoes de licenca e projeto
O footer deve conter: nome do projeto, ano, licenca GPL-3.0 com link para o texto completo, link para o repositorio GitHub e link para o `CODE_OF_CONDUCT.md`.

### LANDING-REQ-008 - Suporte a ingles e portugues
A pagina deve ser acessivel em ingles (idioma padrao) e portugues. A alternancia de idioma deve ser possivel via seletor de idioma visivel ou via URL (`/` para ingles, `/pt` para portugues, ou equivalente). O conteudo em ambos os idiomas deve ser completo e equivalente.

### LANDING-REQ-009 - SEO basico
A pagina deve incluir: `<title>` descritivo, `<meta name="description">` com 120-160 caracteres, tags Open Graph (`og:title`, `og:description`, `og:image`, `og:url`), `sitemap.xml` e `robots.txt` permitindo indexacao.

### LANDING-REQ-010 - Decisao arquitetural documentada no Plan
A escolha entre HTML estatico vs React e entre GitHub Pages vs Nginx proprio deve ser registrada como ADR no Plan, avaliando impacto em DNS, manutencao, dependencias e ciclo de deploy.

## Requisitos Nao Funcionais

### LANDING-NFR-001 - Performance: LCP inferior a 2.5 segundos
O Largest Contentful Paint (LCP) deve ser inferior a 2.5 segundos em conexao 4G simulada (medido via Lighthouse ou PageSpeed Insights). Imagens devem ser otimizadas (WebP, dimensoes corretas, lazy loading).

### LANDING-NFR-002 - Acessibilidade WCAG 2.1 AA
A pagina deve atingir nivel AA do WCAG 2.1, incluindo: contraste de texto minimo de 4.5:1 para texto normal, navegacao completa por teclado, atributos `alt` em todas as imagens com conteudo, labels em todos os inputs e estrutura semantica de headings (h1 -> h2 -> h3).

### LANDING-NFR-003 - Responsividade
A pagina deve ser totalmente funcional e visualmente correta em dispositivos moveis (320px de largura minima), tablets (768px) e desktop (1280px+).

### LANDING-NFR-004 - Sem dependencias de JavaScript para conteudo critico
O conteudo principal da pagina (hero, funcionalidades, comando de instalacao) deve ser acessivel sem JavaScript habilitado. JavaScript e permitido apenas para enhancements (ex: botao de copia, animacoes, seletor de idioma).

### LANDING-NFR-005 - Tempo de manutencao baixo
Atualizar o conteudo da landing page (ex: nova versao no comando de instalacao, novo screenshot) deve ser possivel em menos de 15 minutos por qualquer colaborador sem conhecimento avancado de frontend.

## Criterios de Aceitacao
- **AC-001**: Dado que acesso a landing page em dispositivo desktop, entao o hero com tagline e os dois botoes de call to action sao visiveis sem scroll em viewport de 1280x800.
- **AC-002**: Dado que clico no botao "Copy" ao lado do comando de instalacao, entao o comando e copiado para o clipboard e o botao exibe feedback visual de confirmacao (ex: texto muda para "Copied!") por ao menos 2 segundos.
- **AC-003**: Dado que executo Lighthouse na landing page, entao o score de Acessibilidade e 90 ou superior e o LCP e inferior a 2.5 segundos.
- **AC-004**: Dado que navego pela landing page usando apenas o teclado (Tab, Enter, Space), entao consigo acessar todos os links e botoes interativos sem precisar do mouse.
- **AC-005**: Dado que acesso a landing page com JavaScript desabilitado no browser, entao o conteudo principal (hero, funcionalidades, pre-requisitos, comando de instalacao em texto) e completamente legivel.
- **AC-006**: Dado que compartilho a URL da landing page no WhatsApp ou Twitter/X, entao o preview exibe titulo, descricao e imagem corretos (Open Graph configurado).
- **AC-007**: Dado que acesso a landing page em dispositivo movel com 375px de largura, entao nenhum conteudo esta cortado e todos os botoes sao clicaveis com polegar.
- **AC-008**: Dado que acesso a versao em portugues da landing page, entao todo o conteudo (incluindo hero, funcionalidades, pre-requisitos e footer) esta em portugues, sem mistura de idiomas.

## Out of Scope (esta feature)
- Blog ou secao de noticias do projeto
- Formulario de contato ou lista de email (newsletter)
- Analytics ou tracking de usuarios (privacidade por padrao)
- Documentacao tecnica completa incorporada na landing page (documentacao fica em `docs/`)
- Autenticacao ou area logada na landing page
- Integracao com Discord, Twitch ou outras plataformas

## Dependencias
- Feature `frontend-setup` implementada se a decisao de implementacao for React (gray area — a ser definida no Plan)
- Feature `nginx-ssl` implementada se a hospedagem for no proprio servidor FragHub (gray area — a ser definida no Plan)
- Screenshots ou GIFs do produto capturados em ambiente real (dependencia da feature `docs-release`)
- Dominio configurado (se GitHub Pages: subdominio `fraghub.github.io` ou dominio customizado via CNAME)
- Conteudo textual finalizado (tagline, descricoes de funcionalidades) — dependencia editorial

## Riscos Iniciais
- **Decisao arquitetural GitHub Pages vs Nginx proprio**: hospedagem no servidor do operador significa que a landing page fica fora do ar quando o servidor do CS2 fica — hospedagem no GitHub Pages desacopla mas requer configuracao de DNS separada — essa e a principal gray area desta feature e deve ser resolvida no Plan
- **Decisao HTML estatico vs React**: React adiciona complexidade de build e dependencia do pipeline de CI para deploy; HTML estatico e mais simples mas limita interatividade — a ser avaliada no Plan
- **Screenshots desatualizados**: imagens capturadas durante desenvolvimento podem nao refletir a UI final — mitigacao: capturar screenshots apenas apos freeze de UI
- **Manutencao de traducao**: conteudo em portugues pode ficar desatualizado em relacao ao ingles entre releases — mitigacao: usar chaves de traducao estruturadas (i18n) mesmo em HTML estatico
