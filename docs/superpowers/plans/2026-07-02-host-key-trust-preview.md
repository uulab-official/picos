# Host Key Trust Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locked host-key trust decision preview so picos can show the future fingerprint comparison boundary before trusting any remote host.

**Architecture:** `src/core/remotes.ts` owns a pure `RemoteHostKeyTrustDecisionPreview` model and formatter. `formatRemoteProviderStatus()` and the Remotes TUI render the same rows after `REMOTE KNOWN_HOSTS PARSER PREVIEW`, keeping SFTP imports, sockets, local reads, parser runs, scans, trust decisions, and mutation disabled.

**Tech Stack:** Bun, TypeScript, Ink, Bun test.

---

### Task 1: Core Trust Decision Preview Model

**Files:**
- Modify: `tests/remotes.test.ts`
- Modify: `src/core/remotes.ts`

- [x] **Step 1: Write the failing tests**

Add imports and tests for `createRemoteHostKeyTrustDecisionPreview()` and `formatRemoteHostKeyTrustDecisionPreviewRows()` in `tests/remotes.test.ts`.

Expected selected rows:

```ts
expect(formatRemoteHostKeyTrustDecisionPreviewRows(createRemoteHostKeyTrustDecisionPreview(profile))).toEqual([
	"REMOTE HOST KEY TRUST DECISION prod",
	"target=sftp://deploy@prod.example.com:2222/srv/app lookup=prod.example.com:2222 provider=sftp status=locked",
	"collected=sha256:unknown knownHosts=sha256:unknown match=unknown decision=blocked",
	"inputs=hostKeyEvidence:required knownHostsParser:required hostReview:required",
	'guards=compareOnly exactConfirm="review host trust prod" connectConfirm="connect remote prod"',
	"execution=willImport=false willConnect=false willReadLocal=false willParse=false willScan=false willTrust=false willMutate=false",
	"next=collect host key evidence and parse known_hosts before trust decision",
]);
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test tests/remotes.test.ts`

Expected: FAIL because the new exports do not exist.

- [x] **Step 3: Implement minimal core functions**

Add the `RemoteHostKeyTrustDecisionPreview` type, `createRemoteHostKeyTrustDecisionPreview()`, and `formatRemoteHostKeyTrustDecisionPreviewRows()` in `src/core/remotes.ts`. Include rows in `formatRemoteProviderStatus()` after known-hosts parser preview.

- [x] **Step 4: Run focused test to verify it passes**

Run: `bun test tests/remotes.test.ts`

Expected: PASS.

### Task 2: TUI Surface

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render host-key trust decision preview in Remotes**

Import the new helpers, compute rows for the selected profile, and render a `HOST KEY TRUST DECISION` section before `HOST REVIEW`.

- [x] **Step 2: Run focused checks**

Run: `bun test tests/remotes.test.ts && bun run typecheck && bun run lint && git diff --check`

Expected: all pass.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document v0.4.283**

Add README/CHANGELOG/ROADMAP notes describing the trust decision preview, exact confirmation phrase, comparison-only guard, and no-trust/no-network posture.

- [x] **Step 2: Run full verification**

Run: `bun run verify && bun run release:check && git diff --check`

Expected: all pass.

- [ ] **Step 3: Commit, push, and open draft PR**

Commit message: `feat(remotes): preview host key trust`

Base branch: `codex/picos-v0.4.282-known-hosts-parser-preview`
