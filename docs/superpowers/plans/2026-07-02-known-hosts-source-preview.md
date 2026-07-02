# Known Hosts Source Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locked local `known_hosts` source preview before future SFTP fingerprint collection.

**Architecture:** `src/core/remotes.ts` owns a pure `RemoteKnownHostsSourcePreview` model and formatter. `formatRemoteProviderStatus()` and the Remotes TUI render the same rows between `REMOTE HOST KEY EVIDENCE` and `REMOTE HOST REVIEW`. The preview lists local source candidates but does not read files, import SFTP transport, open sockets, scan host keys, or mutate anything.

**Tech Stack:** Bun, TypeScript, Ink, Bun test.

---

### Task 1: Core Preview Model

**Files:**
- Modify: `tests/remotes.test.ts`
- Modify: `src/core/remotes.ts`

- [x] **Step 1: Write the failing tests**

Add imports and tests for `createRemoteKnownHostsSourcePreview()` and `formatRemoteKnownHostsSourcePreviewRows()` in `tests/remotes.test.ts`.

Expected selected rows:

```ts
expect(formatRemoteKnownHostsSourcePreviewRows(createRemoteKnownHostsSourcePreview(profile))).toEqual([
	"REMOTE KNOWN_HOSTS SOURCE prod",
	"lookup=prod.example.com:2222 provider=sftp status=not-read source=local-files",
	"paths=~/.ssh/known_hosts, ~/.ssh/known_hosts2",
	"match=unknown hashed=unknown fingerprint=sha256:unknown",
	'guards=localReadPreview hostReview exactConfirm="connect remote prod"',
	"execution=willReadLocal=false willImport=false willConnect=false willScan=false willMutate=false",
	"next=preview local known_hosts lookup before fingerprint collection",
]);
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test tests/remotes.test.ts`

Expected: FAIL because the new exports do not exist.

- [x] **Step 3: Implement minimal core functions**

Add the `RemoteKnownHostsSourcePreview` type, `createRemoteKnownHostsSourcePreview()`, and `formatRemoteKnownHostsSourcePreviewRows()` in `src/core/remotes.ts`. Include the formatted rows in `formatRemoteProviderStatus()` after host-key evidence.

- [x] **Step 4: Run focused test to verify it passes**

Run: `bun test tests/remotes.test.ts`

Expected: PASS.

### Task 2: TUI Surface

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render known_hosts source preview in Remotes**

Import the new helpers, compute rows for the selected profile, and render a `KNOWN_HOSTS SOURCE` section before `HOST REVIEW`.

- [x] **Step 2: Run focused checks**

Run: `bun test tests/remotes.test.ts && bun run typecheck && bun run lint && git diff --check`

Expected: all pass.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document v0.4.280**

Add README/CHANGELOG/ROADMAP notes describing local `known_hosts` source candidates, no local file read yet, and no remote socket posture.

- [x] **Step 2: Run full verification**

Run: `bun run verify && bun run release:check && git diff --check`

Expected: all pass.

- [x] **Step 3: Commit, push, and open draft PR**

Commit message: `feat(remotes): preview known hosts sources`

Base branch: `codex/picos-v0.4.279-remote-host-key-evidence`
