# C4 L2 - CLI Installer Containers

```mermaid
flowchart TD
  cliEntrypoint[CliEntrypoint]
  precheckModule[PrecheckModule]
  inputModule[InputModule]
  bootstrapModule[BootstrapModule]
  configureModule[ConfigureModule]
  verifyModule[VerifyModule]
  summaryModule[SummaryModule]
  stateStore[StateStoreLocal]
  logStore[InstallerLogFiles]
  osServices[OSServicesAndPackages]

  cliEntrypoint --> precheckModule
  precheckModule --> inputModule
  inputModule --> bootstrapModule
  bootstrapModule --> configureModule
  configureModule --> verifyModule
  verifyModule --> summaryModule

  precheckModule --> stateStore
  bootstrapModule --> stateStore
  configureModule --> stateStore
  verifyModule --> stateStore

  precheckModule --> logStore
  inputModule --> logStore
  bootstrapModule --> logStore
  configureModule --> logStore
  verifyModule --> logStore
  summaryModule --> logStore

  bootstrapModule --> osServices
  configureModule --> osServices
  verifyModule --> osServices
```

## Notas

- `StateStoreLocal` suporta idempotencia basica e recuperacao de falha parcial.
- `InstallerLogFiles` registra diagnostico sem expor segredos em texto puro.

