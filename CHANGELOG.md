# Changelog

All notable changes to picos will be documented in this file.

The format follows Keep a Changelog style, and this project uses semantic versioning once published.

## [Unreleased]

### Added

- Project logo SVG and README brand header.
- Local file provider foundation for the v0.3 filesystem console.
- Read-only file CLI commands: `pwd`, `dir`, `ls`, `type`, and `cat`.
- Dense OS-console dashboard with system, resource, network, filesystem, doctor, and action status.
- TUI Files and Editor workspaces with local directory listing and read-only text preview.
- File action catalog entries for list/read/write/delete and SFTP-provider planning, with write operations locked.
- lazyifconfig parity implementation plan covering interfaces, routes, connections, ports, tools, timeline, raw output, and update checks.
- `picos tools` foundation with DNS, WHOIS/RDAP, IP info, port-check, TLS, ping, and traceroute commands.
- `picos routes` and `picos route <destination>` route inspector foundation.
- `picos connections` active endpoint inspector with raw output support.
- `picos ports` listening TCP port inspector with process metadata where available.
- TUI Connections and Ports workspaces backed by live read-only OS data.
- TUI Connections and Ports workspaces now show clipped raw OS command output beside parsed endpoint rows.
- Connections and Ports now support endpoint filtering and sorting in CLI, with TUI sort cycling.
- Connections and Ports workspaces now support endpoint selection, detail rows, and safe copy previews.
- Connections and Ports detail rows now enrich matching PIDs with process command, CPU, and memory snapshots.
- `picos process <pid>` read-only process detail inspector for drilling into endpoint owners.
- `picos process <pid> --files` cwd and open-file snapshot for deeper process inspection where available.
- Connections and Ports workspaces can hand off selected endpoint PIDs into the Processes workspace with `enter`.
- Process file snapshots now preserve lsof descriptor labels and can hand local cwd/open-file paths into Files or Editor from the Processes workspace.
- Process file snapshots now classify socket, pipe, unix, and socket-file resources so non-file process resources are visible without pretending they are openable files.
- Clipboard previews now share a locked confirmation model across endpoint and process resource selections.
- Clipboard write planning now has platform adapter commands, exact confirmation checks, and audit event metadata while execution remains locked.
- Clipboard write execution now uses `safeExec()` stdin for confirmed plans while locked plans return audit metadata without spawning OS commands.
- TUI clipboard copy now opens an exact `copy` confirmation prompt for selected connections, ports, and process resources, then records the audit result in the event dock.
- `timeline.export` now writes the current TUI event/audit log to a timestamped file under the picos config directory.
- Clipboard copy failures now include platform fallback hints for `pbcopy`, `xclip`, and `clip.exe` instead of looking like confirmation locks.
- Timeline workspace now shows live EventDock history with `all`, `audit`, `action`, and `raw` filters cycled by `t`.
- Timeline now reloads the latest exported audit log on TUI startup and keeps a longer default in-memory event history.
- Timeline now records network status, primary address, public IP, and interface address changes during refresh with a dedicated `network` filter.
- Tools Hub actions now run read-only tool plans in the TUI, store recent result history, and show the latest raw output handoff.
- Tools Hub actions now open target prompts so operators can run DNS/RDAP/IP/TCP/TLS/ping/traceroute against custom hosts, IPs, and ports.
- Tools Hub history now supports keyboard selection and rerunning selected read-only diagnostics.
- Tools Hub selected raw output now opens the same locked clipboard confirmation flow with `c`.
- Tools Hub selected summaries now open the locked clipboard confirmation flow with `y`.
- Tools Hub history can now export selected or full diagnostic runs to scoped markdown files under the picos config directory.
- Tools Hub history now supports TUI filtering with `f`, clearing with `F`, and filter-aware selection/copy/rerun/export.
- Tools Hub history now supports TUI sort cycling with `s` across time, tool/action, and status while preserving visible selection targets.
- Tools Hub history now supports TUI grouping with `G` by tool/action or status while preserving visible selection targets.
- Tools Hub history now supports session filter presets with `P` to save and `]` to cycle repeated queries.
- Tools Hub history now supports `Tab` detail panes for raw output, summary metadata, and rerunnable command views.
- Tools Hub history presets, sort, group, and detail view preferences now persist in config and restore on TUI boot.
- Tools Hub now shows OS-aware target presets for default host, gateway, DNS servers, public IP, HTTPS, and TLS checks, with `n` to cycle and `R` to run.
- Tools Hub target presets can now be saved with `T`, persisted in config, normalized, de-duplicated, and restored ahead of OS-aware presets on TUI boot.
- Connections and Ports workspaces now support `Tab` detail panes for focused detail, raw output, and process views.
- Connections and Ports workspaces now support TUI endpoint search with `f`, `F`, `P`, and `]` filter preset controls.
- Connections and Ports sort preferences now persist in config and restore on TUI boot.
- Route and endpoint evidence handoff files now have a shared index via `picos handoffs` and the Status workspace, with locked file-open previews for selected entries.
- Timeline workspace now supports TUI event search presets and scoped audit exports for filtered timelines.
- Routes workspace now supports `Tab` detail panes for table, raw output, diagnostics, and destination path views.
- Interfaces workspace now supports keyboard selection plus `Tab` panes for list, detail, traffic stats, and platform source views.
- Network groups now include operator scope/hint labels, and route diagnostics now flag VPN routes plus likely split-tunnel setups.
- Files provider now supports absolute paths and `~` home shorthand.
- `picos locations` / `picos drives` filesystem entry-point listing.
- TUI Files workspace now starts from the system root and shows root/home/workspace/temp locations.
- TUI Files workspace now has child focus navigation with `j/k`, `enter`, `u`, and `h`/`esc`.
- Read-only file opening from Files into the Editor preview workspace.
- Files focus now supports `g` to cycle system locations such as root, home, workspace, and temp.
- Files focus now supports `:` path input for direct local directory jumps.
- Files focus now supports number shortcuts for direct system location jumps.
- SFTP-style remote profile stubs with safe config normalization and `picos remotes`.
- Shared local/SFTP file provider factory with locked SFTP provider placeholders and `picos remote <id>` inspection.
- TUI Remotes workspace for configured profile visibility and provider lock status.
- TUI command palette opened with `?` or `/`, with keyboard action selection and locked-action visibility.
- Command palette filtering by command id, title, description, category, risk, or privilege.
- Action Center now opens dry-run control previews for locked write, destructive, and admin actions, showing risk, privilege, confirmation phrase, platform, and lock reason without executing OS commands.
- Control previews now include adapter-owned macOS/Linux/Windows command candidates for DNS flush, interface disable, route add, and service restart without making those commands executable.
- Control preview attempts now emit stable audit/timeline messages with risk, privilege, dry-run state, lock reason, adapter, and command preview.
- Action Center typed confirmations now record `confirmed-disabled` or `rejected` audit events from the preview panel while keeping OS mutation execution disabled.
- Action Center now shows blocked control policy simulations and logs simulation audit records with approval blockers such as mutation, admin, confirmation, and execution-disabled requirements.
- Control execution harness now defaults to disabled, requires explicit dry-run opt-in plus exact confirmation, and only runs adapter-declared dry-run commands through an injected/safe runner.
- Action Center now exposes `x` for policy-gated dry-run attempts, backed by `controlExecutionMode` and `allowAdminDryRun` config.
- Action Center and Inspector now show the current control execution policy, including dry-run/admin blockers, before an attempt is made.
- `picos update` and the `picos.update` action now run a read-only npm registry check, surfacing latest version, status, registry URL, and install hint without executing an installer.
- Update checks now create a locked self-update apply preview when a newer version is available, showing the npm dry-run command and exact confirmation phrase while keeping package mutation disabled.
- Update checks now include npm package, GitHub Release, and CHANGELOG handoff links for the detected latest version.
- Status workspace update handoff links can now be cycled with `n` and copied through the existing locked `:clipboard` confirmation flow with `c`.
- `picos.update.apply` now opens an Action Center control preview after an update check, and its npm `--dry-run` command can only execute through exact confirmation plus the configured control execution policy.
- Status workspace update handoff links can now be opened with `o` through a locked `:external-open` confirmation flow that only allows HTTPS URLs and OS adapter opener commands.
- `picos update` and the Status workspace now include a read-only GitHub Release latest check alongside the npm registry check.
- `picos release-health` now prints package, artifact, CI, and manual release workflow health rows for pre-publish review.
- `picos monitor` and the TUI Dashboard/System workspaces now show a read-only system monitor snapshot with load average, memory usage, CPU, and top process rows.
- `picos logs` and the TUI Logs workspace now read recent local OS logs through macOS, Linux, and Windows adapters while keeping the command read-only and routed through `safeExec()`.
- Logs now support CLI filtering with `picos logs --filter <query>` plus TUI search, clear, save, preset cycling, and log-only refresh shortcuts.
- Logs now support severity quick filters with `picos logs --level <all|warn|fail|info>` and the TUI `e` cycle shortcut.
- Logs now support pinned severity/search profiles in the TUI with `S` to save and `}` to cycle.
- Logs severity/search profiles now persist in config, are loaded on TUI boot, and are normalized before writing.
- Logs search presets now persist in config, load on TUI boot, and share the same de-duplication and trim rules as the Logs workspace.
- Logs workspace now has `L` live follow mode, which refreshes OS log snapshots while the Logs panel is active and marks follow state in the header.
- Logs live follow now shows bounded refresh ticks plus last follow status in the header and supports `C` to clear follow state counters.
- Logs live follow now keeps a bounded recent follow history row with status, entry counts, and refresh labels.
- Remotes workspace profile focus and locked remote file context staging for the Files workspace.
- Files workspace parent `..` entry, relative `.`/`..` path input, and `b` back navigation history.
- Files workspace filtering with `f`, typed name/path/type matching, apply/clear controls, and parent `..` visibility.
- Locked Files workspace operation previews for copy, move, and delete with selected path, risk, privilege, and confirmation phrase.
- lazyifconfig-style interface kind classification, CIDR prefix capture, network grouping, and denser Network/Interfaces TUI panels.
- Interface MTU and RX/TX byte/packet counters from macOS, Linux, and Windows adapter statistics, surfaced in CLI and TUI network inventory.
- Interface rows now sort into a stable console-friendly order for scanning physical, VPN, bridge, and container adapters.
- Routes workspace now shows live route diagnostics, route rows, and raw command output instead of a staged placeholder.
- Routes workspace destination lookup prompt for inspecting the gateway/interface/source path to a host or IP.
- Route rows now support shared sorting in core, CLI, and TUI, including `picos routes --sort <key>` and `s` in the Routes workspace.
- Route rows now support shared filtering in core, CLI, and TUI, including `picos routes --filter <query>` plus `f`/`F` in the Routes workspace.
- Routes workspace now opens locked clipboard previews for the active table, raw output, diagnostics, or destination path view with `c`.
- Routes workspace now supports session filter presets with `P` to save and `]` to cycle repeated route filters.
- Route filter presets now persist in config, load on TUI boot, and are normalized before writing.
- Routes workspace can now export the active table/raw/diagnostics/path view to a timestamped handoff file with `e`.
- Routes workspace can now prepare an external file-open preview for exported handoff files with `o`, locked behind exact `open` confirmation.
- Connections and Ports workspaces can now export and open active raw/detail/process evidence handoff files with `e` and `o`.
- Connections and Ports filter presets now persist in config, load on TUI boot, and are normalized before writing.
- Release readiness policy, package publish metadata, and `bun run release:check` for pre-publish validation.
- CI release readiness job and manual dry-run-first npm release workflow.
- Version bump helper for dry-run planning and synchronized `package.json` / runtime `VERSION` updates.
- Release note helper for drafting GitHub Release notes from the `[Unreleased]` changelog section.
- Changelog finalize helper for moving `[Unreleased]` entries into a dated release section after release notes are drafted.
- Release command planner for printing manual tag, GitHub Release, and npm publish commands without executing them.
- v0.3 implementation plan for Files, Editor, Dialogs, and SFTP-like provider support.

## [0.2.0] - 2026-06-28

### Added

- Initial Bun/TypeScript package scaffold for `@uulab/picos`.
- Full-screen keyboard-driven Ink console with left workspace navigation, main workspace, inspector, and event log.
- Basic language setting for English, Korean, Japanese, and Chinese.
- lazyifconfig reference notes and roadmap adaptation for interfaces, routes, connections, ports, tools, timeline, and raw output.
- Additional workspace navigation and action metadata for route, connection, port, tools, timeline, and raw-output inspection.
- Runnable read-only TUI actions for network refresh, doctor, default ping, and config inspection.
- OS inventory foundation for full system, hardware, storage, process, runtime, and permission reporting.
- `picos info --full` formatter for OS-style inventory output.
- Safe ping options for bounded count and timeout values.
- `picos connect <host> <port>` TCP reachability check as a non-interactive telnet-style tool.
- TUI workspaces for System, Hardware, Storage, Processes, and Network Tools.
- CLI commands: `info`, `doctor`, `ping`, `dns`, `config`, and `version`.
- Cross-platform network summary, ping command building, config defaults, and doctor checks.
- Locked action catalog for future OS controls with risk, privilege, and confirmation metadata.
- Roadmap/status metadata surfaced in the TUI.
- Codex, Claude, and general agent documentation.
- Local/CI verification harness via `bun run verify`.

### Security

- OS command execution is routed through `safeExec()`.
- OS-specific commands are isolated in adapters.
- Write/destructive actions are disabled by default.
