# Tools Palette Direct Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make read-only Tools Hub actions easier to discover and launch from the command palette with target-aware previews and action-specific prompt guidance.

**Architecture:** `src/core/actions.ts` remains the read-only action catalog. `src/tui/toolHistory.ts` owns tool action metadata, run planning, and prompt rows; `src/tui/palette.ts` formats command-palette previews from the selected action and current network context; `src/tui/App.tsx` passes the context and continues dispatching Tools actions into the existing target prompt and `safeExec`-bounded `runTool()` path.

**Tech Stack:** Bun, TypeScript, Ink/React TUI, Bun test, Biome.

---

### Task 1: Tools Palette Metadata and Prompt Rows

**Files:**
- Modify: `src/tui/toolHistory.ts`
- Modify: `tests/toolHistory.test.ts`

- [x] **Step 1: Write failing metadata/prompt tests**

Add tests that assert `getToolRunActionMetadata("tools.tls")` exposes the action title, placeholder, example, default target, and CLI command, and that `formatToolPromptRows("tool:tools.tls", "")` renders action-specific rows such as `placeholder=example.com:443` and `cli=picos tools tls example.com:443`.

- [x] **Step 2: Verify RED**

Run:

```bash
bun test tests/toolHistory.test.ts
```

Expected: FAIL because the metadata helper does not exist and prompt rows are generic.

- [x] **Step 3: Implement metadata and prompt formatting**

Add a small `ToolRunActionMetadata` map for `tools.dns`, `tools.traceroute`, `tools.whois`, `tools.ipInfo`, `tools.tls`, `network.connect`, and `ping.default`. Reuse it from `formatToolPromptRows()` so prompts show title, placeholder, example, normalized CLI command, and `enter=run esc=cancel`.

- [x] **Step 4: Verify GREEN**

Run:

```bash
bun test tests/toolHistory.test.ts
bun run typecheck
```

Expected: PASS.

### Task 2: Command Palette Tools Direct-Run Preview

**Files:**
- Modify: `src/tui/palette.ts`
- Modify: `src/tui/App.tsx`
- Modify: `tests/palette.test.ts`

- [x] **Step 1: Write failing palette preview tests**

Add tests that search `tools tls`, `tools traceroute`, and `telnet` in the command palette and assert the matching actions are discoverable. Add preview tests that call `formatCommandPaletteActionPreviewRows()` for `tools.tls` and `network.connect` and expect rows with target default, prompt placeholder, CLI shape, and dispatch behavior.

- [x] **Step 2: Verify RED**

Run:

```bash
bun test tests/palette.test.ts
```

Expected: FAIL because Tools run actions currently produce no command-palette preview rows.

- [x] **Step 3: Implement preview formatting and context wiring**

Import the Tool metadata helpers into `palette.ts`, add optional context fields for `defaultToolTarget`, `publicIp`, and `platform`, and format read-only Tools run previews before dispatch. Pass `defaultPingHost`, `summary.publicIp`, and `summary.platform` from `App.tsx` into the palette preview context.

- [x] **Step 4: Verify GREEN**

Run:

```bash
bun test tests/palette.test.ts tests/toolHistory.test.ts
bun run typecheck
bun run lint
```

Expected: PASS.

### Task 3: Docs, Verification, and Publish

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-02-tools-palette-direct-run.md`

- [x] **Step 1: Document the operator-visible flow**

Record that Tools direct-run palette actions now preview target defaults, prompt placeholders, CLI shape, and dispatch into the Tools target prompt.

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
git add src/tui/toolHistory.ts src/tui/palette.ts src/tui/App.tsx tests/toolHistory.test.ts tests/palette.test.ts README.md CHANGELOG.md ROADMAP.md docs/superpowers/plans/2026-07-02-tools-palette-direct-run.md
git commit -m "feat(tools): preview palette direct runs"
git push -u origin codex/picos-v0.4.259-tools-palette-direct-run
gh pr create --draft --base codex/picos-v0.4.258-tools-trace-tls-detail --head codex/picos-v0.4.259-tools-palette-direct-run --title "feat(tools): preview palette direct runs"
```
