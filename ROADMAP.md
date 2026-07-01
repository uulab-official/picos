# picos Roadmap

## v0.4.176 - Status Copy Intent Audit Jump Shelf Summary

Status: draft PR [#238](https://github.com/uulab-official/picos/pull/238) on `codex/picos-v0.4.176-result-audit-jump-shelf-summary`.

Goal: keep reusable result audit jumps visible inside the Status copy-intent shelf even when the result pane is not the operator's focus.

- Status Activity copy-intent shelves now show `audit jumps count=<n> latest=<preview> lines=<n>` when reusable result audit jumps exist.
- The shelf summary reuses the same latest jump and filtered count as Status result rows, so unrelated copy intents do not inflate the count.
- Empty copy-intent shelves can still display the audit-jump summary before the `no Status activity copy intents yet` row.
- Tests cover the shelf summary with an empty history to prove the reusable jump context remains visible.
- Next: make the shelf summary actionable by letting `I` replay the latest result audit jump when the result history cursor is not on a jump-capable row.

## v0.4.175 - Status Result Audit Jump Counter

Status: draft PR [#237](https://github.com/uulab-official/picos/pull/237) on `codex/picos-v0.4.175-result-audit-jump-counter`.

Goal: make repeated Status result-row audit jumps easier to scan in compact Status result rows.

- Status Activity result rows now append `count=<n>` to the `audit jump intent=` hint when more than one reusable result audit jump exists.
- Selected result-history rows show the same counter so `u`/`i` review keeps the latest jump context visible.
- The count is derived only from `status activity result audit jump ...` copy intents, leaving unrelated copy intents out of the counter.
- Single-jump previews keep the existing compact row without a redundant count.
- Tests cover result rows, selected history rows, and filtered audit-jump intent counting.
- Next: add a copy-intent shelf summary row for result audit jumps so the count is visible even when no Status result is selected.

## v0.2.0 - OS Inventory and Network Tools

Status: complete on `codex/picos-v0.1-scaffold`.

- Full-screen terminal OS shell.
- System, hardware, storage, process, network, action, status, and log panels.
- `picos info --full`.
- Safe `ping` options.
- Safe TCP connect check via `picos connect <host> <port>`.
- Read-only action model with write/destructive actions locked.
- Agent docs and verification harness.

## v0.2.1 - Console Polish

Goal: make the current TUI feel denser, cleaner, and more OS-like.

- Improve panel spacing and truncation.
- Add richer status badges for permission, network, and command state.
- Add clearer Network Tools action previews.
- Improve small-terminal sidebar window behavior.
- Keep all write/destructive actions locked.

## v0.2.2 - lazyifconfig Tools and Routes Parity

Status: draft PR #17.

Goal: implement the lazyifconfig feature set in picos, starting with read-only Tools Hub and Route Inspector.

- `picos tools dns <target>`.
- `picos tools whois <target>`.
- `picos tools ip-info <ip>`.
- `picos tools port-check <host> <port>`.
- `picos tools tls <host:port>`.
- `picos tools ping <host>`.
- `picos tools traceroute <host>`.
- `picos routes` with parsed route summary and diagnostics.
- `picos route <destination>` destination path lookup.
- `picos connections` active endpoint parser and raw output.
- `picos ports` listening port parser and raw output.
- TUI Connections and Ports panels backed by live OS data.
- Next: route detail TUI, raw output viewer workspace, and richer process attribution.

## v0.3.0 - DOS/File Manager, Editor, and Dialogs

Status: draft PR #17.

Goal: add the first local filesystem console that is useful in daily work.

- Files workspace.
- Safe read-only commands: `pwd`, `dir`, `ls`, `type`, `cat`.
- System-wide file entry points: root, home, workspace, temp, and Windows system drive.
- Absolute path and `~` support in file commands.
- Planned safe navigation command: `cd` inside the TUI file workspace.
- Text/Markdown viewer.
- TUI editor buffer with dirty state.
- Confirm, input, error, progress, and command palette dialogs.
- Save behind explicit confirmation.
- Delete/move/copy remain locked until preview and confirmation are implemented.

## v0.3.1 - Keyboard File Navigation

Status: draft PR #2.

Goal: make the Files workspace usable as a keyboard-driven local file manager.

- Files child focus entered with `enter`.
- `j/k` entry selection inside Files.
- `enter` opens directories or previews files.
- `u` moves to the parent directory.
- `h`/`esc` returns to workspace navigation.
- Permission and missing-file failures are reported in the event log.
- Next: path input dialog, copy/move/delete previews, and editor dirty-state controls.

## v0.3.2 - File Location Jumps

Status: draft PR #3.

Goal: make the Files workspace feel more like an OS file panel with quick system entry points.

- `g` cycles through root, home, workspace, temp, and drive locations.
- The active quick location is highlighted in the Files panel.
- Location jumps reuse the same safe local provider boundary as normal file listing.
- Failed jumps are reported in the event log.
- Next: direct path input dialog and location selection by number.

## v0.3.3 - Path Command Line

Status: draft PR #4.

Goal: add the first DOS-like command prompt inside the Files workspace.

- `:` opens a path input line while Files focus is active.
- Typed paths support the same local provider rules as CLI file commands, including absolute paths and `~`.
- `enter` submits and lists the target directory.
- `esc` cancels the prompt.
- `backspace` edits the buffer.
- Failed path jumps are reported in the event log.
- Next: location selection by number and command palette dialog.

## v0.3.4 - Numbered Location Shortcuts

Status: draft PR #5.

Goal: make the Files workspace faster to operate from the keyboard.

- Files focus maps `1-9` to visible system locations.
- Numbered quick locations are shown in compact and full Files layouts.
- Number shortcuts override global workspace shortcuts only while Files child focus is active.
- Failed jumps are reported in the event log.
- Next: command palette dialog and SFTP-like remote profile stubs.

## v0.3.5 - SFTP-like Remote Files

Status: draft PR #6.

Goal: add remote file browsing through the same provider model as local files.

- `FileProvider` abstraction with `local` and `sftp` kinds.
- SFTP profiles with host, port, username, key path, and root.
- Safe config normalization that drops unsupported secret fields.
- `picos remotes` profile listing without opening a network session.
- Remote list/read first.
- Remote write behind visible host/path confirmation.
- No password persistence.

## v0.3.6 - Remote Provider Boundary

Status: draft PR #7.

Goal: connect remote profiles to the same file-provider shape as local files before enabling live SFTP.

- Shared `createFileProvider()` factory for local and SFTP provider kinds.
- Locked SFTP provider placeholder with explicit adapter-pending errors.
- Remote write attempts remain blocked behind host/path confirmation.
- `picos remote <id>` shows provider boundary status without opening a network session.
- Next: read-only SFTP adapter selection and dependency evaluation.

## v0.3.7 - Remotes Workspace

Status: draft PR #8.

Goal: make remote file planning visible in the default TUI.

- Remotes workspace appears next to Files in the sidebar.
- `3` opens Remotes from global workspace shortcuts.
- TUI lists configured SFTP-style profiles without opening network sessions.
- Provider status makes local ready / SFTP pending / writes locked visible.
- Next: command palette dialog and read-only SFTP adapter selection.

## v0.3.8 - Command Palette

Status: draft PR #9.

Goal: make actions discoverable from anywhere in the TUI.

- `?` and `/` open the command palette.
- `j/k` moves through actions inside the palette.
- `enter` runs the selected read action or reports locked actions through the existing policy path.
- `esc` or `q` closes the palette.
- Palette rows show ready/locked and read/write/destructive risk.
- Next: command palette filtering and read-only SFTP adapter selection.

## v0.3.9 - Command Palette Filtering

Status: draft PR #10.

Goal: make the command palette fast enough to feel like an OS launcher.

- Typing inside the command palette filters commands.
- Filtering matches command id, title, description, category, risk, and privilege.
- Backspace edits the active query.
- Selection resets when the query changes.
- Palette header shows filtered count versus total command count.
- Next: read-only SFTP adapter selection and remote file browsing boundary.

## v0.3.10 - Remote File Context

Status: draft PR #11.

Goal: let users select a remote profile in the TUI without opening a network session.

- Remotes workspace supports child focus with `enter`, `j/k`, `h`, and `esc`.
- `enter` on a selected remote profile stages a locked remote file context.
- Files workspace shows the selected remote context, adapter-pending status, and write lock.
- Core remote context uses the shared SFTP placeholder provider and does not connect.
- Next: live read-only SFTP adapter behind explicit host review.

## v0.3.11 - File Navigation Basics

Status: draft PR #12.

Goal: make Files navigation feel like a real terminal file manager instead of a static listing.

- Directory views include a `..` parent entry outside filesystem root.
- Path input resolves `.` and `..` relative to the current file root.
- `b` returns to the previous file location.
- File focus help text exposes parent/back controls.
- Next: file operations dialog shell for copy/move/delete previews while writes remain locked.

## v0.3.12 - File Filter

Status: draft PR #13.

Goal: make large directories and developer workspaces scannable from the keyboard.

- `f` opens a filter prompt while Files focus is active.
- Typing filters visible entries by name, path, or type.
- The parent `..` entry stays visible while filtering.
- `enter` applies the current filter without clearing it.
- `esc` clears the filter and returns to the full directory listing.
- Filter match counts are visible in compact and full Files layouts.
- Next: file operations dialog shell for copy/move/delete previews while writes remain locked.

## v0.3.13 - File Operation Dialogs

Status: draft PR #14.

Goal: make future file mutation visible and reviewable before any OS write path exists.

- Files focus maps `c` to copy preview, `m` to move preview, and `x` to delete preview.
- Operation previews show selected path, target expectation, risk, privilege, and confirmation phrase.
- Copy, move, and delete remain non-executable and locked by policy.
- `enter` on an operation preview reports the lock instead of mutating the filesystem.
- `esc` or `q` closes the preview dialog.
- Action Center now includes locked `files.copy` and `files.move` entries.
- Next: destination input for copy/move preview and editor dirty-state save dialog.

## v0.3.14 - Interface Network Groups

Status: draft PR #15.

Goal: close the first visible lazyifconfig interface/network gap inside picos.

- Interface summaries now infer kind: Wi-Fi/Ethernet, loopback, VPN, bridge, container, link-local, or unknown.
- IPv4/IPv6 CIDR prefixes and netmask are retained in the core network summary.
- Network groups classify addresses as LAN, loopback, VPN, container, link-local, public, or unassigned.
- `picos info --full` prints network groups and detailed interface rows.
- TUI Network shows grouped networks and interface CIDR rows.
- TUI Interfaces shows kind, status, CIDR, MAC, netmask, gateway, and DNS.
- Next: platform MTU/RX/TX counter parsers and route/raw-output detail panes.

## v0.3.15 - Interface Traffic Counters

Status: draft PR #16.

Goal: make the Interfaces and Network panels closer to lazyifconfig by showing live adapter shape and traffic counters where the host OS exposes them.

- macOS adapter parses `netstat -ibn` MTU, RX bytes, TX bytes, RX packets, and TX packets.
- Linux adapter parses `ip -s link` MTU, RX bytes, TX bytes, RX packets, and TX packets.
- Windows adapter parses PowerShell adapter statistics, with JSON and table-output fallback support.
- `NetworkSummary` merges platform counters into each interface summary.
- `picos info` and `picos info --full` print MTU/RX/TX per interface.
- TUI Network and Interfaces workspaces expose MTU and traffic counters in compact rows.
- Next: route/raw-output detail panes, sortable interface rows, and richer process attribution for ports/connections.

## v0.3.16 - Routes Raw Output Workspace

Status: draft PR #19.

Goal: make the Routes workspace useful as an OS console panel instead of a staged placeholder.

- Routes workspace renders live route table diagnostics from `picos routes` core data.
- Route rows show destination, gateway, interface, and address family in a dense terminal table.
- Raw command output is visible in the same workspace so users can inspect the platform source data.
- `routes.inspect` action refreshes route data and reports the route count in the event dock.
- Next: destination path lookup UI, sortable route rows, and raw output tabs for ports/connections/tools.

## v0.3.17 - Route Path Lookup UI

Status: draft PR #18.

Goal: let the Routes workspace answer "which gateway/interface/source will this destination use?" without leaving the TUI.

- Routes workspace accepts `:` input for a destination host or IP.
- `routes.path` action opens the same destination prompt from Actions or the command palette.
- Route path results show destination, gateway, interface, source IP, and raw path output.
- Route path formatting is covered by focused tests.
- Next: sortable route rows, VPN route hints, and raw output tabs for ports/connections/tools.

## v0.3.18 - Release Readiness And Version Policy

Status: draft PR #19.

Goal: make external distribution decisions explicit before the first public npm publish.

- Package metadata includes public scoped publish settings and package file allowlist.
- Release readiness core checks keep `package.json` and runtime `VERSION` synchronized.
- `bun run release:check` builds, validates release metadata, and runs `npm pack --dry-run`.
- `docs/RELEASE.md` documents npm publish vs GitHub Release, version rules, and the release checklist.
- Next: GitHub release workflow automation after the stacked v0.3 PRs are merged.

## v0.3.19 - Release Automation Guardrails

Status: draft PR #20.

Goal: move release readiness from local-only checks into CI and add a safe manual publish path.

- CI runs `bun run release:check` in a dedicated release readiness job.
- Manual `Release` workflow runs verify, release check, and npm publish only when `dry_run` is disabled.
- npm publish requires `NPM_TOKEN`; dry-run remains the default.
- Workflow safety is covered by tests that assert CI and release workflow guardrails.
- Next: version bump helper and tag/release note generation after the v0.3 stack is merged.

## v0.3.20 - Version Bump Helper

Status: draft PR #21.

Goal: make version changes explicit and synchronized before the first npm publish.

- Versioning core validates semver, computes next patch/minor/major versions, and plans synchronized updates.
- `bun run version:plan <version>` and `bun run version:next <patch|minor|major>` provide dry-run release planning.
- `bun run version:set <version> --write` updates both `package.json` and `src/core/version.ts`.
- Release docs and README describe the version helper flow.
- Next: tag/release note helper after v0.3 stack merge.

## v0.3.21 - Release Notes Helper

Status: draft PR #22.

Goal: make GitHub Release notes consistent without publishing anything automatically.

- Release notes core extracts the `[Unreleased]` changelog section and validates release tag names.
- `bun run release:notes <version>` prints a GitHub Release draft with tag and verification checklist.
- Release docs and README include the release notes helper in the release flow.
- Next: changelog finalize helper after the v0.3 stack is merged.

## v0.3.22 - Changelog Finalize Helper

Status: draft PR #23.

Goal: make the last manual changelog step explicit and reversible before a public release.

- Changelog core moves `[Unreleased]` entries into `## [version] - date`.
- The helper leaves a fresh `[Unreleased]` section for the next development cycle.
- `bun run release:changelog <version> <date>` previews the changelog move without writing.
- `bun run release:changelog <version> <date> --write` updates `CHANGELOG.md`.
- Release docs make the order explicit: draft release notes first, then finalize the changelog.
- Next: tag and GitHub Release creation helper after the v0.3 stack is merged.

## v0.3.23 - Release Command Planner

Status: draft PR #24.

Goal: make the final release steps reviewable before any tag, GitHub Release, or npm publish is created.

- Release command core validates target version, runtime version, package version, and finalized changelog state.
- `bun run release:commands <version>` prints manual git tag and GitHub Release commands.
- `bun run release:commands <version> --publish` includes the npm publish command after the same blockers pass.
- The helper never creates tags, GitHub Releases, or npm publishes.
- Release docs and README include the command planner in the public release flow.
- Next: return to lazyifconfig parity with sortable route/interface rows and raw-output viewers.

## v0.3.24 - Sortable Network Rows

Status: draft PR #25.

Goal: make dense route and interface tables easier to scan like a daily terminal console.

- Route core supports stable row sorting by default priority, destination, gateway, interface, family, or metric.
- `picos routes --sort <key>` and `picos routes --sort=-metric` expose route sorting from CLI.
- Routes workspace supports `s` to cycle route sort state from the keyboard.
- Route workspace rows show the active sort context.
- Interface summaries use a stable console-friendly order: physical, VPN, bridge, container, link-local, loopback, then unknown.
- Next: raw-output viewer tabs for ports, connections, tools, and platform route details.

## v0.3.25 - Endpoint Raw Output Viewer

Status: draft PR #26.

Goal: make Connections and Ports feel like inspectable OS panels instead of parsed-only summaries.

- TUI Connections keeps the full `netstat` command result alongside parsed endpoint rows.
- TUI Ports keeps the full `lsof` / `ss` / `netstat` command result alongside parsed listening-port rows.
- Shared endpoint panel formatters render summary, parsed rows, and clipped raw source output.
- Refresh and action execution preserve raw output state for the visible workspaces.
- Next: sorting/filtering/detail panes for Connections and Ports, then safe copy actions.

## v0.3.26 - Endpoint Filter And Sort

Status: draft PR #27.

Goal: make Connections and Ports scannable when real systems have hundreds of endpoints.

- Connection core supports stable filtering and sorting by protocol, local address, local port, remote address, remote port, state, or PID.
- Port core supports stable filtering and sorting by protocol, address, port, process, PID, or user.
- `picos connections --filter <query> --sort <key>` exposes endpoint filtering and sorting from CLI.
- `picos ports --filter <query> --sort <key>` exposes listening-port filtering and sorting from CLI.
- Connections and Ports workspaces support `s` to cycle endpoint sort state from the keyboard.
- Endpoint workspace summaries show filtered counts and active sort context.
- Next: endpoint detail panes, safe copy actions, and process attribution improvements.

## v0.3.27 - Endpoint Detail And Copy Preview

Status: draft PR #28.

Goal: make Connections and Ports workspaces inspectable without leaving the keyboard console.

- Connections workspace supports `j/k` selection across sorted endpoint rows.
- Ports workspace supports `j/k` selection across sorted listening-port rows.
- Selected connection rows show local endpoint, remote endpoint, state, PID, and row position details.
- Selected port rows show listen endpoint, process, PID, user, and row position details.
- `c` opens a safe copy preview for the selected endpoint without mutating OS state or writing clipboard data.
- Next: endpoint detail panes with process enrichment and optional explicit clipboard integration behind confirmation.

## v0.3.28 - Endpoint Process Enrichment

Status: draft PR #29.

Goal: make selected endpoints explain which local process owns them when PID data is available.

- Connections detail rows match endpoint PIDs against the current process inventory.
- Ports detail rows match listening-port PIDs against the current process inventory.
- Matched process snapshots show command, CPU, and memory usage in the endpoint detail area.
- TUI Connections and Ports pass the live system inventory process list into endpoint detail formatting.
- Next: deeper process detail commands, cwd/user/session enrichment, and confirmed clipboard integration.

## v0.3.29 - Process Detail Inspector

Status: draft PR #30.

Goal: let endpoint PID hints drill into a read-only process detail command.

- `picos process <pid>` validates PID input before building OS commands.
- POSIX process detail uses `ps -p` with parent PID, user, state, CPU, memory, elapsed time, and command.
- Windows process detail uses PowerShell CIM process lookup with JSON parsing.
- Endpoint detail rows now show `inspect picos process <pid>` when a process snapshot is matched.
- Action Center exposes `process.inspect` as a read-only system action with a CLI hint.
- Next: cwd/open-file enrichment and TUI command handoff from selected endpoint rows.

## v0.3.30 - Process File Snapshot

Status: draft PR #31.

Goal: make process drill-down useful for filesystem-oriented debugging.

- `picos process <pid> --files` requests an optional cwd/open-file snapshot.
- POSIX file snapshots use `lsof -a -p <pid> -Fn -w` through `safeExec()`.
- Process file parsing extracts cwd, de-duplicates open paths, and limits displayed entries.
- Windows returns a graceful unavailable file snapshot until a safe adapter exists.
- Next: TUI handoff from selected endpoint rows and richer file-type labels.

## v0.3.31 - Endpoint Process Handoff

Status: draft PR #32.

Goal: make endpoint panels drill into process details without leaving the TUI.

- Connections rows can create a selected PID handoff request for `picos process <pid> --files`.
- Ports rows can create a selected PID handoff request for `picos process <pid> --files`.
- `enter` on selected Connections or Ports rows loads process detail and file snapshot into the Processes workspace.
- Processes workspace shows snapshot rows, selected process detail, cwd, and open files using shared formatters.
- Next: direct TUI command preview/confirm for clipboard and richer open-file labels.

## v0.3.32 - Process File Handoff

Status: draft PR #33.

Goal: make process drill-down continue into local file navigation like a tiny OS console.

- lsof process file snapshots preserve descriptor labels such as `txt`, `mem`, and fd numbers.
- `picos process <pid> --files` shows labeled open-file rows instead of anonymous paths.
- Processes workspace renders selectable cwd/open-file rows with descriptor labels.
- `j/k` selects process files and `enter` opens local cwd paths in Files or local files in Editor.
- Next: confirmed copy-to-clipboard previews and richer non-file resource labels for sockets/pipes.

## v0.3.33 - Process Resource Labels

Status: draft PR #34.

Goal: make process resource inspection distinguish files from sockets, pipes, and unix handles.

- lsof process entries are classified as `file`, `socket`, `pipe`, `unix`, or `unknown`.
- TCP/UDP/IPv4/IPv6 entries render as socket resources instead of generic fd paths.
- `pipe` and `unix` entries stay selectable in Processes without trying to open them as files.
- Selecting a non-file process resource with `enter` logs an inspectable summary instead of a vague path error.
- Next: confirmed copy-to-clipboard for selected endpoint/process resource summaries.

## v0.3.34 - Clipboard Preview Model

Status: draft PR #35.

Goal: make selected endpoint and process resource summaries copy-ready without silently mutating the clipboard.

- Shared clipboard preview model records source, label, copy text, confirmation phrase, and locked state.
- Connections and Ports copy preview rows now use the shared confirmation model.
- Processes workspace supports `c` for selected cwd/file/socket/pipe/unix resource clipboard previews.
- Clipboard writes remain locked until explicit confirmation plumbing is implemented.
- Next: platform clipboard adapters behind confirm and audit logging.

## v0.3.35 - Clipboard Adapter Plan

Status: draft PR #36.

Goal: prepare platform clipboard writes without bypassing confirmation or audit requirements.

- macOS, Linux, and Windows clipboard write commands are defined in OS adapters.
- Clipboard write plans carry risk `write`, privilege `user`, preview text, confirmation phrase, and adapter metadata.
- Clipboard writes remain disabled until the exact `copy` confirmation is present.
- Confirmed clipboard write attempts can produce audit events with source, label, adapter, and preview text.
- Action catalog includes locked `clipboard.write` as a user-level write action.
- Next: TUI confirmation input and audit log rendering.

## v0.3.36 - Clipboard Safe Execution

Status: draft PR #37.

Goal: wire clipboard execution through `safeExec()` stdin without weakening confirmation gates.

- `safeExec()` supports stdin without shell interpolation.
- Clipboard write plans refuse locked execution and return audit metadata.
- Confirmed clipboard write plans call the adapter command with preview text over stdin.
- Clipboard execution remains model-level until TUI confirmation input is wired.
- Next: TUI confirmation prompt, audit log rendering, and optional platform fallback detection.

## v0.3.37 - TUI Clipboard Confirmation

Status: draft PR #38.

Goal: let keyboard users confirm selected clipboard writes from the OS console without bypassing audit policy.

- Connections, Ports, and Processes `c` actions open a `:clipboard` confirmation prompt.
- Exact `copy` confirmation runs the selected clipboard plan through the safe stdin executor.
- Wrong confirmation stays locked and records a warning audit event without spawning a clipboard command.
- Clipboard prompt input has edit, backspace, enter, and escape handling.
- EventDock shows copied/locked clipboard audit results for the selected value.
- Next: durable audit export and platform fallback hints when clipboard tools are missing.

## v0.3.38 - Durable Audit Export

Status: draft PR #39.

Goal: make the OS console's safety/audit trail exportable instead of only visible in the live EventDock.

- Console events format into a stable `picos audit log` text artifact.
- Audit exports are planned under `<picos-config-dir>/audit/picos-audit-<timestamp>.log`.
- Export writing creates the audit directory and writes UTF-8 log files.
- The enabled `timeline.export` action writes the current TUI event/audit log and reports the output path.
- Next: clipboard tool fallback hints and a richer timeline workspace for state changes.

## v0.3.39 - Clipboard Fallback Hints

Status: draft PR #40.

Goal: make confirmed clipboard failures diagnosable from inside the terminal OS.

- Clipboard write failures include platform fallback hints for `pbcopy`, `xclip`, and `clip.exe`.
- Linux failures suggest installing `xclip` or `wl-clipboard`.
- Confirmed execution failures render as `clipboard failed` events instead of `clipboard locked` confirmation failures.
- Locked confirmation failures keep the existing no-spawn `clipboard locked` audit behavior.
- Next: richer Timeline workspace and raw action audit filters.

## v0.3.40 - Timeline Workspace Filters

Status: draft PR #41.

Goal: replace the placeholder Timeline screen with an operator-facing event history panel.

- Timeline renders live console events instead of staged reference text.
- `t` cycles `all`, `audit`, `action`, and `raw` timeline filters.
- Timeline rows classify clipboard/audit/locked/failed messages as audit events.
- Raw viewer events are separated into a raw filter.
- Summary rows show total, audit, action, raw, and active filter counts.
- Next: persisted timeline loading and richer state-change events for network status/public IP.

## v0.3.41 - Timeline Persistence Reload

Status: draft PR #42.

Goal: make Timeline survive across picos restarts by loading the latest exported audit log.

- Exported `picos audit log` text can be parsed back into timeline events.
- The latest `<picos-config-dir>/audit/picos-audit-*.log` file is selected and read on startup.
- TUI startup merges persisted audit events with current boot events.
- Default in-memory event history grows from 8 to 64 events so Timeline can be useful beyond EventDock height.
- Missing or unreadable audit directories fall back to normal boot events.
- Next: richer network status/public-IP state-change events.

## v0.3.42 - Network Timeline Events

Status: draft PR #43.

Goal: make the console feel more OS-like by recording network state changes during refresh.

- TUI refresh compares the previous and current network summary.
- Network status changes emit `ok`/`warn` timeline events.
- Primary interface address, public IP, and per-interface address changes are recorded as timeline events.
- Timeline adds a dedicated `network` filter so state-change events do not get buried in action logs.
- First refresh seeds the snapshot without noisy state-change output.
- Next: tools/raw platform detail tabs for DNS, ping, traceroute, RDAP, IP info, and TCP checks.

## v0.3.43 - Tools History Raw Handoff

Status: draft PR #44.

Goal: make Tools Hub behave like an OS utility panel instead of a static command queue.

- Read-only `tools.*` and `network.connect` actions are mapped to safe default `picos tools` run plans.
- TUI Tools workspace stores recent tool result history.
- Latest tool result summary and raw output are visible directly inside the Tools workspace.
- `raw.view` can jump back to the latest tool raw output when history exists.
- Tool result history is capped so repeated diagnostics do not overwhelm the console.
- Next: target input prompts for DNS/RDAP/IP/TCP/TLS/ping/traceroute.

## v0.3.44 - Tools Target Prompts

Status: draft PR #45.

Goal: let operators run Tools Hub diagnostics against custom targets from inside the TUI.

- Tool actions open a `:tool` target prompt instead of immediately running only the default host.
- Empty prompt submission still falls back to the configured default ping host.
- DNS, RDAP/WHOIS, traceroute, ping, and IP info prompts map directly to tool args.
- TCP connect prompts support `host port` and `host:port` input.
- TLS prompts support both `host` and `host:port`, defaulting to `:443` when omitted.
- Prompt rows are rendered inside Tools so the operator can see the pending target and submit/cancel controls.
- Next: keyboard selection inside Tools history and rerun/copy shortcuts.

## v0.3.45 - Tools History Selection

Status: draft PR #46.

Goal: make Tools Hub usable for repeated diagnostics without retyping commands.

- Tools history entries preserve their original read-only run plan.
- Tools workspace shows selectable history rows with a `>` cursor.
- `j/k` moves across tool history entries with wraparound.
- `r` reruns the selected tool result and appends a new history entry.
- `raw.view` still jumps to the most recent raw output while history selection remains available.
- Next: copy selected tool summary/raw output through the locked clipboard confirmation flow.

## v0.3.46 - Tools Output Clipboard Confirmation

Status: draft PR #47.

Goal: let operators safely copy selected Tools output without bypassing picos' confirmation model.

- Selected Tools history raw output can produce a locked clipboard preview.
- Tools workspace uses `c` to open the existing exact `copy` confirmation prompt.
- Tool output copy uses the same safe clipboard adapter and audit path as endpoints and process resources.
- Moving history selection clears stale copy previews.
- Next: copy selected summary separately and export scoped tool history.

## v0.3.47 - Tools Summary Clipboard Confirmation

Status: draft PR #48.

Goal: make Tools history useful for quick handoff, not only raw terminal capture.

- Selected Tools history summaries can produce locked clipboard previews.
- Tools workspace uses `y` for selected summary copy and keeps `c` for raw output copy.
- Summary and raw previews track their own display mode so the visible preview matches the pending confirmation.
- Both paths use the existing exact `copy` confirmation prompt and clipboard audit flow.
- Next: export scoped Tools history from the TUI.

## v0.3.48 - Tools History Markdown Export

Status: draft PR #49.

Goal: make Tools Hub output durable enough to hand off, compare, or attach to bug reports.

- Tools history can format selected or full diagnostic runs as markdown.
- Export plans write under the picos config `tools` directory with timestamped filenames.
- Tools workspace uses `e` for selected run export and `E` for full history export.
- The `tools.export` action exports the full Tools history from the command palette/action system.
- Export helpers are covered for path planning, content formatting, and actual file writes.
- Next: searchable/filterable Tools history rows and export scopes.

## v0.3.49 - Tools History Filtering

Status: draft PR #50.

Goal: keep Tools Hub usable after many repeated diagnostics.

- Tools history rows can be filtered by label, title, summary, raw output, tool id, or args.
- The TUI Tools workspace uses `f` to open a filter prompt and `F` to clear it.
- Filtered rows preserve source indexes so rerun, copy, and export still target the visible selected run.
- `j/k` movement wraps within matching history rows while a filter is active.
- Empty matches show an explicit no-match state instead of falling back to hidden rows.
- Next: richer Tools history sort/group modes and saved query presets.

## v0.3.50 - Tools History Sort Modes

Status: draft PR #51.

Goal: make repeated Tools diagnostics scan like a real operator console.

- Tools history supports `time`, `tool`, and `status` sort modes.
- The TUI Tools workspace cycles sort mode with `s`.
- Sort rows preserve source indexes so rerun, copy, and export still target the visible selected run.
- `j/k` movement follows the sorted visible order, including when filters are active.
- Sort context is shown in the Tools workspace header when not using the default time order.
- Next: grouped Tools history sections and saved query presets.

## v0.3.51 - Tools History Group Sections

Status: draft PR #52.

Goal: make Tools Hub history scan more like an operator console when many diagnostics pile up.

- Tools history supports `none`, `tool`, and `status` group modes.
- The TUI Tools workspace cycles group mode with `G`.
- Group headers show run counts without becoming selectable rows.
- Grouped rows preserve source indexes so rerun, copy, and export still target the visible selected run.
- Group context is shown in the Tools workspace header when grouping is active.
- Next: saved Tools query presets.

## v0.3.52 - Tools Filter Presets

Status: draft PR #53.

Goal: make repeated Tools history triage faster during long diagnostic sessions.

- Non-empty Tools history filters are saved as recent session presets.
- The TUI Tools workspace uses `P` to save the active filter again and move it to the front.
- The TUI Tools workspace uses `]` to cycle saved filter presets.
- Preset application updates match counts and visible selection just like typed filters.
- The Tools workspace header shows the first saved presets for quick operator recall.
- Next: tools/platform raw detail tabs.

## v0.3.53 - Tools Detail Tabs

Status: draft PR #54.

Goal: make Tools Hub results feel like an inspectable console panel instead of only a raw dump.

- Tools history supports `raw`, `summary`, and `command` detail views.
- The TUI Tools workspace cycles detail views with `Tab`.
- Summary detail shows title, status, summary, and the rerunnable command.
- Command detail shows action id, tool id, args, and rerun command text.
- Raw detail remains the default view to preserve existing handoff behavior.
- Next: platform detail tabs for routes/endpoints/interfaces.

## v0.3.54 - Endpoint Detail Tabs

Status: draft PR #55.

Goal: make Connections and Ports scan like focused lazyifconfig-style endpoint inspectors.

- Connections and Ports support `detail`, `raw`, and `process` view modes.
- The TUI Connections and Ports workspaces cycle detail views with `Tab`.
- Raw view focuses the original OS command output without repeating detail panes.
- Process view focuses PID handoff metadata and matching process snapshots.
- Detail view remains the default to preserve existing endpoint rows and copy previews.
- Next: route/interface platform detail tabs.

## v0.3.55 - Route Detail Tabs

Status: draft PR #56.

Goal: make Route Inspector navigation match the focused tab model used by endpoint and Tools panels.

- Routes support `table`, `raw`, `diagnostics`, and `path` view modes.
- The TUI Routes workspace cycles detail views with `Tab`.
- Raw view focuses the original route command output.
- Diagnostics view focuses route health findings.
- Path view focuses the destination lookup result when one is available.
- Table view remains the default to preserve the current route table plus path overview.
- Next: interface platform detail tabs.

## v0.3.56 - Interface Detail Tabs

Status: draft PR #57.

Goal: make Interfaces behave like a focused lazyifconfig-style adapter inspector instead of a flat inventory list.

- Interfaces support `list`, `detail`, `stats`, and `platform` view modes.
- The TUI Interfaces workspace cycles detail views with `Tab`.
- The TUI Interfaces workspace uses `j/k` to select the active adapter.
- Detail view focuses CIDR, IPv4/IPv6, MAC, netmask, gateway, and DNS for the selected adapter.
- Stats view focuses MTU, RX/TX bytes, RX/TX packets, and link status for the selected adapter.
- Platform view explains the OS data sources used for interface inventory and statistics.
- Next: richer subnet labels and VPN route hints.

## v0.3.57 - Network Route Hints

Status: draft PR #58.

Goal: make network groups and routes explain operator meaning instead of only listing raw addresses.

- Network groups now include `scope` labels such as private, tunnel, virtual, local, host, and internet.
- Network groups now include concise operator hints for LAN, VPN, container, link-local, public, loopback, and unassigned addresses.
- The Network workspace shows group scope and hints beside interface membership.
- Interface platform detail rows include group scope and hint context.
- Route diagnostics detect VPN interfaces such as `utun`, `tun`, `tap`, `ppp`, `wg`, WireGuard, and VPN-named adapters.
- Route diagnostics flag likely split-tunnel setups when VPN routes exist but the default route remains on a non-VPN interface.
- Next: richer endpoint search and event search.

## v0.3.58 - Endpoint Search Presets

Status: draft PR #59.

Goal: make Connections and Ports practical when endpoint lists grow large during real diagnostic sessions.

- Connections and Ports now have TUI filter prompts opened with `f`.
- `F` clears the active endpoint filter and resets visible selection.
- `P` saves the active endpoint filter as a session preset.
- `]` cycles saved endpoint filter presets for repeated triage terms such as ports, hosts, commands, users, and PIDs.
- Connection and port selection, copy, and process drill-down now target the filtered visible list.
- Endpoint summaries show active filters and the first saved presets.
- Next: richer event search and export scopes.

## v0.3.59 - Timeline Search Export

Status: draft PR #60.

Goal: make Timeline useful as an operator audit console when event history grows.

- Timeline now supports search prompts opened with `f`.
- `F` clears the active timeline search.
- `P` saves the active timeline search as a session preset.
- `]` cycles saved timeline search presets.
- Timeline summaries show search match counts and visible kind counters.
- `timeline.export` writes the current filtered/search scope when Timeline filtering or search is active.
- Scoped audit exports include `scope=filtered` and `query=` metadata plus a filtered filename.
- Next: platform-aware Tools presets and release/version hardening.

## v0.3.60 - Tools Target Presets

Status: draft PR #61.

Goal: make Tools Hub feel like an OS network workbench by offering runnable targets from the current machine state.

- Tools now derives target presets from the current network summary.
- Presets include the configured default ping host, primary gateway, first DNS servers, public IP, HTTPS check, and TLS inspection.
- Tools workspace shows a Target Presets section before history when presets are available.
- `n` cycles the active target preset without changing history selection.
- `R` runs the active target preset through the same safe read-only Tools history path.
- Target preset rows are clipped to preserve footer controls in short terminals.
- Next: release/version hardening after stacked PRs, then privileged control preview framework.

## lazyifconfig Parity Backlog

Goal: close the functional gap with `choihunchul/lazyifconfig` in focused slices.

- Interface details: MAC/prefix/gateway, MTU/RX/TX counters, stable row sorting, keyboard selection, and list/detail/stats/platform panes landed; next release/version hardening.
- Network grouping: subnet/LAN/loopback/VPN/container/link-local/public classification plus operator scope/hint labels landed; next release/version hardening.
- Route Inspector depth: route diagnostics, raw/table/diagnostics/path tabs, destination path lookup UI, sortable rows, VPN route hints, and split-tunnel diagnostics landed; next release/version hardening.
- Connections and Ports: parsed rows, raw output, CLI filtering/sorting, TUI sort cycling, TUI filter presets, selection details, detail/raw/process tabs, shared locked clipboard previews, clipboard adapter plans with audit metadata, safe stdin clipboard execution model, TUI clipboard confirmation prompt with EventDock audit results, durable audit export, clipboard fallback hints, PID process enrichment, `picos process <pid>` drill-down, `--files` cwd/open-file snapshots, TUI process handoff, labeled process files, process-to-files handoff, process resource classification, and network state-change timeline events landed; next release/version hardening.
- Tools Hub: DNS, WHOIS/RDAP, IP info, TCP check, TLS, ping, traceroute as first-class TUI tools with target prompts, OS-aware target presets, filterable/sortable/groupable/selectable result history, raw/summary/command detail panes, session filter presets, rerun, raw output handoff, locked summary/raw-output copy shortcuts, and scoped markdown export landed; next release/version hardening.
- Timeline: live EventDock history, network/action/audit/raw filters, search presets, scoped audit export, latest audit reload, and network status/address/public-IP change events landed; next release/version hardening.
- Raw output viewer for routes, connections, ports, and Tools history landed; next richer platform source viewers.

## v0.4.0 - Privileged Controls Framework

Status: draft PR #62.

Goal: prepare real OS mutation without making it casual or dangerous.

- Action Center now creates dry-run preview plans for locked OS-changing actions.
- Previews include risk, privilege, platform, confirmation phrase, and lock reason.
- Locked write/destructive/admin actions show preview rows instead of only logging a lock warning.
- Inspector shows the active control preview beside the selected action.
- No OS mutation command is executed by this framework step.
- Next: adapter-owned dry-run command previews and audit records for write/destructive attempts.

## v0.4.1 - Adapter Control Command Previews

Status: draft PR #63.

Goal: keep OS mutation command knowledge inside adapters before any control action becomes executable.

- macOS, Linux, and Windows adapters now expose dry-run command previews for selected OS-changing actions.
- `dns.flush`, `interface.disable`, `route.add`, and `service.restart` have adapter-owned command candidates.
- Action preview plans include adapter, command, and args when a platform command candidate exists.
- Action Center and Inspector display command preview rows while keeping `dryRun=true`.
- No OS mutation command is executed by this framework step.
- Next: audit records for write/destructive preview attempts and typed confirmation state.

## v0.4.2 - Control Preview Audit Records

Status: draft PR #64.

Goal: make privileged control review traceable before any OS mutation path is enabled.

- Control preview plans now format stable audit messages for timeline and export flows.
- Locked action previews log risk, privilege, dry-run state, lock reason, adapter, and command preview.
- Timeline classifies control preview messages as audit events.
- Timeline search can find control previews by action id, adapter, command, or risk metadata.
- No OS mutation command is executed by this framework step.
- Next: typed confirmation state for control previews while execution remains disabled.

## v0.4.3 - Control Confirmation State

Status: draft PR #65.

Goal: make the final confirmation step visible and auditable before real mutation is ever enabled.

- Action Center now opens a typed confirmation prompt from a locked control preview with `c`.
- Correct confirmation phrases record `confirmed-disabled` audit events instead of executing commands.
- Incorrect phrases record `rejected` audit events with the same risk, privilege, adapter, and command metadata.
- Timeline classifies control confirmation messages as audit events.
- No OS mutation command is executed by this framework step.
- Next: approval policy modeling and dry-run simulation records for future write/destructive controls.

## v0.4.4 - Control Simulation Policy

Status: draft PR #66.

Goal: make the approval policy decision visible before real OS mutation is ever reachable.

- Locked control previews now create a blocked dry-run policy simulation.
- Simulations show blockers such as `confirmation-missing`, `confirmation-rejected`, `mutation-approval-required`, `admin-approval-required`, and `execution-disabled`.
- Exact typed confirmation removes only the confirmation blocker; mutation/admin/execution blockers remain.
- Action Center and Inspector render control simulation rows next to the preview.
- Timeline classifies control simulation messages as audit events.
- No OS mutation command is executed by this framework step.
- Next: privileged execution harness design with explicit opt-in policy and adapter dry-run execution tests.

## v0.4.5 - Control Execution Harness

Status: draft PR #67.

Goal: define the first execution boundary without making mutation casually reachable.

- Control execution plans default to policy `disabled` and never call a runner.
- Exact typed confirmation is required before any dry-run execution plan can become ready.
- Adapter commands must declare `dryRunExecutable` before the harness can call them.
- Windows PowerShell `-WhatIf` command previews are marked as dry-run executable.
- macOS/Linux preview-only control commands remain blocked as `adapter-dry-run-unavailable`.
- Timeline classifies control execution dry-run audit messages as audit events.
- No TUI path enables mutation by default in this framework step.
- Next: UI-gated dry-run attempt command, operator policy config, and richer adapter dry-run coverage.

## v0.4.6 - Control Policy Config

Status: draft PR #68.

Goal: let operators see and configure the dry-run execution policy while keeping default mutation locked.

- Config now stores `controlExecutionMode`, defaulting to `disabled`.
- Config now stores `allowAdminDryRun`, defaulting to `false`.
- Control execution policy is derived from config before any Action Center dry-run attempt.
- Action Center uses `x` for a policy-gated dry-run attempt from the active locked preview.
- Action Center and Inspector render control execution rows after an attempt.
- Default config still blocks the runner with `mutation-controls-disabled`.
- Next: richer adapter dry-run coverage and explicit UI copy for policy state.

## v0.4.7 - Control Policy Visibility

Status: draft PR #69.

Goal: make the current execution policy visible before an operator tries a dry-run.

- Control execution policy rows now show mode and admin dry-run state.
- Disabled policy copy explains `controlExecutionMode=dry-run`.
- Admin policy copy explains `allowAdminDryRun=true`.
- Action Center renders policy rows before preview, simulation, and execution rows.
- Inspector renders policy rows even before a dry-run attempt.
- Next: richer adapter dry-run coverage and policy-state shortcuts from the TUI.

## v0.4.8 - Read-Only Update Check

Status: draft PR #70.

Goal: bring lazy terminal-tool update awareness into picos without executing installers.

- `picos update` checks the npm registry for the latest `@uulab/picos` version.
- Update check output shows package, current version, latest version, status, registry URL, and install hint.
- Registry failures are shown as read-only diagnostics instead of throwing opaque errors.
- Action Center exposes `picos.update` as a safe read-only action.
- Status workspace shows the latest update-check result after the action runs.
- Next: locked self-update/apply preview with explicit confirmation and release-note handoff.

## v0.4.9 - Locked Self-Update Apply Preview

Status: draft PR #71.

Goal: make update application visible as an OS-style control while keeping package mutation locked.

- Update checks can derive a `picos.update.apply` preview only when a newer version is known.
- The apply preview is risk `write`, privilege `user`, disabled by default, and requires `update picos`.
- The preview command uses `npm install -g @uulab/picos@<version> --dry-run`.
- Status workspace renders the locked apply preview after an update check finds a newer version.
- Action Center catalog includes `picos.update.apply` as a locked write action.
- Next: release-note handoff and policy-gated dry-run execution for the npm dry-run command.

## v0.4.10 - Update Release Handoff

Status: draft PR #72.

Goal: let operators inspect update context before deciding whether to apply anything.

- Update checks can derive npm package, GitHub Release, and CHANGELOG handoff links for the latest version.
- `picos update` prints release handoff rows after the read-only registry check.
- Status workspace renders release handoff rows after `picos.update`.
- Release handoff is only created when a latest version is known.
- The apply path remains locked and preview-only.
- Next: policy-gated dry-run execution for the npm dry-run command and copy/open helpers for handoff URLs.

## v0.4.11 - Update Handoff Copy Controls

Status: draft PR #73.

Goal: make update handoff links usable from the keyboard without bypassing clipboard safety.

- Release handoff links are modeled as selectable `npm`, `github`, and `changelog` rows.
- Status workspace shows the selected handoff link with a cursor.
- `n` cycles the selected update handoff link.
- `c` opens the existing locked `:clipboard` confirmation prompt for the selected link.
- Clipboard previews now support `update-handoff` as a source.
- Next: policy-gated dry-run execution for the npm dry-run command and optional open-in-browser handoff.

## v0.4.12 - Update Dry-Run Execution Gate

Status: draft PR #74.

Goal: route picos self-update dry-run attempts through the same control execution policy as OS controls.

- Update apply previews now convert into Action Center control preview plans.
- The npm update command is marked dry-run executable only when it includes `--dry-run`.
- `picos.update.apply` opens the Action Center preview after `picos.update` finds a newer version.
- Exact `update picos` confirmation and the configured control execution policy gate the npm dry-run attempt.
- Tests cover the preview conversion and policy-gated npm dry-run runner path.
- Next: optional open-in-browser handoff and faster policy-state shortcuts from the TUI.

## v0.4.13 - Update Handoff External Open

Status: draft PR #75.

Goal: make update handoff links usable from the keyboard without silently launching external applications.

- Status workspace update handoff links can be opened with `o`.
- `:external-open` requires the exact `open` confirmation before launching anything.
- External open plans only allow HTTPS URLs.
- macOS, Linux, and Windows opener commands are modeled in core and run through `safeExec()`.
- Tests cover platform command planning, HTTPS blocking, visible rows, and locked execution.
- Next: release handoff status refresh shortcuts and richer update/release automation checks.

## v0.4.14 - GitHub Release Update Check

Status: draft PR #76.

Goal: match release-aware terminal tools by showing GitHub Release state next to npm registry state.

- `picos update` now checks GitHub Releases without downloading assets.
- The latest GitHub tag is normalized from `vX.Y.Z` to semver for comparison.
- GitHub API failures are reported as read-only diagnostics.
- Status workspace renders GitHub Release check rows after `picos.update`.
- Tests cover update-available and API failure paths.
- Next: release handoff status refresh shortcuts and release automation health checks.

## v0.4.15 - Release Health Command

Status: draft PR #77.

Goal: expose release readiness as a picos command, not only as npm scripts.

- `picos release-health` prints package metadata, dist artifact, CI, and release workflow health rows.
- The report summarizes pass/fail counts before listing each check.
- Failed checks include operator-facing details.
- The command exits non-zero when release health fails.
- Tests cover passing and blocked health reports plus CLI output.
- Next: Status workspace release-health panel and refresh shortcuts.

## v0.4.16 - System Monitor Snapshot

Status: draft PR #78.

Goal: make the console feel more like a tiny OS by surfacing live local resource pressure.

- `picos monitor` prints a read-only system monitor snapshot.
- Monitor rows include timestamp, uptime, load average, memory usage, CPU model/core count, process count, and top processes by CPU.
- Dashboard compact/full views surface load and memory pressure.
- System workspace shows detailed monitor rows beside OS identity/runtime state.
- Tests cover snapshot construction, formatting, and CLI output.
- Next: Logs workspace real OS log readers and TUI monitor refresh shortcuts.

## v0.4.17 - OS Logs Snapshot

Status: draft PR #79.

Goal: make Logs a real OS console panel instead of a placeholder diagnostics buffer.

- `picos logs --limit <n>` reads recent local OS log entries.
- macOS uses the unified log, Linux uses `journalctl`, and Windows uses the System event log.
- Log commands are adapter-owned and executed only through `safeExec()`.
- Log snapshots include source, command preview, status, note, severity hints, and bounded raw rows.
- TUI Logs workspace renders the latest OS log snapshot and keeps the doctor buffer as supporting context.
- Action Center includes the read-only `logs.read` action for keyboard-driven refresh.
- Tests cover platform command construction, parsing, formatting, action catalog visibility, and CLI output.
- Next: log filtering/search presets and live follow mode.

## v0.4.18 - Log Search Presets

Status: draft PR #80.

Goal: make Logs useful under pressure by adding the same keyboard search flow as the other dense console panels.

- `picos logs --filter <query>` filters recent OS logs by severity, row number, or message text.
- Filtered output keeps original log row numbers and shows visible/total counts.
- Logs workspace supports `f` search, `F` clear, `P` save preset, `]` cycle preset, and `r` log-only refresh.
- Logs workspace rows show active search and saved preset context before the OS log rows.
- Tests cover core filtering, CLI filtered output, TUI row formatting, and preset cycling.
- Next: live follow mode and severity-only quick filters.

## v0.4.19 - Log Severity Quick Filters

Status: draft PR #81.

Goal: make noisy OS logs easier to triage from the keyboard.

- `picos logs --level <all|warn|fail|info>` filters recent OS log rows by detected severity.
- Severity filtering composes with `--filter <query>` and preserves original row numbers.
- Logs workspace supports `e` to cycle `all -> warn -> fail -> info`.
- Logs workspace header and status rows show the active severity level plus visible/total counts.
- Tests cover severity filtering, keyboard cycle order, CLI output, and TUI row formatting.
- Next: live follow mode and pinned severity/search profiles.

## v0.4.20 - Log Severity/Search Profiles

Status: draft PR #82.

Goal: make repeated log triage workflows one-keystroke recoverable.

- Logs workspace can save the current severity/search pair as a pinned profile with `S`.
- Logs workspace cycles saved profiles with `}` and restores both severity and search text.
- Profile labels use compact `level:query` rows such as `warn:kernel` and `all:-`.
- Logs rows show the first saved profiles in the workspace header.
- Tests cover profile labels, de-duplication, cycling, and row formatting.
- Next: live follow mode and persisted profile storage.

## v0.4.21 - Persistent Log Profiles

Status: draft PR #83.

Goal: make saved log triage profiles survive TUI restarts like an OS console preference.

- Config schema now includes `logProfiles` with the same `level:query` shape used by the Logs workspace.
- Config loading trims profile queries, rejects invalid levels, de-duplicates entries, and keeps the first six profiles.
- TUI boot loads persisted log profiles alongside language, refresh interval, and remote profiles.
- Pressing `S` in Logs persists the current severity/search profile to config as well as the live TUI session.
- Tests cover config defaults, profile normalization, and config-store persistence.
- Next: live log follow mode and persisted log search presets.

## v0.4.22 - Persistent Log Search Presets

Status: draft PR #84.

Goal: make repeated log search terms survive TUI restarts and match the persistent profile workflow.

- Config schema now includes `logSearchPresets` as a normalized string array.
- Config loading trims search presets, drops blanks, de-duplicates entries, and keeps the first six presets.
- TUI boot loads persisted log search presets alongside log profiles.
- Logs search submit and `P` save the active search preset back to config.
- Tests cover config defaults, preset normalization, config-store persistence, and existing Logs workspace preset cycling.
- Next: live log follow mode with bounded refresh history.

## v0.4.23 - Logs Live Follow Mode

Status: draft PR #85.

Goal: make Logs usable as a watchable OS console panel instead of only a manual snapshot viewer.

- Logs workspace header now shows `follow=on/off`.
- Logs workspace shortcut help includes `L follow`.
- Pressing `L` in the Logs workspace toggles live follow mode and records the state transition in the event dock.
- When follow is enabled and the operator is viewing Logs, picos refreshes recent OS log snapshots on the configured refresh interval.
- Follow refresh failures are recorded as visible console events while successful follow refreshes update the panel quietly.
- Tests cover follow header/shortcut formatting in both snapshot and no-snapshot states.
- Next: bounded live-follow history and pause/clear controls.

## v0.4.24 - Logs Follow State Counters

Status: draft PR #86.

Goal: make live follow state inspectable and resettable without leaving the Logs workspace.

- Logs header now shows bounded live follow refresh ticks when follow is active.
- Logs header shows the last follow status as `ok`, `warn`, or `fail`.
- Follow refresh ticks are capped to avoid unbounded UI counters during long sessions.
- Pressing `C` in Logs clears the follow tick counter and last-status marker.
- Shortcut help now includes `C follow-clear` alongside `L follow`.
- Tests cover follow tick/status header rendering and clear shortcut discovery.
- Next: live follow history rows and explicit pause/resume controls.

## v0.4.25 - Logs Follow History Rows

Status: draft PR #87.

Goal: make live follow refreshes auditable in the Logs panel without opening the timeline.

- Logs workspace now renders a compact live follow history row after the OS log rows.
- Follow history records the refresh label, status, and entry count for recent follow refreshes.
- Follow history is bounded to the most recent six refreshes in TUI state and the latest three visible items in the row.
- Follow success, warning snapshots, and exceptions all append visible history entries.
- Pressing `C` clears follow counters, last status, and follow history together.
- Tests cover bounded follow history row rendering alongside the existing header and shortcut rows.
- Next: explicit follow pause/resume controls and follow-history export.

## v0.4.26 - Route Filter Controls

Status: draft PR #88.

Goal: make large route tables searchable from both CLI automation and the keyboard-driven Route workspace.

- Core route rows can now be filtered by destination, gateway, interface, family, metric, protocol, or flags.
- `picos routes --filter <query>` prints match counts and only matching route rows.
- Routes workspace table view shows visible filter context with matched/total route counts.
- Pressing `f` in Routes opens a filter prompt, and `F` clears the active filter.
- Route filtering composes with existing route sorting and destination path lookup.
- Tests cover route filter matching, CLI table formatting, and TUI filter row rendering.
- Next: route filter presets and raw-output open/copy handoff.

## v0.4.27 - Route Clipboard Handoff

Status: draft PR #89.

Goal: make route inspection output portable without bypassing the explicit clipboard confirmation model.

- Routes workspace can stage locked clipboard previews with `c`.
- Table view copies the filtered/sorted `picos routes` table output.
- Raw view copies the adapter-owned route command raw output.
- Diagnostics view copies route diagnostic rows.
- Path view copies destination path raw output when a path lookup is loaded.
- Route clipboard previews use the same exact `copy` confirmation and audit event path as endpoints, process resources, tools, and update links.
- Tests cover table/raw/path clipboard previews and active-view preview row rendering.
- Next: route filter presets and raw-output external handoff.

## v0.4.28 - Route Filter Presets

Status: draft PR #90.

Goal: make repeated route-table triage one-keystroke recoverable inside the Route workspace.

- Routes workspace can save the active filter with `P`.
- Routes workspace can cycle saved filter presets with `]`.
- Route filter presets are de-duplicated, trimmed, and bounded to six session entries.
- Route summary rows show the first three saved presets for quick operator recall.
- Cycling a preset reuses the existing filter/match-count path and clears stale copy previews.
- Tests cover save/cycle helper behavior and visible preset summary rows.
- Next: persistent route presets and raw-output external handoff.

## v0.4.29 - Persistent Route Filter Presets

Status: draft PR #91.

Goal: make saved route triage filters survive TUI restarts like other OS console preferences.

- Config schema now includes `routeFilterPresets` as a normalized string array.
- Config loading trims presets, drops blanks, de-duplicates entries, and keeps the first six route filters.
- TUI boot loads route filter presets alongside log presets, language, refresh interval, and remote profiles.
- Pressing `P` in Routes persists the current route filter to config as well as the live TUI session.
- `routeFilterPresets` cannot be written through generic `picos config set`; it is managed by the Routes workspace.
- Tests cover config defaults, preset normalization, config-store persistence, and existing Route workspace preset rendering.
- Next: raw-output external handoff and route preset profiles.

## v0.4.30 - Route Raw Handoff Export

Status: draft PR #92.

Goal: let operators hand route table evidence to an external editor or review workflow without losing raw OS context.

- Routes now create timestamped Markdown handoff files under the picos config directory.
- The active route detail view controls the export payload: table, raw output, diagnostics, or destination path.
- Path exports stay locked until a route destination lookup exists.
- The TUI Routes workspace exposes `e` as an export shortcut beside copy, filter, sort, detail, and path controls.
- Tests cover handoff content, stable file naming, path-view locking, and actual file writes.
- Next: external editor open preview for route handoff files and route preset profiles.

## v0.4.31 - Route Handoff External Open

Status: draft PR #93.

Goal: let route handoff files move from terminal evidence into the operator's external file viewer without bypassing safety controls.

- A new `fileOpen` core module creates locked file-open plans for route handoff Markdown files.
- File-open plans are limited to picos route handoff files under the config directory.
- Platform adapters use `open`, `xdg-open`, or `rundll32` through `safeExec`; no shell command is assembled in the TUI.
- Routes exposes `o` to write the current handoff file, move to Status, and request exact `open` confirmation before launching.
- Status shows the file-open preview and confirmation prompt beside existing update handoff open previews.
- Tests cover path scoping, preview rows, locked execution, and confirmed opener execution.
- Next: route preset profiles, then the same handoff/open flow for ports and connections raw evidence.

## v0.4.32 - Endpoint Evidence Handoffs

Status: draft PR #94.

Goal: make Connections and Ports evidence as portable as Routes evidence for developer incident triage.

- Connections and Ports now create timestamped Markdown handoff files under `endpoints/*.md`.
- The active endpoint detail view controls the payload: raw OS output or formatted picos summary evidence.
- Endpoint handoff files can be opened through the same locked Status file-open preview used by route handoffs.
- `fileOpen` now allows both route and endpoint handoff directories while still blocking files outside the picos config tree.
- Connections and Ports expose `e` for export and `o` for export-plus-open-confirmation.
- Tests cover connection and port handoff content, stable file naming, writes, endpoint file-open scoping, and existing endpoint panel behavior.
- Next: persistent endpoint filter presets and route/endpoint handoff index browsing.

## v0.4.33 - Persistent Endpoint Filter Presets

Status: draft PR #95.

Goal: make repeated endpoint triage filters survive TUI restarts like route and log operator preferences.

- Config schema now includes `connectionFilterPresets` and `portFilterPresets` as normalized string arrays.
- Config loading trims endpoint presets, drops blanks, de-duplicates entries, and keeps the first six filters.
- TUI boot loads endpoint filter presets alongside route/log presets and other operator preferences.
- Pressing `P` in Connections or Ports persists the current filter to config as well as the live TUI session.
- Endpoint preset arrays cannot be written through generic `picos config set`; they are managed by the endpoint workspaces.
- Tests cover config defaults, endpoint preset normalization, config-store persistence, and existing endpoint preset rendering.
- Next: route/endpoint handoff index browsing and persistent endpoint sort preferences.

## v0.4.34 - Persistent Endpoint Sort Preferences

Status: draft PR #96.

Goal: make repeated endpoint triage views survive TUI restarts, including the active sort order.

- Config schema now includes `connectionSort` and `portSort` as normalized sort preference strings.
- Invalid endpoint sort config falls back to the safe defaults: `state` for Connections and `port` for Ports.
- TUI boot restores Connections and Ports sort preferences before rendering endpoint workspaces.
- Pressing `s` in Connections or Ports persists the next sort state to config while keeping the live panel responsive.
- Tests cover config defaults, invalid sort fallback, config-store persistence, and existing endpoint panel sorting behavior.
- Next: route/endpoint handoff index browsing and persisted Tools Hub history preferences.

## v0.4.35 - Route and Endpoint Handoff Index

Status: draft PR #97.

Goal: make exported route/endpoint evidence discoverable after it leaves the active panel.

- A shared handoff index reads picos-owned Markdown files from `routes/*.md` and `endpoints/*.md`.
- Handoff index entries capture source, kind, view, label, command, timestamp, and path metadata.
- `picos handoffs` prints the recent handoff index for terminal workflows.
- Status workspace now shows the handoff index on boot and after route/endpoint exports.
- Status supports `H` refresh, `]` select, and `O` open, routing selected files through the existing locked file-open confirmation.
- Tests cover index parsing, newest-first ordering, row formatting, selected item clamping, and CLI output.
- Next: persisted Tools Hub history preferences and handoff file cleanup/archive controls.

## v0.4.36 - Persistent Tools Hub Preferences

Status: draft PR #98.

Goal: make the Tools Hub feel like a persistent OS console workspace instead of a fresh session every restart.

- Config schema now includes `toolHistoryFilterPresets`, `toolHistorySort`, `toolHistoryGroup`, and `toolHistoryDetailView`.
- Config loading trims tool filter presets, drops blanks, de-duplicates entries, keeps the first six, and falls back invalid view preferences to safe defaults.
- TUI boot restores Tools Hub filter presets, sort, group, and detail view preferences.
- Pressing `P` in Tools persists the current history filter presets to config.
- Pressing `s`, `G`, or `Tab` in Tools persists the next sort, group, or detail view preference.
- Tests cover config defaults, invalid preference fallback, config-store persistence, and existing Tools Hub rendering/navigation behavior.
- Next: handoff file cleanup/archive controls and persisted Tools target presets.

## v0.4.37 - Persistent Tools Target Presets

Status: draft PR #99.

Goal: let repeated diagnostics start from the operator's own saved targets, not only the current OS snapshot.

- Config schema now includes `toolTargetPresets`.
- Target presets are normalized, trimmed, de-duplicated by action and target, capped at eight entries, and invalid actions are dropped.
- TUI boot restores saved target presets before OS-aware presets such as default host, gateway, DNS servers, public IP, HTTPS, and TLS.
- Pressing `T` in Tools saves the active target preset to config; `n` cycles saved and OS-aware presets, and `R` runs the selected preset.
- Tests cover config defaults, config-store persistence, target preset normalization, de-duplication, and custom preset merge order.
- Next: handoff file cleanup/archive controls and richer custom target editing.

## v0.4.38 - Handoff Archive Controls

Status: draft PR #100.

Goal: keep exported route/endpoint evidence useful after it leaves the active panel without letting cleanup touch arbitrary files.

- Core handoff archive moves are limited to picos-owned route/endpoint Markdown files under the config directory.
- Archived files move into `archive/routes` or `archive/endpoints`, leaving the active handoff index clean.
- `picos handoffs --archive <path>` archives a selected route/endpoint evidence file from the CLI.
- Status workspace now shows `archive target=...` and supports `A` to archive the selected handoff file, then refreshes the handoff index.
- Tests cover archive path scoping, blocked outside files, CLI archive output, and updated handoff index rows.
- Next: richer handoff retention policies and custom Tools target editing.

## v0.4.39 - Tools Target Preset Management

Status: draft PR #101.

Goal: make saved Tools Hub targets maintainable from the keyboard after repeated diagnostics.

- Tools workspace now supports `X` to remove the selected saved target preset from config.
- Removal matches saved presets by action and target, so renamed labels still clean up the same target.
- OS-aware presets such as default host, gateway, DNS servers, public IP, HTTPS, and TLS remain generated and cannot be deleted from config.
- Tests cover saved target removal, non-saved target no-op behavior, and existing Tools Hub row rendering.
- Next: richer custom target editing and retention policies.

## v0.4.40 - Tools Target Preset Labels

Status: draft PR #102.

Goal: make saved Tools Hub targets readable as reusable operator shortcuts instead of raw host strings.

- Tools workspace now supports `L` to open a target label prompt for selected saved target presets.
- Label edits persist through `toolTargetPresets` config and keep the preset action, target, id, and hint intact.
- Rename matching uses action and target, so labels can be edited even if a selected preset came from normalized config.
- OS-aware presets remain generated from the machine state and cannot be renamed into config.
- Tests cover label trimming, blank label no-op behavior, non-saved target no-op behavior, and existing Tools Hub rendering.
- Next: full custom target editing and retention policies.

## v0.4.41 - Tools Target Preset Values

Status: draft PR #103.

Goal: let operators repair or repoint saved Tools Hub targets without editing JSON by hand.

- Tools workspace now supports `M` to edit the selected saved target value.
- Target edits persist through `toolTargetPresets` config while preserving action, label, id, and hint.
- Target edit matching uses action and target so normalized config entries remain editable from the TUI.
- Blank target edits are ignored, and OS-aware presets remain generated from the machine state instead of being copied into config.
- Tests cover target trimming, blank target no-op behavior, non-saved target no-op behavior, and existing Tools Hub rendering.
- Next: richer preset action switching and retention policies.

## v0.4.42 - Tools Target Preset Actions

Status: draft PR #104.

Goal: make saved Tools Hub targets reusable across diagnostic modes without editing JSON by hand.

- Tools workspace now supports `A` to change the selected saved target action.
- Action edits persist through `toolTargetPresets` config while preserving label, target, id, and hint.
- Action edit matching uses action and target so normalized config entries remain editable from the TUI.
- The action prompt accepts exact action ids plus short aliases such as `dns`, `ping`, `trace`, `whois`, `ip`, `tls`, and `tcp`.
- Blank or unknown action edits are ignored, and OS-aware presets remain generated from the machine state instead of being copied into config.
- Tests cover action trimming, invalid action no-op behavior, non-saved target no-op behavior, and existing Tools Hub rendering.
- Next: retention policies for saved target presets and richer preset ordering.

## v0.4.43 - Tools Target Preset Ordering

Status: draft PR #105.

Goal: make repeated Tools Hub diagnostics behave more like an operator favorites shelf.

- Tools workspace now supports `U` to pin the selected saved target preset to the top.
- Pinned order persists through `toolTargetPresets` config and restores before OS-aware generated presets on TUI boot.
- Pin matching uses action and target so renamed, retargeted, or normalized config entries remain movable.
- OS-aware presets remain generated from the machine state and cannot be pinned into config.
- Tests cover saved target promotion, already-top no-op behavior, non-saved target no-op behavior, and existing Tools Hub rendering.
- Next: target preset previous/next navigation and retention policy controls.

## v0.4.44 - Tools Target Preset Navigation

Status: draft PR #106.

Goal: make long Tools Hub target shelves quick to scan without one-way cycling.

- Tools workspace now supports `n`/`N` to move forward/back through OS-aware and saved target presets.
- Target selection uses a tested wraparound helper for both directions.
- The target preset header and shortcut footer now expose the bidirectional cycle controls.
- Tests cover forward wraparound, backward wraparound, out-of-range normalization, and empty target lists.
- Next: retention policy controls for saved target presets.

## v0.4.45 - Tools Target Preset Retention

Status: draft PR #107.

Goal: let operators decide how many saved Tools Hub targets belong in their local console shelf.

- Config schema now includes `toolTargetPresetLimit`, defaulting to eight saved target presets.
- The retention limit accepts values from 1 to 24 and clamps oversized config input to 24.
- TUI target saves use the configured limit when retaining saved presets.
- Config store writes normalize and trim saved targets through the configured retention limit without losing other config values.
- Tests cover default config, config set coercion, invalid lower bounds, oversized clamping, and persisted target trimming.
- Next: bulk target preset cleanup controls.

## v0.4.46 - Tools Target Preset Bulk Cleanup

Status: draft PR #108.

Goal: make saved Tools Hub target shelves easy to prune when an operator has accumulated many entries for one diagnostic action.

- Tools workspace now supports `D` to remove every saved target preset using the selected saved action.
- Bulk cleanup refuses OS-aware generated presets unless the selected action/target pair is actually saved.
- The helper normalizes saved presets before matching and returns stable remaining preset order.
- The target preset header, shortcut footer, README, and changelog now expose the bulk cleanup control.
- Tests cover action-level removal, generated-preset refusal, and empty selection no-op behavior.
- Next: explicit confirmation dialogs for larger config cleanups.

## v0.4.47 - Tools Target Cleanup Confirmation

Status: draft PR #109.

Goal: make bulk config cleanup feel like an OS control surface by requiring visible, exact confirmation before deleting multiple saved targets.

- Pressing `D` in the Tools workspace now opens a `:cleanup` prompt instead of immediately mutating saved target config.
- The prompt shows the selected action id, affected saved preset count, and exact phrase such as `delete tools.dns`.
- Bulk cleanup only executes when the typed phrase matches exactly after trimming whitespace.
- Rejected confirmations leave saved presets unchanged and emit a warning event.
- The Tools workspace header, README, and changelog now describe the confirmation gate.
- Tests cover preview rows, exact confirmation, rejected confirmation, and no-selection behavior.
- Next: reusable config-cleanup confirmation primitives for logs, filters, and handoff shelves.

## v0.4.48 - Config Cleanup Confirmation Model

Status: draft PR #110.

Goal: give picos a shared, reusable confirmation primitive for config cleanup shelves before adding more destructive configuration maintenance controls.

- Core now exposes `createConfigCleanupPreview()` for target/scope/count preview rows and exact phrase generation.
- Core now exposes `submitConfigCleanupConfirmation()` to classify accepted and rejected cleanup confirmations without executing cleanup work.
- Tools target bulk cleanup now carries the shared config cleanup preview while keeping its existing Tools-specific rows.
- Tools target cleanup confirmation now delegates exact phrase matching to the shared model.
- README and changelog describe the reusable config cleanup confirmation posture.
- Tests cover generic cleanup previews, accepted/rejected confirmation results, and Tools integration with the shared preview.
- Next: apply the shared cleanup model to Logs search/profile preset cleanup.

## v0.4.49 - Logs Preset Cleanup Confirmation

Status: draft PR #111.

Goal: let operators prune Logs search presets and severity/search profiles through the shared exact-confirm cleanup model.

- Logs workspace now supports `D` to open a cleanup confirmation for saved search presets and profiles.
- Cleanup preview shows search preset count, profile count, and exact `clear logs` phrase.
- Exact confirmation clears both persisted log search presets and log profiles.
- Rejected confirmations leave saved log config untouched and emit a warning event.
- Tests cover preview rows, rejected confirmation, confirmed cleanup, and empty shelf no-op behavior.
- Next: apply the same cleanup model to route/endpoint filter preset shelves.

## v0.4.50 - Route and Endpoint Filter Cleanup Confirmation

Status: draft PR #112.

Goal: make saved route, connection, and port filter shelves manageable with the same exact-confirm cleanup posture as Tools and Logs.

- Routes workspace now supports `D` to open a cleanup confirmation for saved route filter presets.
- Connections and Ports workspaces now support `D` to clean their own saved filter preset shelves independently.
- Cleanup previews show affected preset counts and exact phrases: `clear routes`, `clear connections`, or `clear ports`.
- Rejected confirmations leave saved filter config untouched and emit warning events.
- Confirmed cleanup persists the empty shelf back to config while leaving the active filter text available for the current inspection.
- Tests cover route cleanup preview/confirmation and endpoint cleanup preview/confirmation.
- Next: bring cleanup confirmation to Timeline and Tools history filter shelves.

## v0.4.51 - Timeline and Tools History Cleanup Confirmation

Status: draft PR #113.

Goal: finish the filter-preset cleanup sweep across the remaining event/history shelves.

- Timeline workspace now supports `D` to open exact `clear timeline` confirmation for saved timeline search presets.
- Tools workspace now supports `C` to open exact `clear tools history` confirmation for saved Tools history filter presets without colliding with `D` target-action cleanup.
- Cleanup previews show affected preset counts and reuse the shared config cleanup rows.
- Rejected confirmations leave preset shelves untouched and emit warning events.
- Confirmed Tools history cleanup persists the empty filter preset shelf back to config.
- Tests cover Timeline search cleanup preview/confirmation and Tools history filter cleanup preview/confirmation.
- Next: add a compact cleanup index/status row so operators can see all cleanable shelves at a glance.

## v0.4.52 - Cleanup Shelf Status Index

Status: draft PR #114.

Goal: make saved preset cleanup discoverable from one OS-console status surface.

- Status workspace now renders a compact cleanup index for Logs, Routes, Connections, Ports, Timeline, Tools history, and saved Tools targets.
- Cleanup index shows active shelf count, total saved items, workspace shortcut, exact confirmation phrase, and per-shelf details.
- Empty indexes still explain that there are no saved preset shelves to clean.
- Tests cover non-empty and empty cleanup index rows.
- Next: add keyboard handoff from Status cleanup index rows into the owning workspace.

## v0.4.53 - Cleanup Index Keyboard Handoff

Status: draft PR #115.

Goal: make the Status cleanup index operate like a keyboard-driven OS console hub, not just a static checklist.

- Cleanup shelves now carry their owning TUI workspace target.
- Status cleanup index rows can be selected with `j/k` or arrow keys.
- Pressing `enter` on a selected active cleanup shelf jumps to the owning workspace and logs the cleanup shortcut plus exact confirmation phrase.
- Zero-count shelves remain visible for awareness but are skipped by selection and handoff.
- Tests cover active-shelf selection, wraparound, empty-index behavior, selected row formatting, and target workspace metadata.
- Next: add a focused Status cleanup detail pane that previews the exact cleanup command flow before jumping.

## v0.4.54 - Cleanup Detail Pane

Status: draft PR #116.

Goal: make cleanup handoff decisions visible before the operator leaves Status.

- Status now renders a cleanup detail pane for the selected active cleanup shelf.
- Detail rows show target workspace, target screen id, cleanup shortcut, affected item count, shelf-specific details, exact confirmation phrase, and jump instruction.
- Empty cleanup indexes keep a useful detail pane explaining that no active cleanup shelf is selected.
- Tests cover selected detail rows and empty-detail fallback rows.
- Next: add a small cleanup command preview/audit row after the operator jumps into the owning workspace.

## v0.4.55 - Cleanup Jump Audit

Status: draft PR #117.

Goal: preserve cleanup context after the operator leaves Status for the owning workspace.

- Status cleanup handoff now creates a small cleanup jump audit model from the selected shelf.
- Destination workspaces render a `CLEANUP HANDOFF` row set when the current screen matches the handoff target.
- Audit rows show source, target workspace, shortcut, affected count, exact phrase, and shelf detail.
- Main workspace height is adjusted so the destination panel keeps room for the audit rows.
- Tests cover audit model rows and empty audit formatting.
- Next: make the destination handoff row actionable by opening the matching cleanup prompt directly.

## v0.4.56 - Actionable Cleanup Handoff

Status: draft PR #118.

Goal: make Status cleanup handoff operate like a real console workflow instead of a passive reminder.

- Destination cleanup handoff rows now expose an action plan only when the current screen matches the selected cleanup shelf.
- Pressing `enter` on a matching destination handoff opens the existing exact-confirm cleanup prompt for Logs, Routes, Connections, Ports, Timeline, Tools history, or Tools targets.
- Non-matching screens do not expose a prompt action, preserving the normal `enter` behavior for endpoints, files, processes, and remotes.
- Tests cover action plan matching, non-matching screen fallback, and action row formatting.
- Next: add a dismiss/clear handoff action so normal destination `enter` behavior can resume after the cleanup prompt is reviewed.

## v0.4.57 - Clearable Cleanup Handoff

Status: draft PR #119.

Goal: let operators review cleanup handoff context without permanently stealing the destination workspace's normal `enter` behavior.

- Destination cleanup handoffs now expose a dismiss plan only on the matching target screen.
- Pressing `esc` on a matching destination handoff clears the audit banner and restores the workspace's normal `enter` behavior.
- The handoff banner now shows `CLEANUP DISMISS esc clears handoff` plus the restored workspace context.
- Tests cover matching dismiss plans, non-matching fallback, and dismiss row formatting.
- Next: add a tiny handoff history row in Status so recently dismissed cleanup jumps remain auditable without blocking workspace controls.

## v0.4.58 - Cleanup Handoff History

Status: draft PR #120.

Goal: keep cleanup handoff decisions auditable in Status after destination banners are opened or dismissed.

- Cleanup handoffs now create a latest-history model for `prompt-opened` and `dismissed` outcomes.
- Status workspace renders the latest cleanup handoff history with target workspace, shortcut, exact phrase, shelf detail, and outcome text.
- Opening a destination cleanup prompt records `prompt-opened`; dismissing the handoff banner records `dismissed`.
- The history row does not keep intercepting destination workspace controls after the active handoff is cleared.
- Tests cover history model creation and row formatting for both outcomes.
- Next: add selectable cleanup history entries once multiple handoff events are retained.

## v0.4.59 - Selectable Cleanup Handoff History

Status: draft PR #121.

Goal: make cleanup handoff history behave like a small operator shelf rather than a single overwritten status line.

- Cleanup handoff history now retains a bounded newest-first list instead of only the latest entry.
- Status workspace renders a selectable cleanup history index with outcome, workspace, shortcut, exact phrase, and detail rows.
- Pressing `[` in Status cycles the selected cleanup history entry without colliding with the file handoff index `]` shortcut.
- The selected history detail keeps the target, shortcut, confirmation phrase, and outcome explanation visible.
- Tests cover bounded insertion, newest-first retention, selected item clamping, wraparound movement, empty-state rows, and selected row formatting.
- Next: add a direct re-open handoff action from selected cleanup history back to the owning workspace.

## v0.4.60 - Reopen Cleanup Handoff History

Status: draft PR #122.

Goal: let operators resume a previously opened or dismissed cleanup handoff directly from Status history.

- Cleanup handoff history entries now retain shelf id and affected item count so they can be restored into full cleanup jump audits.
- Status workspace shows a selected history reopen preview with target workspace, shortcut, exact phrase, detail, and item count.
- Pressing `R` in Status reopens the selected cleanup history entry, jumps to the owning workspace, and restores the destination `CLEANUP HANDOFF` row.
- Reopened handoffs still require the normal destination `enter` plus exact confirmation prompt before persisted config changes.
- Tests cover reopen plan creation, restored jump audit shape, empty reopen formatting, and selected history metadata.
- Next: promote cleanup history into a durable audit timeline/export or add explicit history clear/archive controls.

## v0.4.61 - Export Cleanup Handoff History

Status: draft PR #123.

Goal: make cleanup handoff history durable enough for review, handoff, and release/debug evidence.

- Cleanup handoff history now has markdown export plans for selected or all entries.
- Export files are written under the picos config `cleanup` directory with timestamped `picos-cleanup-*.md` names.
- Status workspace exposes `E` to export the current cleanup handoff history and logs the resulting path.
- Exported entries include outcome, workspace, screen, shortcut, exact confirmation phrase, affected count, and shelf detail.
- Tests cover selected/all export plans, empty export refusal, markdown content, stable paths, and file writes.
- Next: add cleanup history clear/archive controls or surface exported cleanup logs inside Timeline.

## v0.4.62 - Restore Cleanup Exports Into Timeline

Status: draft PR #124.

Goal: make exported cleanup decisions visible again inside the console after restart.

- Cleanup handoff export markdown can now be parsed back into Timeline-compatible events.
- The latest `cleanup/picos-cleanup-*.md` export is read from the picos config directory.
- TUI startup restores latest cleanup export events alongside the existing latest audit export and boot events.
- Restored cleanup events include outcome, label, workspace, screen, shortcut, exact phrase, affected count, and detail.
- Tests cover export parsing, latest export discovery, missing-directory fallback, and Timeline event shape.
- Next: add a Cleanup Export viewer/index or explicit clear/archive controls for exported cleanup files.

## v0.4.63 - Cleanup Export Status Index

Status: draft PR #125.

Goal: make durable cleanup export files visible from the Status console without leaving picos.

- Cleanup export files are indexed from the picos config `cleanup` directory.
- Status workspace renders a cleanup export index with scope, entry count, generated timestamp, and selected file path.
- Pressing `Y` in Status refreshes the cleanup export index.
- Pressing `}` in Status cycles the selected cleanup export row.
- Exporting cleanup history with `E` refreshes the index so the new file appears immediately.
- Tests cover export index discovery, newest-first ordering, selected row clamping, empty rows, and path detail rows.
- Next: add file-open/archive controls for selected cleanup exports or a dedicated Cleanup Export viewer.

## v0.4.64 - Open Cleanup Export Files

Status: draft PR #126.

Goal: make cleanup export evidence inspectable from the Status console while preserving picos' locked external-open posture.

- File-open safety planning now treats picos-owned `cleanup/*.md` exports as allowed markdown evidence files.
- Status workspace exposes `V` to open the selected cleanup export through the locked file-open confirmation.
- The cleanup export index hint now shows `Y refresh`, `}` select, and `V open`.
- File-open rows label cleanup export previews as `FILE OPEN cleanup-export` before requiring the exact `open` confirmation.
- Tests cover cleanup export file-open planning under the config `cleanup` directory.
- Next: add archive/delete controls for stale cleanup exports with exact confirmation.

## v0.4.65 - Archive Cleanup Export Files

Status: draft PR #127.

Goal: let operators retire stale cleanup export evidence from Status without deleting it or bypassing exact confirmation.

- Cleanup export archive plans now carry risk, privilege, exact confirmation phrase, source path, archive path, and lock reason.
- Only picos-owned `cleanup/picos-cleanup-(all|selected)-*.md` files can be archived.
- Confirmed archives move the selected export into `cleanup/archive`.
- Status workspace exposes `X` to open the selected cleanup export archive confirmation.
- The cleanup export index hint now shows `Y refresh`, `}` select, `V open`, and `X archive`.
- Tests cover locked/confirmed archive plans, blocked non-export files, file movement, and index removal after archive.
- Next: add a dedicated Cleanup Export viewer or archive browser.

## v0.4.66 - Cleanup Export Archive Browser

Status: draft PR #128.

Goal: keep retired cleanup export evidence visible from Status after it has been archived.

- Archived cleanup exports are indexed from `cleanup/archive`.
- Status workspace renders a separate cleanup archive browser with scope, entry count, generated timestamp, and selected file path.
- Pressing `B` in Status refreshes the cleanup archive browser.
- Pressing `{` in Status cycles the selected archived cleanup export row.
- Confirmed cleanup export archives refresh both the active export index and archive browser.
- Tests cover archive index discovery, newest-first ordering, selected row clamping, empty rows, and path detail rows.
- Next: add locked file-open or restore controls for archived cleanup exports.

## v0.4.67 - Telnet-Style TCP Alias

Status: draft PR #129 on `codex/picos-v0.4.67-telnet-alias`.

Goal: make picos friendlier for operators who expect telnet-style reachability checks while preserving the existing safe TCP connect implementation.

- CLI registration is now testable through `createCli()`.
- `picos telnet <host> <port>` is registered as a non-interactive TCP connect reachability alias.
- The telnet alias routes through the same host/port validation, timeout option, and TCP connect core as `picos connect`.
- Telnet output identifies the invoked command as `picos telnet host:port`.
- README documents both `connect` and `telnet` usage.
- Tests cover the CLI command registry for the telnet alias.
- Next: expose the telnet-style check inside Tools Hub and command-palette search.

## v0.4.68 - Telnet Tools Surface

Status: draft PR #130 on `codex/picos-v0.4.68-telnet-tools-surface`.

Goal: make telnet-style reachability visible from the OS-like TUI and Tools Hub, not just the standalone CLI alias.

- `picos tools telnet <host> <port>` now runs the same safe TCP reachability core as `picos tools port-check`.
- Tools Hub lists `telnet` with host and port fields so operators can discover it beside DNS, ping, traceroute, TLS, and port checks.
- The TUI Tools workspace now records `network.connect` runs through the `telnet` tool id, keeping the command detail closer to what operators expect.
- Command-palette search for `telnet` finds the read-only TCP connect action.
- Existing `port-check` history remains readable while new runs use the telnet-style surface.
- Tests cover the Tools Hub alias, palette search, and Tools workspace run-plan mapping.
- Next: add richer TCP detail rows in Tools history, including host, port, elapsed time, and timeout policy.

## v0.4.69 - TCP Tool Detail Rows

Status: draft PR #131 on `codex/picos-v0.4.69-tcp-detail-rows`.

Goal: make TCP reachability output feel more like an operator console by separating target metadata from connection status.

- `picos tools port-check <host> <port>` now includes a Target section with host, port, invoked command, and timeout policy.
- `picos tools telnet <host> <port>` shows the same Target section while preserving the telnet-style command surface.
- TCP Status rows remain focused on `OPEN`/`CLOSED`, elapsed time, and any socket error.
- Raw output now includes `[Target]` and `[Status]` sections for export, copy, and handoff readability.
- Tests cover Target rows, timeout display, command display, Status rows, and raw output.
- Next: expose selected TCP detail rows as copyable fields from Tools history.

## v0.4.70 - TCP Target Field Copy

Status: draft PR #132 on `codex/picos-v0.4.70-tcp-field-copy`.

Goal: let operators copy the useful TCP Target fields without grabbing an entire raw diagnostic blob.

- Tools history can now create a locked clipboard preview for a selected TCP `[Target]` section.
- The preview copies host, port, invoked command, and timeout rows when those rows exist in the selected tool raw output.
- The Tools workspace uses `v` for target-field copy, preserving `y` for summary copy and `c` for full raw output copy.
- Clipboard previews use the existing exact `copy` confirmation flow and remain locked until confirmed.
- Non-TCP tool runs without a `[Target]` section do not create a target-field clipboard preview.
- Tests cover the Target section extraction, locked preview shape, and empty-history behavior.
- Next: add a small detail selector so TCP Target and Status fields can be copied independently.

## v0.4.71 - TCP Copy Section Selector

Status: draft PR #133 on `codex/picos-v0.4.71-tcp-copy-section-selector`.

Goal: let operators choose which TCP detail section they want to copy before opening the locked clipboard preview.

- Tools workspace now uses `V` to toggle TCP field-copy selection between `target` and `status`.
- `v` opens a locked clipboard preview for the currently selected TCP section.
- Target section copy preserves host, port, command, and timeout rows.
- Status section copy preserves `OPEN`/`CLOSED`, elapsed time, and socket error rows when present.
- Runs without the selected section keep the copy action unavailable instead of copying unrelated output.
- Tests cover the section preview helper, selector cycling, and shortcut rendering.
- Next: add per-row cursor selection inside TCP detail sections.

## v0.4.72 - TCP Row Copy Selector

Status: draft PR #134 on `codex/picos-v0.4.72-tcp-row-copy-selector`.

Goal: make TCP diagnostics copyable at the exact row level without losing the existing whole-section copy path.

- Tools workspace now uses `,` and `.` to move a row cursor inside the selected TCP Target or Status section.
- `b` opens a locked clipboard preview for the selected TCP row.
- `v` still opens the whole selected TCP section preview, keeping v0.4.71 workflows intact.
- The Tools shortcut footer shows `row=current/total` only when the selected run has rows for the active TCP section.
- Moving between Tools history runs or switching Target/Status resets the row cursor to avoid stale row selection.
- Tests cover row cursor wrapping, row-level clipboard preview shape, unavailable rows, and footer rendering.
- Next: render the selected TCP row with an inline marker inside the detail pane.

## v0.4.73 - TCP Row Inline Marker

Status: draft PR #135 on `codex/picos-v0.4.73-tcp-row-marker`.

Goal: make row-level TCP copy selection visible directly where operators read the raw diagnostic output.

- Raw Tools detail rows now mark the selected TCP Target or Status row with `>`.
- Other rows in the selected TCP section are indented with a stable two-space prefix so the cursor is easy to scan.
- Summary and command detail tabs remain unchanged.
- Raw output export and handoff text remain unmodified; the marker is only a TUI detail rendering affordance.
- Tests cover the selected row marker and non-selected row indentation.
- Next: show a compact copy-target preview row near the Tools detail footer before opening the clipboard confirmation.

## v0.4.74 - TCP Copy Target Preview Row

Status: draft PR #136 on `codex/picos-v0.4.74-tcp-copy-target-preview`.

Goal: show exactly what TCP data will be copied before the operator opens the clipboard confirmation prompt.

- Tools workspace now adds a compact `copy target:` row before the shortcut footer when the selected run has rows for the active TCP section.
- The preview shows active section, section row count, selected row number, and selected row text.
- The preview is omitted for non-TCP runs or TCP sections without rows.
- Existing `b` row copy, `v` section copy, and `c` raw copy behaviors remain unchanged.
- Tests cover the preview row position and text beside the shortcut footer.
- Next: add a compact section preview summary for whole-section `v` copies.

## v0.4.75 - TCP Section Preview Summary

Status: draft PR #137 on `codex/picos-v0.4.75-tcp-section-preview-summary`.

Goal: make whole-section TCP copy as inspectable as row copy before clipboard confirmation.

- Tools workspace now adds a compact `copy section:` row before the row-level `copy target:` row when the selected run has rows for the active TCP section.
- The section preview shows active section, section row count, and the first row that will be included in `v` whole-section copy.
- The row preview remains focused on the active `b` row copy target.
- Non-TCP runs and empty TCP sections keep both preview rows hidden.
- Tests cover section preview ordering beside the row preview.
- Next: add truncation for long copy preview values so footer controls remain readable in narrow terminals.

## v0.4.76 - TCP Copy Preview Truncation

Status: draft PR #138 on `codex/picos-v0.4.76-tcp-copy-preview-truncation`.

Goal: keep TCP copy preview rows readable when command, host, or error text is long.

- `copy section:` and `copy target:` rows now truncate long preview values while preserving the actual clipboard payload.
- Truncation applies only to TUI preview text; `b`, `v`, `c`, export, and handoff output keep full data.
- Long TCP command/error values no longer push shortcut/footer controls out of view in narrow terminals.
- Tests cover row preview truncation and bounded preview row length.
- Next: add a compact copy-preview mode indicator so operators can see whether `b`, `v`, or `c` was last armed.

## v0.4.77 - Tool Copy Mode Indicator

Status: draft PR #139 on `codex/picos-v0.4.77-tool-copy-mode-indicator`.

Goal: make the active Tools copy workflow visible before the exact clipboard confirmation is submitted.

- Tools workspace now shows a compact `copy mode:` row when a copy preview is armed.
- The indicator distinguishes `b` row copy, `v` TCP section copy, `c` raw output copy, and `y` summary copy without changing the clipboard payload.
- TCP row mode includes the active section and row position, while TCP section mode includes the selected section and row count.
- The indicator is colored with the existing clipboard preview styling in the TUI.
- Tests cover raw, section, and row copy mode rows alongside the existing TCP preview rows.
- Next: add a Tools copy help strip that groups `b`, `v`, `c`, and `y` with their current availability.

## v0.4.78 - Tools Copy Help Strip

Status: draft PR #140 on `codex/picos-v0.4.78-tools-copy-help-strip`.

Goal: make Tools copy shortcuts discoverable without making the footer even denser.

- Tools workspace now shows a compact `copy help:` strip on taller terminals for the selected run.
- The strip groups `b row`, `v section`, `c raw`, and `y summary` with `ok`/`-` availability.
- TCP-aware row and section copy show `ok` only when the active Target/Status section has copyable rows.
- Smaller terminal heights keep the existing detail/footer priority and omit the help strip.
- Tests cover TCP and non-TCP availability plus placement before the active `copy mode:` row.
- Next: add a compact Tools copy error hint when `b` or `v` is unavailable for the selected run.

## v0.4.79 - Tools Copy Unavailable Hint

Status: draft PR #141 on `codex/picos-v0.4.79-tools-copy-unavailable-hint`.

Goal: explain why TCP-only copy actions are unavailable without making operators infer it from missing previews.

- Tools workspace now shows a compact `copy hint:` row on taller terminals when the selected run has no active TCP Target/Status rows.
- The hint points operators toward `c raw` and `y summary` instead of silently leaving `b`/`v` unavailable.
- TCP runs with copyable Target/Status rows keep the hint hidden.
- The hint uses the same clipboard-preview styling as `copy help:` and `copy mode:`.
- Tests cover non-TCP hints, TCP omission, and placement after the copy availability strip.
- Next: add Tools copy availability to the locked clipboard confirmation prompt so the modal echoes the selected copy path.

## v0.4.80 - Tools Clipboard Path Modal

Status: draft PR #142 on `codex/picos-v0.4.80-tools-clipboard-path-modal`.

Goal: make locked clipboard confirmations repeat the selected Tools copy path before the operator types `copy`.

- Clipboard previews now support optional detail rows shown before the payload and confirmation line.
- Tools raw, summary, TCP section, and TCP row previews include path/tool/action details in the locked modal.
- TCP section previews include the selected section and row count.
- TCP row previews include the selected section and bounded row position.
- Existing non-Tools clipboard previews keep their current compact rows.
- Tests cover optional detail rows plus Tools raw, summary, section, and row metadata.
- Next: add compact clipboard preview clipping so large raw payloads do not dominate the confirmation modal.

## v0.4.81 - Clipboard Preview Clipping

Status: draft PR #143 on `codex/picos-v0.4.81-clipboard-preview-clipping`.

Goal: keep Tools copy confirmations readable when raw output contains long or multiline payloads.

- Clipboard preview formatting now accepts optional copy line and line-length limits.
- Bounded previews split multiline payloads into individual `copy` rows and show remaining hidden line counts.
- Tools workspace passes terminal-aware copy preview limits so raw output does not consume the whole panel.
- Confirmed clipboard writes still retain the full original payload; only the on-screen preview is clipped.
- Tests cover multiline clipping, line truncation, and remaining-line summaries.
- Next: make the clipboard confirmation audit row show preview clipping metadata before clipboard writes are enabled more broadly.

## v0.4.82 - Ports Process Control Preview

Status: draft PR #144 on `codex/picos-v0.4.82-ports-process-control-preview`.

Goal: close the first lazyifconfig process-control gap while preserving picos' locked-by-default OS mutation model.

- Action catalog now includes `process.terminate` as a destructive, user-privileged, disabled-by-default control.
- macOS/Linux/Windows adapters own the process termination command previews with a `<pid>` placeholder.
- Ports workspace supports `K` to show a locked process termination preview for the selected listening PID.
- The preview repeats the selected port, PID, process, user, exact `kill pid <pid>` phrase, and dry-run lock row.
- Selection, filtering, sorting, copying, and tab changes clear the process-control preview to avoid stale targets.
- Tests cover action metadata, adapter command ownership, selected-port preview rows, and Ports detail rendering.
- Next: add an exact typed confirmation prompt for port process control that records audit events while still refusing execution by default.

## v0.4.83 - Ports Process Control Confirmation

Status: draft PR #145 on `codex/picos-v0.4.83-ports-process-control-confirmation`.

Goal: make locked Ports process-control previews auditable through exact typed confirmation while still refusing execution by default.

- Ports `K` now opens a `:port-control` prompt for the selected listening PID.
- The prompt repeats the destructive action id, target port, PID, process, user, exact `kill pid <pid>` phrase, and dry-run lock row.
- Exact confirmations record a `confirmed-disabled` audit event in the console timeline.
- Rejected confirmations record a rejected audit event without changing OS state.
- Tests cover accepted and rejected confirmation metadata plus audit message formatting.
- Next: wire the disabled confirmation into the shared control execution policy rows so port control shares the same blockers as Action Center previews.

## v0.4.84 - Port Control Policy Rows

Status: draft PR #146 on `codex/picos-v0.4.84-port-control-policy-rows`.

Goal: make the Ports process-control prompt speak the same policy language as Action Center control previews.

- Ports process-control previews can now be converted into shared `ControlExecutionPlan` rows.
- Adapter-owned process termination command previews hydrate the selected PID before rendering.
- The `:port-control` prompt now shows `CONTROL EXECUTION`, `willExecute=false`, and blocker rows under the selected target.
- Submitting the prompt records the original port-control confirmation audit plus a matching `control execution` audit event.
- Tests cover the port-to-control-execution bridge and PID placeholder hydration.
- Next: add a keyboard action to inspect the selected port's execution policy in the side Inspector without opening the confirmation prompt.

## v0.4.85 - Port Policy Inspector

Status: draft PR #147 on `codex/picos-v0.4.85-port-policy-inspector`.

Goal: let operators inspect selected port process-control policy from the OS side Inspector before they open a destructive confirmation prompt.

- Ports workspace now supports `I` to toggle selected listening PID policy rows in the side Inspector.
- The Inspector renders `PORT CONTROL`, target port/PID/process, hydrated adapter command preview, and shared control execution blockers.
- The policy rows update with the selected sorted/filtered port while the Inspector view is pinned.
- Ports key hints now include the Inspector policy shortcut next to the locked `K` control flow.
- Tests cover the selected-port Inspector row formatter and PID placeholder hydration.
- Next: connect Inspector policy rows to process/file drill-down hints so the selected PID can move cleanly into Processes or Files before any destructive preview is opened.

## v0.4.86 - Port Inspector Drilldown Hints

Status: draft PR #148 on `codex/picos-v0.4.86-port-inspector-drilldown-hints`.

Goal: make the selected-port Inspector policy rows point operators toward read-only investigation before any destructive process-control preview.

- Port policy Inspector rows now include the existing `picos process <pid> --files` handoff command.
- The same Inspector rows explain that Ports `enter` opens Processes and Processes `enter` opens cwd/open-file paths.
- Ports workspace hints now mention `enter process` beside `I inspector` and locked `K control`.
- Processes workspace hints now clarify cwd/open-file entry and selected-resource copy behavior.
- Tests cover the Inspector drill-down rows on selected listening PIDs.
- Next: surface selected process cwd/open-file counts in the Ports Inspector so operators can see whether there is useful file evidence before jumping.

## v0.4.87 - Port Inspector File Evidence

Status: draft PR #149 on `codex/picos-v0.4.87-port-inspector-file-evidence`.

Goal: show whether selected listening PIDs already have useful file evidence before leaving Ports.

- Ports `I` now attempts a read-only process file snapshot for the selected PID without switching screens.
- Port policy Inspector rows show loaded file evidence counts: cwd, open files, and selectable resources.
- The evidence row only appears when the loaded snapshot PID matches the selected port PID.
- The existing drill-down row still points operators to `picos process <pid> --files`, Processes `enter`, and selected-resource copy.
- Tests cover PID-matched file evidence counts in selected-port Inspector rows.
- Next: add a small stale/mismatch indicator when cached process file evidence belongs to a different PID.

## v0.4.88 - Port Inspector Stale Evidence

Status: draft PR #150 on `codex/picos-v0.4.88-port-inspector-stale-evidence`.

Goal: keep Ports Inspector evidence trustworthy when selected ports change faster than cached process file snapshots.

- Port policy Inspector rows now show `fileEvidence status=stale` when cached file evidence belongs to a different PID.
- The stale row includes both the selected port PID and cached snapshot PID so operators can see why cwd/open-file counts are not trusted.
- Matching snapshots still render the loaded cwd/open-files/selectable-resources summary from v0.4.87.
- Tests cover the mismatched PID stale row in selected-port Inspector formatting.
- Next: add an unavailable/error row for file evidence lookup failures so permission or adapter gaps are visible in the Inspector.

## v0.4.89 - Port Inspector Evidence Errors

Status: draft PR #151 on `codex/picos-v0.4.89-port-inspector-evidence-errors`.

Goal: make process file evidence lookup gaps visible in Ports instead of only writing them to the event log.

- Port policy Inspector rows now show `fileEvidence status=unavailable` when the selected PID lookup returns no snapshot.
- Failed file evidence lookups now show `fileEvidence status=error` with a compact reason in the same Inspector surface.
- The TUI clears stale issue state before each new lookup and clears cached files when an error belongs to the selected PID.
- Loaded and stale file evidence rows from v0.4.87/v0.4.88 remain unchanged.
- Tests cover unavailable and error rows in selected-port Inspector formatting.
- Next: carry file evidence issue rows into Timeline audit events so lookup failures remain searchable after leaving Ports.

## v0.4.90 - Port Evidence Audit Timeline

Status: draft PR #152 on `codex/picos-v0.4.90-port-evidence-audit-timeline`.

Goal: make Ports file evidence lookup gaps searchable after operators leave the Ports workspace.

- Timeline audit filtering now treats `ports file evidence unavailable`, `error`, and `failed` records as audit events.
- Ports unavailable evidence logs now include `pid=... reason=no snapshot returned` so Timeline search has stable fields.
- Existing failed evidence logs remain audit-classified while loaded evidence stays outside the audit count.
- Tests cover unavailable file evidence records in the Timeline audit filter.
- Next: add a compact Timeline detail copy/export helper for selected audit rows.

## v0.4.91 - Timeline Audit Copy Preview

Status: draft PR #153 on `codex/picos-v0.4.91-timeline-audit-copy-preview`.

Goal: make audit rows portable as operator evidence without bypassing clipboard confirmation.

- Timeline now exposes a selected/latest event clipboard preview using the shared locked clipboard model.
- Audit rows use the `timeline-audit` copy source and include filter plus event id details.
- Timeline `c` opens a locked copy confirmation for the latest filtered/search-matched row.
- General non-audit Timeline rows can share the same helper through the `timeline-event` source.
- Tests cover audit-row clipboard preview text and metadata.
- Next: add a visible Timeline cursor so copy/export can target older rows without changing filters.

## v0.4.92 - Timeline Visible Cursor

Status: draft PR #154 on `codex/picos-v0.4.92-timeline-visible-cursor`.

Goal: let operators target older Timeline audit rows without changing filters or relying on the latest row.

- Timeline rows now support a visible `>` cursor when the TUI passes a selected index.
- Timeline `j`/`k` move the selected filtered/search-matched row with wraparound.
- Timeline `c` now copies the selected row rather than always copying the latest row.
- Summary rows show `selected=n/total` when a cursor is active.
- Tests cover cursor rendering and wraparound movement.
- Next: add a Timeline selected-row export helper for writing one audit row to the audit directory.

## v0.4.93 - Timeline Selected Export

Status: draft PR #155 on `codex/picos-v0.4.93-timeline-selected-export`.

Goal: make the selected Timeline row portable as a one-event audit file without exporting the whole filtered scope.

- Audit export plans now support `scope=selected` and write `picos-audit-selected-*.log`.
- Timeline exposes a selected-row export helper that respects the active filter, search query, and visible cursor.
- Timeline `e` writes the selected event to the picos audit directory and logs the result.
- Timeline footer text advertises `e export selected` beside copy/search/export controls.
- Tests cover selected-row export plan content, file path, query metadata, and cursor targeting.
- Next: add a selected-row open/handoff index so exported Timeline evidence can be reopened from Status.

## v0.4.94 - Timeline Export Status Index

Status: draft PR #156 on `codex/picos-v0.4.94-timeline-export-index`.

Goal: make Timeline audit export files discoverable and reopenable from the Status workspace.

- Audit export files under the picos `audit` directory now have a selectable index.
- The index reads selected, filtered, and all-scope `picos-audit-*.log` files newest first.
- Status now shows an Audit Exports shelf with `T` refresh, `)` select, and `W` locked file-open controls.
- File-open plans allow picos-owned Timeline audit export logs through the same exact `open` confirmation boundary as handoff files.
- Tests cover audit export indexing, row formatting, selected-item clamping, and locked file-open planning.
- Next: add archive controls for old Timeline audit exports so the Status audit shelf can stay tidy.

## v0.4.95 - Timeline Export Archive Controls

Status: draft PR #157 on `codex/picos-v0.4.95-timeline-export-archive`.

Goal: keep the Status audit export shelf tidy without deleting Timeline evidence.

- Audit export archive plans are limited to picos-owned `picos-audit-*.log` files under the config `audit` directory.
- Status now supports `Z` on the selected audit export to open an exact `archive audit export` confirmation prompt.
- Confirmed archives move the selected audit log into `audit/archive`; rejected or missing confirmation leaves the active index unchanged.
- The active audit export index is refreshed after successful archive moves.
- Tests cover locked archive plans, confirmation rows, blocked archive attempts, confirmed moves, active index cleanup, and archive index reads.
- Next: add an archived audit export browser or retention policy preview so older Timeline evidence can be reviewed without cluttering the active shelf.

## v0.4.96 - Timeline Archive Browser

Status: draft PR #158 on `codex/picos-v0.4.96-timeline-archive-browser`.

Goal: make archived Timeline evidence reviewable from Status instead of hiding it after shelf cleanup.

- Audit archive rows now render with a distinct `AUDIT ARCHIVE` header.
- File-open planning allows picos-owned `audit/archive/picos-audit-*.log` files through the same locked `open` confirmation boundary.
- Status loads archived Timeline audit exports on boot.
- Status now supports `U` to refresh archived audit exports, `(` to cycle the selected archived row, and `J` to open the selected archived log through locked file-open preview.
- Successful `Z` archive moves refresh both the active audit shelf and archived audit browser.
- Tests cover archive row formatting and locked open plans for archived Timeline audit logs.
- Next: add retention policy previews for old archived Timeline exports, still locked behind exact confirmation.

## v0.4.97 - Timeline Archive Retention

Status: draft PR #159 on `codex/picos-v0.4.97-timeline-archive-retention`.

Goal: make archived Timeline evidence manageable without unsafe broad deletes.

- Core audit archive retention plans keep the newest archived audit exports and mark older files as prune candidates.
- Retention pruning is destructive, user-privileged, and locked behind the exact phrase `prune audit archive`.
- Prune execution revalidates every candidate path against `audit/archive/picos-audit-*.log` before deleting.
- Status now supports `M` in the Audit Archive shelf to preview the retention plan and open the exact-confirm prompt.
- Confirmed pruning refreshes the archived audit browser.
- Tests cover locked previews, retained/candidate rows, blocked prune attempts, confirmed deletion, and post-prune archive index state.
- Next: make the audit archive retention limit configurable from the picos config screen.

## v0.4.98 - Audit Archive Retention Config

Status: draft PR #160 on `codex/picos-v0.4.98-audit-retention-config`.

Goal: let operators tune archived Timeline evidence retention without code changes.

- Config schema now includes `auditArchiveRetentionLimit`, defaulting to 10 archived audit exports.
- `picos config set auditArchiveRetentionLimit <n>` validates values from 1 to 60 and oversized persisted values clamp to 60.
- Status `M` retention previews use the configured limit instead of a hard-coded count.
- `config.show` logs the active audit archive and Tools target retention limits for quick operator inspection.
- Tests cover defaults, merge normalization, config-set coercion, invalid lower bounds, and oversized clamping.
- Next: add more Config workspace rows for language, refresh cadence, and execution policy.

## v0.4.99 - Config Workspace Retention Controls

Status: draft PR #161 on `codex/picos-v0.4.99-config-workspace-retention`.

Goal: make picos configuration feel like part of the terminal OS instead of a CLI-only side channel.

- The TUI screen order now includes a Config workspace after Status.
- Config rows expose `auditArchiveRetentionLimit` and `toolTargetPresetLimit` as keyboard-selectable retention controls.
- `j/k` or arrow keys move the selected config row, while `+/-` adjusts and persists the selected value.
- `enter` on Config runs the existing `config.show` action so operators can audit the config path and active retention values.
- Sidebar and Inspector labels include `screen.config` translations for English, Korean, Japanese, and Chinese.
- Tests cover screen order, config row formatting, selection movement, value clamping, and i18n labels.
- Next: add Config policy presets and exact-confirm reset controls.

## v0.4.100 - Config Workspace Core Controls

Status: draft PR #162 on `codex/picos-v0.4.100-config-core-controls`.

Goal: make common picos settings controllable from the OS-like TUI instead of requiring CLI config commands.

- Config workspace now lists language, refresh interval, default ping host, control execution mode, and admin dry-run allowance beside retention controls.
- `+/-` cycles languages, dry-run policy values, booleans, and bounded numeric controls while persisting through the config store.
- `enter` on `defaultPingHost` opens a text prompt and saves the trimmed host after validation.
- Control execution policy changes update the active TUI session after config writes, while mutation execution remains behind existing dry-run and confirmation gates.
- Tests cover expanded row formatting, selection wraparound, value clamping/cycling, and text-row edit prompts.
- Next: add Config sections for display, safety, retention, and connectivity groups so the settings panel scales without becoming a flat list.

## v0.4.101 - Config Policy Presets And Reset

Status: draft PR #163 on `codex/picos-v0.4.101-config-policy-reset`.

Goal: make picos configuration feel more like an OS settings panel, with explicit safety modes and reversible core-control defaults.

- Config workspace now exposes `P` to cycle policy presets across safe read-only, user dry-run, and admin dry-run modes.
- Policy presets update `controlExecutionMode`, `allowAdminDryRun`, and `enableExperimentalControls` together so operator intent stays coherent.
- Config workspace now exposes `R` to preview restoring core controls to defaults.
- Reset previews list changed values and require the exact phrase `reset config` before writing config.
- Confirmed resets restore language, refresh cadence, default ping host, retention limits, dry-run policy, and experimental controls while preserving unrelated saved shelves.
- Tests cover policy preset cycling, preset row formatting, reset preview rows, and rejected/confirmed exact confirmations.
- Next: add section detail panes with active safety posture, config path, and per-section persistence hints.

## v0.4.102 - Config Sectioned Settings Center

Status: draft PR #164 on `codex/picos-v0.4.102-config-sections`.

Goal: make Config scale like an OS settings center instead of a flat list as picos grows more controls.

- Config rows now belong to retention, display, connectivity, or safety sections.
- The Config workspace renders section headers and a `1..4` section jump strip above the editable rows.
- Pressing `1`, `2`, `3`, or `4` in Config jumps directly to display, safety, retention, or connectivity controls.
- Selected row status now includes its section for choice/boolean controls.
- Tests cover section metadata, section jump indexes, section header rendering, and existing value adjustment behavior.
- Next: add section action hints for reset, policy presets, and connectivity editing so Config can grow more OS settings without hidden controls.

## v0.4.103 - Config Section Detail Pane

Status: draft PR #165 on `codex/picos-v0.4.103-config-section-details`.

Goal: make Config explain the selected settings group like an OS control panel instead of only listing editable rows.

- Config now formats a section detail pane for the selected row.
- The detail pane shows the selected section, item count, config file path, selected key/value, active safety posture, and section-specific persistence hint.
- Safety posture is derived from `controlExecutionMode` plus `allowAdminDryRun`, showing safe read-only, user dry-run previews, or admin dry-run previews.
- The TUI renders the detail pane under the Config rows when terminal height allows it.
- Tests cover detail rows for display and safety sections, including config path and safety posture.
- Next: add section action hints for reset, policy presets, and connectivity editing so Config can grow more OS settings without hidden controls.

## v0.4.104 - Config Section Action Hints

Status: draft PR #166 on `codex/picos-v0.4.104-config-section-actions`.

Goal: make Config section details expose the exact keyboard actions available for each OS-like settings group.

- Config section detail rows now include the section shortcut number beside the section label and item count.
- Display detail rows advertise `+/-` language/refresh adjustment and exact reset.
- Safety detail rows advertise `+/-` policy adjustment, `P` preset cycling, and exact reset.
- Retention detail rows advertise bounded retention adjustment and exact reset.
- Connectivity detail rows advertise `enter` host editing and exact reset.
- Tests cover display, safety, and connectivity detail rows with action hints.
- Next: add more OS settings shelves under Config for network defaults, tool defaults, and workspace behavior without flattening the panel.

## v0.4.105 - Config Managed Shelves Overview

Status: draft PR #167 on `codex/picos-v0.4.105-config-managed-shelves`.

Goal: make Config reveal workspace-owned settings shelves instead of hiding them inside the JSON config file.

- Config now formats managed shelf rows for network defaults, endpoint filter presets, Tools defaults, Logs, Remotes, public IP display, and experimental control posture.
- The Config workspace renders managed shelf rows below the selected section detail when terminal height allows it.
- The TUI session now keeps `showPublicIp` from config so Config can report the active public-IP display setting.
- Tests cover managed shelf row formatting across network, tools, workspace behavior, logs, and remotes settings.
- Next: add keyboard handoffs from managed shelf rows into Routes, Connections, Ports, Tools, Logs, and Remotes.

## v0.4.106 - Config Managed Shelf Handoffs

Status: draft PR #168 on `codex/picos-v0.4.106-config-shelf-handoffs`.

Goal: make Config managed shelves navigable so settings discovery can hand operators into the owning OS workspace.

- Config now models managed shelf handoff targets for Network, Routes, Connections, Ports, Tools, Logs, and Remotes.
- Pressing `g` or `G` in Config cycles the active managed shelf target.
- Config renders a shelf handoff pane with the target workspace and `enter` jump hint.
- Pressing `enter` on Config still edits `defaultPingHost` when that row is selected; otherwise, when a shelf target is armed, it jumps to the target workspace.
- Tests cover shelf target cycling, wraparound, default selection, and handoff row formatting.
- Next: add shelf-specific detail/deep-link states for presets and cleanup prompts inside the destination workspaces.

## v0.4.107 - Config Shelf Landing Banners

Status: draft PR #169 on `codex/picos-v0.4.107-config-shelf-landing`.

Goal: make Config shelf jumps arrive with visible destination context instead of silently changing workspaces.

- Config now formats shelf landing rows with source, target, workspace, scope, and `esc` clear guidance.
- Shelf landing scopes summarize the destination settings surface, including network defaults, route filters, endpoint filters, Tools saved targets, Logs profiles, and Remotes profiles.
- Config shelf jumps store a landing target, and the destination workspace renders a landing banner only when that target belongs to the current screen.
- Pressing `esc` on the destination clears the Config shelf landing banner and restores normal workspace context.
- Tests cover Tools landing row formatting and existing handoff target behavior.
- Next: add shelf-specific destination cursor presets, such as jumping Tools to saved target controls and Logs to saved profile controls.

## v0.4.108 - Config Shelf Destination Focus

Status: draft PR #170 on `codex/picos-v0.4.108-config-shelf-focus`.

Goal: make Config shelf jumps behave like OS settings deep links by placing operators on the destination control surface.

- Config now models destination focus presets for each managed shelf target, including workspace focus area, cursor kind, index, and optional detail view.
- Destination landing rows include the focus preset so operators can see which shelf control area was armed.
- Config shelf jumps apply the focus preset in App state: Network interface list, Routes table view, Connections/Ports first endpoint rows, Tools saved target presets with summary detail, and Remotes profile focus.
- Tests cover Tools and Remotes destination focus preset contracts alongside landing row focus hints.
- Next: add visible per-workspace shelf-focus rows near the active controls so Logs profiles and route/filter shelves can expose richer cursor state.

## v0.4.109 - Config Shelf Focus Rows

Status: draft PR #171 on `codex/picos-v0.4.109-config-shelf-focus-rows`.

Goal: keep Config deep-link context visible inside the destination workspace, not only in the outer landing banner.

- Config now formats reusable workspace-local shelf focus rows with target, workspace, cursor, detail view, and `esc` guidance.
- Workspace row helpers can prepend Config shelf focus rows while preserving terminal height limits.
- Network, Routes, Connections, Ports, Tools, Logs, and Remotes receive the active Config shelf focus target when the landing target matches the current screen.
- Destination workspaces render focus rows near their active controls so operators can see the Config shelf context while reviewing route filters, endpoint filters, Tools targets, Logs profiles, or Remotes profiles.
- Tests cover focus row formatting and bounded row injection.
- Next: turn focus rows into actionable per-workspace cursor anchors, such as jumping Logs to profile controls and Routes/Endpoints to saved preset shelves.

## v0.4.110 - Config Shelf Focus Actions

Status: draft PR #172 on `codex/picos-v0.4.110-config-shelf-focus-actions`.

Goal: turn Config shelf focus rows into actionable deep-link controls.

- Config now models enter action plans for each shelf focus target, including preset cycling, prompt fallback, Interfaces jump, and Remotes focus.
- Workspace-local focus rows now show target-specific `enter=` guidance instead of passive hints.
- Pressing `enter` while a Config shelf landing is active runs the matching focus action before normal workspace enter behavior.
- Routes, Connections, and Ports cycle saved filter presets or open the matching filter prompt when no presets exist.
- Tools cycles target presets and keeps summary detail visible; Logs cycles saved profiles or opens log search; Network jumps into Interfaces; Remotes enters profile focus.
- Tests cover focus action plan formatting and bounded focus row injection.
- Next: add explicit selected shelf-control cursors for Logs profiles and route/endpoint preset shelves instead of relying on single-key action anchors.

## v0.4.111 - Config Shelf Control Cursors

Status: draft PR #173 on `codex/picos-v0.4.111-shelf-control-cursors`.

Goal: make Config shelf destinations show active OS-settings-style cursors on the saved control shelves they operate.

- Routes now renders a selected `SHELF CONTROL routes.filters` row when a Config shelf landing is active, including current filter, next preset, saved count, and enter action.
- Connections and Ports render selected endpoint filter shelf rows with the same current/next/saved control context.
- Logs renders a selected profile shelf row with the current level/query profile, next saved profile, saved count, and enter action.
- The TUI only enables these shelf-control rows while the matching Config shelf destination is active, preserving the normal workspace layout otherwise.
- Tests cover selected shelf-control formatting for route filters, endpoint filters, and log profiles.
- Next: add a compact Config-origin breadcrumb into the command prompt/edit dialogs so filter/search editing keeps the settings deep-link context visible.

## v0.4.112 - Config Prompt Breadcrumbs

Status: draft PR #174 on `codex/picos-v0.4.112-config-prompt-breadcrumbs`.

Goal: keep Config shelf origin visible while operators edit destination filters and searches.

- Config now formats reusable prompt breadcrumb rows for managed shelf destinations.
- Routes filter prompts show `CONFIG ORIGIN Config > Routes` plus `scope=routes.filters` while a Config shelf landing is active.
- Connections and Ports filter prompts show matching Config-origin breadcrumbs for endpoint filter edits.
- Logs search prompts show Config-origin breadcrumbs for log profile/search edits.
- Endpoint, route, and log row color rules now distinguish Config origin rows and scope rows from normal command input.
- Tests cover Config prompt breadcrumb formatting.
- Next: extend the same breadcrumb model to cleanup confirmations and external handoff dialogs so destructive/locked flows keep their origin path visible.

## v0.4.113 - Config Cleanup Breadcrumbs

Status: draft PR #175 on `codex/picos-v0.4.113-config-cleanup-breadcrumbs`.

Goal: keep Config shelf origin visible inside exact-confirm cleanup flows.

- Config now formats reusable cleanup breadcrumb rows for managed shelf destinations.
- Routes cleanup confirmation prompts show the Config origin path and `scope=routes.filters prompt=cleanup exact-confirm`.
- Connections and Ports cleanup confirmation prompts show matching endpoint shelf origin and scope rows.
- Logs cleanup confirmation prompts show Config origin and `scope=logs.profiles` before the locked cleanup preview.
- The cleanup breadcrumb rows reuse the same visual classification as prompt breadcrumbs, keeping origin rows cyan and scope/action rows yellow.
- Tests cover Config cleanup breadcrumb formatting.
- Next: extend origin breadcrumbs to external handoff and locked file-open dialogs so exported evidence and destructive-adjacent flows keep their source path.

## v0.4.114 - Config Locked Dialog Breadcrumbs

Status: draft PR #176 on `codex/picos-v0.4.114-config-locked-dialog-breadcrumbs`.

Goal: keep Config shelf origin visible in locked evidence-opening dialogs.

- Config now formats reusable locked dialog breadcrumb rows for managed shelf destinations.
- File-open confirmations can render `CONFIG ORIGIN Config > ...` plus `scope=... dialog=file-open locked` while a Config shelf landing is active.
- Status file-open prompts receive the active Config shelf landing target and prepend the locked dialog breadcrumb before the confirmation row.
- Locked file-open breadcrumb rows reuse the existing cyan/yellow origin and scope visual treatment.
- Tests cover locked dialog breadcrumb formatting for route and log shelf origins.
- Next: persist Config-origin metadata on file-open plans themselves so origin breadcrumbs survive workspace changes and exported evidence queues.

## v0.4.115 - File Open Origin Plans

Status: draft PR #177 on `codex/picos-v0.4.115-file-open-origin-plans`.

Goal: make locked evidence-opening dialogs carry their Config shelf origin as part of the plan instead of relying on current workspace state.

- File-open plans now accept structured Config shelf origin metadata with target, label, and scope.
- File-open previews render plan-owned origin metadata so the selected settings path survives the move into Status.
- Confirmed file-open submissions rebuild plans while preserving the original origin metadata.
- Config managed shelf helpers now create reusable file-open origin metadata from shelf targets.
- Tests cover plan-owned origin rows, preview metadata, audit preservation, and Config shelf origin creation.
- Next: write Config-origin metadata into exported evidence files and handoff indexes so reopened evidence can recover its settings source after restart.

## v0.4.116 - Evidence Origin Indexes

Status: draft PR #178 on `codex/picos-v0.4.116-evidence-origin-indexes`.

Goal: persist Config shelf origin metadata into exported evidence files and recover it from the Status handoff index.

- Route and endpoint handoff plans now accept Config-origin metadata and write it into exported markdown evidence.
- Handoff index parsing restores Config-origin metadata from route and endpoint evidence files.
- Status handoff rows show recovered Config origin and scope for indexed evidence.
- Opening indexed handoff evidence now prefers the recovered origin metadata when building the locked file-open plan.
- Direct route/endpoint exports still snapshot the active Config shelf origin before moving into Status.
- Tests cover route export metadata, endpoint export metadata, handoff index restoration, and Status row origin hints.
- Next: extend the same durable origin metadata to Timeline and cleanup export indexes.

## v0.4.117 - Timeline Cleanup Origin Indexes

Status: draft PR #179 on `codex/picos-v0.4.117-export-origin-indexes`.

Goal: keep Config shelf origin metadata durable across Timeline audit exports and cleanup history exports.

- Timeline audit export plans now accept Config-origin metadata and write it into exported audit log files.
- Timeline audit export indexes restore origin metadata and show Config source hints in Status rows.
- Cleanup handoff history export plans now accept Config-origin metadata and write it into exported cleanup files.
- Cleanup export indexes restore origin metadata and show Config source hints in Status rows.
- Status locked file-open plans for Timeline, archived Timeline, and cleanup exports now prefer recovered index origin metadata before falling back to current Config landing state.
- Timeline selected-row exports, Timeline scoped exports, and cleanup history exports snapshot the active Config shelf origin when available.
- Tests cover audit export metadata, cleanup export metadata, index restoration, and Status row origin hints.
- Next: add a compact origin detail pane in Status so selected evidence can show source, scope, path, and retention/archive controls together.

## v0.4.118 - Status Evidence Detail

Status: draft PR #180 on `codex/picos-v0.4.118-status-origin-detail`.

Goal: make selected Status evidence feel like an OS file-control detail pane instead of separate disconnected indexes.

- Status now renders a compact evidence detail pane above the handoff/export indexes.
- The pane summarizes currently selected handoff, Timeline audit export, archived Timeline audit export, cleanup export, and archived cleanup export rows when available.
- Each evidence entry shows recovered Config source, scope, local path, and the relevant keyboard controls for open/archive/retention actions.
- Empty evidence state remains useful with a refresh hint instead of a blank panel.
- Tests cover populated and empty evidence detail panes.
- Next: add keyboard focus/cycling for the Status Evidence pane so operators can choose one evidence family as the active detail target.

## v0.4.119 - Status Evidence Focus

Status: draft PR #181 on `codex/picos-v0.4.119-status-evidence-focus`.

Goal: make the Status Evidence detail pane keyboard-addressable instead of static.

- Status Evidence now tracks an active evidence family across handoff, Timeline audit export, archived Timeline audit export, cleanup export, and archived cleanup export groups.
- `Tab` in Status cycles the active evidence family across the groups that currently have indexed files.
- The detail pane cursor follows the active evidence family while preserving existing per-index selection keys.
- Focus cycling skips unavailable evidence groups and starts on the first available group when the stored focus is no longer present.
- Tests cover active row rendering, focus wraparound, unavailable-family fallback, and empty evidence state.
- Next: let the active Status Evidence target drive a unified `enter` action so operators can open, archive, or preview retention from the pane without remembering each per-index shortcut.

## v0.4.120 - Status Evidence Enter

Status: draft PR #182 on `codex/picos-v0.4.120-status-evidence-enter`.

Goal: make the active Status Evidence target perform a safe primary action from the pane.

- Status Evidence now creates a pure enter plan for the active evidence family.
- `enter` in Status follows that plan and routes to the matching existing safe control: handoff open, audit export open, archived audit open, cleanup export open, or archived cleanup selection.
- Evidence detail rows now show `enter=` hints beside the existing explicit shortcuts.
- When no evidence is indexed, `enter` still falls back to the cleanup shelf handoff flow.
- Tests cover unified enter plans, archived evidence routing, and no-evidence fallback planning.
- Next: add a secondary Status Evidence action mode so `a`/`x` can archive the active target and `m` can preview retention for archived Timeline evidence from the same pane.

## v0.4.121 - Status Evidence Secondary Actions

Status: draft PR #183 on `codex/picos-v0.4.121-status-evidence-secondary`.

Goal: let the Status Evidence cursor drive archive and retention actions without forcing operators to remember each per-index shortcut.

- Status Evidence now creates pure secondary action plans for archive and retention intents.
- `a` and `x` in Status follow the active evidence family and route to the existing safe archive controls for handoff, Timeline audit export, or cleanup export evidence.
- `m` in Status previews archived Timeline retention only when the active evidence family is an archived Timeline audit export.
- Archived cleanup evidence intentionally stays read-only/selectable from this secondary action path.
- Evidence detail rows now expose lowercase action hints beside the existing explicit uppercase controls.
- Tests cover active secondary action planning, archived Timeline retention planning, and blocked archived-cleanup secondary actions.
- Next: add an active-target command strip near the Status Evidence pane so open/archive/retention availability is visible even on narrow terminals.

## v0.4.122 - Status Evidence Command Strip

Status: draft PR #184 on `codex/picos-v0.4.122-status-evidence-command-strip`.

Goal: make Status Evidence feel more like an OS control panel by keeping the active target and its available commands visible above the detail list.

- Status Evidence now formats a compact active-target command strip for the focused evidence family.
- The strip shows `enter`, archive, and retention availability with both the unified lowercase controls and the existing explicit uppercase controls.
- Empty evidence state keeps an operator hint that `enter` can still fall back to cleanup shelf handoff while archive and retention remain unavailable.
- Status renders the strip above the evidence detail rows, so narrow terminal layouts keep the active command state visible before lower rows are clipped.
- Tests cover active audit command strip rows, archived Timeline retention rows, and empty evidence strip rows.
- Next: make Status Evidence selection keys operate like a small indexed table, with direct number jumps for available evidence families.

## v0.4.123 - Status Evidence Number Jumps

Status: draft PR #185 on `codex/picos-v0.4.123-status-evidence-number-jumps`.

Goal: make Status Evidence operate like a compact indexed OS table, so operators can jump directly to an evidence family without cycling through every group.

- Status Evidence now formats a numbered evidence family index for the currently available handoff, Timeline, cleanup, and archived evidence groups.
- `1..9` in the Status workspace selects the matching evidence family before global workspace shortcut handling runs.
- Number jump planning is pure and ignores unavailable or out-of-range indexes safely.
- The evidence index renders above the detail rows beside the active-target command strip, keeping direct-jump controls visible on narrow terminals.
- Tests cover index row formatting, valid number jump plans, and unavailable number jump handling.
- Next: make Status Evidence support per-family item movement with local `[`/`]` style controls from the same active-target model instead of relying on separate index sections.

## v0.4.124 - Status Evidence Item Movement

Status: draft PR #186 on `codex/picos-v0.4.124-status-evidence-item-move`.

Goal: make Status Evidence item selection operate from the active-target model instead of relying on scattered per-index shortcut sections.

- Status Evidence now creates pure active-family item move plans with wraparound for `previous` and `next` movement.
- `[` and `]` in Status move the selected item inside the active evidence family when that family has multiple indexed items.
- The command strip now shows `item=[/]` only when the active family has multiple movable items; otherwise it shows `item=-`.
- Status applies item movement to handoff, Timeline export, archived Timeline export, cleanup export, and archived cleanup export selections through the same planner.
- Tests cover item movement wraparound, single-item unavailable behavior, and command strip item availability.
- Next: collapse the older per-index evidence selector rows into a denser Status Evidence table so the active-target model owns browsing, opening, archiving, and retention from one place.

## v0.4.125 - Status Evidence Table

Status: draft PR #187 on `codex/picos-v0.4.125-status-evidence-table`.

Goal: make Status Evidence read like a compact OS console table instead of separate selector and detail fragments.

- Status Evidence now formats a dense table that combines number shortcuts, evidence family, selected item count, open/archive/retention actions, item movement availability, and target labels.
- Status renders the dense table below the active-target command strip, replacing the separate numbered index block while keeping the detail rows available for path/source inspection.
- The table marks the active evidence family with the same cursor used by `Tab`, `1..9`, `[`/`]`, `enter`, `a`, and `m`.
- Tests cover table row formatting with multi-item evidence and active-family command availability.
- Next: reduce the remaining per-family Status sections so evidence browsing, handoff cleanup, archive browsing, and retention feel like one table-driven control surface.

## v0.4.126 - Status Evidence Table Detail

Status: draft PR #188 on `codex/picos-v0.4.126-status-evidence-table-detail`.

Goal: keep Status Evidence source/path inspection inside the table-driven control surface instead of expanding every evidence family at once.

- Status Evidence now formats active table detail rows for the focused evidence family, including selected item count, label, Config source, path, and explicit controls.
- Status renders active table detail below the dense table, replacing the older all-family detail list in the main panel.
- Empty evidence state keeps a table detail hint so narrow terminals still explain how to refresh indexes.
- Tests cover active detail rows and empty detail rows.
- Next: fold the remaining handoff/audit/cleanup archive browsers into smaller Status table summaries while keeping their existing explicit shortcuts available.

## v0.4.127 - Status Evidence Summary

Status: draft PR #189 on `codex/picos-v0.4.127-status-evidence-summary`.

Goal: make the remaining Status evidence browsers scannable as a compact summary band before operators drill into the table.

- Status Evidence now formats a compact summary band for handoff, Timeline audit export, archived Timeline audit export, cleanup export, and archived cleanup export families.
- The summary shows selected item count, open/archive/retention availability, item movement availability, active cursor, available family count, and total indexed file count.
- Status renders the summary above the command strip so operators can see which underlying browsers have data before using the focused table controls.
- Summary cursor fallback now matches the effective active evidence family when the requested family is unavailable.
- Tests cover summary formatting across archived families and fallback cursor behavior.
- Next: start hiding or clipping the older explicit handoff/audit/cleanup browser blocks behind the summary/table so the Status panel becomes one evidence console instead of several stacked browsers.

## v0.4.128 - Status Evidence Legacy Bridge

Status: draft PR #190 on `codex/picos-v0.4.128-status-evidence-legacy-bridge`.

Goal: collapse the older explicit handoff/audit/cleanup evidence browser blocks behind the summary/table model while preserving their shortcut affordances.

- Status Evidence now formats a compact legacy bridge for the older handoff, Timeline audit, archived Timeline audit, cleanup, and archived cleanup browser shortcuts.
- The bridge shows selected item count and explicit refresh/select/open/archive/retention shortcuts for each indexed family.
- Status replaces the five expanded legacy browser blocks with the single bridge block below the table detail, reducing vertical pressure while keeping old shortcuts discoverable.
- Empty bridge state keeps a refresh shortcut hint for `H/T/U/Y/B`.
- Tests cover populated bridge rows and empty bridge fallback.
- Next: fold cleanup shelf/history into a similarly compact Status operations console so cleanup decisions stop pushing evidence rows down the terminal.

## v0.4.129 - Status Cleanup Ops Console

Status: draft PR #191 on `codex/picos-v0.4.129-status-cleanup-ops-console`.

Goal: make cleanup shelf decisions and cleanup handoff history fit into one compact Status operations surface.

- Status cleanup shelves and cleanup handoff history now format through a single `CLEANUP OPS` console.
- The compact console places the selected shelf first, then shows active shelf counts, exact-confirm phrases, selected history, reopen, export, and keyboard controls.
- Status replaces the separate cleanup index, detail, history, and reopen blocks with the compact operations console so Status Evidence stays higher in tall and short terminals.
- Empty cleanup state still shows the controls and history fallback without implying mutation is available.
- Tests cover populated and empty cleanup ops console rows.
- Next: combine update handoff, release check, and locked update-apply preview into a compact Status release console so the top of Status also behaves like an OS control strip.

## v0.4.130 - Status Release Console

Status: draft PR #192 on `codex/picos-v0.4.130-status-release-console`.

Goal: make Status release/update state behave like a compact OS control strip instead of several stacked diagnostic blocks.

- Status release checks now format through a single `STATUS RELEASE CONSOLE`.
- The console shows npm update status, GitHub release status, current/latest versions, selected handoff link, and locked update-apply confirmation in one compact block.
- npm and GitHub update errors remain visible inside the compact console.
- Status replaces the separate update check, GitHub release check, update-apply preview, and release handoff blocks with the release console.
- Tests cover populated, empty/not-run, and error release console states.
- Next: compact the external-open/file-open/action confirmation preview blocks into a shared Status dialog preview strip so transient confirmations stop pushing the OS dashboard down.

## v0.4.131 - Status Dialog Preview Strip

Status: draft PR #193 on `codex/picos-v0.4.131-status-dialog-preview-strip`.

Goal: keep transient Status confirmations visible without letting several preview blocks push the OS dashboard down.

- Status dialog previews now format through one shared `STATUS DIALOG PREVIEW` strip.
- The strip summarizes external-open, file-open, audit archive, audit retention, and cleanup archive previews with exact-confirm, target path/URL, Config origin, and prompt rows.
- Status replaces the separate transient confirmation preview blocks with the shared strip.
- Empty strip formatting remains useful for tests and future callers without rendering unnecessary UI in Status.
- Tests cover populated multi-preview and empty dialog preview states.
- Next: add a compact Status activity queue so recent release, cleanup, evidence, and dialog actions can be scanned without opening Logs or Timeline.

## v0.4.132 - Status Activity Queue

Status: draft PR #194 on `codex/picos-v0.4.132-status-activity-queue`.

Goal: make Status feel more like an OS console by showing the current release, dialog, cleanup, and evidence activity before detailed panels.

- Status now formats a compact `STATUS ACTIVITY QUEUE` across release, dialog, cleanup, and evidence sources.
- The queue pulls the high-signal header from each meaningful source and keeps release/dialog/cleanup/evidence in a stable scan order.
- Status renders the queue above the detailed release, dialog, cleanup, and evidence consoles so operators can see what changed without opening Logs or Timeline first.
- Empty queue state remains explicit when no meaningful Status activity is present.
- Tests cover populated multi-source queue rows and empty queue rows.
- Next: add a Status activity detail cursor so the queue can jump into the matching release, dialog, cleanup, or evidence console section.

## v0.4.133 - Status Activity Detail Cursor

Status: draft PR #195 on `codex/picos-v0.4.133-status-activity-detail-cursor`.

Goal: make the Status activity queue behave like a keyboard-driven OS console selector instead of a static summary.

- Status Activity now formats a compact `STATUS ACTIVITY DETAIL` block for the selected release, dialog, cleanup, or evidence source.
- The detail block mirrors the selected console header and first detail rows so operators can inspect the active source before scrolling into the full panel.
- Status `,` and `.` move the activity source cursor across currently available sources with wraparound.
- Empty or unavailable selected sources fall back to the first active activity source while keeping an explicit no-detail state when the queue is empty.
- Tests cover detail row formatting, fallback behavior, and source cursor movement.
- Next: wire the Status activity cursor into jump actions so `enter` can move focus or trigger the selected source's safest primary action.

## v0.4.134 - Status Activity Enter Plan

Status: draft PR #196 on `codex/picos-v0.4.134-status-activity-enter-plan`.

Goal: let the Status activity cursor perform the selected source's safest primary action with `enter`.

- Status Activity now creates an explicit enter plan for release, dialog, cleanup, evidence, and empty activity states.
- `enter` on release cycles the selected release handoff link using the same safe path as `n`.
- `enter` on dialog surfaces exact-confirm guidance without bypassing the locked confirmation prompt.
- `enter` on cleanup jumps to the selected cleanup shelf and leaves the existing exact-confirm handoff banner.
- `enter` on evidence runs the existing active evidence enter plan, preserving locked file-open behavior.
- Tests cover source-specific enter plans and fallback behavior when the requested source is unavailable.
- Next: add visible activity action result rows so recent Status enter outcomes are readable without opening Timeline.

## v0.4.135 - Status Activity Result Rows

Status: draft PR [#197](https://github.com/uulab-official/picos/pull/197) on `codex/picos-v0.4.135-status-activity-result-rows`.

Goal: keep recent Status activity enter outcomes readable in Status without requiring operators to open Timeline.

- Status Activity now formats compact `STATUS ACTIVITY RESULT` rows for the latest activity source action.
- The result row shows source, action, message, and optional detail such as cleanup handoff instructions or evidence action labels.
- Status stores the latest activity result after release, dialog, cleanup, evidence, and empty activity enter paths.
- The result appears directly below the activity queue/detail block, keeping action feedback close to the cursor.
- Tests cover populated result rows and empty result rows.
- Next: add bounded activity result history so the last few Status activity actions remain visible across rapid keyboard operations.

## v0.4.136 - Status Activity Result History

Status: draft PR [#198](https://github.com/uulab-official/picos/pull/198) on `codex/picos-v0.4.136-status-activity-result-history`.

Goal: make rapid Status activity actions auditable in-place by keeping the last few outcomes visible without opening Timeline.

- Status Activity now appends each source `enter` outcome into a bounded newest-first result history.
- `STATUS ACTIVITY RESULT HISTORY` shows the count, source, action, message, and optional detail for recent activity outcomes.
- Status keeps the latest result row while adding history rows directly below it, so both the current action and recent trail stay near the activity cursor.
- Evidence fallback handoffs now record the cleanup handoff detail in the same activity result history.
- Tests cover bounded newest-first history, detail rows, and empty history formatting.
- Next: add keyboard selection/copy for Status activity result history rows so operators can reuse recent action details without opening Timeline.

## v0.4.137 - Status Activity History Copy

Status: draft PR [#199](https://github.com/uulab-official/picos/pull/199) on `codex/picos-v0.4.137-status-activity-history-copy`.

Goal: make recent Status activity outcomes reusable from the OS console surface without opening Timeline or Logs.

- Status Activity result history now has a selected row cursor with newest-first wraparound movement.
- `u` and `i` move the selected activity result history row while keeping the selected count visible in `STATUS ACTIVITY RESULT HISTORY`.
- `y` opens the existing locked clipboard confirmation for the selected activity result, preserving the safe `:clipboard` flow.
- Clipboard previews use a dedicated `status-activity` source and include the selected source, action, message, optional detail, and selected row count.
- Tests cover cursor movement, selected history row formatting, clipboard preview payloads, and empty history behavior.
- Next: add a compact copy preview strip for Status activity history so long details can be inspected before confirming copy.

## v0.4.138 - Status Activity Copy Preview

Status: draft PR [#200](https://github.com/uulab-official/picos/pull/200) on `codex/picos-v0.4.138-status-activity-copy-preview`.

Goal: show the selected Status activity history copy payload before opening the locked clipboard confirmation.

- Status now renders `STATUS ACTIVITY COPY PREVIEW` directly below the selected activity result history.
- The strip reuses the existing clipboard preview formatter with compact limits, then replaces the generic header with a Status-specific summary.
- Preview rows show the selected history label, selection detail, first copy lines, overflow count, and locked `:clipboard` confirmation hint.
- Empty Status activity history keeps an explicit no-copy-preview state so keyboard discovery remains visible.
- Tests cover populated and empty copy preview rows.
- Next: add detail selection/expansion for long Status activity copy previews without leaving Status.

## v0.4.139 - Status Activity Copy Preview Detail

Status: draft PR [#201](https://github.com/uulab-official/picos/pull/201) on `codex/picos-v0.4.139-status-activity-copy-preview-detail`.

Goal: let operators inspect longer Status activity copy previews in-place before opening the locked clipboard confirmation.

- `STATUS ACTIVITY COPY PREVIEW` now includes selected row and expanded state metadata.
- `;` cycles the selected copy preview row, keeping the active preview line marked with `>`.
- `=` toggles expanded copy preview mode so longer selected history payloads can show additional copy lines before `:clipboard`.
- Copy preview selection resets when a new Status activity result is recorded or when the selected activity history row changes.
- Tests cover preview row movement, wraparound, expanded rows, and empty preview behavior.
- Next: add a dedicated Status activity copy preview audit event so copy-intent inspection is searchable in Timeline before confirmation.

## v0.4.140 - Status Activity Copy Intent Audit

Status: draft PR [#202](https://github.com/uulab-official/picos/pull/202) on `codex/picos-v0.4.140-status-activity-copy-intent-audit`.

Goal: make Status activity copy intent searchable in Timeline before the operator confirms a clipboard write.

- Status Activity now formats a dedicated `clipboard intent status-activity` audit message for selected history copy previews.
- Pressing `y` in Status logs the copy intent, selected preview row, expanded state, copy line count, and first preview line before opening `:clipboard`.
- Timeline audit filtering/search can find `status-activity` copy intent events even when the clipboard write remains unconfirmed.
- Tests cover the copy-intent audit message and Timeline audit search behavior.
- Next: add a Status activity copy-intent review shelf so recent unconfirmed copy intents can be revisited without filtering Timeline manually.

## v0.4.141 - Status Activity Copy Intent Shelf

Status: draft PR [#203](https://github.com/uulab-official/picos/pull/203) on `codex/picos-v0.4.141-status-activity-copy-intent-shelf`.

Goal: keep recent Status activity copy intents visible in Status after `y` opens the locked clipboard confirmation.

- Status Activity now creates structured copy-intent records from the same selected preview data used by the Timeline audit message.
- Pressing `y` appends the intent to a newest-first `STATUS ACTIVITY COPY INTENTS` shelf before opening `:clipboard`.
- The shelf shows selected preview row, expanded state, copy line count, and first preview text so unconfirmed clipboard attempts can be reviewed without filtering Timeline manually.
- Empty Status sessions keep an explicit no-intents row so the keyboard workflow remains discoverable.
- Tests cover intent record creation, bounded history append, populated shelf rows, and empty shelf rows.
- Next: add keyboard selection for the copy-intent shelf and a direct Timeline audit search jump for the selected intent.

## v0.4.142 - Status Activity Copy Intent Timeline Jump

Status: draft PR [#204](https://github.com/uulab-official/picos/pull/204) on `codex/picos-v0.4.142-status-activity-copy-intent-jump`.

Goal: make Status copy-intent review actionable by selecting older intents and jumping directly into matching Timeline audit rows.

- `STATUS ACTIVITY COPY INTENTS` now supports `<` and `>` selection with wraparound movement.
- `g` from Status creates a Timeline handoff for the selected copy intent, switches Timeline to the audit filter, applies the selected intent label as the search query, and resets the Timeline cursor.
- New copy intents reset the intent shelf cursor to the newest row so repeated `y` actions stay predictable.
- The Status activity header and copy-intent controls now document `<`/`>` selection and `g` Timeline audit search.
- Tests cover copy-intent shelf movement, empty selection behavior, and Timeline search payload creation.
- Next: let selected copy-intent rows reopen their matching locked clipboard preview or export a small audit handoff file from Status.

## v0.4.143 - Status Activity Copy Intent Replay

Status: draft PR [#205](https://github.com/uulab-official/picos/pull/205) on `codex/picos-v0.4.143-status-activity-copy-intent-replay`.

Goal: let selected Status copy-intent rows reopen their original payload through the locked clipboard confirmation flow.

- Status Activity copy-intent records now retain the original copy payload alongside audit metadata.
- `v` from Status replays the selected `STATUS ACTIVITY COPY INTENTS` row into the existing `:clipboard` confirmation dialog.
- Replayed previews include copy-intent selection metadata, selected row, expanded state, and line count while keeping the confirmation phrase locked to `copy`.
- The Status activity header and copy-intent controls now document `v replay` beside `<`/`>` selection and `g` Timeline audit search.
- Tests cover payload retention, selected replay preview shape, and empty replay behavior.
- Next: export selected copy-intent rows as small audit handoff files from Status for durable review outside the live event buffer.

## v0.4.144 - Status Activity Copy Intent Audit Export

Status: draft PR [#206](https://github.com/uulab-official/picos/pull/206) on `codex/picos-v0.4.144-status-activity-copy-intent-export`.

Goal: make selected Status copy-intent rows durable by exporting them as selected audit logs.

- `STATUS ACTIVITY COPY INTENTS` now exposes `e export` beside replay and Timeline search controls.
- Status `e` writes the selected copy-intent audit message through the shared `ConsoleAuditExportPlan`/`writeConsoleAuditExport` path.
- Exported files use the existing `audit/picos-audit-selected-*.log` format so Status Evidence and Timeline audit tooling can read them.
- Successful exports refresh the Status audit export index quietly so the file appears in existing evidence controls.
- Tests cover selected export plan shape, empty export behavior, and writing the selected export file.
- Next: add a Status copy-intent export-open shortcut so the newly exported audit file can be opened immediately after export.

## v0.4.145 - Status Activity Copy Intent Export Open

Status: draft PR [#207](https://github.com/uulab-official/picos/pull/207) on `codex/picos-v0.4.145-status-activity-copy-intent-export-open`.

Goal: let operators inspect the latest Status copy-intent audit export immediately without leaving the locked file-open flow.

- Status remembers the most recent copy-intent audit export written by `e`.
- `z` from Status opens a locked `:file-open` confirmation for that latest export file instead of launching an OS opener directly.
- The open plan reuses `buildFileOpenPlan()` with `source=timeline-export`, so the exported audit file remains limited to the picos config directory and still requires typing `open`.
- `STATUS ACTIVITY COPY INTENTS` controls now show `z open export` beside replay, export, and Timeline search.
- Tests cover the export-to-file-open plan shape, including platform adapter, locked confirmation phrase, and picos-owned audit path.
- Next: add persisted boot discovery for the newest Status copy-intent export so `z` can work after restarting the TUI.

## v0.4.146 - Status Activity Copy Intent Export Restore

Status: draft PR [#208](https://github.com/uulab-official/picos/pull/208) on `codex/picos-v0.4.146-status-activity-copy-intent-export-restore`.

Goal: make the latest Status copy-intent audit export discoverable after restart so the `z` open flow survives beyond live React state.

- Status Activity now derives the latest persisted copy-intent export from the existing audit export index.
- Boot-time audit export loading restores that latest `status activity ...` selected export as the `z` open target.
- Manual audit export refresh also refreshes the remembered `z` target, so Evidence changes and copy-intent export opening stay in sync.
- The restore helper ignores unrelated selected/filtered audit exports and only accepts selected exports whose query starts with `status activity `.
- Tests cover latest persisted export discovery, empty index behavior, scope filtering, and conversion back into a locked file-open-ready export plan.
- Next: surface the restored export path in the Status Activity copy-intent shelf so operators can see what `z` will open before pressing it.

## v0.4.147 - Status Activity Copy Intent Export Target Row

Status: draft PR [#209](https://github.com/uulab-official/picos/pull/209) on `codex/picos-v0.4.147-status-activity-copy-intent-export-path`.

Goal: make the restored `z` file-open target visible inside the Status Activity copy-intent shelf before the operator presses the shortcut.

- `STATUS ACTIVITY COPY INTENTS` now shows a compact `z target=` row when a latest copy-intent audit export is available.
- The target row includes the export file name, original Status Activity query, and event count.
- Empty copy-intent shelves still show the restored export target, so a restarted TUI can explain what `z` will open even before new copy intents are recorded.
- The row is backed by the same `ConsoleAuditExportPlan` used by the locked file-open flow, avoiding a separate display-only state.
- Tests cover the restored target row for empty shelves and keep the existing copy-intent shelf controls stable.
- Next: let `z` also select the matching Status Evidence audit export row so the Evidence table and Activity shelf point at the same file.

## v0.4.148 - Status Activity Copy Intent Evidence Sync

Status: draft PR [#210](https://github.com/uulab-official/picos/pull/210) on `codex/picos-v0.4.148-status-activity-copy-intent-evidence-sync`.

Goal: keep the Status Activity `z` file-open target and Status Evidence audit selection aligned.

- Status Activity can now resolve the latest copy-intent export plan back to its audit export index row.
- Pressing `z` selects the matching Status Evidence audit export row before opening the locked `:file-open` prompt.
- `z` also moves Status Evidence focus to the audit family when a matching row exists, so the Evidence table and Activity shelf point at the same file.
- Missing or stale export targets still open through the existing locked file-open flow without forcing an invalid Evidence selection.
- Tests cover export path to Evidence index matching and missing target behavior.
- Next: add a compact `z evidence=` hint beside the target row so the Activity shelf shows the matching Evidence row number before opening.

## v0.4.149 - Status Activity Copy Intent Evidence Hint

Status: draft PR [#211](https://github.com/uulab-official/picos/pull/211) on `codex/picos-v0.4.149-status-activity-copy-intent-evidence-hint`.

Goal: make the Status Activity `z` open target explain its matching Status Evidence audit row before the operator presses it.

- `STATUS ACTIVITY COPY INTENTS` now appends `evidence=<row>` to the restored `z target=` row when the latest export resolves to a Status Evidence audit index row.
- The row number is one-based to match the operator-visible Evidence table instead of the internal array index.
- Missing or stale export targets still omit the hint while preserving the existing `z target`, query, and event preview.
- The TUI render path uses the same export-to-Evidence resolver as the `z` open handler, keeping preview and action behavior aligned.
- Tests cover the rendered `evidence=` hint for restored copy-intent export targets.
- Next: let Status Activity expose a direct Evidence focus jump for the matching export without opening the file prompt.

## v0.4.150 - Status Activity Copy Intent Evidence Focus

Status: draft PR [#212](https://github.com/uulab-official/picos/pull/212) on `codex/picos-v0.4.150-status-activity-copy-intent-evidence-focus`.

Goal: let operators move from the Status Activity copy-intent export target to its matching Evidence audit row without opening the file prompt.

- `STATUS ACTIVITY COPY INTENTS` controls now advertise `w Evidence focus` beside replay, export, `z` open, and Timeline search.
- Pressing `w` resolves the latest copy-intent export to the matching Status Evidence audit row and selects it directly.
- `w` moves the Status Evidence active family to `audit` and keeps the operator in Status without creating a locked `:file-open` prompt.
- Missing or stale export targets produce a warning and leave the current Evidence selection untouched.
- Tests cover the pure focus plan, stale target behavior, and the visible `w Evidence focus` control row.
- Next: add an Activity-to-Evidence status result row so `w` focus jumps are recorded in the recent Status Activity result history.

## v0.4.151 - Status Activity Evidence Focus Result

Status: draft PR [#213](https://github.com/uulab-official/picos/pull/213) on `codex/picos-v0.4.151-status-activity-evidence-focus-result`.

Goal: keep `w` Activity-to-Evidence focus jumps visible in the same recent activity result stream as other Status actions.

- `w` focus now records a `STATUS ACTIVITY RESULT source=evidence action=focus-evidence` row.
- The result detail preserves the target Evidence family, one-based selected row, total audit export count, and target path.
- `STATUS ACTIVITY RESULT HISTORY` now retains the focus jump, so `u`/`i`, copy preview, and copy-intent capture can reuse it like other Status actions.
- The helper converts the same focus plan used by the `w` handler into the activity result, keeping visible logs and history aligned.
- Tests cover result formatting and history formatting for copy-intent Evidence focus jumps.
- Next: add a compact copy-intent focus audit event so `w` focus jumps are searchable in Timeline without requiring a clipboard action.

## v0.4.152 - Status Activity Evidence Focus Timeline Event

Status: draft PR [#214](https://github.com/uulab-official/picos/pull/214) on `codex/picos-v0.4.152-status-focus-timeline-event`.

Goal: make `w` Activity-to-Evidence focus jumps searchable in Timeline audit even when no clipboard confirmation is opened.

- `w` focus now logs a compact `status activity evidence focus` audit event with evidence kind, shortcut, one-based selected row, target label, and target path.
- Timeline audit filtering/search can find `evidence focus` jumps directly from the live event log.
- The Status result history still records the richer `focus-evidence` result, while Timeline keeps the compact audit trail.
- Tests cover the audit message formatter and Timeline audit search behavior for focus-only jumps.
- Next: add a direct Timeline search handoff for the latest `w` focus event so operators can jump from Status to the matching focus audit row immediately.

## v0.4.153 - Status Activity Evidence Focus Timeline Jump

Status: draft PR [#215](https://github.com/uulab-official/picos/pull/215) on `codex/picos-v0.4.153-status-focus-timeline-jump`.

Goal: let operators jump from Status to the Timeline audit row for the latest `w` Evidence focus event.

- Status remembers the latest `w` Evidence focus plan after selecting the matching audit export row.
- `G` from Status opens Timeline with the audit filter and a `status activity evidence focus` search query.
- The Timeline cursor lands on the newest matching focus audit row so repeated focus jumps are easy to review.
- The `STATUS ACTIVITY COPY INTENTS` controls now advertise `G focus search` beside `w Evidence focus` and `g Timeline audit search`.
- Tests cover focus search handoff creation, empty focus behavior, and updated controls.
- Next: add an evidence trail handoff from the Timeline focus row back to the matching Status audit export open/archive controls.

## v0.4.154 - Timeline Focus Evidence Trail

Status: draft PR [#216](https://github.com/uulab-official/picos/pull/216) on `codex/picos-v0.4.154-timeline-focus-evidence-trail`.

Goal: let selected Timeline focus audit rows return to the matching Status Evidence audit export controls.

- Timeline focus audit rows now expose an `E evidence` handoff.
- The handoff parses the selected `status activity evidence focus` row, extracts the quoted audit export path, and matches it against the Status audit export index.
- When a match exists, `E` switches back to Status, selects the audit Evidence family, and selects the matching audit export row.
- Missing non-focus rows, missing paths, or stale paths leave the current Status Evidence selection untouched and log a warning.
- Tests cover focus-row path extraction, index matching, empty search behavior, and the updated Timeline footer.
- Next: expose a compact Timeline evidence trail result row that previews the matching Status `W` open and `Z` archive controls before switching screens.

## v0.4.155 - Timeline Evidence Trail Preview

Status: draft PR [#217](https://github.com/uulab-official/picos/pull/217) on `codex/picos-v0.4.155-timeline-evidence-trail-preview`.

Goal: make Timeline-to-Status Evidence handoffs explain the next available audit controls before switching screens.

- Timeline focus evidence trail plans now include compact preview rows for the matched audit export.
- The preview shows the selected audit index position, target file name, path, and Status Evidence `W` open, `Z` archive, and `enter` open controls.
- Pressing `E` on a matching Timeline focus row logs the preview controls while selecting the matching Status audit export row.
- Tests cover the preview rows alongside the existing path extraction and index matching behavior.
- Next: render the latest Timeline evidence trail preview as a Status Activity result/history entry so the operator can copy or export the trail handoff itself.

## v0.4.156 - Timeline Evidence Trail Activity Result

Status: draft PR [#218](https://github.com/uulab-official/picos/pull/218) on `codex/picos-v0.4.156-timeline-trail-activity-result`.

Goal: make Timeline-to-Status Evidence trail handoffs reusable through Status Activity result/history.

- Timeline `E` handoffs now record a `STATUS ACTIVITY RESULT source=evidence action=timeline-evidence-trail`.
- The result detail preserves Status Evidence `W` open, `Z` archive, `enter` hints, and the target path.
- The existing Status Activity result history, copy preview, copy-intent, and export flow can reuse the trail handoff like other Status actions.
- Tests cover the result conversion and formatted rows.
- Next: persist Timeline evidence trail handoff records as selected audit exports so a restarted TUI can recover the last trail.

## v0.4.157 - Timeline Evidence Trail Audit Export

Status: draft PR [#219](https://github.com/uulab-official/picos/pull/219) on `codex/picos-v0.4.157-timeline-trail-audit-export`.

Goal: make Timeline Evidence trail handoffs durable through the existing selected audit export shelf.

- Timeline `E` handoffs now create a selected audit export with a `timeline evidence trail ...` query.
- The persisted audit event preserves trail kind, selected position, target label, target path, and Status Evidence `W`/`Z`/`enter` controls.
- The TUI writes the trail audit export when the handoff is used, then refreshes the Status audit export index while preserving the original Evidence target selection.
- A latest-trail recovery helper finds the newest persisted trail record from the Status audit export index after refresh or restart.
- Tests cover selected export formatting, disk write, and latest persisted trail recovery.
- Next: surface the recovered latest Timeline trail record directly in the Status Activity copy-intent shelf so restart recovery is visible without opening the audit index first.

## v0.4.158 - Timeline Evidence Trail Recovery Shelf

Status: draft PR [#220](https://github.com/uulab-official/picos/pull/220) on `codex/picos-v0.4.158-timeline-trail-recovery-shelf`.

Goal: make recovered Timeline Evidence trail records visible in Status Activity without opening the audit index first.

- Status Activity copy-intent shelves now render a `trail target=` row for the latest recovered Timeline Evidence trail audit export.
- The row shows the trail export file name, recovery query, and event count after audit index refresh or TUI boot.
- `refreshAuditExportIndex()` and startup audit index loading now restore the latest Timeline trail export into TUI state.
- The recovered trail row updates the shelf controls with a `trail recovered` hint.
- Tests cover the empty-shelf recovery row and control hint.
- Next: add a direct keyboard action that opens the recovered Timeline trail export through the locked file-open prompt.

## v0.4.159 - Timeline Evidence Trail Open Action

Status: draft PR [#221](https://github.com/uulab-official/picos/pull/221) on `codex/picos-v0.4.159-timeline-trail-open-action`.

Goal: make recovered Timeline Evidence trail exports directly openable through the existing locked file-open confirmation.

- Status Activity copy-intent shelf controls now expose `L open trail` when a recovered trail export is available.
- `L` builds a locked `:file-open` plan for the recovered `timeline evidence trail ...` selected audit export.
- The open action selects the matching Status Evidence audit row when the recovered trail export still exists in the audit index.
- The action clears conflicting external-open/archive/retention previews before opening the confirmation prompt.
- Tests cover the recovered trail file-open plan and shelf control hint.
- Next: add a Timeline search shortcut from the recovered trail row so operators can jump back to the source audit trail without opening a file.

## v0.4.160 - Timeline Evidence Trail Search Action

Status: draft PR [#222](https://github.com/uulab-official/picos/pull/222) on `codex/picos-v0.4.160-timeline-trail-search-action`.

Goal: let recovered Timeline Evidence trail exports jump back into Timeline audit search without opening a file.

- Status Activity copy-intent shelf controls now expose `N trail search` when a recovered trail export is available.
- `N` uses the recovered `timeline evidence trail ...` query to set Timeline's audit filter and search query.
- The jump selects the latest matching Timeline row so operators land near the most recent recovered trail event.
- Missing recovered trail exports keep the action locked with a warning instead of changing Timeline state.
- Tests cover the recovered trail Timeline search helper and updated shelf control hint.
- Next: add a compact recovered trail detail preview row showing the restored target path and the available `L`/`N` actions together.

## v0.4.161 - Timeline Evidence Trail Detail Preview

Status: draft PR [#223](https://github.com/uulab-official/picos/pull/223) on `codex/picos-v0.4.161-timeline-trail-detail-preview`.

Goal: make recovered Timeline Evidence trail rows self-explanatory without opening the audit index first.

- Status Activity copy-intent shelves now show a `trail detail path=... actions=L open N search` row when a recovered trail export exists.
- The detail row keeps the restored export path visible beside the compact `trail target=` summary.
- The row names the two available recovered-trail actions: `L` locked file-open and `N` Timeline audit search.
- Tests cover the compact detail row in the empty recovered shelf state.
- Next: add a selected recovered trail cursor so multiple recovered trail exports can be reviewed instead of only the latest one.

## v0.4.162 - Timeline Evidence Trail Selection

Status: draft PR [#224](https://github.com/uulab-official/picos/pull/224) on `codex/picos-v0.4.162-timeline-trail-selection`.

Goal: let Status Activity review more than the latest recovered Timeline Evidence trail export.

- Status Activity now indexes recovered Timeline Evidence trail exports as a selectable list.
- The copy-intent shelf shows `trail selected=current/total` when multiple recovered trail exports are available.
- `S` cycles the recovered trail selection without disturbing copy-intent `<`/`>` selection or Status Evidence item movement.
- `L` locked file-open and `N` Timeline audit search now target the selected recovered trail export.
- Tests cover multi-trail shelf formatting, recovered trail list indexing, selected trail lookup, and wraparound selection.
- Next: expose previous/next recovered trail shortcuts in the command palette so trail review is discoverable outside the Status footer.

## v0.4.163 - Timeline Evidence Trail Palette Actions

Status: draft PR [#225](https://github.com/uulab-official/picos/pull/225) on `codex/picos-v0.4.163-timeline-trail-palette-actions`.

Goal: make recovered Timeline Evidence trail review discoverable through the command palette, not only the Status footer.

- The action catalog now includes `status.timelineTrail.select`, `status.timelineTrail.open`, and `status.timelineTrail.search` read-only actions.
- Command palette searches for `trail` surface the recovered trail select/open/search actions.
- Running the palette actions reuses the same Status Activity selection, locked file-open, and Timeline audit-search paths as `S`, `L`, and `N`.
- Action summary counts include the new read-only Status actions while mutable action locks remain unchanged.
- Tests cover palette filtering and action catalog metadata for the recovered trail actions.
- Next: add command-palette result logging rows in Status Activity so palette-triggered trail operations are visible in the result history.

## v0.4.164 - Timeline Evidence Trail Palette Results

Status: draft PR [#226](https://github.com/uulab-official/picos/pull/226) on `codex/picos-v0.4.164-timeline-trail-palette-results`.

Goal: make command-palette recovered trail operations visible in Status Activity history.

- Palette-triggered recovered trail select/open/search actions now append `timeline-evidence-trail` result rows to Status Activity.
- Result rows include the palette action, selected index, total recovered trail count, file name, query, and path.
- Missing recovered trail actions record an unavailable result instead of disappearing into the event log.
- Keyboard `S`, `L`, and `N` keep their existing behavior while palette actions add the extra history row.
- Tests cover result row and result-history formatting for palette-triggered recovered trail actions.
- Next: add Timeline audit events for palette-triggered recovered trail actions so they are searchable across sessions.

## v0.4.165 - Timeline Evidence Trail Palette Audit Events

Status: draft PR [#227](https://github.com/uulab-official/picos/pull/227) on `codex/picos-v0.4.165-timeline-trail-palette-audit`.

Goal: make command-palette recovered trail operations searchable in Timeline audit, not only Status Activity result history.

- Palette-triggered recovered trail select/open/search actions now emit `palette timeline trail audit ...` events.
- Audit messages include action, selected index, total recovered trail count, file name, query, and path when a trail is selected.
- Missing recovered trail actions emit an unavailable audit row instead of only warning in the event log.
- Timeline audit search surfaces `palette timeline trail` events through the existing audit filter.
- Tests cover the audit message formatter and Timeline audit search rendering.
- Next: persist palette trail audit events through selected audit export shortcuts so they can be reopened after restart.

## v0.4.166 - Timeline Evidence Trail Palette Export Recovery

Status: draft PR [#228](https://github.com/uulab-official/picos/pull/228) on `codex/picos-v0.4.166-timeline-trail-palette-export-recovery`.

Goal: let palette trail audit events saved with Timeline `e` recover as trail exports after refresh or restart.

- Selected audit exports with `palette timeline trail` queries now join the recovered Timeline Evidence trail export list.
- Status Activity copy-intent shelves show palette trail selected exports as `trail target=... query=palette timeline trail` rows.
- Recovered palette trail exports reuse existing `L` locked file-open, `N` Timeline search, and `S` trail selection controls.
- Tests cover persisted palette trail selected audit exports through the audit index and recovered shelf rows.
- Next: surface the recovered trail query source in the detail row so operators can distinguish direct Timeline Evidence handoffs from palette audit exports.

## v0.4.167 - Timeline Evidence Trail Source Detail

Status: draft PR [#229](https://github.com/uulab-official/picos/pull/229) on `codex/picos-v0.4.167-timeline-trail-source-detail`.

Goal: make recovered trail rows reveal whether they came from a direct Evidence handoff or a palette audit export.

- Recovered trail detail rows now include `source=evidence` for direct `timeline evidence trail ...` selected exports.
- Recovered trail detail rows now include `source=palette` for `palette timeline trail` selected exports.
- Existing `L` locked file-open, `N` Timeline search, and `S` trail selection controls keep using the same selected export.
- Tests cover both direct recovered trail rows and palette recovered trail rows.
- Next: add a compact source filter for recovered trail lists once the shelf has enough mixed-source rows.

## v0.4.168 - Timeline Evidence Trail Source Filter

Status: draft PR [#230](https://github.com/uulab-official/picos/pull/230) on `codex/picos-v0.4.168-timeline-trail-source-filter`.

Goal: make mixed-source recovered trail shelves easy to scan by source.

- Status Activity recovered trail shelves now show `trail source=<filter> visible=<shown>/<total>` when more than one trail exists or a source filter is active.
- `Q` cycles recovered trail source filters across `all`, `evidence`, and `palette`.
- `S`, `L`, and `N` now operate on the filtered recovered trail list, while empty filters show an explicit unavailable row.
- Tests cover source filtering helpers, empty filtered shelves, and filtered selection rows.
- Next: expose recovered trail source filtering in the command palette so keyboard discovery does not depend on reading the Status controls row.

## v0.4.169 - Timeline Evidence Trail Source Palette Action

Status: draft PR [#231](https://github.com/uulab-official/picos/pull/231) on `codex/picos-v0.4.169-timeline-trail-source-palette`.

Goal: make recovered trail source filtering discoverable from the command palette.

- The action catalog now includes `status.timelineTrail.source` as a read-only Status action.
- Command palette searches for `trail source` expose the recovered trail source filter action.
- Running the palette action reuses the same `Q` source-filter cycle across `all`, `evidence`, and `palette`.
- Tests cover action catalog metadata and command palette discovery for the source filter action.
- Next: record palette-triggered source-filter cycles in Status Activity result history so filter changes remain visible after rapid trail review.

## v0.4.170 - Timeline Evidence Trail Source Palette Results

Status: draft PR [#232](https://github.com/uulab-official/picos/pull/232) on `codex/picos-v0.4.170-timeline-trail-source-results`.

Goal: keep command-palette source-filter changes visible in Status Activity result history.

- Palette-triggered recovered trail source-filter cycles now append `timeline-evidence-trail` result rows.
- Result rows include the selected source filter and visible/total recovered trail counts.
- Empty source filters still record visible `0/<total>` result rows.
- Keyboard `Q` keeps its existing lightweight log-only behavior while palette actions add the extra result row.
- Tests cover source-filter result formatting for populated and empty source filters.
- Next: emit Timeline audit events for palette-triggered source-filter cycles so filter changes are searchable outside Status.

## v0.4.171 - Timeline Evidence Trail Source Palette Audit

Status: draft PR [#233](https://github.com/uulab-official/picos/pull/233) on `codex/picos-v0.4.171-timeline-trail-source-audit`.

Goal: make command-palette source-filter changes searchable in Timeline audit, not only Status Activity result history.

- Palette-triggered recovered trail source-filter cycles now emit `palette timeline trail audit action=source ...` events.
- Source audit events include the selected `source=<all|evidence|palette>` filter and `visible=<shown>/<total>` counts.
- Timeline audit search can find source-filter cycles by queries such as `action=source`.
- Keyboard `Q` remains a lightweight Status-only source cycle, while command palette source cycles leave the fuller audit trail.
- Tests cover the source audit formatter and Timeline audit rendering/search path.
- Next: add a direct Timeline jump from the Status result row for the latest palette source-filter event.

## v0.4.172 - Timeline Evidence Trail Source Result Jump

Status: draft PR [#234](https://github.com/uulab-official/picos/pull/234) on `codex/picos-v0.4.172-timeline-trail-source-result-jump`.

Goal: let operators jump from a palette source-filter Status result row back into the matching Timeline audit event.

- Status Activity result history now builds Timeline audit search plans for palette `trail source` result rows.
- `STATUS ACTIVITY COPY PREVIEW` advertises `I audit jump` beside copy controls.
- Pressing `I` in Status jumps the selected palette source-filter result into Timeline with an `action=source source=<filter> visible=<shown>/<total>` audit search.
- Non-auditable Status result rows keep returning a clear unavailable path instead of changing screens.
- Tests cover the result-row search planner and copy preview control hint.
- Next: persist the latest result-row audit jump as a reusable Status copy intent so it can be exported like other handoffs.

## v0.4.173 - Status Result Audit Jump Intents

Status: draft PR [#235](https://github.com/uulab-official/picos/pull/235) on `codex/picos-v0.4.173-result-audit-jump-intent`.

Goal: make Status result-row audit jumps reusable through the same copy-intent shelf as other Status handoffs.

- Pressing `I` for a palette `trail source` result now appends a newest-first `STATUS ACTIVITY COPY INTENTS` row before switching to Timeline.
- The jump intent stores the audit query, jump message, and `filter=audit` payload so it can be copied, exported, or replayed through existing controls.
- The jump intent logs a searchable `clipboard intent status-activity ...` audit event before the Timeline handoff log.
- Existing `g`, `e`, and `v` copy-intent controls can now reuse the result audit jump without a separate workflow.
- Tests cover the jump-intent record shape and its compatibility with copy-intent Timeline search.
- Next: show the latest `I` jump intent as a compact row beside the selected Status Activity result so the operator can see the pending reusable audit handoff before leaving Status.

## v0.4.174 - Status Result Audit Jump Preview

Status: draft PR [#236](https://github.com/uulab-official/picos/pull/236) on `codex/picos-v0.4.174-result-audit-jump-preview`.

Goal: keep the latest reusable `I` audit jump visible beside Status Activity result rows.

- Status Activity result and selected result-history rows now render an `audit jump intent=<query> lines=<n>` hint when a reusable result audit jump exists.
- The preview reuses the latest `status activity result audit jump ...` copy-intent row, so it stays aligned with the existing copy/export/replay shelf.
- Non-jump copy intents stay hidden from the Status result preview to avoid noisy unrelated hints.
- The Status TUI passes the latest audit-jump intent into both result formatters and renders the hint as a quiet detail row.
- Tests cover result-row formatting, selected-history formatting, and latest jump-intent detection.
- Next: add a small status counter for result audit jump intents so repeated `I` jumps are easier to scan.

## v0.5.0 - Developer Environment Plugins

Goal: expand beyond local OS inventory into developer operations.

- Plugin registry design.
- Docker read-only plugin.
- SSH profile inventory.
- Logs workspace.
- System monitor workspace.
