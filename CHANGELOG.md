# Changelog

All notable changes to picos will be documented in this file.

The format follows Keep a Changelog style, and this project uses semantic versioning once published.

## [Unreleased]

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
