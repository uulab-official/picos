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
