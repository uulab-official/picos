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
- Files provider now supports absolute paths and `~` home shorthand.
- `picos locations` / `picos drives` filesystem entry-point listing.
- TUI Files workspace now starts from the system root and shows root/home/workspace/temp locations.
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
