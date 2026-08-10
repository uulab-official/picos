# Plugin Registry and Docker Read-Only Inventory Design

Date: 2026-08-10
Status: approved for implementation

## Goal

Add a platform-neutral built-in plugin registry and capability contract to picos, then prove the contract with a bounded, read-only Docker inventory that is available through core, CLI, and the System TUI. Environments without Docker, or with only part of the Docker runtime available, must return an explicit supported-state result instead of an opaque command failure.

## Scope

This slice includes:

- a static built-in plugin registry owned by `src/core`;
- an immutable public capability contract for every registered plugin;
- a Docker plugin with adapter-owned read-only command plans;
- bounded Docker engine, context, and container-summary collection;
- plain-text and schema-versioned JSON CLI output;
- a compact Docker plugin section in the existing System workspace;
- deterministic tests, a subprocess harness, documentation, and checklist updates.

This slice excludes:

- dynamic package discovery, imports, or third-party plugin execution;
- local OpenSSH config inventory, which remains the next developer-environment slice;
- Docker start, stop, restart, remove, pull, push, exec, or any other mutation;
- raw Docker output, container command lines, environment variables, labels, mounts, secrets, or credentials;
- background polling or a daemon.

## Approaches Considered

### Static built-in registry with a Docker reference implementation

This is the selected approach. It fixes the capability and result contracts before introducing untrusted loading, while the Docker implementation verifies that the boundaries work in a real collector.

### Dynamic npm plugin loader

This would offer immediate extensibility, but picos does not yet have package trust, compatibility negotiation, isolation, or plugin execution permission policy. Loading external code would broaden the security boundary beyond this milestone.

### Registry catalog without a live collector

This would be low risk but would not prove bounded execution, partial-state aggregation, source evidence, or CLI/TUI consumption. It would leave the most important parts of the contract hypothetical.

## Architecture

### Core registry

`src/core/plugins.ts` owns the platform-neutral public model:

- `DeveloperPluginId`, initially the exhaustive union `"docker"`;
- plugin metadata: stable id, label, description, source, risk, and mutation posture;
- capability metadata with stable capability ids, support state, read/write classification, and bounds;
- runtime status: `completed`, `partial`, or `unsupported`;
- normalized collector evidence without raw output;
- a discriminated runtime snapshot keyed by plugin id;
- catalog lookup, collection dispatch, status aggregation, and row formatting.

The catalog is a `Record<DeveloperPluginId, ...>` so adding an id fails compilation until its contract exists. Public catalog functions return copies so callers cannot mutate registry state. Dispatch is also exhaustive over the same id union; callers cannot inject command plans or collectors.

The registry is built-in only. The word "plugin" describes the capability boundary and future extension point, not dynamic code loading in this slice.

### Docker adapter

`src/adapters/docker.ts` owns all Docker executable and argument definitions. Every command is explicitly read-only and uses Docker's formatted output to avoid collecting command lines or broad inspection documents.

The adapter exposes plans for:

1. client version: `docker --version`, which does not require a daemon connection;
2. current context: `docker context show`;
3. engine summary: `docker info --format ...` with only server version and aggregate counts;
4. container summary: `docker ps --all --format ...` with ID, name, image, state, and status only.

No shell command string is accepted. Core executes only adapter plans through `safeExec()` with the existing combined-output byte limit and a plugin-specific timeout no greater than 5 seconds per collector. Container rows are capped at 200 and normalized field lengths are capped before publication.

### Docker runtime result

The Docker snapshot contains:

- plugin contract metadata;
- requested and returned bounds;
- client version and current context when available;
- engine version and aggregate container/image counts when available;
- at most 200 normalized container rows;
- one normalized evidence item per collector with command identity, support, success, exit status, and truncation;
- a bounded, redacted diagnostic message for failed collectors.

Raw stdout/stderr is never published. Container command fields, arguments, labels, mounts, and environment data are never requested.

Status rules are deterministic:

- `unsupported`: the Docker executable is unavailable, identified by the client probe's spawn-not-found result. Remaining collectors are not run.
- `partial`: the executable is present but one or more requested collectors fail, time out, or truncate; successful fields remain available.
- `completed`: every requested collector succeeds without source truncation and all published rows fit the declared result bounds.

An unavailable daemon therefore produces `partial`, not `unsupported`, because the Docker client capability exists. Result-bound truncation is published separately from source-output truncation.

### Core/TUI/CLI flow

The CLI command is:

```text
picos plugins
picos plugins docker
picos plugins docker --json
```

`picos plugins` lists the built-in catalog without running Docker. `picos plugins docker` runs the bounded collector and formats the snapshot. `--json` emits one versioned stdout document. An unknown plugin id or invalid option emits one structured failure document and a non-zero exit. `unsupported` and `partial` are valid inspection outcomes and exit zero because the command successfully described current capability state.

The TUI uses the same core snapshot and formatter. `createSystemInventory()` collects the Docker plugin alongside existing storage and process collectors, then the System workspace renders a compact `DEVELOPER PLUGINS` block with plugin status, read-only/mutation posture, context/version, counts, bounds, and partial diagnostics. It does not add a new interactive screen or duplicate collection logic.

The Docker collection runs concurrently with independent full-inventory collectors so it does not serialize their timeouts. TUI and CLI never invoke `safeExec()` or adapter plans directly.

## Error Handling and Safety

- Every collector is bounded by timeout, combined output bytes, parsed row count, and normalized field length.
- Diagnostics pass through recursive secret redaction and length bounds before reaching text or JSON output.
- A failed collector preserves successful sibling evidence and data.
- `unsupported` and `partial` remain visible; neither is silently converted to an empty successful inventory.
- The registry advertises Docker mutation capabilities as unsupported/locked and exposes no execution entry point.
- No socket is opened directly by picos. Docker CLI behavior remains inside bounded child processes.
- Existing `safeExec()` output limits are not overridden.

## Testing

Focused tests will cover:

- exhaustive registry lookup, immutable copies, capability metadata, and unknown ids;
- adapter command and argument ownership, including absence of mutating operations;
- parser normalization, row/field bounds, malformed lines, and redaction;
- `completed`, daemon-unavailable `partial`, timeout/truncation `partial`, and executable-missing `unsupported` aggregation;
- formatter output and System workspace rows;
- schema version, source evidence, separate source/result truncation, no raw output, and one-document JSON failures;
- CLI registration and dispatch;
- subprocess behavior in a deterministic harness using a temporary fake `docker` executable for completed, partial, and unsupported cases.

The new harness becomes part of `bun run verify` and does not depend on a real Docker installation or daemon. Final completion also requires lint, typecheck, build, smoke, all existing harnesses, `git diff --check`, and the repository's callback audit.

## Documentation and Delivery

Update:

- `README.md` with command usage, contract, bounds, and safety posture;
- `CHANGELOG.md` with the user-visible plugin and Docker inventory feature;
- `ROADMAP.md` to mark the registry and Docker slice implemented while leaving SSH inventory next;
- `docs/INCOMPLETE_FEATURES_CHECKLIST.md` to complete the registry and Docker items only;
- harness documentation for the deterministic Docker fixture.

Commit and push the specification before implementation. During implementation, commit and push after the core/adapter contract, CLI/harness, and TUI/docs milestones. Do not commit `dist/`.

## Acceptance Criteria

The slice is complete only when all of the following are proven from the current branch:

1. The core catalog and runtime dispatch are exhaustive for `DeveloperPluginId` and return immutable public values.
2. Docker commands are adapter-owned, read-only, bounded, and executed only through `safeExec()`.
3. Docker missing, daemon unavailable, collector failure, source truncation, and result truncation have distinct truthful evidence.
4. CLI plain text and JSON expose the same normalized snapshot without raw output or sensitive fields.
5. The System TUI displays the same contract and runtime state without implementing collection decisions in `App.tsx` callbacks.
6. Unsupported environments are visible and partial environments retain successful data.
7. The deterministic subprocess harness runs under `bun run verify` on every supported CI OS.
8. Tests, documentation, checklist state, intermediate commits/pushes, and the final full verification all pass.
