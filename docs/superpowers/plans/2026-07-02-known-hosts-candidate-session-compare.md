# v0.4.292 Known Hosts Candidate Session Compare Plan

## Goal

Let Remotes keep a parsed known_hosts candidate in session so provided host-key evidence can immediately compare against it.

## Scope

- Add a pure known_hosts candidate session map keyed by remote profile id.
- Preserve selected candidate metadata and source in the session preview.
- Keep invalid/empty candidate input from clearing previous session candidates.
- Feed session candidates into Remotes candidate rows and host-key compare detail.
- Add a locked `K` Remotes prompt for one-line known_hosts candidate input.

## Safety Contract

- No local trust-file reads.
- No SFTP transport import.
- No socket opening.
- No host-key scan.
- No trust application.
- No known_hosts write.
- No remote mutation.

## Verification

- RED: `bun test tests/remotes.test.ts` failed on missing known_hosts candidate session exports.
- GREEN: `bun test tests/remotes.test.ts`
- GREEN: `bun test tests/remotes.test.ts tests/statusActivityQueue.test.ts`
- GREEN: `bun run typecheck`

## Next

Add a multi-row known_hosts paste/import review buffer so operators can compare multiple candidates without squeezing source content into one prompt line.
