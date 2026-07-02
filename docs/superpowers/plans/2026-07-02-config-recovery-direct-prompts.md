# Config Recovery Direct Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Config recovery palette actions open the destination creation prompt directly when a recoverable shelf is empty.

**Architecture:** Add a pure Config helper that converts recovery target plus live shelf counts into a command-line prompt plan. App dispatch reuses the existing Config recovery navigation and opens the prompt only for shelves that already have safe prompt flows: Routes, Connections, Ports, and Logs.

**Tech Stack:** Bun, TypeScript, Ink/React TUI helpers, Bun test, Biome.

---

### Task 1: Add Failing Direct Prompt Plan Tests

**Files:**
- Modify: `tests/configPanel.test.ts`

- [x] **Step 1: Import and test direct prompt plans**

Add expectations for `createConfigRecoveryDirectPromptPlan()`:

```ts
expect(createConfigRecoveryDirectPromptPlan("routes", { routes: 0 })).toEqual({
	target: "routes",
	workspace: "routes",
	label: "Routes",
	prompt: "route-filter",
	reason: "empty routeFilters",
	rows: [
		"CONFIG RECOVERY PROMPT",
		"target=routes workspace=Routes",
		"prompt=route-filter reason=empty routeFilters",
		"next=type filter and press enter",
	],
});
expect(createConfigRecoveryDirectPromptPlan("connections", { connections: 0 })?.prompt).toBe("endpoint-filter:connections");
expect(createConfigRecoveryDirectPromptPlan("ports", { ports: 0 })?.prompt).toBe("endpoint-filter:ports");
expect(createConfigRecoveryDirectPromptPlan("logs", { logs: 0 })?.prompt).toBe("log-search");
expect(createConfigRecoveryDirectPromptPlan("routes", { routes: 2 })).toBeUndefined();
expect(createConfigRecoveryDirectPromptPlan("tools", { tools: 0 })).toBeUndefined();
```

- [x] **Step 2: Run focused tests and verify RED**

Run:

```bash
bun test tests/configPanel.test.ts
```

Expected: FAIL because the direct prompt plan helper does not exist.

### Task 2: Implement Direct Prompt Planning

**Files:**
- Modify: `src/tui/configPanel.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Add pure prompt plan helper**

Add `ConfigRecoveryDirectPromptPlan`, `ConfigRecoveryShelfCounts`, and `createConfigRecoveryDirectPromptPlan(target, counts)`. Return prompt plans only for empty `routes`, `connections`, `ports`, and `logs`; return `undefined` for non-empty shelves and unsupported targets.

- [x] **Step 2: Open prompts from recovery palette dispatch**

When `configRecoveryFocusTarget` exists, call the helper with live counts:

```ts
{
	routes: routeFilterPresets.length,
	connections: connectionFilterPresets.length,
	ports: portFilterPresets.length,
	logs: logProfiles.length,
	tools: customToolTargetPresets.length,
	remotes: remoteProfiles.length,
}
```

If a plan exists, call `setCommandLine(openCommandLine(plan.prompt))` after setting the destination workspace and log `config recovery prompt ...`.

- [x] **Step 3: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/configPanel.test.ts tests/palette.test.ts
```

Expected: PASS.

### Task 3: Update Product Docs and Roadmap

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document direct recovery prompts**

Record that Config recovery palette actions now open route/endpoint/log prompt flows directly when the shelf is empty.

- [x] **Step 2: Add v0.4.251 roadmap entry**

Add `v0.4.251 - Config Recovery Direct Prompts` above v0.4.250 and set the next slice toward Tools target and Remotes profile creation prompts.

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
git add docs/superpowers/plans/2026-07-02-config-recovery-direct-prompts.md src/tui/configPanel.ts src/tui/App.tsx tests/configPanel.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(config): open recovery prompts directly"
```

- [x] **Step 2: Push and open draft PR**

Run:

```bash
git push -u origin codex/picos-v0.4.251-config-recovery-direct-prompts
gh pr create --draft --base codex/picos-v0.4.250-config-recovery-palette-actions --head codex/picos-v0.4.251-config-recovery-direct-prompts --title "feat(config): open recovery prompts directly"
```

- [x] **Step 3: Update roadmap with PR link**

Replace the local branch status with the draft PR URL, rerun verification, amend the commit, and force-push with lease.
