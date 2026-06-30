# Handoff Archive Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe route/endpoint handoff archive controls so exported evidence can be cleaned up without leaving the picos config tree.

**Architecture:** Extend `src/core/handoffIndex.ts` with picos-owned handoff path validation and archive move planning/execution. Wire the same core function into `picos handoffs --archive <path>` and the Status workspace `A` shortcut so CLI and TUI share one safety boundary.

**Tech Stack:** Bun, TypeScript, Ink, Bun test, Biome.

---

### Task 1: Core Handoff Archive Boundary

**Files:**
- Modify: `src/core/handoffIndex.ts`
- Test: `tests/handoffIndex.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("archives only picos-owned handoff files under the config tree", async () => {
  const root = await mkdtemp(join(tmpdir(), "picos-handoff-archive-"));
  try {
    await mkdir(join(root, "routes"), { recursive: true });
    const path = join(root, "routes", "picos-routes-raw-2026-06-30T120000000Z.md");
    await writeFile(path, "generatedAt=2026-06-30T12:00:00.000Z\nview=raw\n");

    const result = await archiveHandoffFile(root, path);

    expect(result.status).toBe("archived");
    expect(result.archivedPath).toContain(join(root, "archive", "routes"));
    expect(await readFile(result.archivedPath, "utf8")).toContain("view=raw");
    expect(await exists(path)).toBe(false);
    expect((await readHandoffIndex(root)).items).toHaveLength(0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/handoffIndex.test.ts`
Expected: FAIL because `archiveHandoffFile` does not exist.

- [ ] **Step 3: Write minimal implementation**

Add `archiveHandoffFile(baseDir, targetPath)` that resolves the target, rejects files outside `routes`/`endpoints`, rejects non-picos filenames, creates `archive/<source-dir>`, renames the file there, and returns `{ status, sourcePath, archivedPath, message }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/handoffIndex.test.ts`
Expected: PASS.

### Task 2: CLI Archive Command

**Files:**
- Modify: `src/cli/index.ts`
- Modify: `src/cli/commands/handoffs.ts`
- Test: `tests/handoffsCommand.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
await handoffsCommand({ archivePath: "/tmp/picos/routes/picos-routes-raw-2026-06-30T120000000Z.md", archiveResult });
expect(output).toContain("archived");
expect(output).toContain("archive/routes");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/handoffsCommand.test.ts`
Expected: FAIL because the command ignores archive options.

- [ ] **Step 3: Write minimal implementation**

Support `picos handoffs --archive <path>` and keep default listing unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/handoffsCommand.test.ts`
Expected: PASS.

### Task 3: TUI Status Shortcut

**Files:**
- Modify: `src/tui/App.tsx`
- Modify: `src/core/handoffIndex.ts`
- Test: `tests/handoffIndex.test.ts`

- [ ] **Step 1: Write the failing formatting test**

Assert `formatHandoffIndexRows()` advertises `A archive` and shows selected `archive target=...`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/handoffIndex.test.ts`
Expected: FAIL because the rows do not mention archive controls.

- [ ] **Step 3: Write minimal implementation**

Import `archiveHandoffFile` in `App.tsx`, bind `A` in the Status workspace to archive the selected item, refresh the index, clamp selection, and log the result.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/handoffIndex.test.ts`
Expected: PASS.

### Task 4: Docs, Verification, and PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [ ] Update keyboard docs for `A archive`.
- [ ] Add v0.4.38 roadmap entry.
- [ ] Run `bun run verify`.
- [ ] Run `bun run release:check`.
- [ ] Commit, push, and open a draft PR stacked on v0.4.37.
