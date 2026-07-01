# Editor Write Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe editor-save preview model so picos can show file edits as reviewed OS write actions before any local or remote provider mutates data.

**Architecture:** Keep the write-preview logic platform-neutral in `src/core/fileWritePreview.ts`. The TUI consumes formatted preview rows and keeps execution locked until a later confirmation/policy slice enables provider writes.

**Tech Stack:** Bun, TypeScript, Ink, Bun test.

---

### Task 1: Core Editor Write Preview

**Files:**
- Create: `src/core/fileWritePreview.ts`
- Test: `tests/fileWritePreview.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import {
	createEditorWritePreview,
	formatEditorWritePreviewRows,
} from "../src/core/fileWritePreview";

describe("editor write preview", () => {
	test("builds locked diff previews for changed editor buffers", () => {
		const preview = createEditorWritePreview({
			path: "/workspace/picos/README.md",
			originalContent: "# picos\nold\nkeep\n",
			nextContent: "# picos\nnew\nkeep\nadded\n",
		});

		expect(preview).toMatchObject({
			kind: "editor-save",
			path: "/workspace/picos/README.md",
			risk: "write",
			privilege: "user",
			confirmationPhrase: "save file",
			executable: false,
			changed: true,
			stats: {
				additions: 2,
				deletions: 1,
				unchanged: 2,
			},
		});
		expect(preview.diffRows).toEqual([
			"  1 | # picos",
			"-  2 | old",
			"+  2 | new",
			"  3 | keep",
			"+  4 | added",
		]);
		expect(formatEditorWritePreviewRows(preview)).toContain(
			"locked confirm=save file executable=false",
		);
	});
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test tests/fileWritePreview.test.ts`

Expected: FAIL because `src/core/fileWritePreview.ts` does not exist yet.

- [x] **Step 3: Write minimal implementation**

Create `src/core/fileWritePreview.ts` with an `EditorWritePreview` model, an LCS-based line diff, locked write metadata, and `formatEditorWritePreviewRows()` output for the TUI.

- [x] **Step 4: Run test to verify it passes**

Run: `bun test tests/fileWritePreview.test.ts`

Expected: PASS.

### Task 2: TUI Editor Panel Visibility

**Files:**
- Modify: `src/tui/App.tsx`
- Test: existing render-facing tests remain covered by typecheck and smoke.

- [x] **Step 1: Import and create preview rows**

Import `createEditorWritePreview` and `formatEditorWritePreviewRows` from `src/core/fileWritePreview.ts`, then render a compact save-preview block in `EditorWorkspace` for the loaded read-only buffer.

- [x] **Step 2: Run focused verification**

Run: `bun run typecheck`

Expected: PASS.

### Task 3: Documentation and Release Notes

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document the feature**

Add a v0.4.205 roadmap entry and README/CHANGELOG bullets explaining that Editor now shows a locked diff-based save preview with path, provider, risk, exact phrase, and changed-line counts.

- [x] **Step 2: Run full verification**

Run: `bun run verify && bun run release:check`

Expected: PASS.
