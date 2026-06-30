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

## lazyifconfig Parity Backlog

Goal: close the functional gap with `choihunchul/lazyifconfig` in focused slices.

- Interface details: MAC/prefix/gateway, MTU/RX/TX counters, and stable row sorting landed; next raw platform detail.
- Network grouping: subnet/LAN/loopback/VPN/container/link-local/public classification landed; next richer subnet labels.
- Route Inspector depth: route diagnostics, raw output view, destination path lookup UI, and sortable rows landed; next VPN route hints.
- Connections and Ports: parsed rows, raw output, CLI filtering/sorting, TUI sort cycling, selection details, shared locked clipboard previews, clipboard adapter plans with audit metadata, safe stdin clipboard execution model, TUI clipboard confirmation prompt with EventDock audit results, durable audit export, clipboard fallback hints, PID process enrichment, `picos process <pid>` drill-down, `--files` cwd/open-file snapshots, TUI process handoff, labeled process files, process-to-files handoff, process resource classification, and network state-change timeline events landed; next richer endpoint/platform detail tabs.
- Tools Hub: DNS, WHOIS/RDAP, IP info, TCP check, TLS, ping, traceroute as first-class TUI tools with target prompts, recent result history, and raw output handoff; next history selection, rerun, and copy shortcuts.
- Timeline: live EventDock history, network/action/audit/raw filters, audit export, latest audit reload, and network status/address/public-IP change events landed; next richer event search and export scopes.
- Raw output viewer for routes, connections, and ports landed; next tools and platform detail tabs.

## v0.4.0 - Privileged Controls Framework

Goal: prepare real OS mutation without making it casual or dangerous.

- Preview/dry-run framework.
- Confirmation phrase flow.
- Admin/elevation detection by platform.
- Audit log for write/destructive attempts.
- First controlled mutation prototype.

## v0.5.0 - Developer Environment Plugins

Goal: expand beyond local OS inventory into developer operations.

- Plugin registry design.
- Docker read-only plugin.
- SSH profile inventory.
- Logs workspace.
- System monitor workspace.
