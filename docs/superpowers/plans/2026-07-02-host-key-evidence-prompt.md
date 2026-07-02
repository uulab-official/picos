# v0.4.290 Host Key Evidence Prompt Plan

## Goal

Add a locked Remotes prompt for entering provided host-key fingerprint evidence without opening SFTP transport, scanning hosts, trusting hosts, writing `known_hosts`, or mutating remote state.

## Scope

- Add core confirmation and audit models for provided host-key evidence input.
- Add Status Activity result/history/timeline recovery rows for evidence submissions.
- Add Remotes focus keyboard support with `e` and a live `:remote-host-key-evidence` prompt.
- Update docs and roadmap for the new operator flow.

## Safety Contract

- `networkOpened=false`
- `hostKeyScanned=false`
- `trustApplied=false`
- `knownHostsWritten=false`
- `remoteMutated=false`

## Verification

- RED: `bun test tests/remotes.test.ts tests/statusActivityQueue.test.ts` failed on missing evidence prompt exports.
- GREEN: `bun test tests/remotes.test.ts tests/statusActivityQueue.test.ts`
- GREEN: `bun run typecheck`

## Next

Persist the latest evidence fingerprint in session state so compare detail can immediately show `matched`, `mismatch`, or `evidence-only` after the operator submits the prompt.
