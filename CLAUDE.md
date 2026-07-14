# Claude Code Guide

Claude should use `AGENTS.md` as the source of truth for this repository.

## Claude-Specific Notes

- Treat `picos` as a terminal OS product, not a generic CLI.
- Preserve the safety boundary around OS-changing actions.
- Do not bypass `src/utils/safeExec.ts` for process execution.
- Do not place OS-specific commands outside `src/adapters`.
- Keep SSH/SFTP transport in `src/core/sftp.ts`; require host-key verification and exact confirmation before opening a socket.
- Keep TUI and CLI SFTP lifecycle behavior aligned: visible cancellation, exact-confirm retry, bounded operations, structured audits, and guaranteed provider close.
- Preserve OpenSSH revocation semantics and case-insensitive DNS host matching; never weaken trust-file, read-size, or directory-list bounds.
- Keep remote `--json` output secret-free and schema-versioned on stdout, with audit diagnostics on stderr and a non-zero failure exit.
- Keep local inspector `--json` output bounded and schema-versioned, omit raw OS output and process arguments, redact failure text, retain source success/exit evidence, and use the awaited stdout writer without double-reporting write failures.
- Run the local JSON subprocess harness when changing `info`, routes, connections, ports, CLI output, or parser failure behavior.
- Run the diagnostics JSON subprocess harness when changing doctor, DNS, Tools, normalized tool evidence, timeout validation, or diagnostic failure behavior.
- Run the operations JSON subprocess harness when changing monitor, OS logs, process detail/files, log option validation, redaction, or operational source evidence; never serialize process arguments or raw log/process collector output.
- Run the public-key-authenticated localhost SFTP harness when changing transport, remote output, confirmation, or close behavior.
- Do not add password persistence, host-key auto-accept, remote writes, or remote command execution to the read-only provider.
- Keep OS inventory features read-only unless a write action has preview, confirmation, privilege metadata, and locked-by-default tests.
- Prefer `bun run verify` before final responses.

## Common Tasks

Run the app locally:

```bash
bun src/bin/picos.ts
```

Run the full harness:

```bash
bun run verify
```

Run a focused smoke check:

```bash
bun run smoke
```

Run the focused credentialed SFTP harness:

```bash
bun run harness sftp
```

Run the focused local inspector JSON harness:

```bash
bun run harness local-json
```

Run the focused diagnostics JSON harness:

```bash
bun run harness diagnostics-json
```

Run the focused operations JSON harness:

```bash
bun run harness operations-json
```

## TUI Expectations

The app should remain keyboard-first:

- `1-9` selects the first nine workspaces.
- `left/right` and `h/l` move between panels.
- `j/k` moves through workspaces, or child action rows after explicit focus.
- `r` refreshes.
- `q` quits.
- Remotes `K`/`P` supplies host-key candidates, `c` exact-confirms a read-only SFTP connection, and Files `L` closes it.

Avoid adding visible tutorial copy inside the primary dashboard unless it is part of the persistent footer or Status panel.
