# FragHub Agent Contract

This file is the source of truth for autonomous agents working on FragHub.

## Project Scope (Hard Constraint)

- Work ONLY inside: `/Users/guilhermecordeiro/www/pessoal/FragHub`
- Never act on other repositories or system paths.
- If context is missing, stop and report blocker instead of improvising.

## Required Project Context

Load and follow these docs in this order:

1. `.specs/project/CONSTITUTION.md` (immutable rules)
2. `.specs/project/ROADMAP.md` (milestones and feature sequence)
3. `.specs/project/STATE.md` (decisions, history, current status)
4. `.specs/planning/PLANNING.md` (cross-feature dependencies and scope)

## Mandatory Delivery Format (SDD)

All non-trivial work must follow Spec-Driven Development phases:

1. Specify
2. Plan
3. Tasks
4. Implement
5. Validate

Rules:

- Do not jump directly to implementation.
- Do not implement without approved tasks for Large/Complex work.
- Keep artifacts under `.specs/features/<feature-slug>/`.
- Respect gates: phase advances only after explicit approval.

## Artifact Locations

For each feature `<slug>`, use:

- `.specs/features/<slug>/spec.md`
- `.specs/features/<slug>/plan.md` (when required by scope)
- `.specs/features/<slug>/tasks.md` (TDAD-style where applicable)
- `.specs/features/<slug>/validation.md` (evidence and AC status)

Architecture outputs:

- ADRs in `docs/adr/`
- C4 diagrams in `docs/architecture/`

## Linear Is Mandatory

Linear must be used as operational tracker for every feature flow:

- Pre-Specify: fetch and use parent issue context.
- Post-Tasks: sync spec/plan/tasks summary back to parent issue.
- Create/update sub-issues from approved tasks.
- If Linear is unavailable, stop and mark the work as blocked.

## code-review-graph Is Mandatory First

Use code-review-graph MCP tools BEFORE fallback file scanning:

- `semantic_search_nodes_tool`
- `query_graph_tool`
- `get_impact_radius_tool`
- `detect_changes_tool`
- `get_review_context_tool`
- `get_affected_flows_tool`

Fallback to file scans only when graph coverage is insufficient.

## Execution Guardrails

- Honor roadmap order and dependency gates from `.specs/project/ROADMAP.md` and `.specs/planning/PLANNING.md`.
- Prefer smallest safe increment that preserves project architecture.
- Keep logs/action notes concise and actionable.
- If requirements conflict, `CONSTITUTION.md` wins.

## Autonomous Execution Policy

Use this policy to keep work progressing without manual babysitting:

- Treat assigned issues as end-to-end responsibilities, not only delegation triggers.
- If delegating to a child issue, keep the parent issue in `in_progress` until:
  - child outcomes are reviewed,
  - parent summary is updated,
  - next action is assigned.
- Never mark a parent issue as `done` immediately after creating child tasks.
- On each heartbeat, always do one concrete advancement:
  - produce artifact update,
  - create or refine executable subtasks,
  - implement approved task slice,
  - or explicitly mark blocker with owner and unblock condition.
- If blocked, set status `blocked` with actionable unblock instructions; retry only after new context appears.
- Keep continuity across heartbeats using the latest issue comments and artifact diffs.
