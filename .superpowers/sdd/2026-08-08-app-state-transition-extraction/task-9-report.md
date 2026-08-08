# Task 9 Report — Remote Lifecycle Transitions

## RED / GREEN

- RED: `bun test tests/remotesPanel.test.ts` failed because `src/tui/remotesPanel.ts` did not exist.
- GREEN 1: profile/connect lifecycle guards passed after adding the first pure transition owner (9 tests).
- RED/GREEN 2: profile commands, exact confirmation, cross-session `@revoked` blocking, paste review, retry, and evidence handoff exports were added one behavior at a time; each missing export failed before its implementation. The final focused owner suite passed with 19 tests / 46 expectations.
- GREEN related: `bun test tests/remotesPanel.test.ts tests/remotes.test.ts tests/connect.test.ts tests/sftp.test.ts tests/statusEvidence.test.ts tests/statusActivityQueue.test.ts tests/fileWorkspaceTransitions.test.ts` passed with 241 tests / 801 expectations.

## Transition ownership

- `src/tui/remotesPanel.ts` owns clamped profile selection/staging, profile command parsing, selected host-key resolution, paste-review state, exact connect/trust confirmation, retry eligibility, cancellation/disconnect decisions, diagnostic publication notices, and remote `known_hosts` evidence handoff intents.
- `App.tsx` retains config and local `known_hosts` reads, SFTP connect/list/provider switching, audit export writes, clipboard/open application, and guaranteed provider/session close I/O.
- Core retains the read-only SFTP provider, host-key parsing/model construction, audit formatting, and locked trust/write behavior. No remote write/delete/exec path was added.
- `useInput` still dispatches inline; its Remotes branches apply owner intents, and the whole dispatcher remains `inline-decision` until its remaining slices are extracted.

## Lifecycle / token map

| State group | Identity | Writers | Publication rule |
| --- | --- | --- | --- |
| Visible remote connection diagnostic | `remoteConnectionDiagnosticSequenceRef` | connect start/outcome and disconnect | Every async outcome must match the newest shared diagnostic sequence before it may replace current state. |
| Active long connection | monotonically increasing run token plus `activeRemoteConnectionRunTokenRef` | connect start, outcome, cancellation, final cleanup | Success/failure/cancellation may publish current state only for the active run token; superseded cleanup cannot clear a newer run. |
| Transport cancellation | per-run `AbortController` | App connect/cancel I/O adapter | The pure transition first verifies pending transport, active token, and `connecting` status; App then aborts and closes the pending provider. |
| Failure/cancellation history | audit/activity result from the classified outcome | App event/status publishers | Every failure remains historical evidence, while stale failures cannot set the visible diagnostic. Stale success also cannot publish a diagnostic or connected notice. |
| Shared command status | existing counted `beginCommand()` / `endCommand()` | connect callback | Every begin has one unconditional end in `finally`, including superseded runs. |

## Callback manifest rows

| Callback | Owner | Classification |
| --- | --- | --- |
| `disconnectRemoteFiles` | `src/tui/remotesPanel.ts` | delegated |
| `selectRemoteProfile` | `src/tui/remotesPanel.ts` | delegated |
| `submitRemoteProfileCommand` | `src/tui/remotesPanel.ts` | delegated |
| `submitRemoteConnectCommand` | `src/tui/remotesPanel.ts` | delegated |
| `cancelPendingRemoteConnect` | `src/tui/remotesPanel.ts` | delegated |
| `submitRemoteHostKeyEvidenceInputCommand` | `src/tui/remotesPanel.ts` | delegated |
| `submitRemoteKnownHostsCandidateCommand` | `src/tui/remotesPanel.ts` | delegated |
| `submitRemoteKnownHostsPasteReviewCommand` | `src/tui/remotesPanel.ts` | delegated |
| `moveRemoteKnownHostsPasteReviewSelectionCommand` | `src/tui/remotesPanel.ts` | delegated |
| `selectRemoteKnownHostsPasteReviewCandidateCommand` | `src/tui/remotesPanel.ts` | delegated |
| `submitRemoteKnownHostsPasteSelectionCommand` | `src/tui/remotesPanel.ts` | delegated |
| `submitRemoteHostTrustReviewCommand` | `src/tui/remotesPanel.ts` | delegated |
| `getSelectedRemoteKnownHostsSelectionEvidenceResultOptions` | `src/tui/remotesPanel.ts` | delegated |
| `openSelectedRemoteKnownHostsSelectionEvidenceClipboardHandoff` | `src/tui/remotesPanel.ts` | delegated |
| `exportSelectedRemoteKnownHostsSelectionEvidenceHandoff` | `src/tui/remotesPanel.ts` | delegated |
| `selectNextRemoteKnownHostsEvidenceHandoff` | `src/tui/remotesPanel.ts` plus status owner | delegated |
| `openSelectedRemoteKnownHostsEvidenceHandoff` | `src/tui/remotesPanel.ts` plus status/timeline owners | delegated |
| `useInput` | App plus extracted panel owners | inline-decision |

## Trust and read-only safety

- Connect and host-trust submissions compare the received string directly to the expected phrase. Mismatches preserve the original bytes in the rejected confirmation; no trim or normalization occurs in the transition.
- Candidate resolution scans both the one-line candidate session and paste-review session. A matching `@revoked` fingerprint in either session blocks the selected fingerprint globally, even when the revoked row is not selected.
- Retry is available only for the selected profile after `failed` or `cancelled`. It reopens an empty prompt and requires the exact `connect remote <id>` phrase again.
- `connecting` and `cancelling` are both busy. Cancellation is valid only for the current active token and cannot expose a second connection window.
- Clipboard and export operations are typed handoff intents only. SFTP remains list/stat/read-only; trust-file writes, remote mutation, and command execution remain unavailable.

## Verification

- Focused owner suite — pass (19 tests, 46 expectations)
- Related remote/status/files suite — pass (241 tests, 801 expectations)
- `bun run audit:tui-callbacks` — pass (`callbacks=154`, `useInput=1`, `total=155`, `inlineDecisions=45`)
- `bun run audit:tui-callbacks --strict` — expected non-zero (`strict audit rejected 45 inline-decision entries`)
- `bun run lint` — pass
- `bun run typecheck` — pass
- `git diff --check` — pass
- `bun run verify` — pass (995 tests / 3,171 expectations across 91 files, all five integration harnesses, typecheck, build, and smoke)

## Self-review

- Verified every remote profile selection and evidence option repair uses `clampIndex()`.
- Verified no new App test or callback was introduced; the callback inventory remains 154 plus one dispatcher.
- Verified current diagnostic writes are guarded in success, failure, cancellation, and disconnect paths, with a shared sequence and a separate active-run token.
- Verified transport, config/known-hosts reads, audit writes, clipboard/open calls, and close operations remain outside the pure transition owner.
- Verified the checklist is updated and no `dist/` output is included.

## Concerns

- Strict callback audit intentionally remains non-zero with 45 unrelated inline decisions; `useInput` remains inline-owned until the full dispatcher extraction is complete.
- The integration harness validates disposable localhost public-key SFTP. Operator-specific remote credentials and servers remain a manual environment check.

## Commit

- Local commit: `refactor(tui): extract remote lifecycle transitions`
- Push: intentionally not performed; review remains pending.
