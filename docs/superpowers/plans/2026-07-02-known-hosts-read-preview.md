# Known Hosts Read Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locked local `known_hosts` read preview before picos reads local trust files or parses host-key rows.

**Architecture:** `src/core/remotes.ts` owns a pure `RemoteKnownHostsReadPreview` model and formatter. `formatRemoteProviderStatus()` and the Remotes TUI render the same rows after `REMOTE KNOWN_HOSTS SOURCE`. This slice still performs no local file read, no parser run, no SFTP import, no socket open, no host-key scan, and no mutation.

**Tech Stack:** Bun, TypeScript, Ink, Bun test.

---

### Task 1: Core Read Preview Model

**Files:**
- Modify: `tests/remotes.test.ts`
- Modify: `src/core/remotes.ts`

- [x] **Step 1: Write the failing tests**

Add imports and tests for `createRemoteKnownHostsReadPreview()` and `formatRemoteKnownHostsReadPreviewRows()` in `tests/remotes.test.ts`.

Expected selected rows:

```ts
expect(formatRemoteKnownHostsReadPreviewRows(createRemoteKnownHostsReadPreview(profile))).toEqual([
	"REMOTE KNOWN_HOSTS READ PREVIEW prod",
	"lookup=prod.example.com:2222 provider=sftp status=locked source=local-known-hosts",
	"paths=~/.ssh/known_hosts, ~/.ssh/known_hosts2 allowedBase=~/.ssh",
	"risk=read privilege=user parser=not-run match=unknown",
	'guards=localFileBoundary exactConfirm="read known_hosts prod" hostReview=required',
	"execution=willReadLocal=false willImport=false willConnect=false willScan=false willMutate=false",
	"next=confirm local known_hosts read preview before parsing trust rows",
]);
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test tests/remotes.test.ts`

Expected: FAIL because the new exports do not exist.

- [x] **Step 3: Implement minimal core functions**

Add the `RemoteKnownHostsReadPreview` type, `createRemoteKnownHostsReadPreview()`, and `formatRemoteKnownHostsReadPreviewRows()` in `src/core/remotes.ts`. Include rows in `formatRemoteProviderStatus()` after known-hosts source preview.

- [x] **Step 4: Run focused test to verify it passes**

Run: `bun test tests/remotes.test.ts`

Expected: PASS.

### Task 2: TUI Surface

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render known_hosts read preview in Remotes**

Import the new helpers, compute rows for the selected profile, and render a `KNOWN_HOSTS READ PREVIEW` section before `HOST REVIEW`.

- [x] **Step 2: Run focused checks**

Run: `bun test tests/remotes.test.ts && bun run typecheck && bun run lint && git diff --check`

Expected: all pass.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document v0.4.281**

Add README/CHANGELOG/ROADMAP notes describing the local read preview, exact confirmation phrase, local boundary, and no-read/no-network posture.

- [x] **Step 2: Run full verification**

Run: `bun run verify && bun run release:check && git diff --check`

Expected: all pass.

- [x] **Step 3: Commit, push, and open draft PR**

Commit message: `feat(remotes): preview known hosts reads`

Base branch: `codex/picos-v0.4.280-remote-known-hosts-preview`
