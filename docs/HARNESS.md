# Verification Harness

The harness keeps local development, Codex sessions, Claude sessions, and CI on the same quality gate.

## Main Command

```bash
bun run verify
```

This runs:

1. `bun run lint`
2. `bun test`
3. `bun run typecheck`
4. `bun run build`
5. `bun run smoke`

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

Additional local manual checks:

```bash
bun src/bin/picos.ts info --full
bun src/bin/picos.ts ping google.com --count 2 --timeout 5000
bun src/bin/picos.ts connect example.com 443
bun src/bin/picos.ts pwd
bun src/bin/picos.ts dir .
bun src/bin/picos.ts type README.md
```

Read-only SFTP needs a real SSH server and is therefore a manual integration check:

1. Configure a remote profile with `keyPath`, or start picos with a working `SSH_AUTH_SOCK`.
2. In Remotes, provide a matching `known_hosts` row with `K` or `P`.
3. Press `c`, enter `connect remote <id>`, and confirm Files can list and preview remote text files.
4. During a slow or unreachable connection, press `X` and verify `cancelled` appears in `REMOTE SESSION CONTROL`; press `R` and verify the exact confirmation is required again.
5. Confirm `c`, `m`, and `x` stay blocked in remote Files, then press `L` and verify `disconnected` plus the restored local root.
6. Repeat with a mismatched host-key row and verify the connection fails without opening a Files session.
7. Run the TUI at 80x24 and 120x40. Confirm Remotes stays inside its workspace, keeps `SESSION CONTROL` and the selected profile visible, and never overwrites the event dock.

The same credentialed server can verify guarded CLI reads:

```bash
bun src/bin/picos.ts remote <id> --list . --known-hosts ~/.ssh/known_hosts --confirm "connect remote <id>"
bun src/bin/picos.ts remote <id> --read README.md --max-bytes 262144 --known-hosts ~/.ssh/known_hosts --confirm "connect remote <id>"
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
