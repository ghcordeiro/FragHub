# C4 L1 - CLI Installer Context

```mermaid
flowchart TD
  adminUser[AdminComunidade]
  targetServer[ServidorUbuntu]
  cliInstaller[FragHubCLIInstaller]
  packageRepos[RepositoriosPacotes]
  steamInfra[SteamInfra]
  linearDocs[SpecsDocsLinear]

  adminUser -->|executaWizard| cliInstaller
  cliInstaller -->|validaEProvisiona| targetServer
  cliInstaller -->|instalaDependencias| packageRepos
  cliInstaller -->|baixaComponentesGame| steamInfra
  cliInstaller -->|geraRastreabilidade| linearDocs
```

## Notas

- Este diagrama mostra apenas a relacao do installer com atores/sistemas externos.
- Persistencia funcional de produto (matches/stats) nao esta no escopo de v0.1.

