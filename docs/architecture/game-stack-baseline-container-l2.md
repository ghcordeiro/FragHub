# C4 L2 - Game Stack Baseline Containers

```mermaid
flowchart TD
  entrypoint[InstallEntrypoint]
  gamePrecheck[GamePrecheckModule]
  gameBootstrap[GameBootstrapModule]
  cs2Bundle[CS2PluginBundleModule]
  csgoBundle[CSGOPluginBundleModule]
  serviceConfig[SystemdServiceConfigModule]
  gameVerify[GameVerifyModule]
  gameSummary[GameSummaryModule]
  stateStore[StateStoreLocal]
  logStore[InstallerLogFiles]
  gameRuntime[CS2CSGORuntime]
  systemdUnits[SystemdUnits]

  entrypoint --> gamePrecheck
  gamePrecheck --> gameBootstrap
  gameBootstrap --> cs2Bundle
  cs2Bundle --> csgoBundle
  csgoBundle --> serviceConfig
  serviceConfig --> gameVerify
  gameVerify --> gameSummary

  gamePrecheck --> stateStore
  gameBootstrap --> stateStore
  cs2Bundle --> stateStore
  csgoBundle --> stateStore
  serviceConfig --> stateStore
  gameVerify --> stateStore

  gamePrecheck --> logStore
  gameBootstrap --> logStore
  cs2Bundle --> logStore
  csgoBundle --> logStore
  serviceConfig --> logStore
  gameVerify --> logStore
  gameSummary --> logStore

  gameBootstrap --> gameRuntime
  cs2Bundle --> gameRuntime
  csgoBundle --> gameRuntime
  serviceConfig --> systemdUnits
  gameVerify --> gameRuntime
  gameVerify --> systemdUnits
```

## Notas

- `StateStoreLocal` garante idempotencia por etapa e por trilha de jogo.
- Os bundles CS2/CS:GO permanecem separados para isolamento de falha e reexecucao parcial.
