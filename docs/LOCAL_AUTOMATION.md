# Local Inspector Automation

picos exposes versioned JSON snapshots for its primary read-only local OS and network inspectors.

## Commands

```bash
picos info --json
picos info --full --json
picos routes --json
picos routes --filter utun --sort interface --json
picos route 8.8.8.8 --json
picos connections --filter 443 --sort remotePort --json
picos ports --filter node --sort process --json
```

## Stream Contract

- stdout contains exactly one JSON document for success or expected command failure.
- successful commands exit zero; failures exit non-zero without appending a plain-text error.
- `schemaVersion` is currently `1`; consumers should reject unsupported versions.
- `--raw` and `--json` cannot be combined because raw command output is intentionally excluded from the automation contract.
- successful documents are compact JSON capped at 4 MiB; table rows are reduced to fit the final serialized document exactly, and large stdout documents are flushed before the process exits, including when output is piped to another process.

## Snapshot Shape

Every successful document contains `schemaVersion`, `command`, and `status=completed`.

`info` adds `scope=summary|full` and a `data` object. Summary mode includes system and normalized network state. Full mode also includes hardware, storage, up to 10,000 process names/PIDs, permission posture, runtime versions, and config path. Storage and process sections include `totalCount`, `returnedCount`, `limit`, and `truncated`; their rows live under `volumes` and `entries`. Process arguments are deliberately omitted because command lines commonly contain credentials. Network source records retain command, arguments, line counts, truncation, success, and exit code, but not raw source text.

`routes`, `connections`, and `ports` add:

- `request.filter` and the effective sort key/direction
- `source.command`, `source.args`, `source.success`, `source.exitCode`, and `source.truncated`
- `totalCount`, `visibleCount`, `returnedCount`, `limit`, and `truncated`
- at most 10,000 normalized rows after filtering and sorting, further reduced when needed to stay inside the 4 MiB document limit
- route diagnostics where applicable

`route` records the requested destination, source-command status, gateway, interface, and source IP when the platform exposes them.

Full `info` records separate storage and process source statuses (`supported`, `success`, `exitCode`, and `truncated`) so an unsupported or failed collector is distinguishable from a valid empty result. A failed or capture-truncated route, destination route, connection, or port source never produces `status=completed`.

Expected failures use `status=failed` and `error.code=PICOS_LOCAL_INSPECTOR_FAILED`. When a platform command fails or its captured output is truncated, the failure also includes bounded `source` command, arguments, success, exit code, and truncation evidence without raw stdout/stderr. Error and request text is bounded to 4,096 characters and redacts URL credentials, credential-like environment assignments/options, home paths, and common SSH private-key paths.

## Examples

```bash
picos info --json | jq '.data.network.interfaces'
picos connections --filter 443 --json | jq '.data.connections'
picos ports --json | jq '.data.ports[] | select(.command == "node")'
picos routes --json | jq '.data.diagnostics'
```

## Privacy And Safety

Local JSON mode is read-only and does not widen the OS mutation policy. Raw OS command output and process arguments are omitted so automation receives parsed fields rather than an accidental dump of unrelated local state. `safeExec()` caps combined stdout/stderr capture at 4 MiB by default, terminates the process group where supported, and applies a final completion bound after forced termination. External public-IP lookup behavior remains the same as normal `picos info`; the other local inspectors execute only their documented platform commands through `safeExec()`.

Run the real subprocess contract on the current OS with:

```bash
bun run harness local-json
```
