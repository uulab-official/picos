# Task 8 Report — Interface and DNS Target/Proposal Transitions

## RED / GREEN

- RED: `bun test tests/interfacePanel.test.ts tests/dnsPanel.test.ts` failed because `src/tui/dnsPanel.ts` and the planned interface transition exports did not exist.
- RED follow-up: the source-handoff regression failed because an empty interface inventory returned `{ kind: "source-handoff" }` for `e` instead of an explicit no-op.
- GREEN: the focused suite passed with 37 tests / 136 expectations across `interfacePanel`, `dnsPanel`, `interfaceControl`, `dnsControl`, and `actions`.

## Transition ownership

- `src/tui/interfacePanel.ts` resolves selected interfaces with `clampIndex()`, source-handoff eligibility, state proposal drafts, confirmation outcomes, and all associated notices.
- `src/tui/dnsPanel.ts` resolves DNS interface targets with `clampIndex()`, prepares locked server proposals, exposes confirmation eligibility, and returns explicit no-ops for unavailable target lists.
- `App.tsx` applies transition state, opens prompts, records audits, and retains the existing handoff I/O adapters. No callback was added; the audit remains 154 `useCallback` declarations plus one `useInput` dispatcher.

## Callback manifest rows

| Callback | Owner | Classification |
| --- | --- | --- |
| `exportInterfaceSourceHandoff` | `src/tui/interfacePanel.ts` | delegated |
| `openInterfaceSourceHandoff` | `src/tui/interfacePanel.ts` | delegated |
| `submitDnsServerProposalCommand` | `src/tui/dnsPanel.ts` | delegated |
| `openInterfaceStateProposal` | `src/tui/interfacePanel.ts` | delegated |
| `submitInterfaceConfirmationCommand` | `src/tui/interfacePanel.ts` | delegated |
| `useInput` | App plus panel transition owners | inline-decision (partial interface/DNS delegation) |

## Locked-safety evidence

- Interface and DNS transitions only call proposal/control constructors; they do not invoke command execution or `safeExec()`.
- Tested proposals remain `enabled: false` and previews/confirmation results remain `willExecute: false`.
- A Darwin interface without a resolvable service mapping returns an explicit no-op before a proposal/control preview is created.
- Empty, raw out-of-range, unsupported, or unresolved interface targets return no-op decisions and expose a keyless control row; DNS continues to replace `T`/`S`/`C` controls with a non-actionable unavailable-target row.
- Exact interface confirmation mismatches produce the existing rejected audit result and retain the execution-disabled blockers.

## Verification

- `bun test tests/interfacePanel.test.ts tests/dnsPanel.test.ts tests/interfaceControl.test.ts tests/dnsControl.test.ts tests/actions.test.ts` — pass (37 tests, 136 expectations)
- `bun run audit:tui-callbacks` — pass (`callbacks=154`, `useInput=1`, `total=155`, `inlineDecisions=62`)
- `bun run typecheck` — pass
- `bun run lint` — pass
- `git diff --check` — pass
- `bun run verify` — pass (973 tests, all five integration harnesses, typecheck, build, and smoke)

## Self-review

- Verified all new selection resolution uses `clampIndex()`.
- Verified no new `useCallback` or App tests were introduced.
- Verified supported notices/prompt wording is preserved and no targetless path enters mutation proposal or handoff I/O.
- Verified no `dist/` output is included.

## Concerns

- `bun run audit:tui-callbacks --strict` intentionally remains non-zero with 62 inline-decision entries, including `useInput`; unrelated dispatcher decisions remain for later work.

## Commit

- Local commit: `refactor(tui): extract interface and DNS transitions`
- Push: intentionally not performed; review remains pending.

## Fix round 1/5

- RED: added interface transition tests for raw negative/beyond-end selection, unsupported platform, missing control target confidence, unavailable D/U/K/enter/C keys, and stale selection confirmation reset. The first run failed because `prepareInterfaceSelectionTransition` was not exported.
- Root cause: proposal eligibility reused the clamped display resolver, allowing raw stale indexes to select a different interface, while proposal status did not reject unresolved/unsupported control targets. App also owned j/k/up/down resets and omitted `interfaceConfirmationResult`.
- GREEN: interface eligibility now requires a raw in-range selected interface plus an exact control target. Unsupported and unresolved targets produce no-op notices and a keyless control-row intent. The pure selection transition repairs/moves with `clampIndex()` and clears copy preview, proposal, and confirmation together only when the selected index changes.
- Manifest correction: `useInput` is restored to `inline-decision`; the audit now truthfully reports 154 callbacks plus one dispatcher and 62 outstanding inline decisions. Its reason records the partial interface/DNS delegation without claiming the whole dispatcher is delegated.
- DNS confirmation eligibility is unchanged and remains controller-deferred, per review direction.
- Rechecked the five Task 8 callbacks (`exportInterfaceSourceHandoff`, `openInterfaceSourceHandoff`, `submitDnsServerProposalCommand`, `openInterfaceStateProposal`, and `submitInterfaceConfirmationCommand`) and the Task 8 `useInput` branches: owner modules now determine target guards and notices; App only applies decisions or performs the existing handoff/prompt I/O.
- The interface heading now derives its D/U/K/enter/C wording from the same control intent, and the Actions render path uses `resolveSelectedInterface()` rather than an inline clamp.
- Fix-round verification: focused related suite passed (40 tests, 153 expectations); callback audit reported `154+1` with `inlineDecisions=62`; `--strict` intentionally failed with `strict audit rejected 62 inline-decision entries`; typecheck and `git diff --check` passed.
- Full verification: `bun run verify` passed: lint, 976 tests / 3125 expectations across 90 files, all five integration harnesses, typecheck, build, and smoke.
