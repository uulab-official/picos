# Interface Raw Source Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store bounded raw network source evidence in `NetworkSummary` and render it in the Interfaces source pane.

**Architecture:** `src/core/network.ts` will capture bounded source-output records while preserving existing platform parsers and safe execution boundaries. `src/tui/interfacePanel.ts` will render compact source evidence rows after command/source metadata and before locked controls. Docs will record the lazyifconfig parity step and keep mutation disabled by default.

**Tech Stack:** Bun, TypeScript, Ink/React TUI formatting helpers, Bun test, Biome.

---

### Task 1: Core Raw Source Model

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/network.ts`
- Modify: `tests/network.test.ts`

- [x] **Step 1: Write failing core tests**

Add tests for bounded source-output capture and summary retention:

```ts
expect(
	createNetworkSourceOutput(
		"interface-stats",
		"Interface stats",
		"netstat",
		["-ibn"],
		{
			command: "netstat",
			args: ["-ibn"],
			stdout: "Name Mtu\\nen0 1500\\nutun4 1380\\nbridge0 1500",
			stderr: "",
			exitCode: 0,
			success: true,
		},
		{ maxLines: 2 },
	),
).toMatchObject({
	key: "interface-stats",
	label: "Interface stats",
	command: "netstat",
	args: ["-ibn"],
	output: "Name Mtu\nen0 1500",
	lineCount: 4,
	shownLines: 2,
	truncated: true,
	success: true,
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
bun test tests/network.test.ts
```

Expected: FAIL because `createNetworkSourceOutput` and source-output fields do not exist yet.

- [x] **Step 3: Implement core model**

Add `NetworkSourceOutputKey`, `NetworkSourceOutput`, `sourceOutputs?: NetworkSourceOutput[]`, `createNetworkSourceOutput()`, and use bounded source outputs from network inventory, interface stats, and gateway commands.

- [x] **Step 4: Verify GREEN**

Run:

```bash
bun test tests/network.test.ts
bun run typecheck
```

Expected: PASS.

### Task 2: Interfaces Source Pane Rendering

**Files:**
- Modify: `src/tui/interfacePanel.ts`
- Modify: `tests/interfacePanel.test.ts`

- [x] **Step 1: Write failing panel test**

Extend the fixture with `sourceOutputs` and expect compact rows such as:

```txt
RAW RETAINED sources=3 selected=en0
raw[interface-inventory] node:os.networkInterfaces ok lines=2 shown=2
  en0 IPv4 192.168.0.20/24
raw[interface-stats] netstat -ibn ok lines=3 shown=2 truncated=yes
  Name Mtu
```

- [x] **Step 2: Verify RED**

Run:

```bash
bun test tests/interfacePanel.test.ts
```

Expected: FAIL because source evidence rows are not rendered.

- [x] **Step 3: Implement source evidence rows**

Render bounded `NetworkSummary.sourceOutputs` after source command metadata and before locked control previews. Keep rows clipped and compact for terminal use.

- [x] **Step 4: Verify GREEN**

Run:

```bash
bun test tests/interfacePanel.test.ts tests/network.test.ts
bun run typecheck
bun run lint
```

Expected: PASS.

### Task 3: Docs, Roadmap, and Full Verification

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-interface-raw-source-retention.md`

- [x] **Step 1: Document user-visible behavior**

Record that Interfaces now retains bounded raw source evidence for inventory, stats, and gateway data.

- [x] **Step 2: Add v0.4.256 roadmap entry**

Add `v0.4.256 - Interface Raw Source Retention` above v0.4.255 and set the next slice toward raw source export/copy or deeper interface actions.

- [x] **Step 3: Run full verification**

Run:

```bash
bun run verify
bun run release:check
git diff --check
```

Expected: all commands pass.

### Task 4: Publish the Version Slice

**Files:**
- Commit all modified source, tests, and docs.

- [x] **Step 1: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-07-02-interface-raw-source-retention.md src/core/types.ts src/core/network.ts src/tui/interfacePanel.ts tests/network.test.ts tests/interfacePanel.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(interfaces): retain raw source evidence"
```

- [x] **Step 2: Push and open draft PR**

Run:

```bash
git push -u origin codex/picos-v0.4.256-interface-raw-source-retention
gh pr create --draft --base codex/picos-v0.4.255-interface-palette-control-preview --head codex/picos-v0.4.256-interface-raw-source-retention --title "feat(interfaces): retain raw source evidence"
```

- [x] **Step 3: Update roadmap with PR link**

Replace the local branch status with the draft PR URL, rerun verification, amend the commit, and force-push with lease.
