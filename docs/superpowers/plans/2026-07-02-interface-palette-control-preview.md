# Interface Palette Control Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make command-palette `interface.disable` previews include the currently selected interface target and source context before routing to the locked Action Center preview.

**Architecture:** Extend the command palette preview context with the selected `NetworkInterfaceSummary` and platform. Add a pure interface-control palette formatter that wraps the existing generic locked control preview rows with selected adapter target, kind/status, address, and source context; then pass the selected interface from `App`.

**Tech Stack:** Bun, TypeScript, Ink/React TUI helper formatting, Bun test, Biome.

---

### Task 1: Add Failing Palette Preview Tests

**Files:**
- Modify: `tests/palette.test.ts`

- [x] **Step 1: Import network interface type if needed**

Create a selected interface fixture with `name=en0`, `kind=wifiOrEthernet`, `status=connected`, `ipv4Cidr=192.168.0.20/24`, `ipv6Cidr=fe80::1/64`, `mtu=1500`, and traffic counters.

- [x] **Step 2: Assert interface-disable palette preview rows**

Call `formatCommandPaletteActionPreviewRows()` for `interface.disable` with both `controlPreview` and `selectedInterface`. Expect rows:

```ts
[
	"interface control target=en0 connected wifiOrEthernet",
	"address=192.168.0.20/24 mtu=1500 rx=125.0MB tx=42.0MB",
	"source=darwin action=interface.disable locked",
	"control preview interface.disable locked dryRun=true",
	"risk=destructive privilege=admin confirm=disable interface",
	"adapter=macos command=sudo networksetup -setnetworkserviceenabled <service> off",
	"blocked=disabled-by-default",
]
```

- [x] **Step 3: Run focused tests and verify RED**

Run:

```bash
bun test tests/palette.test.ts
```

Expected: FAIL because palette context does not yet understand `selectedInterface`.

### Task 2: Implement Palette Context and Formatting

**Files:**
- Modify: `src/tui/palette.ts`
- Modify: `src/tui/App.tsx`

- [x] **Step 1: Add selected interface context fields**

Add `selectedInterface?: NetworkInterfaceSummary` and `selectedInterfacePlatform?: SupportedPlatform` to `CommandPalettePreviewContext`.

- [x] **Step 2: Add interface preview formatter**

For `action.id === "interface.disable"` plus `context.controlPreview`, prepend selected target rows before generic control preview rows. Keep generic behavior for all other controls.

- [x] **Step 3: Pass selected interface from App**

When building command palette preview context, pass `summary.interfaces[selectedInterfaceIndex]` and `summary.platform`.

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/palette.test.ts tests/interfacePanel.test.ts
bun run typecheck
bun run lint
```

Expected: PASS.

### Task 3: Update Product Docs and Roadmap

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document palette interface previews**

Record that command-palette interface controls now show selected adapter target/source context before locked Action Center dispatch.

- [x] **Step 2: Add v0.4.255 roadmap entry**

Add `v0.4.255 - Interface Palette Control Preview` above v0.4.254 and set the next slice toward bounded raw adapter output retention.

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
git add docs/superpowers/plans/2026-07-02-interface-palette-control-preview.md src/tui/palette.ts src/tui/App.tsx tests/palette.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(interfaces): preview palette control target"
```

- [x] **Step 2: Push and open draft PR**

Run:

```bash
git push -u origin codex/picos-v0.4.255-interface-palette-control-preview
gh pr create --draft --base codex/picos-v0.4.254-interface-source-control-preview --head codex/picos-v0.4.255-interface-palette-control-preview --title "feat(interfaces): preview palette control target"
```

- [x] **Step 3: Update roadmap with PR link**

Replace the local branch status with the draft PR URL, rerun verification, amend the commit, and force-push with lease.
