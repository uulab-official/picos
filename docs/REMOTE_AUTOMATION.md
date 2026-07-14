# Remote Automation

`picos remote` supports host-key-verified, read-only SFTP list and text-read automation.

## Commands

```bash
picos remote <id> --list <path> \
  --known-hosts ~/.ssh/known_hosts \
  --confirm "connect remote <id>" \
  --json

picos remote <id> --read <path> \
  --max-bytes 262144 \
  --known-hosts ~/.ssh/known_hosts \
  --confirm "connect remote <id>" \
  --json
```

`--json` requires exactly one of `--list` or `--read`. The confirmation is byte-for-byte exact. `--timeout` accepts 1000-60000 milliseconds, `--max-bytes` accepts 1-1048576 bytes, and ambiguous usable host keys require `--fingerprint SHA256:...`.

## Stream Contract

- stdout contains exactly one JSON document for a success or expected command failure.
- stderr contains the terminal `remote connect audit` diagnostic when an operation was requested.
- failures return a non-zero process exit code.
- success is reported only after the SSH transport emits close.
- `schemaVersion` is currently `1`; consumers should reject unsupported versions.

The JSON document contains:

- `command`, `status`, and `operation`
- a sanitized profile without `keyPath` or credentials
- credential-redacted request path and applicable timeout/read bounds
- selected SHA256 fingerprint and closed/unknown network posture
- `list`, `stat`, and `read` capabilities with `writes=locked` and `exec=unsupported`
- list entries with paths relative to the requested directory, or bounded UTF-8 file content and truncation metadata
- a stable error code and message for failures

## Safety Boundary

JSON mode does not relax connection policy. picos still requires a matching local OpenSSH `known_hosts` candidate, blocks globally revoked keys, never auto-accepts host keys, and does not expose password authentication, remote write, transfer, delete, trust-file mutation, or remote command execution. Machine-readable path and error fields redact SFTP URL credentials and cap displayed text; list entry paths do not repeat the remote authority or root.

Run the disposable integration harness with:

```bash
bun run harness sftp
```

It creates fresh keys and a localhost read-only SFTP server, then launches the real CLI to verify authentication, host-key matching, exact confirmation, JSON list/read, bounded truncation, locked mutation/exec posture, and transport close.
