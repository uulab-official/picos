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

## v0.5.0 - Developer Environment Plugins

Goal: expand beyond local OS inventory into developer operations.

- Plugin registry design.
- Docker read-only plugin.
- SSH profile inventory.
- Logs workspace.
- System monitor workspace.
