# Config Recovery Tools Remotes Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Config recovery palette actions create missing Tools target presets and Remotes profiles from safe text prompts when those shelves are empty.

**Architecture:** Extend the existing Config recovery direct prompt planner to include `tool-target-preset` and `remote-profile` prompt plans. Add pure parsers for one-line Tools target presets and SFTP remote profiles, then wire App command-line submit handlers to persist normalized config through existing config store paths.

**Tech Stack:** Bun, TypeScript, Ink/React TUI helpers, Bun test, Biome.

---

### Task 1: Add Failing Prompt Plan and Parser Tests

**Files:**
- Modify: `tests/configPanel.test.ts`
- Modify: `tests/toolHistory.test.ts`
- Modify: `tests/remotes.test.ts`

- [x] **Step 1: Extend Config recovery prompt expectations**

Assert that empty `tools` shelves return `tool-target-preset`, empty `remotes` shelves return `remote-profile`, and non-empty shelves still return `undefined`.

- [x] **Step 2: Add Tools target preset parser tests**

Assert that `parseToolTargetPresetCommand("dns example.com Example DNS")` returns a normalized saved preset for `tools.dns`, `example.com`, and label `Example DNS`, while bad or incomplete input returns `undefined`.

- [x] **Step 3: Add Remote profile parser tests**

Assert that `parseRemoteProfileCommand("prod deploy@example.com:2222 /srv/app key=~/.ssh/id_ed25519")` returns a normalized SFTP profile and that malformed host/user/id input returns `undefined`.

- [x] **Step 4: Run focused tests and verify RED**

Run:

```bash
bun test tests/configPanel.test.ts tests/toolHistory.test.ts tests/remotes.test.ts
```

Expected: FAIL because the new prompt plans and parser exports do not exist yet.

### Task 2: Implement Pure Planning and Parsing

**Files:**
- Modify: `src/tui/configPanel.ts`
- Modify: `src/tui/toolHistory.ts`
- Modify: `src/core/remotes.ts`

- [x] **Step 1: Add Tools/Remotes prompt plan names**

Extend `ConfigRecoveryDirectPromptPlan["prompt"]` and `getConfigRecoveryDirectPrompt()` with `tool-target-preset` and `remote-profile`.

- [x] **Step 2: Add Tools target preset command parser**

Add `parseToolTargetPresetCommand(input)` in `src/tui/toolHistory.ts`. It should accept action aliases already known to Tools, a required target, and an optional label, then return a normalized `ToolTargetPreset`.

- [x] **Step 3: Add Remote profile command parser**

Add `parseRemoteProfileCommand(input)` in `src/core/remotes.ts`. It should parse `id user@host[:port] [root] [key=path]`, normalize through `normalizeRemoteProfiles()`, and return the first safe profile.

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/configPanel.test.ts tests/toolHistory.test.ts tests/remotes.test.ts
```

Expected: PASS.

### Task 3: Wire TUI Submit Handlers

**Files:**
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Add `submitToolTargetPresetCommand()`**

Parse the command-line value, save the preset through `saveToolTargetPreset()` and `setConfigToolTargetPresets()`, select the new saved preset, close the prompt, and log either a warning or success.

- [x] **Step 2: Add `submitRemoteProfileCommand()`**

Parse the command-line value, merge it into current config remote profiles by id, persist with `writeConfig()`, sync session state, select the new profile, close the prompt, and log either a warning or success.

- [x] **Step 3: Add command routing and cancel text**

Handle `tool-target-preset` and `remote-profile` in command-line Enter/Escape routing.

- [x] **Step 4: Run focused type/lint and tests**

Run:

```bash
bun run typecheck
bun run lint
bun test tests/configPanel.test.ts tests/toolHistory.test.ts tests/remotes.test.ts
```

Expected: PASS.

### Task 4: Update Product Docs and Roadmap

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document Tools/Remotes recovery prompts**

Record the new one-line prompt formats and the fact that all Config recovery actions now have direct creation prompts.

- [x] **Step 2: Add v0.4.252 roadmap entry**

Add `v0.4.252 - Config Recovery Tools Remotes Prompts` above v0.4.251 and set the next slice toward visible prompt preview rows and lazyifconfig parity gaps.

- [x] **Step 3: Run full verification**

Run:

```bash
bun run verify
bun run release:check
git diff --check
```

Expected: all commands pass.

### Task 5: Publish the Version Slice

**Files:**
- Commit all modified source, tests, and docs.

- [x] **Step 1: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-07-02-config-recovery-tools-remotes-prompts.md src/tui/configPanel.ts src/tui/toolHistory.ts src/core/remotes.ts src/tui/App.tsx tests/configPanel.test.ts tests/toolHistory.test.ts tests/remotes.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(config): create recovery tools and remotes"
```

- [x] **Step 2: Push and open draft PR**

Run:

```bash
git push -u origin codex/picos-v0.4.252-config-recovery-tools-remotes-prompts
gh pr create --draft --base codex/picos-v0.4.251-config-recovery-direct-prompts --head codex/picos-v0.4.252-config-recovery-tools-remotes-prompts --title "feat(config): create recovery tools and remotes"
```

- [x] **Step 3: Update roadmap with PR link**

Replace the local branch status with the draft PR URL, rerun verification, amend the commit, and force-push with lease.
