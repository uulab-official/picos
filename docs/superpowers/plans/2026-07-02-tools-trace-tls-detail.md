# Tools Trace TLS Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Tools Hub traceroute and TLS results more inspectable with structured Target/Status/detail sections that flow through CLI, TUI, copy, compare, and export.

**Architecture:** `src/core/tools.ts` owns the canonical `ToolResult` sections and raw output, so improving TLS/traceroute there upgrades every downstream formatter. Tests will inject TLS/traceroute runtimes instead of touching the network, keeping verification deterministic. Docs and roadmap will record the lazyifconfig parity slice.

**Tech Stack:** Bun, TypeScript, Node TLS/safeExec boundaries, Bun test, Biome.

---

### Task 1: TLS Inspector Structured Sections

**Files:**
- Modify: `src/core/tools.ts`
- Modify: `tests/tools.test.ts`

- [x] **Step 1: Write failing TLS test**

Add a test that calls `runTool("tls", ["example.com:443"], { inspectTls })` and expects sections:

```txt
Target
Status
Certificate
```

with command, timeout, authorized state, protocol, cipher, subject, issuer, validity, SAN, and certificate count rows.

- [x] **Step 2: Verify RED**

Run:

```bash
bun test tests/tools.test.ts
```

Expected: FAIL because TLS inspection is not injectable and only emits a single `TLS` section.

- [x] **Step 3: Implement TLS detail model**

Add `TlsInspection`, injectable `inspectTls`, and section formatting helpers while preserving `runTlsInspect(target, runtime)`.

- [x] **Step 4: Verify GREEN**

Run:

```bash
bun test tests/tools.test.ts
bun run typecheck
```

Expected: PASS.

### Task 2: Traceroute Target, Status, and Hop Rows

**Files:**
- Modify: `src/core/tools.ts`
- Modify: `tests/tools.test.ts`

- [x] **Step 1: Write failing traceroute test**

Add a test that calls `runTool("traceroute", ["8.8.8.8"], { runner, platform: "darwin", timeoutMs: 1500 })` and expects `Target`, `Status`, and `Hops` sections with parsed hop rows.

- [x] **Step 2: Verify RED**

Run:

```bash
bun test tests/tools.test.ts
```

Expected: FAIL because traceroute currently returns generic command output.

- [x] **Step 3: Implement traceroute detail model**

Add injectable command runner, target/status sections, command rows, timeout rows, exit status rows, elapsed rows when available, and bounded hop parsing for Unix and Windows traceroute outputs.

- [x] **Step 4: Verify GREEN**

Run:

```bash
bun test tests/tools.test.ts
bun run typecheck
```

Expected: PASS.

### Task 3: TUI Copy/Detail Regression

**Files:**
- Modify: `tests/toolHistory.test.ts`

- [x] **Step 1: Add Tools history regression tests**

Build TLS/traceroute `ToolResult` fixtures with the new sections and assert `formatToolsWorkspaceRows(..., "summary")` exposes meaningful target/status summaries and raw view includes `[Target]`, `[Status]`, and detail section rows.

- [x] **Step 2: Verify focused tests**

Run:

```bash
bun test tests/tools.test.ts tests/toolHistory.test.ts
bun run typecheck
bun run lint
```

Expected: PASS.

### Task 4: Docs, Verification, and Publish

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-tools-trace-tls-detail.md`

- [x] **Step 1: Document behavior**

Record structured TLS/traceroute Tools output and the lazyifconfig parity rationale.

- [x] **Step 2: Full verification**

Run:

```bash
bun run verify
bun run release:check
git diff --check
```

Expected: all commands pass.

- [x] **Step 3: Commit, push, and open draft PR**

Run:

```bash
git add docs/superpowers/plans/2026-07-02-tools-trace-tls-detail.md src/core/tools.ts tests/tools.test.ts tests/toolHistory.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(tools): structure trace and tls details"
git push -u origin codex/picos-v0.4.258-tools-trace-tls-detail
gh pr create --draft --base codex/picos-v0.4.257-interface-source-handoffs --head codex/picos-v0.4.258-tools-trace-tls-detail --title "feat(tools): structure trace and tls details"
```
