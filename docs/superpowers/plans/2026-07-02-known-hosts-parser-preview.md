# Known Hosts Parser Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locked `known_hosts` parser preview so picos can show the future trust-row parse boundary before reading local files or making host trust decisions.

**Architecture:** `src/core/remotes.ts` owns a pure `RemoteKnownHostsParserPreview` model and formatter. `formatRemoteProviderStatus()` and the Remotes TUI render the same rows after `REMOTE KNOWN_HOSTS READ PREVIEW`, keeping parsing, local file reads, SFTP imports, socket opens, host-key scans, trust decisions, and mutation disabled.

**Tech Stack:** Bun, TypeScript, Ink, Bun test.

---

### Task 1: Core Parser Preview Model

**Files:**
- Modify: `tests/remotes.test.ts`
- Modify: `src/core/remotes.ts`

- [x] **Step 1: Write the failing tests**

Add imports and tests for `createRemoteKnownHostsParserPreview()` and `formatRemoteKnownHostsParserPreviewRows()` in `tests/remotes.test.ts`.

Expected selected rows:

```ts
expect(formatRemoteKnownHostsParserPreviewRows(createRemoteKnownHostsParserPreview(profile))).toEqual([
	"REMOTE KNOWN_HOSTS PARSER PREVIEW prod",
	"lookup=prod.example.com:2222 provider=sftp status=locked source=local-known-hosts",
	"parser=planned formats=plain,hashed,marker,cert-authority match=unknown",
	"candidates=0 selected=none fingerprint=sha256:unknown trustDecision=blocked",
	'guards=localReadRequired exactConfirm="parse known_hosts prod" hostReview=required',
	"execution=willReadLocal=false willParse=false willConnect=false willScan=false willTrust=false willMutate=false",
	"next=confirm parser preview after local known_hosts read boundary",
]);
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test tests/remotes.test.ts`

Expected: FAIL because the new exports do not exist.

- [x] **Step 3: Implement minimal core functions**

Add the `RemoteKnownHostsParserPreview` type, `createRemoteKnownHostsParserPreview()`, and `formatRemoteKnownHostsParserPreviewRows()` in `src/core/remotes.ts`. Include rows in `formatRemoteProviderStatus()` after known-hosts read preview.

- [x] **Step 4: Run focused test to verify it passes**

Run: `bun test tests/remotes.test.ts`

Expected: PASS.

### Task 2: TUI Surface

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Render known_hosts parser preview in Remotes**

Import the new helpers, compute rows for the selected profile, and render a `KNOWN_HOSTS PARSER PREVIEW` section before `HOST REVIEW`.

- [x] **Step 2: Run focused checks**

Run: `bun test tests/remotes.test.ts && bun run typecheck && bun run lint && git diff --check`

Expected: all pass.

### Task 3: Docs, Verification, PR

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document v0.4.282**

Add README/CHANGELOG/ROADMAP notes describing the parser preview, exact confirmation phrase, trust-decision lock, and no-read/no-network posture.

- [x] **Step 2: Run full verification**

Run: `bun run verify && bun run release:check && git diff --check`

Expected: all pass.

- [x] **Step 3: Commit, push, and open draft PR**

Commit message: `feat(remotes): preview known hosts parsing`

Base branch: `codex/picos-v0.4.281-known-hosts-read-preview`
