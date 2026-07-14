# Lazyifconfig Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the useful lazyifconfig feature set into picos while preserving picos' safe command execution, permission model, and terminal OS direction.

**Architecture:** picos keeps platform commands behind core/adapters and exposes features through both CLI and TUI. Read-only inspection features ship first; write/destructive controls remain locked behind explicit confirmation and privilege checks.

**Tech Stack:** Bun, TypeScript, Ink, cac, Node built-ins (`dns`, `net`, `tls`), `safeExec()`, `bun test`, `bun run verify`.

---

## Source Feature Map

lazyifconfig source reference: https://github.com/choihunchul/lazyifconfig

- Interface inventory: implemented type, status, MAC, CIDR prefixes, netmask, gateway, DNS, MTU, RX/TX byte and packet counters, source evidence, and platform panes.
- Network view: implemented LAN, loopback, VPN, container, link-local, public, and unassigned grouping.
- Connections view: implemented `netstat` parsing, filter/sort, TUI detail/raw/process panes, presets, handoffs, and JSON automation.
- Ports view: implemented macOS `lsof`, Linux `ss`, Windows `netstat`, process metadata, guarded control previews, filters/presets, and JSON automation.
- Route Inspector: implemented route tables, default/VPN diagnostics, destination path lookup, raw output, filter/sort/presets, handoffs, and JSON automation.
- Diagnostics: implemented missing/multiple default route, VPN/split-tunnel, and route consistency diagnostics.
- Timeline: implemented local network/action/audit events, search/presets, selected/full exports, evidence recovery, archive, and retention.
- Tools Hub: implemented DNS, WHOIS/RDAP, IP info, TCP/telnet, TLS, ping, and traceroute with TUI forms, history, raw/summary/compare, evidence, archive, and retention.
- Raw output viewer: implemented source comparison for interface, route, connection, port, and tool results; raw output stays excluded from JSON automation.
- Self-update: implemented npm/GitHub release checks and a locked apply dry-run preview; package mutation remains disabled by default.
- Machine automation: implemented schema-versioned bounded JSON for local info/routes/connections/ports and guarded remote SFTP list/read.

## Files

- Modify: `src/core/actions.ts` to expose lazyifconfig-derived actions with safe locked defaults.
- Create: `src/core/tools.ts` for Tools Hub definitions and read-only executions.
- Create: `src/core/routes.ts` for route command building, parsing, path lookup, and diagnostics.
- Create: `src/cli/commands/tools.ts` for `picos tools <name> ...`.
- Create: `src/cli/commands/routes.ts` for `picos routes` and `picos route <destination>`.
- Modify: `src/cli/index.ts` to register new commands.
- Modify: `src/tui/App.tsx` to surface tools/routes status in the OS console.
- Test: `tests/tools.test.ts`, `tests/routes.test.ts`, `tests/actions.test.ts`.
- Docs: `README.md`, `CHANGELOG.md`, `ROADMAP.md`.

### Task 1: Tools Hub Core And CLI

**Files:**
- Create: `src/core/tools.ts`
- Create: `src/cli/commands/tools.ts`
- Modify: `src/cli/index.ts`
- Test: `tests/tools.test.ts`

- [x] **Step 1: Write tool definition and validation tests**

```ts
import { describe, expect, test } from "bun:test";
import { getToolDefinitions, normalizeToolTarget } from "../src/core/tools";

describe("tools hub", () => {
	test("lists lazyifconfig-derived runnable tools", () => {
		expect(getToolDefinitions().map((tool) => tool.id)).toEqual([
			"dns",
			"whois",
			"ip-info",
			"port-check",
			"tls",
			"ping",
			"traceroute",
		]);
	});

	test("rejects unsafe targets", () => {
		expect(() => normalizeToolTarget("example.com; rm -rf /")).toThrow(
			"Invalid target",
		);
	});
});
```

- [x] **Step 2: Run failing test**

Run: `bun test tests/tools.test.ts`
Expected: fail because `src/core/tools.ts` does not exist.

- [x] **Step 3: Implement core tools**

Implement `ToolId`, `ToolDefinition`, `getToolDefinitions()`, `normalizeToolTarget()`, `runDnsLookup()`, `runWhoisLookup()`, `runIpInfo()`, `runTlsInspect()`, `runTraceroute()`, and a formatter that emits sections plus raw output.

- [x] **Step 4: Add CLI command**

Register:

```ts
cli.command("tools <name> [...args]", "Run picos Tools Hub command").action(toolsCommand);
```

Expected examples:

```bash
picos tools dns example.com
picos tools whois github.com
picos tools ip-info 8.8.8.8
picos tools port-check github.com 443
picos tools tls github.com:443
picos tools traceroute 8.8.8.8
```

- [x] **Step 5: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add lazyifconfig tools hub foundation"`

### Task 2: Route Inspector Foundation

**Files:**
- Create: `src/core/routes.ts`
- Create: `src/cli/commands/routes.ts`
- Modify: `src/cli/index.ts`
- Test: `tests/routes.test.ts`

- [x] **Step 1: Write parser tests**

```ts
import { describe, expect, test } from "bun:test";
import { parseLinuxIpRoutes, parseMacosNetstatRoutes } from "../src/core/routes";

describe("route inspector", () => {
	test("parses linux ip route output", () => {
		expect(
			parseLinuxIpRoutes("default via 192.168.0.1 dev eth0 proto dhcp metric 100"),
		).toContainEqual({
			destination: "default",
			gateway: "192.168.0.1",
			interfaceName: "eth0",
			family: "ipv4",
			metric: 100,
			protocol: "dhcp",
		});
	});

	test("parses macOS netstat route output", () => {
		expect(
			parseMacosNetstatRoutes("Internet:\nDestination Gateway Flags Netif\n default 192.168.0.1 UGSc en0"),
		)[0].toMatchObject({
			destination: "default",
			gateway: "192.168.0.1",
			interfaceName: "en0",
			family: "ipv4",
		});
	});
});
```

- [x] **Step 2: Run failing test**

Run: `bun test tests/routes.test.ts`
Expected: fail because `src/core/routes.ts` does not exist.

- [x] **Step 3: Implement route core**

Implement route command builders for macOS/Linux/Windows, route parsers, default route diagnostics, route summary formatter, and `runRouteTable()`.

- [x] **Step 4: Add CLI command**

Register:

```bash
picos routes
picos route 8.8.8.8
```

- [x] **Step 5: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add route inspector foundation"`

### Task 3: Connections And Ports

**Files:**
- Create: `src/core/connections.ts`
- Create: `src/core/ports.ts`
- Create: `src/cli/commands/connections.ts`
- Create: `src/cli/commands/ports.ts`
- Test: `tests/connections.test.ts`, `tests/ports.test.ts`

- [x] **Step 1: Add fixture-driven parsers**

Parse `netstat -an`, `lsof -nP -iTCP -sTCP:LISTEN`, `ss -ltnp`, and Windows `netstat -ano` into stable objects.

- [x] **Step 2: Add CLI commands**

```bash
picos connections
picos ports
```

- [x] **Step 3: Wire TUI panels**

Replace placeholder Connections/Ports screens with parsed data and raw-output references.

- [x] **Step 4: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add connection and port inspectors"`

### Task 4: TUI Tools Modal And Raw Viewer

**Files:**
- Modify: `src/tui/App.tsx`
- Create: `src/tui/toolsState.ts`
- Test: `tests/navigation.test.ts`, `tests/tools.test.ts`

- [x] **Step 1: Add focused Tools child state**

Use `Enter` to enter Tools child focus, `Tab` to move fields, `Esc`/`h` to leave child focus.

- [x] **Step 2: Add result panes**

Show Summary, Detail, Diagnostics, and Raw Output sections for tool runs.

- [x] **Step 3: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add tools modal and raw output viewer"`

### Task 5: Interface And Network Parity

**Files:**
- Modify: `src/core/network.ts`
- Create: `src/core/subnets.ts`
- Test: `tests/network.test.ts`

- [x] **Step 1: Add subnet grouping**

Classify loopback, LAN, VPN, container, link-local, public, and unassigned interface groups.

- [x] **Step 2: Add interface metadata**

Add interface type, CIDR prefix, netmask, gateway, DNS visibility, MTU, and RX/TX counters.

- [x] **Step 3: Add platform counters**

Parse MTU and RX/TX counters from macOS `netstat -ibn`, Linux `ip -s link`, and Windows adapter statistics when available.

- [x] **Step 4: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add interface traffic counters"`

### Task 6: Timeline And Update Check

**Files:**
- Create: `src/core/timeline.ts`
- Create: `src/core/update.ts`
- Modify: `src/tui/App.tsx`
- Test: `tests/events.test.ts`, `tests/update.test.ts`

- [x] **Step 1: Add timeline event types**

Track interface appearance/removal, address changes, route changes, public IP changes, copy actions, and update checks.

- [x] **Step 2: Add export**

Save `picos-timeline-YYYYMMDD-HHMMSS.txt` only when the user asks.

- [x] **Step 3: Add release check**

Check GitHub Releases for `uulab-official/picos`; do not auto-install until a later confirmation flow exists.

- [x] **Step 4: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add timeline export and update check"`

### Task 7: Routes TUI And Raw Output Workspace

**Files:**
- Create: `src/tui/routePanel.ts`
- Modify: `src/tui/App.tsx`
- Test: `tests/routePanel.test.ts`

- [x] **Step 1: Add route panel row formatting tests**

Verify the Routes workspace row model includes summary, diagnostics, route rows, and raw command output.

- [x] **Step 2: Add route panel formatter**

Create a pure formatter that clips destination/gateway/interface cells and raw output rows for terminal height limits.

- [x] **Step 3: Wire the TUI Routes workspace**

Replace the staged Routes placeholder with live `runRouteTable()` data and render diagnostics, table rows, and raw output.

- [x] **Step 4: Refresh from route action**

Make `routes.inspect` run the adapter-backed route table command and update the event dock with the discovered route count.

- [x] **Step 5: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: show route diagnostics and raw output in TUI"`

### Task 8: Route Path Lookup UI

**Files:**
- Modify: `src/tui/routePanel.ts`
- Modify: `src/tui/App.tsx`
- Test: `tests/routePanel.test.ts`

- [x] **Step 1: Add route path formatter test**

Verify destination, gateway, interface, source IP, and raw path output are rendered as stable rows.

- [x] **Step 2: Add route path formatter**

Create `formatRoutePathRows()` for the Routes workspace.

- [x] **Step 3: Wire destination input**

Use `:` in the Routes workspace to open a route destination prompt and run `runRoutePath()`.

- [x] **Step 4: Wire `routes.path` action**

Make the action open the same prompt instead of logging a queued placeholder.

- [x] **Step 5: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add route path lookup to TUI"`

### Task 9: Local Inspector JSON Automation

**Files:**
- Create: `src/cli/localInspectorOutput.ts`
- Create: `scripts/localInspectorIntegration.ts`
- Modify: local inspector CLI commands and `scripts/harness.ts`
- Test: `tests/localInspectorOutput.test.ts`, `tests/cli.test.ts`

- [x] **Step 1: Define one versioned local inspector schema**

Normalize info, route, connection, and port fields while omitting raw OS output and process arguments.

- [x] **Step 2: Preserve query and source execution evidence**

Include effective filter/sort plus source command, arguments, success, and exit code.

- [x] **Step 3: Bound machine output**

Return at most 10,000 rows under a 4 MiB document budget with total, visible, returned, limit, and truncation metadata.

- [x] **Step 4: Keep failures machine-readable**

Reject raw/JSON conflicts before execution and emit one bounded failure document with a non-zero exit.

- [x] **Step 5: Verify real cross-platform subprocess output**

Run five success and three failure contracts through `bun run harness local-json`, including large stdout pipe flushing, as part of `bun run verify`.

## Current Execution Choice

Proceed inline in this session. First implementation batch: Task 1 and the read-only route CLI slice from Task 2.
