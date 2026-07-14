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
picos doctor --json
picos dns --json
picos tools --json
picos tools dns example.com --json
picos tools port-check example.com 443 --timeout 5000 --json
picos tools tls example.com:443 --json
picos monitor --json
picos logs --limit 20 --level warn --filter kernel --json
picos process 12345 --json
picos process 12345 --files --json
```

## Stream Contract

- stdout contains exactly one JSON document for success or expected command failure.
- successful commands exit zero; failures exit non-zero without appending a plain-text error.
- completed health probes may exit non-zero when their normalized result is valid but unhealthy: doctor exits non-zero when any check fails, and a Tools run exits non-zero when its source reports failure.
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

`doctor` returns eight stable check IDs under `data.checks`, plus `passCount`, `warnCount`, `failCount`, `checkCount`, and `healthy`. A failed individual network probe remains a normalized check instead of aborting the full report.

`dns` returns configured resolver servers with `source.kind=node` and `source.api=dns.getServers`. `dns flush --json` is intentionally different: it exits non-zero with `status=blocked`, `error.code=PICOS_ACTION_LOCKED`, write/admin risk, confirmation requirements, and `executionEnabled=false`. JSON mode never enables the mutation.

`tools list --json` returns all eight tool definitions and their input fields. Tool runs return `request.operation=run`, the normalized tool ID and arguments, a source kind (`dns`, `http`, `tcp`, `tls`, or `command`), `data.outcome=ok|fail`, and tool-specific normalized data. DNS records, RDAP metadata, IP metadata, TCP reachability, TLS certificate metadata, ping reachability, and traceroute hops are represented without embedding `rawOutput` or screen-oriented section text.

`monitor` returns uptime, load average, memory, CPU, total process count, and at most five top-process names with separate Node API and process-list collector evidence. Process command arguments are deliberately omitted; unavailable or failed optional process sampling marks `data.outcome=partial` without discarding valid system metrics.

`logs` accepts limits from 1-200, filters up to 256 characters, and `all|warn|fail|info` severity selection. Completed documents contain bounded normalized entry indexes, levels, and redacted messages plus command source evidence, never the collector's raw stdout/stderr. Failed or capture-truncated collectors emit a failed document and non-zero exit.

`process` returns normalized PID, parent PID, user, state, CPU, memory, elapsed time, process name, executable path, and start time while omitting the full command line. With `--files`, it adds bounded cwd and resource entries plus separate support/success/exit/truncation/count evidence. Platforms without the optional file collector report `supported=false`, `success=null`, and `data.outcome=partial`; raw `lsof` output is never serialized.

Full `info` records separate storage and process source statuses (`supported`, `success`, `exitCode`, and `truncated`) so an unsupported or failed collector is distinguishable from a valid empty result. A failed or capture-truncated route, destination route, connection, or port source never produces `status=completed`.

Expected failures use `status=failed` and `error.code=PICOS_LOCAL_INSPECTOR_FAILED`. When a platform command fails or its captured output is truncated, the failure also includes bounded `source` command, arguments, success, exit code, and truncation evidence without raw stdout/stderr. Error, request, and normalized log text is bounded and redacts URL/query credentials, credential-like assignments/options, authorization headers, bearer tokens, home paths, and common SSH private-key paths.

## Examples

```bash
picos info --json | jq '.data.network.interfaces'
picos connections --filter 443 --json | jq '.data.connections'
picos ports --json | jq '.data.ports[] | select(.command == "node")'
picos routes --json | jq '.data.diagnostics'
picos doctor --json | jq '.data.checks[] | select(.status != "pass")'
picos dns --json | jq '.data.servers'
picos tools tls example.com:443 --json | jq '.data.result'
picos monitor --json | jq '.data.memory'
picos logs --limit 20 --level fail --json | jq '.data.entries'
picos process 12345 --files --json | jq '.data.files'
```

## Privacy And Safety

Local JSON mode is read-only and does not widen the OS mutation policy. Raw OS/tool command output and process arguments are omitted so automation receives parsed fields rather than an accidental dump of unrelated local state. Nested credential-like tool fields are redacted recursively. `safeExec()` caps combined stdout/stderr capture at 4 MiB by default, terminates the process group where supported, and applies a final completion bound after forced termination. Public-IP, doctor, RDAP, IP-info, DNS, TCP, and TLS behavior remains the same as their normal CLI forms; external requests are always explicit commands.

Run the real subprocess contract on the current OS with:

```bash
bun run harness local-json
bun run harness diagnostics-json
bun run harness operations-json
```
