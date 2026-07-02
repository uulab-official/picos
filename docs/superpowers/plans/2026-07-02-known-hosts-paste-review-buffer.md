# v0.4.293 Known Hosts Paste Review Buffer Plan

## Goal

Let Remotes keep a hidden-content multi-row known_hosts paste review buffer so several candidates can be reviewed and compared without reading local trust files.

## Scope

- Add a pure paste review buffer with hidden raw content, source line count, parsed candidates, selected candidate, and blocked safety flags.
- Convert the paste review buffer into the existing candidate preview shape for compare detail.
- Keep invalid paste input from clearing previous candidate sessions.
- Feed successful paste reviews into Remotes candidate and compare detail sessions.
- Add a locked `P` Remotes prompt for escaped `\n` multi-row input.

## Safety Contract

- No local trust-file reads.
- No SFTP transport import.
- No socket opening.
- No host-key scan.
- No trust application.
- No known_hosts write.
- No remote mutation.

## Verification

- RED: `bun test tests/remotes.test.ts` failed on missing paste review exports.
- GREEN: `bun test tests/remotes.test.ts`
- GREEN: `bun run typecheck`
- GREEN: `bun run lint`

## Next

Add operator-controlled candidate selection or rotation inside the review buffer before enabling any local known_hosts read.
