# Plugin Registry and Docker Read-Only Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an exhaustive built-in plugin registry and a bounded Docker read-only inventory that reports truthful completed, partial, and unsupported state through core, CLI JSON/text, and the System TUI.

**Architecture:** Split the feature into an immutable core contract, adapter-owned Docker command plans, a normalized Docker collector, and thin CLI/TUI consumers. The built-in registry dispatches only known plugin ids; no dynamic import or caller-supplied command is allowed. `createSystemInventory()` collects the same Docker snapshot used by `picos plugins docker`, while a deterministic fake-Docker subprocess harness verifies behavior without a real Docker installation.

**Tech Stack:** Bun, TypeScript, `safeExec`, cac, Ink + React, Biome, Bun test

## Global Constraints

- `DeveloperPluginId` is initially the exhaustive union `"docker"`; its catalog is a `Record<DeveloperPluginId, DeveloperPluginContract>`.
- Docker collection is read-only. Do not add start, stop, restart, remove, pull, push, exec, or other mutation commands.
- Docker command plans are owned by `src/adapters/docker.ts`; core, TUI, and CLI must not construct Docker argv.
- Execute child processes only through `safeExec()` with at most 5,000 ms per collector and the default combined stdout/stderr byte limit.
- Publish at most 200 containers and cap each normalized Docker text field at 256 characters.
- Never request or publish container command lines, arguments, environment variables, labels, mounts, secrets, credentials, or raw Docker output.
- Distinguish `unsupported` (Docker executable missing), `partial` (client exists but any requested collector fails, times out, or source-truncates), and `completed` (all requested collectors succeed without source truncation).
- Publish source-output truncation separately from result row-limit truncation.
- `picos plugins` reads only the static catalog; `picos plugins docker` runs collection; `--json` emits exactly one schema-versioned stdout document.
- Unknown plugin ids and invalid JSON requests exit non-zero with one structured failure document. `unsupported` and `partial` are successful inspections and exit zero.
- The TUI displays plugin state in System without adding a new screen or leaving collection decisions inside `App.tsx` callbacks.
- Local SSH config inventory and every Docker mutation remain out of scope.
- Update user-visible documentation and do not commit `dist/`.

## File Structure

- Create `src/core/pluginTypes.ts`: public plugin contract, evidence, status, and Docker snapshot types.
- Create `src/adapters/docker.ts`: immutable read-only Docker command plans.
- Create `src/core/dockerPlugin.ts`: Docker parsing, normalization, redaction, bounds, collector execution, and status aggregation.
- Create `src/core/plugins.ts`: exhaustive built-in catalog, copy-returning lookup, dispatch, and shared text rows.
- Create `src/cli/pluginOutput.ts`: plugin catalog/snapshot JSON normalization within the local inspector envelope.
- Create `src/cli/commands/plugins.ts`: cac command handler for catalog and one-plugin collection.
- Create `src/tui/pluginPanel.ts`: pure compact System-workspace row formatter.
- Create `tests/support/pluginFixtures.ts`: reusable fully typed Docker snapshot fixtures for core, CLI, inventory, and TUI tests.
- Create `tests/dockerAdapter.test.ts`, `tests/dockerPlugin.test.ts`, `tests/plugins.test.ts`, `tests/pluginOutput.test.ts`, and `tests/pluginPanel.test.ts`.
- Create `scripts/pluginsJsonIntegration.ts`: deterministic subprocess contract harness.
- Create `scripts/support/dockerFixture.ts`: cross-platform fake Docker executable writer and environment helper.
- Modify `src/core/types.ts`, `src/core/systemInventory.ts`, `src/cli/index.ts`, `src/cli/localInspectorOutput.ts`, `src/cli/commands/info.ts`, `src/tui/App.tsx`, relevant existing tests, `scripts/harness.ts`, `package.json`, and project documentation.

---

### Task 1: Exhaustive Registry Contract and Docker Collector

**Files:**
- Create: `src/core/pluginTypes.ts`
- Create: `src/adapters/docker.ts`
- Create: `src/core/dockerPlugin.ts`
- Create: `src/core/plugins.ts`
- Create: `tests/dockerAdapter.test.ts`
- Create: `tests/dockerPlugin.test.ts`
- Create: `tests/plugins.test.ts`
- Create: `tests/support/pluginFixtures.ts`

**Interfaces:**
- Consumes: `safeExec(command: string, args: string[], options?: SafeExecOptions): Promise<SafeExecResult>` from `src/utils/safeExec.ts`.
- Produces: `DeveloperPluginId`, `DeveloperPluginContract`, `DeveloperPluginSnapshot`, `DockerPluginSnapshot`, `parseDeveloperPluginId(value): DeveloperPluginId`, `getDeveloperPluginCatalog(): DeveloperPluginContract[]`, `getDeveloperPluginContract(id): DeveloperPluginContract`, `collectDeveloperPlugin(id, options?): Promise<DeveloperPluginSnapshot>`, `formatDeveloperPluginCatalogRows(catalog): string[]`, and `formatDeveloperPluginSnapshotRows(snapshot): string[]`.

- [ ] **Step 1: Write failing adapter and registry tests**

```ts
// tests/dockerAdapter.test.ts
expect(getDockerCommandPlans()).toEqual([
  { id: "client", command: "docker", args: ["--version"] },
  { id: "context", command: "docker", args: ["context", "show"] },
  expect.objectContaining({ id: "engine", command: "docker", args: ["info", "--format", expect.any(String)] }),
  expect.objectContaining({ id: "containers", command: "docker", args: ["ps", "--all", "--format", expect.any(String)] }),
]);
expect(JSON.stringify(getDockerCommandPlans())).not.toMatch(/start|stop|restart|rm|remove|pull|push|exec/);

// tests/plugins.test.ts
const first = getDeveloperPluginCatalog();
expect(first).toEqual([
  expect.objectContaining({ id: "docker", risk: "read", mutations: "locked" }),
]);
first[0]!.capabilities[0]!.status = "unsupported";
expect(getDeveloperPluginCatalog()).not.toEqual(first);
expect(getDeveloperPluginContract("docker")).toMatchObject({ id: "docker" });
expect(() => getDeveloperPluginContract("missing" as never)).toThrow("Unknown developer plugin: missing");
```

- [ ] **Step 2: Run the focused tests and confirm missing-module failures**

Run: `bun test tests/dockerAdapter.test.ts tests/plugins.test.ts`

Expected: FAIL because `src/adapters/docker.ts` and `src/core/plugins.ts` do not exist.

- [ ] **Step 3: Implement types, adapter plans, and immutable registry copies**

```ts
// src/core/pluginTypes.ts
export type DeveloperPluginId = "docker";
export type DeveloperPluginRuntimeStatus = "completed" | "partial" | "unsupported";
export type DeveloperPluginCapability = {
  id: string;
  label: string;
  risk: "read" | "write" | "destructive";
  status: "available" | "locked" | "unsupported";
  bounds?: { timeoutMs?: number; maxEntries?: number; maxTextLength?: number };
};
export type DeveloperPluginContract = {
  id: DeveloperPluginId;
  label: string;
  description: string;
  source: "built-in";
  risk: "read";
  mutations: "locked";
  capabilities: DeveloperPluginCapability[];
};
export type DeveloperPluginEvidence = {
  id: "client" | "context" | "engine" | "containers";
  command: string;
  args: string[];
  supported: boolean;
  success: boolean;
  exitCode: number | null;
  truncated: boolean;
  diagnostic?: string;
};
```

Define `DockerContainerSummary`, `DockerPluginData`, `DockerPluginSnapshot`, and `DeveloperPluginSnapshot = DockerPluginSnapshot` in the same file. Set `DOCKER_PLUGIN_TIMEOUT_MS = 5_000`, `DOCKER_PLUGIN_CONTAINER_LIMIT = 200`, and `DOCKER_PLUGIN_TEXT_LIMIT = 256` in `src/core/dockerPlugin.ts`. In `src/adapters/docker.ts`, return fresh `{id, command, args}` objects and use tab-separated fields `ID`, `Names`, `Image`, `State`, and `Status` only for `docker ps`.

Create a reusable complete fixture with no raw collector output:

```ts
// tests/support/pluginFixtures.ts
export function createDockerSnapshotFixture(
  overrides: Partial<Omit<DockerPluginSnapshot, "data">> & {
    data?: Partial<DockerPluginSnapshot["data"]>;
  } = {},
): DockerPluginSnapshot {
  const { data, ...snapshotOverrides } = overrides;
  return {
    id: "docker",
    contract: getDeveloperPluginContract("docker"),
    status: "completed",
    evidence: [],
    sourceTruncated: false,
    resultTruncated: false,
    data: {
      clientVersion: "28.3.0",
      context: "default",
      engineVersion: "28.3.0",
      containerCounts: { total: 1, running: 1, paused: 0, stopped: 0 },
      imageCount: 2,
      requestedContainerLimit: 200,
      returnedContainerCount: 0,
      containers: [],
      ...data,
    },
    ...snapshotOverrides,
  };
}
```

Implement the catalog as:

```ts
const pluginCatalog: Record<DeveloperPluginId, DeveloperPluginContract> = {
  docker: createDockerPluginContract(),
};

export function getDeveloperPluginCatalog(): DeveloperPluginContract[] {
  return (Object.keys(pluginCatalog) as DeveloperPluginId[]).map((id) => cloneContract(pluginCatalog[id]));
}
```

- [ ] **Step 4: Write failing Docker parser and aggregation tests**

```ts
const result = (stdout: string, overrides: Partial<SafeExecResult> = {}): SafeExecResult => ({
  command: "docker", args: [], stdout, stderr: "", exitCode: 0, success: true, truncated: false, ...overrides,
});
const failed = (stderr: string): SafeExecResult => result("", { stderr, exitCode: 1, success: false });
const sequenceExec = (results: SafeExecResult[]) => async (): Promise<SafeExecResult> => {
  const next = results.shift();
  if (!next) throw new Error("unexpected Docker collector call");
  return next;
};

const completed = await collectDockerPlugin({
  exec: sequenceExec([
    result("Docker version 28.3.0, build abc"),
    result("desktop-linux"),
    result("28.3.0\t3\t1\t1\t1\t12"),
    result("abc123\tapi\tregistry.example/api:1\trunning\tUp 2 hours"),
  ]),
});
expect(completed).toMatchObject({
  id: "docker",
  status: "completed",
  data: { clientVersion: "28.3.0", context: "desktop-linux", engineVersion: "28.3.0" },
});
expect(completed.data.containers).toHaveLength(1);

const unsupported = await collectDockerPlugin({ exec: sequenceExec([failed("spawn docker ENOENT")]) });
expect(unsupported.status).toBe("unsupported");
expect(unsupported.evidence).toHaveLength(1);

const partial = await collectDockerPlugin({
  exec: sequenceExec([result("Docker version 28.3.0"), result("default"), failed("Cannot connect to daemon"), failed("Cannot connect to daemon")]),
});
expect(partial).toMatchObject({ status: "partial", data: { clientVersion: "28.3.0", context: "default" } });
expect(JSON.stringify(partial)).not.toContain("TOKEN=secret");
```

Add cases for 201 container lines, 257-character fields, malformed numeric engine fields, `truncated: true`, `exitCode: null`, and diagnostics containing `password=`, `token=`, `Authorization:`, and a home path.

- [ ] **Step 5: Run parser tests and confirm collector functions are missing**

Run: `bun test tests/dockerPlugin.test.ts`

Expected: FAIL because `collectDockerPlugin()` and parser exports are not implemented.

- [ ] **Step 6: Implement bounded parsing, redaction, and client-gated parallel collection**

```ts
export async function collectDockerPlugin(options: DockerPluginCollectorOptions = {}): Promise<DockerPluginSnapshot> {
  const exec = options.exec ?? safeExec;
  const plans = getDockerCommandPlans();
  const clientResult = await runPlan(exec, plans[0], options.timeoutMs ?? DOCKER_PLUGIN_TIMEOUT_MS);
  if (isExecutableMissing(clientResult)) return createUnsupportedDockerSnapshot(clientResult);
  const remaining = await Promise.all(plans.slice(1).map((plan) => runPlan(exec, plan, options.timeoutMs ?? DOCKER_PLUGIN_TIMEOUT_MS)));
  return createDockerSnapshot([clientResult, ...remaining], options.containerLimit ?? DOCKER_PLUGIN_CONTAINER_LIMIT);
}
```

`isExecutableMissing()` must recognize only spawn-not-found diagnostics (`ENOENT`, `not found`, or Windows error 2) on the client probe; daemon errors remain `partial`. Normalize all strings with `normalizeDockerText(value, 256)`, replace credential-shaped values and home paths, and never retain `SafeExecResult.stdout` or `.stderr` after parsing. Track `sourceTruncated` from evidence and `resultTruncated` from container row limiting as separate booleans.

- [ ] **Step 7: Run focused tests, format, and inspect the diff**

Run: `bun test tests/dockerAdapter.test.ts tests/dockerPlugin.test.ts tests/plugins.test.ts`

Expected: PASS.

Run: `bunx biome check --write src/adapters/docker.ts src/core/pluginTypes.ts src/core/dockerPlugin.ts src/core/plugins.ts tests/dockerAdapter.test.ts tests/dockerPlugin.test.ts tests/plugins.test.ts`

Run: `git diff --check`

Expected: no errors.

- [ ] **Step 8: Commit and push the core milestone**

```bash
git add src/adapters/docker.ts src/core/pluginTypes.ts src/core/dockerPlugin.ts src/core/plugins.ts tests/support/pluginFixtures.ts tests/dockerAdapter.test.ts tests/dockerPlugin.test.ts tests/plugins.test.ts
git commit -m "feat(core): add Docker plugin registry contract"
git push
```

---

### Task 2: System Inventory and Pure TUI Rows

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/systemInventory.ts`
- Modify: `src/tui/App.tsx`
- Create: `src/tui/pluginPanel.ts`
- Modify: `tests/systemInventory.test.ts`
- Create: `tests/pluginPanel.test.ts`
- Modify: `tests/tuiCallbackAudit.test.ts` only if the strict manifest reports a changed callback count; do not add an exception for plugin logic.

**Interfaces:**
- Consumes: `collectDeveloperPlugin("docker")` and `formatDeveloperPluginSnapshotRows(snapshot)` from Task 1.
- Produces: `SystemInventory.plugins: DeveloperPluginSnapshot[]` and `formatSystemPluginRows(plugins, visibleRows): string[]`.

- [ ] **Step 1: Write failing inventory and row-formatter tests**

```ts
const docker = createDockerSnapshotFixture({ status: "partial" });
const inventory = await createSystemInventory({
  storage: [], processes: [], network, plugins: [docker], system, hardware, permission, runtime,
});
expect(inventory.plugins).toEqual([docker]);

expect(formatSystemPluginRows([docker], 6)).toEqual([
  "DEVELOPER PLUGINS",
  "docker partial · built-in · read-only · mutations locked",
  "context=default client=28.3.0 engine=-",
  "containers=0/200 resultTruncated=false sourceTruncated=false",
  expect.stringContaining("engine warn"),
]);
expect(formatSystemPluginRows([], 6)).toContain("no registered plugin snapshots");
```

- [ ] **Step 2: Run focused tests and confirm missing property/module failures**

Run: `bun test tests/systemInventory.test.ts tests/pluginPanel.test.ts`

Expected: FAIL because `SystemInventory.plugins` and `pluginPanel.ts` do not exist.

- [ ] **Step 3: Collect independent inventory sources concurrently**

Change `createSystemInventory()` to resolve storage, processes, and Docker in one `Promise.all`. Respect overrides so tests can avoid child processes:

```ts
const [storageResult, processResult, dockerSnapshot] = await Promise.all([
  overrides.storage === undefined ? getStorageSummaryWithSource() : undefined,
  overrides.processes === undefined ? getProcessSummaryWithSource(FULL_INVENTORY_PROCESS_LIMIT) : undefined,
  overrides.plugins === undefined ? collectDeveloperPlugin("docker") : undefined,
]);
```

Return `plugins: overrides.plugins ?? [dockerSnapshot!]`. Import `DeveloperPluginSnapshot` into `src/core/types.ts` with `import type` and add the required property to `SystemInventory`.

- [ ] **Step 4: Implement pure compact TUI formatting and wire SystemWorkspace**

```ts
// src/tui/pluginPanel.ts
export function formatSystemPluginRows(
  plugins: DeveloperPluginSnapshot[],
  visibleRows: number,
): string[] {
  const rows = [
    "DEVELOPER PLUGINS",
    ...plugins.flatMap((snapshot) =>
      formatDeveloperPluginSnapshotRows(snapshot).slice(0, 4),
    ),
  ];
  return rows.slice(0, Math.max(1, visibleRows));
}
```

In `SystemWorkspace`, compute `pluginRows = formatSystemPluginRows(inventory?.plugins ?? [], 7)` and render them below `SYSTEM MONITOR`. Color headings cyan, `partial`/`unsupported` rows yellow, and all other rows gray/white. Do not add state, effects, or branch decisions to a callback.

- [ ] **Step 5: Run focused tests and the strict callback audit**

Run: `bun test tests/systemInventory.test.ts tests/pluginPanel.test.ts`

Run: `bun run audit:tui-callbacks --strict`

Expected: both pass with `inlineDecisions=0` and `selectionClamps=0`. If only the exact callback total changes due to source line movement, regenerate the existing manifest through its documented script; do not weaken an ownership rule.

- [ ] **Step 6: Format, diff-check, commit, and push**

```bash
bunx biome check --write src/core/types.ts src/core/systemInventory.ts src/tui/pluginPanel.ts src/tui/App.tsx tests/systemInventory.test.ts tests/pluginPanel.test.ts
git diff --check
git add src/core/types.ts src/core/systemInventory.ts src/tui/pluginPanel.ts src/tui/App.tsx tests/systemInventory.test.ts tests/pluginPanel.test.ts tests/tuiCallbackAudit.test.ts scripts/support/tuiCallbackManifest.ts
git commit -m "feat(tui): show Docker plugin inventory in System"
git push
```

---

### Task 3: Plugin CLI and Versioned JSON Contract

**Files:**
- Create: `src/cli/pluginOutput.ts`
- Create: `src/cli/commands/plugins.ts`
- Modify: `src/cli/index.ts`
- Modify: `src/cli/localInspectorOutput.ts`
- Modify: `src/cli/commands/info.ts`
- Modify: `tests/cli.test.ts`
- Modify: `tests/localInspectorOutput.test.ts`
- Create: `tests/pluginOutput.test.ts`

**Interfaces:**
- Consumes: Task 1 registry functions and `stringifyLocalInspectorCompleted()` / `reportLocalInspectorJsonFailure()`.
- Produces: `pluginsCommand(id?: string, options?: {json?: unknown})`, `formatPluginCatalogJson()`, and `formatPluginSnapshotJson(snapshot)`.

- [ ] **Step 1: Write failing CLI registration and output tests**

```ts
const cli = createCli();
const command = cli.commands.find((candidate) => candidate.name === "plugins");
expect(command?.rawName).toBe("plugins [id]");
expect(command?.options.some((option) => option.name === "json")).toBeTrue();

const catalog = JSON.parse(formatPluginCatalogJson(getDeveloperPluginCatalog()));
expect(catalog).toMatchObject({
  schemaVersion: 1,
  command: "plugins",
  status: "completed",
  request: { action: "list", id: null },
  data: { totalCount: 1, plugins: [{ id: "docker", mutations: "locked" }] },
});

const partial = JSON.parse(formatPluginSnapshotJson(createDockerSnapshotFixture({ status: "partial" })));
expect(partial.data.status).toBe("partial");
expect(JSON.stringify(partial)).not.toContain("raw-secret-output");
```

Add a `runCli(["plugins", "missing", "--json"])` assertion for exactly one failure document and a non-zero reported error. Add `plugins` to the exhaustive local inspector command registry test.

- [ ] **Step 2: Run focused tests and confirm missing command/output failures**

Run: `bun test tests/cli.test.ts tests/pluginOutput.test.ts tests/localInspectorOutput.test.ts`

Expected: FAIL because the plugin CLI modules and local inspector command member are absent.

- [ ] **Step 3: Implement JSON normalization and command behavior**

```ts
export async function pluginsCommand(
  id?: string,
  options: { json?: unknown } = {},
): Promise<void> {
  const jsonRequested = isLocalJsonRequested(options.json);
  try {
    const json = assertLocalJsonOptions(options);
    if (!id) {
      const catalog = getDeveloperPluginCatalog();
      await writeCliOutput(json ? formatPluginCatalogJson(catalog) : formatDeveloperPluginCatalogRows(catalog).join("\n"));
      return;
    }
    const pluginId = parseDeveloperPluginId(id);
    const snapshot = await collectDeveloperPlugin(pluginId);
    await writeCliOutput(json ? formatPluginSnapshotJson(snapshot) : formatDeveloperPluginSnapshotRows(snapshot).join("\n"));
  } catch (caught) {
    if (isCliOutputWriteError(caught)) throw caught;
    if (jsonRequested) reportLocalInspectorJsonFailure("plugins", caught, { request: { action: id ? "inspect" : "list", id: id ?? null } });
    throw caught;
  }
}
```

Register `plugins [id]` in `createCli()`. Add `"plugins"` to `LocalInspectorCommand` and the exhaustive `Record<LocalInspectorCommand, true>`. JSON must include contract, normalized source evidence, `sourceTruncated`, and `resultTruncated`, and must use existing `sanitizeText` behavior by exporting a narrowly named `sanitizeLocalInspectorText()` helper or normalizing in `pluginOutput.ts` without duplicating redaction rules.

- [ ] **Step 4: Include plugin snapshots in full info text and JSON**

Append `Plugins` rows from `formatDeveloperPluginSnapshotRows()` in `formatFullInfo()`. Add a normalized `plugins` array to `normalizeFullInventory()` and update full-info tests to prove Docker diagnostics and raw output are absent. This keeps `SystemInventory` truthful in every public full-inventory representation.

- [ ] **Step 5: Run focused tests and CLI smoke probes**

Run: `bun test tests/cli.test.ts tests/pluginOutput.test.ts tests/localInspectorOutput.test.ts tests/systemInventory.test.ts`

Run: `bun src/bin/picos.ts plugins`

Run: `bun src/bin/picos.ts plugins docker --json`

Expected: tests pass; catalog exits zero without running Docker; Docker inspection prints one JSON document with `completed`, `partial`, or `unsupported` data according to the local machine.

- [ ] **Step 6: Format, diff-check, commit, and push**

```bash
bunx biome check --write src/cli/pluginOutput.ts src/cli/commands/plugins.ts src/cli/index.ts src/cli/localInspectorOutput.ts src/cli/commands/info.ts tests/cli.test.ts tests/pluginOutput.test.ts tests/localInspectorOutput.test.ts tests/systemInventory.test.ts
git diff --check
git add src/cli/pluginOutput.ts src/cli/commands/plugins.ts src/cli/index.ts src/cli/localInspectorOutput.ts src/cli/commands/info.ts tests/cli.test.ts tests/pluginOutput.test.ts tests/localInspectorOutput.test.ts tests/systemInventory.test.ts
git commit -m "feat(cli): expose plugin inventory automation"
git push
```

---

### Task 4: Deterministic Cross-Platform Plugin Harness

**Files:**
- Create: `scripts/support/dockerFixture.ts`
- Create: `scripts/pluginsJsonIntegration.ts`
- Modify: `scripts/harness.ts`
- Modify: `package.json`
- Modify: `docs/HARNESS.md`

**Interfaces:**
- Consumes: `picos plugins docker --json` from Task 3.
- Produces: `bun run integration:plugins-json` and `bun run harness plugins-json`, both included in `bun run verify`.

- [ ] **Step 1: Add the failing package and harness registrations**

Add package script:

```json
"integration:plugins-json": "bun scripts/pluginsJsonIntegration.ts"
```

Add `"plugins-json"` to `HarnessMode`, a `pluginsJsonSteps` entry, mode routing, parse validation, and a `Plugin JSON integration` entry in `verifySteps`.

- [ ] **Step 2: Run the new script and confirm the missing-file failure**

Run: `bun run integration:plugins-json`

Expected: FAIL because `scripts/pluginsJsonIntegration.ts` does not exist.

- [ ] **Step 3: Implement a temporary fake Docker fixture**

`createDockerFixture(mode)` must create a temporary directory and a `docker` executable (`docker.cmd` on Windows, executable POSIX shell script elsewhere). It branches only on argv and `PICOS_DOCKER_FIXTURE_MODE`:

```text
--version                         -> Docker version 28.3.0, build fixture
context show                      -> fixture-context
info --format ...                -> 28.3.0<TAB>3<TAB>1<TAB>1<TAB>1<TAB>12
ps --all --format ...            -> two tab-separated safe container rows
```

In `partial` mode, `info` and `ps` write `Cannot connect to the Docker daemon token=fixture-secret` to stderr and exit 1. The helper returns explicit `PATH`/`Path` environment values and a cleanup function. Do not depend on `grep`, `sed`, `chmod` subprocesses, or a real Docker installation.

- [ ] **Step 4: Implement completed, partial, unsupported, and failure assertions**

```ts
const completed = await runPicosWithFixture("completed", ["plugins", "docker", "--json"]);
assert.equal(completed.exitCode, 0);
assert.equal(completed.stderr, "");
assert.equal(parseSingleJson(completed.stdout).data.status, "completed");

const partial = await runPicosWithFixture("partial", ["plugins", "docker", "--json"]);
assert.equal(partial.exitCode, 0);
assert.equal(parseSingleJson(partial.stdout).data.status, "partial");
assert.equal(partial.stdout.includes("fixture-secret"), false);

const unsupported = await runPicosWithEmptyPath(["plugins", "docker", "--json"]);
assert.equal(unsupported.exitCode, 0);
assert.equal(parseSingleJson(unsupported.stdout).data.status, "unsupported");

const unknown = await runPicosWithEmptyPath(["plugins", "missing", "--json"]);
assert.equal(unknown.exitCode, 1);
assert.equal(parseSingleJson(unknown.stdout).status, "failed");
```

Assert each stdout starts with `{`, ends with `}`, parses once, stays below 4 MiB, contains no raw output property, and publishes four collector evidence rows only when the client exists.

- [ ] **Step 5: Run the harness directly and through the router**

Run: `bun run integration:plugins-json`

Run: `bun run harness plugins-json`

Expected: both pass on the current platform and report completed, partial, unsupported, and unknown-plugin contracts.

- [ ] **Step 6: Document, format, commit, and push**

```bash
bunx biome check --write scripts/support/dockerFixture.ts scripts/pluginsJsonIntegration.ts scripts/harness.ts package.json
git diff --check
git add scripts/support/dockerFixture.ts scripts/pluginsJsonIntegration.ts scripts/harness.ts package.json docs/HARNESS.md
git commit -m "test: add Docker plugin JSON harness"
git push
```

---

### Task 5: Product Documentation, Checklist, and Completion Audit

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `docs/INCOMPLETE_FEATURES_CHECKLIST.md`
- Modify: `docs/LOCAL_AUTOMATION.md`

**Interfaces:**
- Consumes: verified commands, statuses, limits, and harness names from Tasks 1-4.
- Produces: user-facing command/safety documentation and truthful remaining-work state.

- [ ] **Step 1: Update docs from the enforced constants and behavior**

Document exactly:

```text
picos plugins
picos plugins docker
picos plugins docker --json
```

State that the registry is built-in/static, Docker inspection is read-only, each collector is bounded to 5 seconds, containers to 200, text fields to 256 characters, raw output and command/env/secret-bearing fields are excluded, and `unsupported`/`partial` are valid zero-exit inspection outcomes. Describe the JSON document in `docs/LOCAL_AUTOMATION.md` and the deterministic fixture in `docs/HARNESS.md`.

Mark only `plugin registry design and capability contract` and `Docker read-only plugin` complete in `docs/INCOMPLETE_FEATURES_CHECKLIST.md`; leave `SSH profile inventory` pending and keep it as developer-environment priority 1. Update ROADMAP without restating stale verification counts across slices.

- [ ] **Step 2: Run focused feature verification**

Run:

```bash
bun test tests/dockerAdapter.test.ts tests/dockerPlugin.test.ts tests/plugins.test.ts tests/pluginPanel.test.ts tests/pluginOutput.test.ts tests/systemInventory.test.ts tests/cli.test.ts tests/localInspectorOutput.test.ts
bun run integration:plugins-json
bun run audit:tui-callbacks --strict
git diff --check
```

Expected: all pass; callback audit reports `inlineDecisions=0` and `selectionClamps=0`.

- [ ] **Step 3: Run the repository completion gates**

Run: `bun run verify`

Expected: lint, callback audit, all Bun tests, local JSON, diagnostics JSON, operations JSON, automation presets, plugin JSON, SFTP, typecheck, build, and smoke all pass.

Run: `bun run release:check`

Expected: build, release metadata checks, and `npm pack --dry-run` pass without adding `dist/` to git.

- [ ] **Step 4: Audit every acceptance criterion from current evidence**

Use these evidence checks:

```bash
rg -n 'DeveloperPluginId|Record<DeveloperPluginId|collectDeveloperPlugin' src/core
rg -n 'docker' src/adapters/docker.ts
rg -n 'safeExec' src/core/dockerPlugin.ts src/cli src/tui
rg -n 'start|stop|restart|remove|pull|push|exec' src/adapters/docker.ts src/core/dockerPlugin.ts
rg -n 'plugins-json|integration:plugins-json' package.json scripts/harness.ts docs/HARNESS.md
git status --short
git diff --check
```

Confirm that core/CLI/TUI all consume the same snapshot type, unsupported and partial tests assert retained evidence, source/result truncation fields are separate, no mutation command exists, all required docs are updated, `dist/` is untracked/ignored, and the worktree contains only intended changes.

- [ ] **Step 5: Commit and push documentation and any verified final fixes**

```bash
git add README.md CHANGELOG.md ROADMAP.md docs/INCOMPLETE_FEATURES_CHECKLIST.md docs/LOCAL_AUTOMATION.md docs/HARNESS.md
git commit -m "docs: complete Docker plugin inventory slice"
git push
```

- [ ] **Step 6: Verify the pushed branch is synchronized**

Run:

```bash
git status --short --branch
git rev-parse HEAD
git rev-parse '@{u}'
```

Expected: clean worktree and identical local/upstream commit ids.
