# Known Hosts Select Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. Add failing tests before production code, keep Remotes mutation locked, and commit this version separately.

**Goal:** Make the Remotes `known_hosts` typed candidate selection prompt discoverable and executable from the command palette.

**Architecture:** Add a read-only `remote.knownHosts.select` catalog action, teach palette search/preview about its prompt and guards, and dispatch it to the existing `:remote-known-hosts-select` TUI command line path.

**Tech Stack:** Bun, TypeScript, Ink, existing action catalog and palette tests.

---

### Task 1: Action catalog discovery

**Files:**
- Modify: `src/core/actions.ts`
- Test: `tests/actions.test.ts`

- [x] Add RED tests expecting `remote.knownHosts.select` as an enabled read-only action.
- [x] Add `remote.knownHosts.select` with `risk=read`, `privilege=none`, and no confirmation requirement.

### Task 2: Palette search and preview

**Files:**
- Modify: `src/tui/palette.ts`
- Test: `tests/palette.test.ts`

- [x] Add RED tests for `remote known_hosts select` and `known hosts candidate` queries.
- [x] Add preview rows showing `:remote-known-hosts-select`, accepted input formats, and locked trust/network/write guards.

### Task 3: Palette dispatch

**Files:**
- Modify: `src/tui/App.tsx`

- [x] Dispatch `remote.knownHosts.select` to Remotes focus.
- [x] Open `remote-known-hosts-select` command line prompt through the existing safe selection path.

### Task 4: Docs, verification, and PR

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`

- [x] Document palette discovery for Remotes known_hosts selection.
- [x] Run `bun run verify` and `bun run release:check`.
- [ ] Commit, push, and open a draft PR stacked on v0.4.296.
