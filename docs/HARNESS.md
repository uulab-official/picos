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
```

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
