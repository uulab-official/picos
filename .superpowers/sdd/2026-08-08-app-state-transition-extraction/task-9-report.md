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

## Fix round 1/5

### RED / GREEN evidence

- RED: `bun test tests/remotesPanel.test.ts` produced 18 passes and 4 intended failures. The failures reproduced raw invalid-selection input in a notice, missing active disconnect ownership, missing terminal publication for `connecting`, and accepted `connected` publication over a current `cancelling` diagnostic.
- GREEN: the focused owner suite passed with 22 tests / 58 expectations after the minimal fixes.
- Related GREEN: `bun test tests/remotesPanel.test.ts tests/remotes.test.ts tests/connect.test.ts tests/sftp.test.ts tests/statusEvidence.test.ts tests/statusActivityQueue.test.ts tests/fileWorkspaceTransitions.test.ts` passed with 244 tests / 815 expectations.

### Critical — disconnect during replacement connection

- Root cause: disconnect advanced the diagnostic sequence but only terminalized `connected`; the pending controller/provider and run-token ownership were not part of the disconnect intent. The superseded connection then correctly suppressed its stale cancellation, leaving the visible diagnostic at `connecting` or `cancelling`.
- `prepareRemoteDisconnect()` now identifies a live `connecting`/`cancelling` attempt and returns cancellation ownership only when the active run token matches the current token and a pending controller exists.
- App advances the shared diagnostic sequence, aborts and closes only the captured owning controller/provider, and clears controller/provider/token refs only while they still identify that owner. The connect callback keeps its unconditional counted `endCommand()` in `finally`.
- Disconnect publication maps `connecting` and `cancelling` to terminal `cancelled`, maps a restored `connected` session to `disconnected`, and remains sequence-guarded. A cancelled disconnect is immediately eligible for an empty exact-confirm retry prompt.
- Regression coverage includes connecting, cancelling, connected, stale owner token, sequence-stale disconnect, and retry eligibility.

### Important — late connected publication

- Root cause: the final live-attempt check occurred before `await loadFiles(...)`, and same-attempt identity accepted a current `cancelling` diagnostic.
- Every connect await boundary—transport connect, `pwd`, `list`, and provider switch—is now followed by the same pure publication classifier using the shared sequence, active run token, exact attempt identity, controller ownership, abort state, and current diagnostic status.
- A `connected` outcome is publishable only while the exact current diagnostic remains `connecting`; `cancelling`, aborted, lost-controller, and superseded-token attempts are stale. Failure/cancellation history remains recordable while stale outcomes cannot replace current state.
- Regression coverage includes normal success, cancellation before publication, cancellation during switch cleanup, and a superseded run token.

### Important — invalid paste-selection redaction

- Root cause: the invalid typed candidate notice interpolated the raw command-line value.
- Invalid selection now returns the constant `remote known_hosts paste candidate selection invalid` notice and no activity/audit payload containing the supplied value.
- The regression uses credential-, password-, and private-key-like input and verifies the complete serialized transition contains none of those substrings.

### Safety recheck

- Exact connect and host-trust confirmation mismatch tests still preserve the original received bytes.
- Cross-session matching `@revoked` fingerprints remain global blockers.
- SFTP remains list/stat/read-only; no trust-file write, remote mutation, or remote command path was introduced.
- Pending and established providers retain guaranteed close paths, and command status begin/end remains counted with unconditional final cleanup.
- No App test or new React callback was added; the inventory remains 154 callbacks plus one `useInput` dispatcher.

### Fix-round verification

- `bun run audit:tui-callbacks` — pass (`callbacks=154`, `useInput=1`, `total=155`, `inlineDecisions=45`)
- `bun run typecheck` — pass
- `git diff --check` — pass
- `bun run verify` — pass (998 tests / 3,183 expectations across 91 files, all five integration harnesses, typecheck, build, and smoke)

### Fix-round commit

- Local commit: `fix(tui): harden remote lifecycle transitions`
- Push: intentionally not performed; review remains pending.

## Fix round 2/5

### RED / GREEN evidence

- RED: `bun test tests/remotesPanel.test.ts` produced 22 passes and the intended restore-failure regression failed. The connected/`localRestored=false` branch returned the false-success notice `read-only SFTP session closed; local filesystem restored` and did not explicitly retain remote-session ownership.
- GREEN: the focused owner suite passed with 23 tests / 63 expectations after the isolated classifier fix.
- Related GREEN: `bun test tests/remotesPanel.test.ts tests/remotes.test.ts tests/connect.test.ts tests/sftp.test.ts tests/statusEvidence.test.ts tests/statusActivityQueue.test.ts tests/fileWorkspaceTransitions.test.ts` passed with 245 tests / 820 expectations.

### Important — connected restore-failure notice and ownership

- Root cause: `classifyRemoteDisconnectPublication()` built the connected-session success notice before checking `localRestored === false`. App already avoided provider close when restore failed, and the Files switch transition already left the active remote provider/context uncommitted and unchanged.
- The connected restore-failure branch now returns `publishCurrent=false`, `retainRemoteSession=true`, and the explicit failure notice `local filesystem restore failed; read-only SFTP session remains connected` at `level=fail`, following the existing Files restore-failure wording.
- The branch returns no terminal diagnostic and no audit payload, so App preserves the current `connected` diagnostic and logs no disconnected/success result. The established provider and remote context remain owned by the active session.
- Retry remains unavailable from the retained `connected` diagnostic. The regression asserts the exact no-retry notice.
- The connected/`localRestored=true` regression remains unchanged: it publishes `disconnected` with the existing successful local-restoration notice.

### Fix-round verification

- `bun run audit:tui-callbacks` — pass (`callbacks=154`, `useInput=1`, `total=155`, `inlineDecisions=45`)
- `bun run typecheck` — pass
- `git diff --check` — pass
- `bun run verify` — pass (999 tests / 3,188 expectations across 91 files, all five integration harnesses, typecheck, build, and smoke)

### Fix-round commit

- Local commit: `fix(tui): report remote restore failures`
- Push: intentionally not performed; review remains pending.
