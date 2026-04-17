# ADR-003: Zero Bibliotecas de UI

**Status:** Accepted
**Date:** 2026-04-17
**Feature:** frontend-refactor-stitch

## Contexto

O mercado oferece diversas bibliotecas de componentes React: MUI, Shadcn/ui, Chakra UI, Ant Design, Headless UI, Radix UI. Cada uma acelera o desenvolvimento inicial mas impõe trade-offs relevantes para este projeto.

## Decisão

**Não usar nenhuma biblioteca de componentes UI.** Todos os componentes são implementados do zero usando CSS Modules + CSS Custom Properties.

**Proibido:** Tailwind CSS, MUI, Shadcn, Chakra, Ant Design, Bootstrap, Radix UI, Headless UI.

**Exceções futuras:** se algum componente complexo (ex: date picker acessível, combobox com busca) justificar uma dependência, criar ADR específica antes de instalar.

## Rationale

1. **Stitch já fornece o design** — o design system está completamente especificado. Não precisamos de uma biblioteca para "inventar" componentes; precisamos implementar o que já está desenhado.
2. **Bundle size** — MUI adiciona ~200kb gzip; o projeto atual tem 58kb. Manter o bundle pequeno é uma NFR.
3. **Controle total** — o design system é personalizado (obsidian palette, glassmorphism, glow effects). Sobrescrever uma biblioteca de UI geralmente exige mais trabalho do que implementar do zero.
4. **Constitution** — a stack definida na CONSTITUTION não inclui bibliotecas de UI; qualquer adição requer consenso explícito.

## Consequências

**Positivo:**
- Bundle mínimo
- Nenhuma atualização de dependência forçada por breaking changes de UI lib
- Design 100% fiel ao Stitch

**Negativo:**
- Acessibilidade (ARIA, keyboard nav) deve ser implementada manualmente
- Componentes complexos (modal, tooltip, select acessível) levam mais tempo
- Sem storybook pré-pronto

**Mitigação de acessibilidade:** cada componente deve implementar ARIA roles e keyboard navigation conforme WCAG 2.1 AA (NFR-006).
