# Local Inspector Automation

picos exposes versioned JSON snapshots for its primary read-only local OS and network inspectors, plus saved presets that replay those inspectors with the same bounds.

## Commands

```bash
picos info --json
picos info --full --json
picos locations --json
picos drives --json
picos remotes --json
picos release-health --json
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
picos monitor --samples 5 --interval 1000 --json
picos logs --limit 20 --level warn --filter kernel --json
picos process 12345 --json
picos process 12345 --files --json
picos operations kinds --json
picos operations kinds monitor --json
picos operations list --json
picos operations show pulse --json
picos operations save pulse monitor --samples 5 --interval 1000 --confirm "save operation preset pulse" --json
picos operations save errors logs --limit 50 --level fail --filter kernel --confirm "save operation preset errors" --json
picos operations save worker process --pid 12345 --files --confirm "save operation preset worker" --json
picos operations run pulse --json
picos operations remove pulse --confirm "remove operation preset pulse" --json
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

`locations` and `drives` return the same bounded file-location entries with
`label`, redacted `path`, and `kind`. Their `data` blocks include
`totalCount`, `returnedCount`, `limit`, `byteLimit`, and `truncated`.

`remotes` returns configured SFTP profile metadata without private-key paths or
credentials. The response is bounded by an entry limit and a 4 MiB document
limit, and reports `totalCount`, `returnedCount`, and `truncated`.

`release-health` returns normalized package, artifact, CI, and release workflow
check rows. A completed but unhealthy report keeps `status=completed` in the
document and exits non-zero, matching the plain-text command's failure status.

`doctor` returns eight stable check IDs under `data.checks`, plus `passCount`, `warnCount`, `failCount`, `checkCount`, and `healthy`. A failed individual network probe remains a normalized check instead of aborting the full report.

`dns` returns configured resolver servers with `source.kind=node` and `source.api=dns.getServers`. `dns flush --json` is intentionally different: it exits non-zero with `status=blocked`, `error.code=PICOS_ACTION_LOCKED`, write/admin risk, confirmation requirements, and `executionEnabled=false`. JSON mode never enables the mutation.

`tools list --json` returns all eight tool definitions and their input fields. Tool runs return `request.operation=run`, the normalized tool ID and arguments, a source kind (`dns`, `http`, `tcp`, `tls`, or `command`), `data.outcome=ok|fail`, and tool-specific normalized data. DNS records, RDAP metadata, IP metadata, TCP reachability, TLS certificate metadata, ping reachability, and traceroute hops are represented without embedding `rawOutput` or screen-oriented section text.

`monitor` returns uptime, load average, memory, CPU, total process count, and at most five top-process names with separate Node API and process-list collector evidence. Process command arguments are deliberately omitted; unavailable or failed optional process sampling marks `data.outcome=partial` without discarding valid system metrics.

`monitor --samples <n> --interval <ms>` collects a bounded time series instead of a single reading. Sample counts are limited to 1-60 and intervals to 250-60,000 ms, and `(samples - 1) * intervalMs` may not exceed 300,000 ms. That cap bounds the scheduled waiting between samples, not wall-clock time: each sample also runs one process-collector command bounded by its own 5,000 ms timeout, so a maximal request is bounded well above 300,000 ms rather than by it. Read `data.durationMs` for the measured elapsed time instead of predicting it from the cap. The series document keeps `request.operation=sample` and adds `startedAt`, `completedAt`, `requestedCount`, `returnedCount`, `cancelled`, `intervalMs`, `durationMs`, per-sample process collector evidence, and a `data.aggregate` block with `min`, `max`, `average`, and `last` values for memory used percent, one-minute load, and process count. Any partial sample marks the whole series `data.outcome=partial`, which reports missing process data within a sample and is independent of `cancelled`. `data.cancelled` is `true` only when sampling stopped before reaching `requestedCount`, in which case the samples already collected are still returned and still valid; for every request made through the CLI it is `false`, because stopping early is a capability the command line does not currently expose. `--samples 1` keeps the existing single-snapshot shape.

`logs` accepts limits from 1-200, filters up to 256 characters, and `all|warn|fail|info` severity selection. Completed documents contain bounded normalized entry indexes, levels, and redacted messages plus command source evidence, never the collector's raw stdout/stderr. Failed or capture-truncated collectors emit a failed document and non-zero exit.

`limit` is applied by the platform command, before `level` and `filter` narrow anything. The collector is asked for the most recent `limit` entries of any severity, and the requested level and text filter are then applied to just those entries. `data.totalCount` reports what was read and `data.visibleCount` what survived filtering, so `--limit 5 --level fail` can legitimately return zero entries while hundreds of failures exist further back in the log. Treat an empty result as "no match within the last `limit` entries" and raise the limit rather than concluding the system is healthy.

`data.limitReached` states that directly: it is `true` when the collector filled the window, meaning the filters narrowed a set that was already capped. Branch on it rather than re-deriving it from `totalCount` and `limit`, because the derivation is only correct if you already know the limit is applied first, which is the part that is easy to miss. When it is `true` and `visibleCount` is low, the honest reading is that the answer is bounded by the limit rather than by the system's state. The plain-text output says the same thing with a trailing `limit=<n> reached before filtering; raise --limit to search further back` row, emitted only when a `level` or `filter` is actually narrowing, since an unfiltered request is just paging.

`process` returns normalized PID, parent PID, user, state, CPU, memory, elapsed time, process name, executable path, and start time while omitting the full command line. With `--files`, it adds bounded cwd and resource entries plus separate support/success/exit/truncation/count evidence. Platforms without the optional file collector report `supported=false`, `success=null`, and `data.outcome=partial`; raw `lsof` output is never serialized.

`operations` turns repeated monitor, OS log, and process inspections into named presets stored in the picos user config, so a script or coding agent can re-run the same bounded request without restating every option.

- `kinds` publishes the preset contract itself and is the recommended first call for an agent. It returns `request.operation=kinds`, `source.kind=picos-contract`, `source.location=built-in`, `data.limits` with `maxPresets`, `maxIdLength`, `maxMonitorIntervalSpanMs`, `idPattern`, and `idNormalization`, `data.confirmations` with the `save operation preset <id>` and `remove operation preset <id>` templates, and `data.kinds[]` where each entry carries the target `command` plus a `fields[]` list of `name`, `option`, `type`, `required`, `default`, `min`, `max`, `maxLength`, and `choices`. The contract is generated from the same validators that enforce the bounds, so it cannot drift from what `save` accepts, and it reads no config file.
- An unfiltered `kinds` call also reports `request.kind: null`, `data.totalCount` for the full catalog, and `data.returnedCount` for how many entries were serialized. Unlike the table commands, this document has no `limit` or `truncated` field, because the catalog is fixed and never reduced to fit.
- `kinds <monitor|logs|process>` narrows the response to one kind and echoes it as `request.kind`, while `data.totalCount` stays the full catalog size. Kind names are matched without case or surrounding whitespace, and `picos operations save` accepts the same spellings. An unknown kind or an extra argument returns one failed document rather than being silently ignored, but the two report differently and a consumer should not treat `request.kind` as the rejected token. For an unknown kind, `request.kind` echoes the rejected input, so `operations kinds bogus` reports `bogus`. For an extra argument, `request.kind` reports the kind that was accepted from the preceding slot, so `operations kinds monitor extra` reports `monitor`, and the surplus token appears only in the error message. `request.presetId` is `null` on both paths, matching the success document.
- One monitor constraint is deliberately not expressible per field: `--samples 60 --interval 60000` satisfies both published maxima but is still rejected, because `(samples - 1) * intervalMs` must stay within `data.limits.maxMonitorIntervalSpanMs`. A consumer that generates monitor presets should check that product rather than trusting the two field bounds alone.
- `list` and `show` return `request.operation`, `request.presetId`, `source.kind=picos-config`, `source.location=user-config`, `data.totalCount`, the selected `data.preset`, and the normalized `data.presets` array. The config file path is deliberately not serialized.
- Preset ids accept 1-32 characters from lowercase letters, digits, dot, underscore, and dash, and must start with a letter or digit. Input is trimmed and lowercased first, which `data.limits.idNormalization` reports and `data.limits.idPattern` describes with the same regular expression the validator runs. At most 12 presets are retained, de-duplicated by id, newest saved first.
- A preset only stores validated inspector options, never a command string: monitor presets store `samples` and `intervalMs` (defaulting to `1` and `1000`), logs presets store `limit`, `level`, and `filter` (defaulting to `50`, `all`, and empty), and process presets store `pid` and `files` (defaulting `files` to `false`). Every value is validated against the same bounds as its direct CLI form when the preset is saved and again when it is loaded from config, so a hand-edited config entry that violates a bound is dropped instead of trusted.
- A logs preset inherits the pre-filter `limit` semantics described above, so a preset that pairs a narrow `level` or `filter` with a small `limit` will usually return nothing. Size the saved `limit` for how far back the filter needs to reach, not for how many rows you want returned.
- Process presets are the one kind that stores an ephemeral identifier, which the published contract labels as such. A PID is only valid while that process lives, and the OS may reuse it, so a re-run can succeed while describing an unrelated process. Running a process preset therefore reports `data.identity`, and a saved preset records the instant it was written as `savedAtMs`. The check needs no absolute process start time and so works on every platform: if the running process is younger than the preset, it cannot be the process that was saved. Read the three values as follows.
  - `reused` means the process now holding that PID started after the preset was written, so it is not the one you saved. Re-save the preset against the current PID rather than trusting the reading. This is strong evidence rather than a formal proof, and how strong depends on which value the platform supplied, described below.
  - `consistent` is **not** the converse. It only means no contradiction was found: the process is older than the preset, which is also what a long-lived process that inherited the PID looks like. It raises confidence without settling the question.
  - `unknown` means no conclusion is available, for one of two reasons. Either the collector reported no comparable time, or the preset carries no `savedAtMs` because it was written before that field existed. In the second case the check is off for that preset until you re-save it; nothing is fabricated to fill the gap, precisely so this reads as `unknown` rather than as a falsely reassuring `consistent`.
  - Two paths feed the verdict and they are not equally strong. Where the platform reports an absolute creation date, currently Windows, two wall-clock instants are compared directly and the result is sound. Elsewhere a kernel-measured `elapsed` is compared against two `Date.now()` readings, so a forward wall-clock step larger than the tolerance, such as an NTP correction after a resume, can inflate the estimated start and report a false `reused`. Treat `reused` on those platforms as a reason to re-check rather than as a certainty.
  - The comparison tolerates two seconds, because `ps` reports elapsed time at one-second resolution, which biases the estimate toward a false `reused`.
  - The plain-text form prints an `identity=reused` line for that case only, since it is the only value that should change what a reader does. The TUI Operations workspace logs the same finding when it runs a process preset.
  - `data.identity` is `null` for a direct `picos process` call, which has no saved instant to compare against. Monitor and logs presets have no such field at all, because they store a policy rather than an identity.
- `save` and `remove` are config writes and require byte-for-byte `--confirm "save operation preset <id>"` or `--confirm "remove operation preset <id>"`. The phrase must use the **stored** id, not the id as typed: `save PULSE --confirm "save operation preset PULSE"` is rejected because the stored id is `pulse`. Normalize the id locally with `idNormalization` before building the phrase. A missing or mismatched phrase returns one failed document, exits non-zero, leaves the saved shelf unchanged, and its error message states the exact phrase that was expected. Note that the two spellings appear in different places on that failure: the error message quotes the **normalized** id, because that is what the phrase must match, while `request.presetId` echoes the id **as typed**. So `save PULSE` fails with a message naming `pulse` and a `request.presetId` of `PULSE`. Correlate by the id you sent, and read the message for the phrase to retry with.
- A successful `save` reports `data.evicted`, listing any preset id dropped because the 12-entry shelf was already full; the plain-text form prints a matching `Evicted:` line. The field is an empty array for every other action. Re-saving an existing id evicts nothing, but it does not leave the entry where it was: the replacement is prepended and the previous entry with that id is dropped, so the preset becomes the newest and `data.presets` order changes. That is consistent with the newest-first rule above, and it means re-saving refreshes recency, which affects which preset is dropped by a later save once the shelf is full. A consumer that correlates by position rather than by id will read the wrong entry after any save.
- `run <id>` executes the referenced read-only inspector and returns that inspector's own document, so the response `command` is `monitor`, `logs`, or `process` rather than `operations`, with `request.presetId` added for correlation. A preset cannot widen what the underlying inspector already allows. A monitor preset with `samples` of 1 returns the single-snapshot shape and `request.operation=snapshot`; two or more returns the series shape and `request.operation=sample`, so branch on `request.operation` rather than assuming one of them.
- `operationPresets` is managed by `picos operations` and is rejected by `picos config set`.

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
picos monitor --samples 5 --interval 1000 --json | jq '.data.aggregate'
picos logs --limit 20 --level fail --json | jq '.data.entries'
picos process 12345 --files --json | jq '.data.files'
picos operations kinds --json | jq '.data.kinds[] | {kind, fields: [.fields[].option]}'
picos operations kinds --json | jq '.data.confirmations'
picos operations list --json | jq '.data.presets'
picos operations run pulse --json | jq '{command, preset: .request.presetId, outcome: .data.outcome}'
```

## Privacy And Safety

Local JSON mode is read-only and does not widen the OS mutation policy. Raw OS/tool command output and process arguments are omitted so automation receives parsed fields rather than an accidental dump of unrelated local state. Nested credential-like tool fields are redacted recursively. `safeExec()` caps combined stdout/stderr capture at 4 MiB by default, terminates the process group where supported, and applies a final completion bound after forced termination. Public-IP, doctor, RDAP, IP-info, DNS, TCP, and TLS behavior remains the same as their normal CLI forms; external requests are always explicit commands.

Saved operation presets keep that boundary. They are local config records of already-permitted read-only inspector options, they cannot store or run an arbitrary command, and creating or deleting one is the only part of the flow that writes anything, which is why both require an exact confirmation phrase. Bounded monitor sampling cannot become an unbounded background collector: the scheduled interval span is capped, the sample count is capped, and every per-sample collector call runs through `safeExec()` with its own timeout, so the worst case is finite even when a platform command hangs.

Run the real subprocess contract on the current OS with:

```bash
bun run harness local-json
bun run harness diagnostics-json
bun run harness operations-json
bun run harness automation-presets
```
