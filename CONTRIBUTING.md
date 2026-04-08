# Contributing to FragHub

First off, thanks for taking the time to contribute! 🎉

## How Can I Contribute?

### Reporting Bugs

- Check if the bug was already reported in [Issues](https://github.com/ghcordeiro/FragHub/issues)
- If not, create a new issue with:
  - Clear title and description
  - Steps to reproduce
  - Expected vs actual behavior
  - System info (OS, versions)

### Suggesting Features

- Open an issue with the `enhancement` label
- Describe the feature and why it would be useful
- Include mockups/examples if possible

### Branches and merge requests

- Use **one branch per deliverable unit** — prefer **pacotes completos** (várias tasks Linear no mesmo PR) quando formarem um fluxo ou marco coerente, em vez de um PR por mudança mínima.
- O pacote deve ter **um objetivo claro** (ex.: “installer: wizard + segredos + estado”) e um diff ainda **revisável** (se estiver enorme, dividir por marco vertical, não por ficheiro).
- Prefer names aligned with Linear when applicable: `feature/fra-123-short-slug` — podes usar o ID da **issue principal** ou do **marco**; no corpo do PR lista `Refs` / `Closes` para todas as issues cobertas.
- Open **one PR/MR per branch**; use **commits atómicos** dentro do branch para facilitar leitura e eventual cherry-pick.
- Rebase or merge `main` into your branch before opening the PR if `main` moved forward.

**Quando um PR pequeno ainda faz sentido:** hotfix urgente, mudança de alto risco (segurança) que deve isolar rollback, ou contribuição externa mínima.

### Pull Requests

1. Fork the repo (or work from a clone with push access)
2. Create a branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests (when available)
5. Commit: `git commit -m "feat: add my feature"` (vários commits por etapa são bem-vindos em pacotes grandes)
6. Push: `git push -u origin feature/my-feature`
7. Open a Pull Request: descreve o **objetivo do pacote**, checklist do que entra, e liga **todas** as Linear/GitHub issues relevantes (`Refs FRA-10, FRA-11` ou `Closes …` quando aplicável)

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `style:` — Formatting, no code change
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `test:` — Adding tests
- `chore:` — Maintenance tasks

## Code Style

- **Bash**: Follow ShellCheck recommendations
- **TypeScript**: ESLint + Prettier (strict mode)
- **C# (CSSharp)**: Standard .NET conventions
- **SourcePawn**: SourceMod style guide

## Questions?

Open an issue or reach out to [@ghcordeiro](https://github.com/ghcordeiro).

Thanks! 🙏
