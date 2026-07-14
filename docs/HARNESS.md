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
4. `bun run integration:sftp`
5. `bun run typecheck`
6. `bun run build`
7. `bun run smoke`

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

Network-dependent commands such as `doctor` are useful locally but are not part of the cross-platform smoke gate yet.

## Local Inspector JSON Integration

```bash
bun run harness local-json
```

This launches the real CLI sequentially for summary/full `info`, `routes`, destination `route`, `connections`, and `ports` JSON snapshots. It verifies complete single-document stdout, schema version, source execution status, process sampling counts, row and byte bounds, raw-output omission, option-conflict failures, invalid sorts, inline JSON flags, missing arguments, a deterministic unavailable-utility shim, non-zero failure exits, and a near-limit document through a real subprocess pipe. Optional route/connection/port utilities may be absent on a CI image; those live probes must then produce one failed document with source evidence, while summary/full info remains successful and the JSON transport/schema stays valid on macOS, Linux, and Windows.

Additional local manual checks:

```bash
bun src/bin/picos.ts info --full
bun src/bin/picos.ts ping google.com --count 2 --timeout 5000
bun src/bin/picos.ts connect example.com 443
bun src/bin/picos.ts pwd
bun src/bin/picos.ts dir .
bun src/bin/picos.ts type README.md
```

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
