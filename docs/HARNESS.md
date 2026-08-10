# Verification Harness

The harness keeps local development, Codex sessions, Claude sessions, and CI on the same quality gate.

## Main Command

```bash
bun run verify
```

This runs:

1. `bun run lint`
2. `bun test`
3. `bun run integration:local-json`
4. `bun run integration:diagnostics-json`
5. `bun run integration:operations-json`
6. `bun run integration:automation-presets`
7. `bun run integration:plugins-json`
8. `bun run integration:sftp`
9. `bun run typecheck`
10. `bun run build`
11. `bun run smoke`

`typecheck` covers `src/`, `tests/`, and `scripts/`, including the harness itself.

## Smoke Checks

```bash
bun run smoke
```

Smoke checks run read-only CLI commands that should be stable across macOS, Linux, and Windows:

- `bun src/bin/picos.ts version`
- `bun src/bin/picos.ts config get theme`

Language smoke can be checked manually with:

```bash
bun src/bin/picos.ts config set language ko
bun src/bin/picos.ts
```

Network-dependent commands such as `doctor` stay outside the minimal smoke gate; their bounded JSON transport and result shape are covered by the diagnostics integration gate below.

## Local Inspector JSON Integration

```bash
bun run harness local-json
```

This launches the real CLI sequentially for summary/full `info`, `routes`, destination `route`, `connections`, and `ports` JSON snapshots. It verifies complete single-document stdout, schema version, source execution status, process sampling counts, row and byte bounds, raw-output omission, option-conflict failures, invalid sorts, inline JSON flags, missing arguments, a deterministic unavailable-utility shim, non-zero failure exits, and a near-limit document through a real subprocess pipe. Optional route/connection/port utilities may be absent on a CI image; those live probes must then produce one failed document with source evidence, while summary/full info remains successful and the JSON transport/schema stays valid on macOS, Linux, and Windows.

## Diagnostics JSON Integration

```bash
bun run harness diagnostics-json
```

This launches the real CLI for live resolver state, the eight-entry Tools catalog, a successful TCP check against a disposable random-port localhost server, and the eight-check doctor report. Doctor may exit zero or one according to the runner's network health, but must always return a complete normalized report. Six deterministic cases verify locked DNS flush, unknown DNS/tool actions, missing tool arguments, invalid timeout, and `--raw --json`; each must emit exactly one guarded or failed document with a non-zero exit and no stderr. The check requires no public service for its success contract and runs in `bun run verify` on macOS, Linux, and Windows.

## Operations JSON Integration

```bash
bun run harness operations-json
```

This launches the real CLI for monitor, current-process detail, current-process file/resource inspection, and bounded OS logs. Monitor and process must complete without command arguments or raw collector output. Logs may complete or return a structured source failure because platform log access is environment-dependent; either outcome must be one complete JSON document with matching exit status and no stderr. Five deterministic cases verify lower/upper log-limit bounds, invalid severity, invalid PID, and missing PID. The check runs in `bun run verify` on macOS, Linux, and Windows.

## Automation Presets Integration

```bash
bun run harness automation-presets
```

This launches the real CLI against an isolated temporary config directory, so it never reads or writes the operator's saved presets. It verifies the published preset contract and the empty shelf, saves and runs one bounded monitor sampling preset, one OS log preset, and one current-process `--files` preset, then lists and removes presets through their exact confirmations.

Checked behavior:

1. `operations kinds --json` returns the three preset kinds, the save/remove confirmation templates, and the published id pattern and normalization rule without serializing the config path, and `operations kinds monitor --json` narrows to one entry while still reporting the full catalog count.
2. An empty shelf returns `request.operation=list`, `totalCount=0`, and `source.location=user-config` without serializing the config path.
3. The monitor preset is saved using the option names and confirmation template taken from that published contract, so the contract is proven executable rather than merely descriptive.
4. A saved monitor preset runs as a `monitor` document with `request.operation=sample`, matching requested and returned sample counts, and no raw output or command line.
5. A saved logs preset returns either a completed `logs` document or one structured `operations` source failure, because platform log access is environment-dependent; both outcomes stay a single document with matching exit status and no stderr.
6. A saved process preset returns a `process` document with the requested PID and `files=true` without command arguments or raw `lsof` output.
7. `operations list --json` reports the saved count with newest-saved-first ordering.
8. Eight deterministic cases verify a wrong confirmation phrase, an oversized monitor interval span, a missing preset id, an unknown action, an unknown preset kind, a surplus argument after a valid kind, a confirmation that repeats an un-normalized id instead of the normalized one, and an id that violates the published pattern by starting with a dot; each exits non-zero with one `operations` `PICOS_LOCAL_INSPECTOR_FAILED` document, no stderr, and an unchanged preset shelf. Each case is additionally paired with a substring of the message its own guard produces, and the document's echoed `request.operation` is checked, so a case that begins failing at a different guard than intended is caught rather than passing on the shared failure envelope. The two `kinds` failures also pin `request.kind`, because they echo it differently: an unknown kind echoes the rejected input, while a surplus argument echoes the kind accepted before it.
9. `operations remove <id>` with its published confirmation template reduces the saved count.

The check requires no public service and runs in `bun run verify` on macOS, Linux, and Windows.

Additional local manual checks:

```bash
bun src/bin/picos.ts info --full
bun src/bin/picos.ts monitor --samples 3 --interval 500
bun src/bin/picos.ts operations kinds
bun src/bin/picos.ts operations list
bun src/bin/picos.ts ping google.com --count 2 --timeout 5000
bun src/bin/picos.ts connect example.com 443
bun src/bin/picos.ts pwd
bun src/bin/picos.ts dir .
bun src/bin/picos.ts type README.md
```

## Plugin JSON Integration

```bash
bun run harness plugins-json
```

This launches the real source CLI against a disposable Bun-compiled Docker executable named `docker` on macOS/Linux and `docker.exe` on Windows. It runs through the same shell-free process behavior as the production collector and requires no Docker installation, daemon, credentials, or public network access. It verifies completed Docker data, a partial daemon failure with the fixture secret omitted from JSON, an unsupported Docker client with an empty child-only path, and an unknown-plugin failure. The fixture accepts only the exact four collector argv arrays, so a changed adapter command cannot be masked by the fake. Every case must remain one bounded JSON document without raw output or diagnostics; the completed and partial cases publish the four collector evidence rows only when the client is available. The check runs in `bun run verify` on macOS, Linux, and Windows.

## Credentialed SFTP Integration

```bash
bun run harness sftp
```

The focused harness is deterministic and requires no Docker image, system `sshd`, existing SSH agent, or public network. It:

1. Generates disposable Ed25519 host and client keys.
2. Starts a random-port localhost `ssh2` server with public-key authentication.
3. Serves an in-memory read-only filesystem and rejects/counts mutation and exec requests.
4. Launches the real picos CLI with an isolated config, private key, and matching `known_hosts` file.
5. Verifies JSON directory list and bounded/truncated file read results after observed session close.
6. Verifies a missing exact confirmation exits non-zero with structured output and opens no socket.

The check is part of `bun run verify`, so GitHub Actions runs it on Ubuntu, macOS, and Windows.

Manual TUI SFTP checks remain useful for interaction and responsive layout:

1. Configure a remote profile with `keyPath`, or start picos with a working `SSH_AUTH_SOCK`.
2. In Remotes, provide a matching `known_hosts` row with `K` or `P`.
3. Press `c`, enter `connect remote <id>`, and confirm Files can list and preview remote text files.
4. During a slow or unreachable connection, press `X` and verify `cancelled` appears in `REMOTE SESSION CONTROL`; press `R` and verify the exact confirmation is required again.
5. Confirm `c`, `m`, and `x` stay blocked in remote Files, then press `L` and verify `disconnected` plus the restored local root.
6. Repeat with a mismatched host-key row and verify the connection fails without opening a Files session.
7. Run the TUI at 80x24 and 120x40. Confirm Remotes stays inside its workspace, keeps `SESSION CONTROL` and the selected profile visible, and never overwrites the event dock.

Guarded CLI reads can also be exercised against an operator-owned server:

```bash
bun src/bin/picos.ts remote <id> --list . --known-hosts ~/.ssh/known_hosts --confirm "connect remote <id>"
bun src/bin/picos.ts remote <id> --read README.md --max-bytes 262144 --known-hosts ~/.ssh/known_hosts --confirm "connect remote <id>"
bun src/bin/picos.ts remote <id> --list . --known-hosts ~/.ssh/known_hosts --confirm "connect remote <id>" --json
```

Verify that omitting, padding, or mistyping `--confirm` opens no socket; numeric-looking paths remain paths; multiple usable keys require `--fingerprint`; a normal key duplicated by a matching `@revoked` row is blocked; oversized `known_hosts`, reads, and directory listings fail before unbounded output; and every terminal outcome writes one `remote connect audit` diagnostic without enabling remote writes. Successful reads must report `status=completed network=closed` after provider close.

`connect`, `ping`, and external network checks depend on local network availability, DNS, firewall state, and CI provider policy. Keep them out of deterministic CI smoke unless they are mocked or converted to parser-only tests.

## Local Manual Preview

```bash
bun src/bin/picos.ts
```

Expected keyboard controls:

- `1-6`: select panels
- `1-9`: select the first nine workspaces
- `left/right` or `h/l`: move between workspaces
- `up/down` or `j/k`: move through workspaces or actions
- `enter`: run the selected action
- `d`: run doctor
- `p`: ping the default host
- `r`: refresh
- `q`: quit

## CI

GitHub Actions runs the same `bun run verify` command on:

- Ubuntu
- macOS
- Windows

If a command is too environment-specific for CI, keep it out of `verify` and document it as a local manual check.
