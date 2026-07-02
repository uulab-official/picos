# Interface Parity Selected Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Interfaces workspace feel closer to lazyifconfig by showing a compact selected-interface OS summary with address, route, traffic, group, source, and safe-action hints.

**Architecture:** Add a pure formatter in `src/tui/interfacePanel.ts` that derives a selected interface summary strip from `NetworkSummary`. The existing `formatInterfaceWorkspaceRows()` output prepends these rows to every interface view, so list/detail/stats/platform panes all keep the selected adapter context visible.

**Tech Stack:** Bun, TypeScript, Ink/React TUI helper formatting, Bun test, Biome.

---

### Task 1: Add Failing Selected Summary Tests

**Files:**
- Modify: `tests/interfacePanel.test.ts`

- [x] **Step 1: Import and test `formatSelectedInterfaceSummaryRows()`**

Add expectations that selected `en0` returns:

```ts
[
	"SELECTED en0 up wifiOrEthernet group=LAN primary=yes",
	"ADDR ipv4=192.168.0.20/24 ipv6=fe80::1/64 mac=aa:bb:cc:dd:ee:ff netmask=255.255.255.0",
	"LINK mtu=1500 rx=125.0MB/9000pk tx=42.0MB/7100pk",
	"ROUTE gateway=192.168.0.1 dns=1.1.1.1,8.8.8.8 public=203.0.113.10",
	"SOURCE os=darwin stats=netstat -ib actions=R refresh Tab panes K locked controls",
]
```

Also assert that missing interfaces return `["SELECTED none"]`.

- [x] **Step 2: Assert workspace rows include the strip**

Update the list-view expectation so rows after `SUMMARY ...` include the selected strip before the interface table.

- [x] **Step 3: Run focused tests and verify RED**

Run:

```bash
bun test tests/interfacePanel.test.ts
```

Expected: FAIL because `formatSelectedInterfaceSummaryRows()` is not exported and workspace rows do not include the selected strip yet.

### Task 2: Implement Summary Formatting

**Files:**
- Modify: `src/tui/interfacePanel.ts`

- [x] **Step 1: Add `formatSelectedInterfaceSummaryRows()`**

Implement the pure formatter with stable rows for selected group, primary marker, address, link counters, route/DNS/public IP, and platform data source/action hints.

- [x] **Step 2: Prepend summary strip in `formatInterfaceWorkspaceRows()`**

Include the selected summary rows after the `SUMMARY ...` header for list/detail/stats/platform views, then preserve existing visible row clipping.

- [x] **Step 3: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/interfacePanel.test.ts tests/network.test.ts
```

Expected: PASS.

### Task 3: Update Product Docs and Roadmap

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [x] **Step 1: Document selected interface summary strip**

Record that Interfaces now keeps selected adapter address/link/route/source/action context visible across panes.

- [x] **Step 2: Add v0.4.253 roadmap entry**

Add `v0.4.253 - Interface Parity Selected Summary` above v0.4.252 and set the next slice toward interface raw-output/action previews.

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
git add docs/superpowers/plans/2026-07-02-interface-parity-selected-summary.md src/tui/interfacePanel.ts tests/interfacePanel.test.ts CHANGELOG.md README.md ROADMAP.md
git commit -m "feat(interfaces): show selected interface summary"
```

- [x] **Step 2: Push and open draft PR**

Run:

```bash
git push -u origin codex/picos-v0.4.253-interface-parity-selected-summary
gh pr create --draft --base codex/picos-v0.4.252-config-recovery-tools-remotes-prompts --head codex/picos-v0.4.253-interface-parity-selected-summary --title "feat(interfaces): show selected interface summary"
```

- [x] **Step 3: Update roadmap with PR link**

Replace the local branch status with the draft PR URL, rerun verification, amend the commit, and force-push with lease.
