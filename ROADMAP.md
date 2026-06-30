# picos Roadmap

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

## v0.5.0 - Developer Environment Plugins

Goal: expand beyond local OS inventory into developer operations.

- Plugin registry design.
- Docker read-only plugin.
- SSH profile inventory.
- Logs workspace.
- System monitor workspace.
