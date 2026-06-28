# Lazyifconfig Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the useful lazyifconfig feature set into picos while preserving picos' safe command execution, permission model, and terminal OS direction.

**Architecture:** picos keeps platform commands behind core/adapters and exposes features through both CLI and TUI. Read-only inspection features ship first; write/destructive controls remain locked behind explicit confirmation and privilege checks.

**Tech Stack:** Bun, TypeScript, Ink, cac, Node built-ins (`dns`, `net`, `tls`), `safeExec()`, `bun test`, `bun run verify`.

---

## Source Feature Map

lazyifconfig source reference: https://github.com/choihunchul/lazyifconfig

- Interface inventory: picos has basic interface inventory; add MTU, type, prefixes, counters, gateways.
- Network view: add subnet grouping for LAN, loopback, VPN, container, link-local, public, unassigned.
- Connections view: add active endpoint parsing from `netstat -an`.
- Ports view: add listening port parsing from `lsof` on macOS, `ss` on Linux, `netstat` on Windows.
- Route Inspector: add route table parsing, default route diagnostics, destination path lookup, raw route output.
- Diagnostics: add missing default route, multiple default routes, missing interfaces, down route interfaces, metric conflicts.
- Timeline: add interface/address/status/public IP/copy/update events and timestamped export.
- Tools Hub: add DNS lookup, WHOIS/RDAP, IP info, TCP port check, TLS inspection, ping, traceroute.
- Raw output viewer: retain source command output for route/connection/port/tool results.
- Self-update: add release check first, install/update later behind confirmation.

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

- [ ] **Step 1: Write tool definition and validation tests**

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

- [ ] **Step 2: Run failing test**

Run: `bun test tests/tools.test.ts`
Expected: fail because `src/core/tools.ts` does not exist.

- [ ] **Step 3: Implement core tools**

Implement `ToolId`, `ToolDefinition`, `getToolDefinitions()`, `normalizeToolTarget()`, `runDnsLookup()`, `runWhoisLookup()`, `runIpInfo()`, `runTlsInspect()`, `runTraceroute()`, and a formatter that emits sections plus raw output.

- [ ] **Step 4: Add CLI command**

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

- [ ] **Step 5: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add lazyifconfig tools hub foundation"`

### Task 2: Route Inspector Foundation

**Files:**
- Create: `src/core/routes.ts`
- Create: `src/cli/commands/routes.ts`
- Modify: `src/cli/index.ts`
- Test: `tests/routes.test.ts`

- [ ] **Step 1: Write parser tests**

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

- [ ] **Step 2: Run failing test**

Run: `bun test tests/routes.test.ts`
Expected: fail because `src/core/routes.ts` does not exist.

- [ ] **Step 3: Implement route core**

Implement route command builders for macOS/Linux/Windows, route parsers, default route diagnostics, route summary formatter, and `runRouteTable()`.

- [ ] **Step 4: Add CLI command**

Register:

```bash
picos routes
picos route 8.8.8.8
```

- [ ] **Step 5: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add route inspector foundation"`

### Task 3: Connections And Ports

**Files:**
- Create: `src/core/connections.ts`
- Create: `src/core/ports.ts`
- Create: `src/cli/commands/connections.ts`
- Create: `src/cli/commands/ports.ts`
- Test: `tests/connections.test.ts`, `tests/ports.test.ts`

- [ ] **Step 1: Add fixture-driven parsers**

Parse `netstat -an`, `lsof -nP -iTCP -sTCP:LISTEN`, `ss -ltnp`, and Windows `netstat -ano` into stable objects.

- [ ] **Step 2: Add CLI commands**

```bash
picos connections
picos ports
```

- [ ] **Step 3: Wire TUI panels**

Replace placeholder Connections/Ports screens with parsed data and raw-output references.

- [ ] **Step 4: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add connection and port inspectors"`

### Task 4: TUI Tools Modal And Raw Viewer

**Files:**
- Modify: `src/tui/App.tsx`
- Create: `src/tui/toolsState.ts`
- Test: `tests/navigation.test.ts`, `tests/tools.test.ts`

- [ ] **Step 1: Add focused Tools child state**

Use `Enter` to enter Tools child focus, `Tab` to move fields, `Esc`/`h` to leave child focus.

- [ ] **Step 2: Add result panes**

Show Summary, Detail, Diagnostics, and Raw Output sections for tool runs.

- [ ] **Step 3: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add tools modal and raw output viewer"`

### Task 5: Interface And Network Parity

**Files:**
- Modify: `src/core/network.ts`
- Create: `src/core/subnets.ts`
- Test: `tests/network.test.ts`

- [ ] **Step 1: Add subnet grouping**

Classify loopback, LAN, VPN, container, link-local, public, and unassigned interface groups.

- [ ] **Step 2: Add interface metadata**

Add type, prefix, MTU, gateway, and counters where the platform exposes them.

- [ ] **Step 3: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: expand interface and subnet inventory"`

### Task 6: Timeline And Update Check

**Files:**
- Create: `src/core/timeline.ts`
- Create: `src/core/update.ts`
- Modify: `src/tui/App.tsx`
- Test: `tests/events.test.ts`, `tests/update.test.ts`

- [ ] **Step 1: Add timeline event types**

Track interface appearance/removal, address changes, route changes, public IP changes, copy actions, and update checks.

- [ ] **Step 2: Add export**

Save `picos-timeline-YYYYMMDD-HHMMSS.txt` only when the user asks.

- [ ] **Step 3: Add release check**

Check GitHub Releases for `uulab-official/picos`; do not auto-install until a later confirmation flow exists.

- [ ] **Step 4: Verify and commit**

Run: `bun run verify`
Commit: `git commit -m "feat: add timeline export and update check"`

## Current Execution Choice

Proceed inline in this session. First implementation batch: Task 1 and the read-only route CLI slice from Task 2.
