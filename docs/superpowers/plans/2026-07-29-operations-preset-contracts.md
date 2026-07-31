# Operations Preset Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Verified. Source, tests, harness, and docs are written and the full gate is green: `bunx biome check .` reported no fixes across 217 files, `bun test` is 802 passing across 83 files, `bun run harness automation-presets` verifies 8 guarded failures, and `bun run verify` and `bun run release:check` both exit clean with `tsc --noEmit` included. Only the commit, push, and roadmap-link steps remain.

**Goal:** Make saved operation presets a first-class coding-agent workflow by publishing the preset contract itself, so an agent can construct a valid `picos operations save` call and its exact confirmation phrase without reading prose docs.

**Architecture:** `src/core/operationPresets.ts` already owns every bound and default. The contract catalog lives next to those constants and reads its numbers from them, so the published contract cannot drift from the validators. `picos operations kinds` answers from the catalog before any config read, which keeps discovery working on a machine with no picos config and makes it the cheapest possible first call. The exact confirmation phrases moved into one core formatter that both the CLI write guard and the published contract use, removing the previously duplicated string literals. Output reuses the existing schema-versioned local-inspector envelope with `command=operations`.

**Tech Stack:** Bun, TypeScript, cac CLI, Bun test, Biome.

---

### Task 1: Core Contract Coverage

**Files:**

- Modify: `tests/operationPresets.test.ts`

- [x] **Step 1: Write the failing tests**

Three tests were added to the existing `operation presets` describe block:

- `publishes preset contracts derived from the validated bounds` asserts kind order, `OPERATION_PRESET_LIMITS`, the exact monitor field list, and that each declared bound equals the validator that enforces it, so a future bound change breaks the test instead of shipping a stale contract:

```ts
const limit = logs.fields.find((field) => field.name === "limit");
expect(limit?.max).toBe(MAX_OPERATION_LOG_LIMIT);
expect(() => parseOperationLogLimit((limit?.max ?? 0) + 1)).toThrow("1 to 200");
```

- `formats contract rows and exact confirmation phrases` pins the compact rows and both confirmation templates.
- `returns contract copies so callers cannot mutate the catalog` pops a field from one returned contract and expects the next call to still return two monitor fields.
- `creates a preset from every published field name and bound` builds a `createOperationPreset()` input out of each contract, preferring `field.min` over `field.default` so a wrong field name cannot pass by falling back to a default, then asserts the created preset carries every published field name with the value that was sent.

- [x] **Step 2: Run focused tests and verify RED, then GREEN after Task 2**

Run:

```bash
bun test tests/operationPresets.test.ts
```

### Task 2: Publish The Contract From Core

**Files:**

- Modify: `src/core/operationPresets.ts`

- [x] **Step 1: Add contract types**

`OperationPresetFieldContract` carries `name`, `option`, `type`, `required`, `default`, and the optional `min`, `max`, `maxLength`, and `choices`. `OperationPresetKindContract` carries `kind`, `command`, `label`, and `fields`.

- [x] **Step 2: Extract the missing bounds and defaults**

Added `MIN_OPERATION_LOG_LIMIT`, `MIN_MONITOR_SAMPLES`, `MIN_OPERATION_PROCESS_ID`, `DEFAULT_MONITOR_SAMPLES`, `DEFAULT_MONITOR_INTERVAL_MS`, `DEFAULT_OPERATION_LOG_LIMIT`, `DEFAULT_OPERATION_LOG_LEVEL`, `DEFAULT_OPERATION_FILES`, and `OPERATION_LOG_LEVELS`, then rewrote `parseMonitorSampleCount()`, `parseMonitorInterval()`, `parseOperationLogLimit()`, `parseOperationLogLevel()`, `parseOperationProcessId()`, and `parseOperationFiles()` to use them. The thrown messages keep their existing wording.

The preset id rule follows the same shape in the other direction: the regular expression stays the source of truth as `OPERATION_PRESET_ID_REGEX`, and `OPERATION_PRESET_ID_PATTERN` is published from its `.source` so the string can never disagree with the expression that runs. Keeping the literal avoids `new RegExp(…)`, which Biome's `useRegexLiterals` would flag.

- [x] **Step 3: Declare the catalog from those constants**

`OPERATION_PRESET_KIND_CONTRACTS_BY_KIND` is a `Record<OperationPreset["kind"], OperationPresetKindContract>`, so adding a kind to the union stops compiling until its contract exists. `OPERATION_PRESET_KIND_CONTRACTS` derives the published order from it, holds monitor, logs, and process in CLI option order, and contains no numeric literals. `OPERATION_PRESET_LIMITS` publishes `maxPresets`, `maxIdLength`, and `maxMonitorIntervalSpanMs`. The published key deliberately says interval span rather than duration, because `MAX_MONITOR_DURATION_MS` caps `(samples - 1) * intervalMs` and not wall-clock time.

- [x] **Step 4: Add lookups and formatters**

```ts
export function listOperationPresetKindContracts(): OperationPresetKindContract[];
export function findOperationPresetKindContract(
	kind: unknown,
): OperationPresetKindContract;
export function formatOperationPresetKindContract(
	contract: OperationPresetKindContract,
): string;
export function formatOperationPresetConfirmation(
	action: "save" | "remove",
	id: string,
): string;
```

Both lookups return deep copies. `parseOperationPresetKind()` is the single normalize-and-validate point, used by both `createOperationPreset()` and `findOperationPresetKindContract()`, so the write path and the discovery path accept exactly the same kind spellings and fail with the same message. Rows render as:

```text
monitor -> picos monitor [--samples=1..60] [--interval=250..60000]
logs -> picos logs [--limit=1..200] [--level=all|warn|fail|info] [--filter=text<=256]
process -> picos process --pid=1+ [--files]
```

Rows quote `field.option` rather than `field.name`, because the monitor interval field is named `intervalMs` but its flag is `--interval`; printing the field name would advertise a flag that does not exist. Optional fields are bracketed so the required `--pid` is distinguishable.

- [x] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/operationPresets.test.ts
```

### Task 3: Add The `kinds` Action

**Files:**

- Modify: `tests/operationPresetsOutput.test.ts`
- Modify: `tests/operationsCommand.test.ts`
- Modify: `src/cli/operationPresetsOutput.ts`
- Modify: `src/cli/commands/operations.ts`

- [x] **Step 1: Write the output and CLI tests**

`publishes the preset contract with bounds and confirmations` asserts the completed `operations` document:

The envelope is matched partially, with `toMatchObject`, but `request.kind` is pinned deliberately:

```ts
{
	command: "operations",
	status: "completed",
	request: { operation: "kinds", presetId: null, kind: null },
	source: { kind: "picos-contract", location: "built-in", success: true },
}
```

That last field was added because `kind` is produced by `options.kind ?? null` and the type is `kind?: OperationPreset["kind"]`, so dropping the `?? null` would still compile while changing the serialized document: `JSON.stringify` omits `undefined`, and the key would disappear rather than read `null`. Before this it was covered only by the harness, which asserts it under `node:assert/strict` where `undefined` does not equal `null`. Pinning it in the unit test moves that failure to the fast gate.

`data.limits` and `data.confirmations`, by contrast, are matched with `toEqual`, so these are exhaustive and adding a key to `OPERATION_PRESET_LIMITS` fails the test until it is listed:

```ts
limits: {
	maxPresets: 12,
	maxIdLength: 32,
	maxMonitorIntervalSpanMs: 300000,
	idPattern: "^[a-z0-9][a-z0-9._-]*$",
	idNormalization: "trim-lowercase",
}
confirmations: {
	save: "save operation preset <id>",
	remove: "remove operation preset <id>",
}
```

`idPattern` is the regular expression's `.source`, which excludes both the delimiters and the `u` flag. `data.totalCount` and `data.returnedCount` are both 3, one field is pinned exactly to catch a renamed key, `kinds[1].fields[1].choices` pins the level list, and `output` is asserted not to contain `config.json`.

`prints preset kind contracts without creating config` asserts the text rows and that no config file is written. `rejects unknown operations actions` pins the new action list.

- [x] **Step 2: Add the JSON formatter**

`formatOperationPresetKindsJson()` and `normalizeOperationPresetKindContract()` sit beside `formatOperationPresetsJson()`, reuse `stringifyLocalInspectorCompleted("operations", ...)` and `sanitizeLocalInspectorText()`, normalize absent bounds to `null`, and serialize no filesystem path.

- [x] **Step 2b: Report shelf eviction on save**

Auditing the published contract against the write path surfaced a silent behavior: `saveOperationPreset()` prepends and then caps at `MAX_OPERATION_PRESETS`, so a save into a full shelf drops the oldest preset with no signal. `findEvictedOperationPresetIds()` diffs the shelf before and after, the save document gains `data.evicted`, and the plain-text form prints a matching `Evicted:` line. Re-saving an existing id replaces it in place, so the diff is empty.

- [x] **Step 3: Answer the action before config is read**

`operationsCommand()` handles `kinds` immediately after option validation and before `readConfig()`, passing the second positional through as an optional kind filter. The inline `save operation preset ${preset.id}` and `remove operation preset ${preset.id}` literals now call `formatOperationPresetConfirmation()`, and the unknown-action message reads `expected list, kinds, show, save, run, or remove`. The failure request echo reports the `kinds` positional as `kind` rather than `presetId`.

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
bun test tests/operationPresetsOutput.test.ts tests/operationsCommand.test.ts
```

### Task 4: Extend The Automation Presets Harness

**Files:**

- Modify: `scripts/automationPresetsIntegration.ts`

- [x] **Step 1: Assert the live contract before any preset exists**

`operations kinds --json` now runs first, asserting `request.operation=kinds`, three kinds in order, both confirmation templates, and no serialized config path.

- [x] **Step 2: Drive the save call from the published contract**

The monitor save now takes its option names from the published `fields[]` through a `requireContractOption()` helper and its confirmation from `confirmations.save.replace("<id>", "pulse")`. The removal uses `confirmations.remove` the same way. A descriptive contract that cannot actually drive the CLI now fails the gate.

- [x] **Step 3: Add a guarded failure case**

`["operations", "sample", "--json"]` and `["operations", "kinds", "bogus", "--json"]` joined the deterministic failure loop, keeping the single-document, non-zero-exit, empty-stderr expectations. A confirmation repeating an un-normalized id joined it too, pinning the rule that the phrase must use the stored id. Guarded failures went from three to six.

- [x] **Step 4: Run the focused harness**

Run:

```bash
bun run harness automation-presets
```

### Task 5: Product Docs And Roadmap

**Files:**

- Modify: `README.md`
- Modify: `docs/LOCAL_AUTOMATION.md`
- Modify: `docs/HARNESS.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `AGENTS.md`
- Modify: `CODEX.md`
- Modify: `CLAUDE.md`

- [x] **Step 1: Document the discovery command**

Added `picos operations kinds` to the README CLI block and a command bullet, the contract document shape and two `jq` examples to `docs/LOCAL_AUTOMATION.md`, and the new contract assertions plus the four-failure count to `docs/HARNESS.md`.

- [x] **Step 2: Record the agent rule**

`AGENTS.md`, `CODEX.md`, and `CLAUDE.md` now require the published contract to be derived from the validators, `kinds` to answer without reading config, catalog copies to stay copies, confirmations to come from the shared formatter, and the contract test to change alongside any bound change.

- [x] **Step 3: Add the roadmap slice**

Added `v0.4.341 - Operations Preset Contracts` above `v0.4.340` and repointed the v0.4.340 `Next` line at TUI surfacing.

- [x] **Step 4: Run full verification**

The source in this slice was hand-written without a working shell, so normalize formatting and import order first; `bun run format` only fixes formatting and leaves import sorting alone.

Run:

```bash
bunx biome check . --write
bun run verify
bun run release:check
git diff --check
```

### Task 6: Publish The Version Slice

**Files:**

- Commit all modified source, tests, scripts, and docs.

- [x] **Step 1: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-07-29-operations-preset-contracts.md src/core/operationPresets.ts src/cli/operationPresetsOutput.ts src/cli/commands/operations.ts scripts/automationPresetsIntegration.ts tests/operationPresets.test.ts tests/operationPresetsOutput.test.ts tests/operationsCommand.test.ts README.md docs/LOCAL_AUTOMATION.md docs/HARNESS.md CHANGELOG.md ROADMAP.md AGENTS.md CODEX.md CLAUDE.md
git commit -m "feat(operations): publish preset contracts for agents"
```

- [x] **Step 2: Push and open draft PR**

Run:

Done as a single stacked PR covering v0.4.340 through v0.4.342, because several files carry changes from more than one slice and could not be split without interactive staging. The branch was renamed from the v0.4.340 name it was created under, and the base is the branch below it rather than `main`, which is 475 commits behind:

```bash
git branch -m codex/picos-v0.4.342-operations-presets
git push -u origin codex/picos-v0.4.342-operations-presets
gh pr create --draft \
  --base codex/picos-v0.4.339-operations-json \
  --title "feat(operations): publish preset contracts and add run control"
```

Result: draft PR [#415](https://github.com/uulab-official/picos/pull/415).

- [x] **Step 3: Update roadmap with PR link**

The three affected `Status:` lines now carry the PR link and the local verification result. The original instruction here said to amend the commit and force-push with lease; that was written for a pre-push edit and does not apply once the branch is published, so this went in as a separate `docs:` commit instead, matching the `docs: track … pull request` commits on the slices below.

## Out Of Scope

- New preset kinds beyond monitor, logs, and process.
- Wildcard or multi-kind selection for `operations kinds`; a single optional kind positional is enough for a three-entry catalog.
- Any preset field that would let a preset run a command the direct CLI form cannot.
- TUI surfacing of saved presets. The owning-workspace question is now resolved in [2026-07-29-operations-preset-visibility.md](2026-07-29-operations-preset-visibility.md): Config reports coverage, no managed shelf target is added, and running presets from the TUI is blocked on a cancellation model.

## Verification Triage

This slice and the two stacked on it were written without a working shell, so this list was assembled by derivation and ordered by how likely each item was to be the cause of a failure. The cause of that condition was found later and is worth recording: the data volume was at 99% with the reported free space well below what APFS advertises, so commands were failing with an empty output and a non-zero exit because they could not write. The same shortage later surfaced inside the gate as an `ENOSPC` from `tests/remoteCommand.test.ts`, whose oversized-`known_hosts` case deliberately writes just over 4 MiB; it passes whenever there is room. A failing step that reports `errno -28` in this repo is an environment problem, not a regression. **The gate has since run and every item held.** The list is kept because the outcome is the useful part: it says which kinds of reasoning survived contact with the tools.

- `bunx biome check . --write` reported **no fixes applied across 217 files**. The prediction was zero changes under `src/` with possible churn in `tests/` and `scripts/`; the actual result was stronger than predicted. The method that produced it was reading `biome.json`, finding no `formatter` block, and therefore working to the defaults of `lineWidth` 80 with a tab counted as `indentWidth`, then comparing each hand-written construct against an already-committed sibling of the same shape rather than guessing. The one spot where no sibling agreed, the `useState` generic in `App.tsx`, was the one spot that was actually wrong and was corrected before the gate ran.
- Every string in item 2 was correct, including the ones re-derived through their emitters rather than compared by eye: the coverage counts, the empty-shelf ordering, the three contract rows, `count=1 total=3`, `002 fail disk offline`, and the two error messages that were converted from prose literals to `formatExpectedList()` output and had to stay byte-identical.
- Item 3's `tsc --noEmit` passed, which covers the type-level work that had no compiler while it was written: the `Record`-keyed level presence map with its `Object.keys(...)` cast, the `Exclude<...>` narrowing in `configPanel.ts`, the `ReturnType<...>[number]["fields"][number]` indexed access in the round-trip test, and the explicitly typed `failureCases` table that replaced an `as const` array so optional columns could be destructured.

The two defects that this triage explicitly could not have caught were both found by review rather than by the gate, and both were already fixed before it ran: the hardcoded `operationPresets: []` in the `App.tsx` shelf argument, and seams placed inside the cac-populated options object. That asymmetry is the honest summary of the method's limits, since a gate run would have passed with either of them in place.

1. **Formatter line breaking.** Still the reason `bunx biome check . --write` runs before anything else, and `bun run format` will not fix import sorting. A later pass narrowed this considerably. `biome.json` sets no `formatter` block, so Biome's defaults apply: `lineWidth` 80 and tab indentation, with a tab measured as `indentWidth` columns. That gives a number to check the flagged spots against instead of guessing.

   One spot was wrong and is now fixed. The `operationPresets` `useState` was hand-written breaking inside the type argument:

   ```ts
   const [operationPresets, setOperationPresets] = useState<
   	PicosConfig["operationPresets"]
   >([]);
   ```

   The one-line form is 96 columns so it must break, but the pre-existing sibling two lines above it, `interfaceEvidenceSearchPresets`, breaks after `=` instead and has already passed the gate. Both lines of that layout fit here, at 49 and 50 columns, and Biome prefers breaking at the assignment over breaking type arguments when the right-hand side fits alone. The declaration now matches the sibling.

   The other two flagged spots are already in Biome's output shape. The long template literals in `printPresetKindContracts()` cannot be broken by Biome at all, since it does not split template literals, so the only decision is whether the argument moves to its own line, and it must: the shortest of them is 83 columns inlined. That is exactly the form they are in, and it matches the pre-existing `console.log` calls beside them. The `Exclude<...>` parameter in `configPanel.ts` inlines to 137 columns so it must break too, and the broken form present, with the parameter on its own line at 67 columns and a trailing comma, is Biome's standard shape.

   Import **order** is no longer part of this item. Biome 2.x is in use, confirmed by the top-level `assist` key in `node_modules/@biomejs/biome/configuration_schema.json`, and the repo's pre-existing blocks are consistently sorted, so `organizeImports` is clearly enforced. Every block touched by these slices was re-checked against Biome's case-insensitive natural ordering, where `_` sorts before letters: the eleven-member core import in `operations.ts`, its `osLogs`/`processes`/`systemMonitor`/`operationPresetsOutput` blocks and its module order, the `operationPresetsOutput.ts` core block, the new `DEFAULT_*` entries in `logs.ts` and `monitor.ts`, and the four touched test files. All are in the order Biome will want.

   What this changes about the gate: `--write` should now produce a **small** diff. If it rewrites many lines, the model of the formatter recorded here is wrong and the rest of this triage should be trusted less.

   Import **order** is no longer part of this item. Biome 2.x is in use, confirmed by the top-level `assist` key in `node_modules/@biomejs/biome/configuration_schema.json`, and the repo's pre-existing blocks are consistently sorted, so `organizeImports` is clearly enforced. Every block touched by these slices was re-checked against Biome's case-insensitive natural ordering, where `_` sorts before letters: the eleven-member core import in `operations.ts`, its `osLogs`/`processes`/`systemMonitor`/`operationPresetsOutput` blocks and its module order, the `operationPresetsOutput.ts` core block, the new `DEFAULT_*` entries in `logs.ts` and `monitor.ts`, and the four touched test files. All are in the order Biome will want.
2. **Exact strings computed by hand.** Mostly cleared. Each string was derived by reading the emitter rather than running it, so each was a plausible off-by-one. A later pass re-derived the two largest groups end to end, from the constants through every formatting branch, and both came out matching. That is not the same as running them: it settles the **values against the source logic**, and says nothing about whether the files compile or satisfy Biome. Items 1 and 3 still cover those.

   Cleared by derivation:

   - `saved=9`. The populated fixture in `tests/configPanel.test.ts` holds `routeFilterPresets` 2 and one entry each in `connectionFilterPresets`, `portFilterPresets`, `toolTargetPresets`, `logProfiles`, `logSearchPresets`, `remoteProfiles`, and `operationPresets`, so the `Object.values(shelfCounts).reduce(...)` sum is 2 + 7 = 9, and the ten interpolations in the coverage row appear in the same order the assertion lists them.
   - `empty=8` and the empty-shelf list order. The sparse case spreads `defaultConfig` only, and `operationPresets` is the eighth and last key in the `shelfCounts` literal, so `Object.entries(...)` yields the asserted `routeFilters,…,remotes,operationPresets` order and the count moves 7 to 8. `defaultConfig` does define `operationPresets: []` at `src/config/schema.ts`, which matters more than the count: the builder calls `.length` on it unguarded, so a missing default would have thrown rather than miscounted.
   - The three contract rows, re-derived through `formatOperationPresetFieldContract()` and `formatOperationPresetFieldValue()` rather than compared by eye. The branch order matters and holds: `choices` is tested before `type === "boolean"` and before `maxLength`, so `--level` renders as the joined `all|warn|fail|info`; `--filter` reaches the `maxLength` branch and renders `text<=256`; `--pid` has a `min` but no `max` so it takes the `${min}+` branch, and being the only `required: true` field it is the only token emitted without brackets; `--files` is `boolean` so its value is `undefined` and the token degrades to the bare option. One detail that could plausibly have broken a hand-derivation did not: `MAX_MONITOR_INTERVAL_MS` is written `60_000`, but numeric separators are lexical only, so the interpolation is `60000` and `[--interval=250..60000]` is right.

   - `count=1 total=3`. `findOperationPresetKindContract(" MONITOR ")` normalizes case and surrounding whitespace to a single contract, so `contracts.length` is 1, and `OPERATION_PRESET_KIND_COUNT` is the length of `Object.values()` over the three-key record, so `total` is 3. The neighbouring `not.toContain("picos logs")` also holds: the only rows printed are the header, the count line, the id-pattern line, the single monitor contract row, and the two confirm lines, none of which contain that substring.
   - `002 fail disk offline`. The entry row template is `${String(entry.index).padStart(3, "0")} ${entry.level} ${entry.message}`, and the fixture entry is index 2, level `fail`, message `disk offline`, so the padding gives `002` and the separators are single spaces. The `errors` preset in that test sets no filter, so `filter` normalizes to `""` and only the `level` filter is active, which is what drops the index-1 `info` entry and satisfies the `not.toContain("service ready")` assertion beside it. No other emitted row contains that phrase either; the closest, `note=recent systemd journal entries`, does not.

   With those two, every hand-computed string in these slices has been derived from its emitter. What remains for the gate is compilation and formatting, not arithmetic.

The five-argument `operationsCommand` call sites were also on this list. All three restructured calls in `tests/operationsCommand.test.ts` were re-read after the seams moved out of the options object; the argument counts, braces, and the paren-wrapped object return in `readProcessDetailResult` all balance. The `not.toContain("service ready")` assertion beside them holds under either plausible reading of the level filter, since `info` is excluded whether the filter is an equality check or a severity threshold.
Item 4 was removed rather than triaged. The round-trip test asserted `input as OperationPresetInput`, which is legal only because `OperationPresetInput` is a type alias of an anonymous object type and so gains an implicit index signature; converting it to an `interface` later would silently break the test. It now reads `input as unknown as OperationPresetInput`, which holds regardless.

Two items that were on this list are now resolved without running anything.

- **cac positional parsing for `operations kinds monitor`** is settled directly from `node_modules/cac/dist/index.js`. `runMatchedCommand()` builds the action arguments by walking the command's declared brackets in order and indexing the parsed positionals, then appends the options object:

  ```js
  command.args.forEach((arg, index) => {
  	if (arg.variadic) actionArgs.push(args.slice(index));
  	else actionArgs.push(args[index]);
  });
  actionArgs.push(options);
  ```

  So `operations [action] [id] [kind]` is called as `("kinds", "monitor", undefined, options)`. Two further consequences worth recording: exactly four arguments are passed, so the fifth `seams` parameter always takes its `{}` default in production; and `checkUnusedArgs()` only throws when the positional count *exceeds* the declared three, which is why the explicit `kind !== undefined` guard is doing real work rather than duplicating a library check.
- **`Object.values()` overload resolution** is settled by reading `node_modules/typescript/lib/lib.es2017.object.d.ts`. The first overload is `values<T>(o: { [s: string]: T } | ArrayLike<T>): T[]`, which a `Record` over a string-literal union satisfies through its implicit index signature, giving `OperationPresetKindContract[]`. If it fell through to `values(o: {}): any[]`, the explicit annotation absorbs it. It compiles either way. The neighbouring `Object.entries` overloads back the pre-existing `emptyShelves` code in `configPanel.ts` the same way, so adding an eighth key changes nothing there.

Two known defects were introduced and then found during this work, both in code that compiled and passed the tests as written: a hardcoded `operationPresets: []` in the `App.tsx` shelf argument that would have reported zero forever, and injection seams placed in the cac-populated options object where `--now 5` would have been called as a function. Both are fixed. They are recorded here because they are the class of thing this triage cannot catch, and only running the code can.

## Audit Results

Every construct these slices introduced was checked for existing precedent in the repo, on the theory that an API used nowhere else is an API nobody has verified here.

- `Bun.file(path).exists()` had no precedent and was replaced. The repo checks existence with `existsSync` from `node:fs` in scripts, source, and tests alike, including `tests/releaseWorkflow.test.ts`, so the new test now does the same. This removed both an unverified runtime API and a style inconsistency.
- `toHaveProperty` had no precedent either. It is a standard matcher and almost certainly fine, but it is a test-framework assumption, which is the class that had already caused trouble, so the round-trip assertion was rewritten with `toEqual` against an indexed value. That reads more directly anyway, since the point is the value rather than the property's existence.
- `Array.from({ length: n }, ...)` and the `Exclude<...>` utility type also have no precedent here and were kept deliberately. Both are plain language features rather than runtime or framework APIs, so absence of precedent says nothing about availability.
- `docs/HARNESS.md` was re-checked against the current script, because its checked-behavior list was edited four times as the harness grew and stale gate documentation is worse than none. All nine items still match: the published contract and filtered-kind assertions in item 1, the empty-shelf fields in item 2, the contract-driven save in item 3, the four collector outcomes in items 4 through 7, all six guarded failures named in item 8 against the six loop entries, and the templated removal in item 9. The ten-step `bun run verify` list also still matches `verifySteps` in `scripts/harness.ts`, in order. No drift found.
- Constructs that do have precedent and needed no change: `Object.values` and `Object.entries` in `configPanel.ts`, `toBeTrue`/`toBeFalse` in `tests/cli.test.ts`, `Pick<...>` in `configPanel.ts`, and the `assert.ok`/`assert.deepEqual` style already used by the integration scripts.

Checked while tracing doc claims against code; no change was needed for these, but they are the paths that could have lost saved presets.

- The TUI has exactly one whole-config write, `applyNextConfigPolicyPreset()` in `src/tui/App.tsx`, and it writes `{ ...config, ...preset.values }` from a fresh `readConfig()`, so `operationPresets` survives. `tests/configStore.test.ts` now pins that pattern with a whole-config write test.
- `ConfigWorkspaceResetKey` in `src/tui/configPanel.ts` is a scalar-settings-only union, so the exact-confirm `reset config` flow cannot clear preset arrays.
- Every `setConfig*` store writer reads the current config and overrides one key, so none of them drops presets.
- `picos config` prints presets inside the full JSON, `picos config get operationPresets` passes the array to `console.log` rather than interpolating it, and `picos config set operationPresets` is rejected.
- `runPreset()` called every collector directly, while all three direct commands already accepted injection: `monitorCommand()` takes `snapshot`/`readSnapshot`/`wait`/`now`, `logsCommand()` takes `snapshot`, and `processCommand()` takes four reader functions. So each direct command had deterministic tests and the preset path had only harness coverage, which sleeps for real intervals, spawns `ps`, and tolerates environment-dependent log failures. `runPreset()` now takes the command options and threads `readSnapshot`, `wait`, `now`, `logSnapshot`, `readProcessDetailResult`, and `readProcessFileSnapshotResult` through, mirroring the existing patterns rather than inventing one. `logSnapshot` is named rather than reusing `logsCommand`'s `snapshot` because the seams already carry a monitor snapshot reader. All three branches now have unit tests.
- The seams were first added inside `OperationsCommandOptions` and then moved to a separate `OperationRunSeams` parameter, rather than `monitorCommand()`, which at the time mixed them into its options. An earlier draft of this note said the move followed `processCommand()`. That attribution is wrong and is corrected below: `processCommand()` is its own third shape, and the grouped-object shape actually originates with `operationsCommand()` itself. The move was justified as fixing a reachable bug where `picos operations run x --now 5` would set `options.now = 5` and call it as a function. **That justification was wrong**, and reading `node_modules/cac/dist/index.js` settled it: `runMatchedCommand()` calls `checkUnknownOptions()` before invoking the action, and that method throws `Unknown option` for any flag not registered on the command or globally unless `allowUnknownOptions` is set, which no picos command sets. So the flag is rejected before any handler runs. The separation is still worth keeping, because it makes the seam boundary explicit and does not depend on a library guarantee, but it is defense in depth rather than a fix.
- For the same reason, the `monitorCommand()` and `logsCommand()` seams-in-options arrangement was a style inconsistency rather than a latent defect. It has now been brought into line anyway, since leaving them on the other shape would have made the boundary a coin flip for the next reader. Both grew named `*CommandOptions` and `*CommandSeams` types and a second parameter; `snapshot`, `readSnapshot`, `wait`, and `now` moved off monitor's options, and `snapshot` off logs'. A caller audit first confirmed the only callers are cac's `.action()` registration, which passes one argument, and two test call sites each. A follow-up grep for `options.snapshot`, `options.readSnapshot`, `options.wait`, and `options.now` confirmed no reference to a moved seam survives, including in the two `catch` blocks, which read only genuine options such as `options.samples` and `options.limit`.

  The pattern's scope is the CLI command boundary in `src/cli/commands/`, because that is the only place cac populates the options object. Core functions keep seams in their options legitimately, and `src/core/command.ts` still reads `options.now` and `options.connect` for the TCP check; that is correct and should not be "fixed" to match.

  There were three shapes at that boundary, not two, and `processCommand()` was the outlier rather than the model. It took `pid`, then a **union-typed** `optionsOrReadProcessDetail` that was either the options object or a reader function and was discriminated at runtime by `typeof … === "function"`, then four further reader functions as flat positional parameters. That was a backward-compatibility affordance for callers that passed a function second; cac itself always passes the options object, so the function branch was reachable only from direct callers and tests.

  All four commands now share one shape: the declared positionals, then `options`, then a single grouped seams object. `processCommand()` gained a `ProcessCommandSeams` type and resolves each reader against its default with `??` at the top of the body, which left the rest of the function unchanged. A grep for `optionsOr` now returns nothing.

  What actually keeps cac from clobbering a seams parameter is narrower than "seams go last", and it is worth stating because nothing enforces it. `runMatchedCommand()` pushes exactly one argument per declared bracket and then pushes `options`, so the seams parameter must sit at index *declared brackets + 1*. Each command satisfies this only because of its own bracket count: `monitor` and `logs` declare none, so `options` is first and seams second; `process <pid>` declares one, so `options` is second and the readers start third; `operations [action] [id] [kind]` declares three, so `options` is fourth and seams fifth. Adding a bracket to any of these without shifting the parameters would pass `options` into the seams slot, which is exactly the defect class already found once in this stack, and it would type-check if the seams type's properties are all optional. Changing a command string and its handler signature are therefore a single edit, never two.

  That follow-on is **done**. Collapsing the four flat readers into one object removed four positions where a bracket change could silently misalign, and removed the one place at this boundary where an options object and a seam were interchangeable at runtime.

  Two of the three test call sites simply moved their readers into the seams object. The third existed only to cover the union, asserting that a reader passed in the options position was not mistaken for options; that is now structurally impossible, so rather than delete the case it was repointed at an untested branch, that `readProcessFileSnapshot` is not consulted unless `files` is requested.
- The three new test fixtures were built by copying other test files, so they were checked against the actual declarations rather than against the copies. `OsLogSnapshot` is `OsLogCommand & {...}`, requiring `source`, `command`, `args`, `note`, `status` limited to `"ok" | "warn"`, and `entries`; note that `"fail"` is a valid `OsLogLevel` for an entry but **not** a valid snapshot `status`. `ProcessInspectionSource` requires all eight of `key`, `command`, `args`, `supported`, `success`, `exitCode`, `truncated`, and `totalCount`. `ProcessDetail` extends `ProcessSummary`, so `pid` and `command` are required and the rest are optional. All three fixtures satisfy these exactly, with no excess properties, which matters because they are fresh object literals in contextually typed positions.
- A logs `limit` is applied by the platform command, not after filtering. `buildOsLogCommand()` puts the limit into `log show`/`journalctl`/`Get-EventLog`, so the collector returns the most recent `limit` entries of any severity, and `filterOsLogEntries()` narrows those locally in both `formatLogsJson()` and `formatOsLogRows()`. A preset such as `--limit 5 --level fail` can therefore report zero failures while many exist further back, which is a wrong-conclusion hazard rather than a cosmetic one. The counts were already separated as `totalCount` versus `visibleCount`; only the ordering was undocumented.
- Process presets embed an ephemeral PID, and the ability to detect PID reuse across runs is platform-dependent. `src/core/processes.ts` assigns `started` only in the Windows branch, from `item.CreationDate`; the POSIX `ps` parser populates `elapsed` but leaves `started` undefined. The contract label now names the hazard and the docs record the asymmetry. A stored start-time fingerprint would make reuse detectable everywhere, but it changes the preset schema and needs its own slice.
- Monitor sampling is bounded but not by the number the docs claimed. `assertMonitorSamplingWindow()` caps `(samples - 1) * intervalMs` at `MAX_MONITOR_DURATION_MS`; `collectSystemMonitorSeries()` then adds one `readSnapshot()` per sample, and `getProcessSummaryWithSource()` runs `ps` through `safeExec` with `timeoutMs: 5000` plus a 250 ms termination grace and a 1,000 ms force-kill settle. Worst case for 60 samples is therefore roughly 675,000 ms, not 300,000 ms. The published key was renamed to `maxMonitorIntervalSpanMs` and every doc claiming a fixed wall-clock window was corrected.
- The presets harness isolation holds on all three CI platforms: it overrides `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME`, and `APPDATA`, `os.homedir()` honours `$HOME` on POSIX, and `getConfigPath()` is evaluated per call inside the child process rather than cached at module load.

## Deferred Review Notes

- Resolved: `findOperationPresetKindContract()` had no production caller. It now backs the optional kind positional on `operations kinds`, which also removed the silently ignored extra argument. It normalizes case and surrounding whitespace before lookup.
- The log-level union is declared or enumerated in **five** places, not the two this note originally claimed, and the drift guard covers only one direction. Unifying them touches `types.ts` and the TUI, so it stays out of this slice, but the analysis below should not have to be re-derived.

  The five sites, all currently agreeing on the same four members:

  1. `src/core/osLogs.ts` — `OsLogLevel = "info" | "warn" | "fail"`, composed into `OsLogLevelFilter = "all" | OsLogLevel`.
  2. `src/core/types.ts` — `LogProfile.level` as an inline `"all" | "info" | "warn" | "fail"`.
  3. `src/core/types.ts` — `LogsOperationPreset.level` as a second, independent inline copy of that same union.
  4. `src/core/operationPresets.ts` — `OPERATION_LOG_LEVELS`, which backs both preset validation and the published `logs` contract `choices`.
  5. `src/core/osLogs.ts` — a local `filters` array inside `nextOsLogLevelFilter()`, not exported, duplicating site 4's contents and order.

  Sites 4 and 5 are both `["all", "warn", "fail", "info"]`, so the published contract `--level=all|warn|fail|info` and the TUI cycle order agree today.

  The asymmetry is the part worth knowing. Adding a member to `LogsOperationPreset["level"]` **breaks the build**, because `parseLogsLevel()` in `src/cli/commands/logs.ts` declares `OsLogLevelFilter` as its return type while returning `parseOperationLogLevel()`, so the preset union must stay a subset of the osLogs union. Adding a member to `OsLogLevel` **breaks nothing**: the subset relation still holds, so the new severity would be accepted by `filterOsLogEntries()` and the TUI, rejected by `parseOperationLogLevel()`, and silently missing from the published contract and both cycle arrays. That unguarded direction is the more likely edit, because `OsLogLevel` is the union `OsLogEntry` actually uses.

  Neither array annotation helped: `LogsOperationPreset["level"][]` and `OsLogLevelFilter[]` reject invalid members but never require completeness.

  Site 4 is now fixed, which closes the half of this that the published contract depends on. `OPERATION_LOG_LEVELS` is derived from an `OPERATION_LOG_LEVEL_PRESENCE` record keyed by `LogsOperationPreset["level"]`, mirroring the `Record`-plus-derivation shape already used for the preset kind catalog, so adding a level to that union now stops compiling until the record lists it. The runtime value and its order are unchanged, since `Object.keys()` preserves the literal's insertion order, so the published `choices`, the `find()` in `parseOperationLogLevel()`, and every existing assertion see exactly `["all", "warn", "fail", "info"]` as before.

  Sites 1, 2, 3, and 5 are now fixed too, so the unguarded direction is closed. `types.ts` is the lowest layer, importing only from `node:os` and holding no runtime values, while `osLogs.ts` already imported from it, so the canonical `OsLogLevel` and `OsLogLevelFilter` were moved into `types.ts` and `osLogs.ts` re-exports them. That direction was forced: declaring them in `osLogs.ts` and importing into `types.ts` would have created a cycle. Re-exporting keeps all four external consumers, `App.tsx`, `operationsOutput.ts`, `logs.ts`, and `tests/osLogs.test.ts`, importing the types from the module that owns the collectors, so none of them changed. The two inline copies in `LogProfile` and `LogsOperationPreset` now reference `OsLogLevelFilter`, and the local array in `nextOsLogLevelFilter()` became a module-level `OS_LOG_LEVEL_FILTER_PRESENCE` record with a derived cycle array.

  The guarantee was verified rather than assumed. Temporarily adding `"debug"` to `OsLogLevel` produces exactly two compile errors, one per record:

  ```text
  src/core/operationPresets.ts(28,7): error TS2741: Property 'debug' is missing ...
  src/core/osLogs.ts(142,7): error TS2741: Property 'debug' is missing ...
  ```

  Before this work the same edit produced **zero** errors. The two records are deliberately left as two rather than merged into one ordered list: they encode different orders for different purposes, the published CLI `choices` and the keyboard cycle, and each is independently exhaustive, so neither can silently omit a member.

  One further enumeration turned up while fixing site 4: `parseOperationLogLevel()` spelled its members out in prose as `"Invalid OS log level; expected all, warn, fail, or info"`, with `INVALID_OPERATION_PRESET_KIND_MESSAGE` doing the same for kinds.

  Both are now derived. A `formatExpectedList()` helper renders a member list as `a, b, or c`, and the two validators build their messages from `OPERATION_LOG_LEVELS` and from a new `OPERATION_PRESET_KINDS` derived off the contract catalog. Both outputs are byte-identical to the literals they replace, which matters because tests assert them verbatim: four levels give `all, warn, fail, or info` and three kinds give `monitor, logs, or process`.

  Two ordering details are load-bearing. `OPERATION_PRESET_KINDS` reads `OPERATION_PRESET_KIND_CONTRACTS`, so it is declared after it; putting it where the old message const sat, above the catalog, would have been a temporal dead zone at module load rather than a type error. `formatExpectedList()` is a function declaration and so is hoisted, and both call sites are inside function bodies evaluated at call time, so its textual position is free. The old message const was removed rather than left unused, and it had exactly one reference.
- Field `name` and `option` values are compile-time literals and are not passed through `sanitizeLocalInspectorText()`; only `label` is. Revisit if any contract text ever becomes dynamic.
- The round-trip test is sound but `ROADMAP.md` attributed its strength to the wrong mechanism, and the corrected wording is worth keeping straight because the two mechanisms protect against different mistakes.

  The test sets `input[field.name] = field.min ?? field.default` for each published field, constructs the preset, then asserts `expect(created[field.name]).toEqual(input[field.name])`. Rename protection comes from that lookup rather than from the `min` preference: if a published `field.name` no longer matches the key the constructor returns, `created[field.name]` is `undefined` while `input[field.name]` holds the probe, so it fails. That covers all seven fields, and no field can be skipped by the `if (value !== null)` guard, because only `pid` has a `null` default and it also has a `min`.

  Preferring `min` over `default` guards a different and weaker failure: a parser that ignores its argument and returns the default regardless. That is only detectable where the probe value differs from the default, which today is `intervalMs` at 250 against a default of 1000, `limit` at 1 against 50, and `pid` at 1 against a required `null`. It is defeated for `samples`, whose `min` and `default` are both 1, and for `level`, `filter`, and `files`, which have no `min` at all, so their probe *is* the default. Four of seven fields therefore would not catch that class of break.

  This is now **implemented**. A `probeValue()` helper replaces `field.min ?? field.default` and picks per field type: a choice that differs from the default, the opposite boolean, a non-empty string for text, and for integers the `min` when it differs from the default or `min + 1` when it does not. All seven fields are now probed with a value the constructor cannot reach by defaulting.

  Two choices in it are deliberate. `samples` steps to 2 rather than jumping to its `max` of 60, because `max` combined with the `intervalMs` probe of 250 would put `(samples - 1) * intervalMs` at 14,750 and couple this test to the interval-span cap; at 2 the product is 250 against a 300,000 cap. And the helper is typed with `ReturnType<typeof listOperationPresetKindContracts>[number]["fields"][number]` rather than by importing `OperationPresetFieldContract`, to avoid adding a member to an import block whose ordering Biome enforces.

  The `if (value !== null)` guard around the assignment is now unreachable, since no branch returns `null`, and was kept as a cheap guard against a future field shape rather than removed.

- `docs/LOCAL_AUTOMATION.md` also claimed that re-saving an existing id "replaces it in place without evicting anything". The eviction half is right; the placement half is wrong, and it contradicted the newest-first rule stated four bullets earlier in the same document. `saveOperationPreset()` returns `normalizeOperationPresets([preset, ...presets.filter(c => c.id !== preset.id)])`, so the replacement is **prepended** and the prior entry is dropped, making the re-saved preset the newest and changing `data.presets` order. Nothing is evicted because the length is unchanged: one entry is filtered out before one is added, so the twelve-entry truncation in `normalizeOperationPresets()` never triggers. The corrected prose also records the consequence, that re-saving refreshes recency and therefore changes which preset a later save drops, and warns against correlating by position instead of id.

  Two neighbouring claims in the same bullet list were checked at the same time and are accurate. The monitor run shapes are exactly as documented: the `samples === 1` branch emits `stringifyLocalInspectorCompleted("monitor", …)` with `operation: "snapshot"`, and the series branch emits the same envelope with `operation: "sample"` plus `samples: series.requestedCount`. Both carry `presetId: options.presetId ?? null`, so the documented claim that `run` returns the underlying inspector's own document with `command` of `monitor` rather than `operations`, plus `request.presetId` for correlation, holds.

- `docs/LOCAL_AUTOMATION.md` claimed that on a `kinds` failure `request.kind` "echoes the rejected input rather than a catalog value". That is true for one of the two failures and backwards for the other, and it has been corrected. The catch block sets `kind: action === "kinds" ? idInput : kind`, so `kinds bogus` reports `bogus`, the rejected input, but `kinds monitor extra` reports `monitor`, which is precisely a catalog value, while the surplus `extra` never reaches the document and shows up only in the error message. The code is defensible as written, since `request.kind` means the kind parsed from that slot rather than the offending token, so only the prose changed.

  Worth noting how this survived: the harness exercises both failures and did not catch it, because the loop asserted only `exitCode`, an empty `stderr`, `status`, and `error.code`, and never read `request` on a failure path.

  That blind spot is now closed. The loop asserts `document.request?.operation` against `args[1]`, the action positional in all seven cases and what the catch block echoes, and the argument list became a table pairing each case with a substring of the message its own guard produces:

  | case | asserted substring | guard |
  | --- | --- | --- |
  | `save blocked --confirm wrong` | `pass --confirm "save operation preset blocked"` | `assertExactConfirmation()` |
  | `save too-long --samples 60 --interval 60000` | `exceeds 300000 milliseconds` | `assertMonitorSamplingWindow()` |
  | `run missing` | `Operation preset not found: missing` | `requirePreset()` |
  | `sample` | `Unknown operations action` | action dispatch |
  | `kinds bogus` | `expected monitor, logs, or process` | `parseOperationPresetKind()` |
  | `kinds monitor extra` | `Unexpected argument after kind` | the surplus-positional guard |
  | `save UPPER --confirm …UPPER` | `pass --confirm "save operation preset upper"` | `assertExactConfirmation()`, on the normalized id |
  | `save .leading-dot` | `Invalid operation preset id` | `parseOperationPresetId()` |

  Two of these are load-bearing beyond their own case. The `upper` substring is the whole point of that case, since the supplied phrase spells the id in upper case and only the normalized form appears in the expected phrase. And the `expected monitor, logs, or process` substring now also guards the derived message described above, so if `formatExpectedList()` ever stops reproducing the trailing `or`, the harness fails rather than only the unit test.

  The table then gained optional `requestKind` and `requestPresetId` columns, asserted only where set, because a uniform assertion is impossible: the unknown-action case supplies no id, so `presetId` is `undefined` and the key is absent from its serialized document. Both `kinds` cases set them, which is what locks in the corrected documentation claim above. `kinds bogus` pins `kind: "bogus"`, the rejected input, and the newly added `kinds monitor extra` pins `kind: "monitor"`, the kind accepted before the surplus token. That distinction was wrong in prose for two revisions and had no coverage at all; now the difference between the two is asserted rather than described.

  `requestPresetId` is now set on every case except the unknown-action one, and filling it in surfaced a consumer-visible detail that no document stated. The catch block echoes `presetId: action === "kinds" ? null : idInput`, and `idInput` is the raw positional, so a failed `save UPPER` reports `presetId: "UPPER"` while its own error message quotes the normalized `upper`, because that is the spelling the confirmation phrase has to match. The two spellings therefore appear in the same document for different reasons. That case now pins `"UPPER"` deliberately, and `docs/LOCAL_AUTOMATION.md` states the split so a consumer correlating a failure by `presetId` knows to use the id it sent rather than the one in the message.

  Adding `kinds monitor extra` needed one thing checked first: it supplies exactly three positionals against the three declared brackets in `operations [action] [id] [kind]`, so `checkUnusedArgs()` does not fire and the request reaches the application guard, which is the behaviour being tested. A fourth positional would have been rejected by cac instead and would have tested the library rather than picos.

  Switching the table from an `as const` array to an explicitly typed `failureCases` const was necessary rather than cosmetic: with `as const`, destructuring a property that only some members declare is a type error, so optional columns require either a declared element type or a placeholder on every row.

  This is possible because the failure document carries the message: `formatLocalInspectorJsonFailure()` sets `error.message` through `sanitizeText()`, and `AutomationDocument` types it as `string | undefined`, so `document.error?.message?.includes(…)` typechecks without a cast.

- `parseOperationPresetId()` throws a message that nothing asserts, and its throw path is exercised by no test and no harness case. The string `Invalid operation preset id` appears only at its own definition. The six harness failures are, in loop order: a wrong `--confirm` phrase, a monitor sampling window over the cap, `run` against a missing id, an unknown `sample` action, `kinds bogus`, and `save UPPER` with an unnormalized confirmation phrase. The last of those looks like an id test but is not: `UPPER` normalizes to `upper`, so the expected phrase becomes `save operation preset upper` and the supplied phrase mismatches, meaning it lands on the confirmation guard. The second is likewise named `too-long` for its sampling window, not its id, which is a valid eight characters.

  To reach the guard you need an id that is empty, longer than `MAX_OPERATION_PRESET_ID_LENGTH`, or fails `OPERATION_PRESET_ID_REGEX` after trimming and lowercasing, such as one with a leading dot or an interior space. The existing `"unsafe id"` fixture in `tests/operationPresets.test.ts` covers `normalizeOperationPresets()` dropping such an entry, which is a different path from this throw.

  The ordering question this raised is now settled by reading rather than running, so a seventh case is safe to write. `parseOperationPresetId(input.id)` is the first statement of `createOperationPreset()`, and the `save` branch calls `createOperationPreset()` before `assertExactConfirmation()`, which it must, because the expected phrase is built from the already-normalized `preset.id`. The validation order is therefore id, then kind, then the per-kind fields, then the confirmation. An invalid id throws before `--confirm` is examined at all, so the new case lands on the intended guard whatever phrase is passed.

  That order also pins down exactly where each existing case fails, which is worth recording because the loop asserts only the generic failure envelope and never the message, so a case that failed for the wrong reason would still pass. Case 1, `save blocked --confirm wrong`, clears id, kind, and a default sampling window of zero, then fails the confirmation. Case 2 clears id and kind, then fails `assertMonitorSamplingWindow(60, 60000)` at 3,540,000 ms against the 300,000 ms cap, never reaching its confirmation. Case 6, `save UPPER`, has a **valid** id, since trimming and lowercasing yield `upper`, which the regex accepts; it fails the confirmation because the expected phrase uses the normalized form.

  This is now **implemented** as a seventh loop entry, together with the two strings that had to move with it, the `7 guarded failures` completion message and item 8 of `docs/HARNESS.md`:

  ```ts
  [
  	"operations",
  	"save",
  	".leading-dot",
  	"monitor",
  	"--confirm",
  	"save operation preset .leading-dot",
  	"--json",
  ],
  ```

  A leading dot fails the regex's `^[a-z0-9]` anchor while still parsing as a positional rather than a flag. It was preferred over an empty string, which could be confused with an argument-parsing failure, and over an over-length id, which would need updating if the bound moves. The loop's existing generic assertions cover it without change, since an id rejection is thrown inside the same `try` and produces the same `PICOS_LOCAL_INSPECTOR_FAILED` envelope as the other six.

- While applying the 80-column check, the error message in that same validator was found hardcoding its own bound as `1-32` while the three neighbouring validators interpolate theirs. It now reads `1-${MAX_OPERATION_PRESET_ID_LENGTH}`. The rendered text is byte-identical today, so nothing can break, and it brings the message in line with the principle this slice already applied to `OPERATION_PRESET_ID_PATTERN`: a published string should not be able to disagree with the code that enforces it.

- The "multi-line ternaries in the failure-echo split" that an earlier draft of triage item 1 listed were searched for and are not there. No end-of-line ternary appears in `scripts/automationPresetsIntegration.ts` or anywhere under `src/cli/`. The item was an inaccurate description rather than a real spot, and it is recorded here rather than silently dropped so that nobody goes looking for it again.

- The `kinds` action overloads the positional slots, and the local variable names end up inverted relative to what they hold. `operationsCommand(action, idInput, kind, options, seams)` matches the shared `operations [action] [id] [kind]` bracket list, so `picos operations kinds monitor` arrives as `("kinds", "monitor", undefined, options)`. The kind filter therefore lands in **`idInput`**, which is what `printPresetKindContracts(json, idInput)` passes into a parameter named `kindInput`, while the variable actually named `kind` holds only the surplus third positional and exists to be rejected. The behaviour is right and the user-facing message is right too, since for `picos operations kinds monitor extra` the rejected token really does come after the kind. But a future edit that reaches for the variable named `kind` expecting the kind filter would silently read the wrong slot, and no type error would follow because both are `string | undefined`. If the third positional is ever given a real meaning for another action, rename these at the same time.
