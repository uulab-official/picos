# picos

A tiny terminal OS for developers.

`picos` is a lightweight cross-platform TUI/CLI for inspecting, diagnosing, and eventually controlling your local developer environment. It aims to feel closer to `lazygit`, `btop`, `k9s`, or a focused `lazyifconfig` than a plain command collection.

## Status

`picos` is early and unreleased. The current milestone focuses on a full-screen keyboard-driven console, read-only network diagnostics, and a locked action model for future privileged OS controls.

## Install

```bash
npm install -g @uulab/picos
```

The package is not published yet. For local development:

```bash
bun install
bun src/bin/picos.ts
```

## TUI Usage

```bash
picos
picos ui
```

Keyboard controls:

- `1-9`: select Dashboard, Interfaces, Network, Routes, Connections, Ports, Tools, Timeline, or DNS
- `left/right` or `h/l`: move between workspaces
- `up/down` or `j/k`: move through workspaces, or actions inside Action Center
- `enter`: run the selected action
- `d`: run doctor
- `p`: ping the default host
- `r`: refresh
- `q`: quit

Language setting:

```bash
picos config set language ko
picos config set language en
picos config set language ja
picos config set language zh
```

## CLI Usage

```bash
picos info
picos info --full
picos doctor
picos ping google.com --count 4 --timeout 10000
picos connect example.com 443
picos dns
picos config
picos version
```

Commands:

- `picos` or `picos ui`: open the TUI control panel.
- `picos info`: print network and system summary.
- `picos info --full`: print OS-style system, hardware, storage, process, network, runtime, and permission inventory.
- `picos doctor`: run read-only network diagnostics.
- `picos ping <host>`: run a safe ping test without shell interpolation.
- `picos ping <host> --count <n> --timeout <ms>`: run ping with bounded count and timeout options.
- `picos connect <host> <port>`: run a safe TCP connect reachability check.
- `picos dns`: show configured DNS servers.
- `picos dns flush`: disabled in v0.1.
- `picos config`: print config path and current config.
- `picos config get <key>`: print one config value.
- `picos config set <key> <value>`: update one config value.
- `picos version`: print the package version.

## Safety Model

The long-term goal includes OS controls, but system mutation must be explicit and guarded.

Every future write/destructive action must define:

- risk: `read`, `write`, or `destructive`
- privilege: `none`, `user`, or `admin`
- preview/dry-run behavior
- confirmation requirement
- adapter-owned OS commands
- tests for default locked behavior

All OS command execution must go through `src/utils/safeExec.ts`; OS-specific commands belong in `src/adapters`.

## Network Console Roadmap

picos takes inspiration from tools like `lazyifconfig` for local network inspection patterns while keeping a broader terminal OS scope.

Reference-inspired modules now tracked in picos:

- Interfaces inventory
- Subnet/network grouping
- Route Inspector
- Connections view
- Ports view
- Tools Hub
- Timeline
- Raw output viewer

See [docs/references/lazyifconfig.md](docs/references/lazyifconfig.md).

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the sequential version plan.

## OS Console Direction

v0.2 expands picos toward an OS-like console:

- System, hardware, storage, process, runtime, and permission inventory.
- Network tools for ping, TCP connect, DNS, routes, ports, and connections.
- Telnet-like reachability is implemented as `picos connect`, a non-interactive TCP check, instead of an interactive telnet session.
- DOS-style file navigation and text editing are planned after the read-only inventory and network tool layer is stable.

## Privacy Direction

picos should not collect telemetry or upload local interface, route, port, connection, process, or command-output data to a project-owned service.

Most inspection features should parse local operating-system command output in memory. Any feature that contacts an external service, such as public IP lookup, RDAP/Whois fallback, release checks, or target-host diagnostics, must be visible as part of the action being run.

## Config

Default config:

```json
{
	"theme": "dark",
	"language": "en",
	"refreshInterval": 3000,
	"defaultPingHost": "google.com",
	"showPublicIp": true,
	"enableExperimentalControls": false
}
```

Supported languages:

- `en`: English
- `ko`: Korean
- `ja`: Japanese
- `zh`: Chinese

Config file locations:

- Windows: `%APPDATA%/picos/config.json`
- macOS: `~/Library/Application Support/picos/config.json`
- Linux: `~/.config/picos/config.json`

## Development

```bash
bun install
bun run verify
```

Focused commands:

```bash
bun run lint
bun test
bun run typecheck
bun run build
bun run smoke
```

See [docs/HARNESS.md](docs/HARNESS.md) for the verification harness.

## Agent Docs

- [AGENTS.md](AGENTS.md): shared coding-agent rules.
- [CODEX.md](CODEX.md): Codex workflow guide.
- [CLAUDE.md](CLAUDE.md): Claude Code workflow guide.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## v0.1 Scope

v0.1 focuses on safe read-only inspection, diagnostics, and a visible TUI shell. Adapter enable/disable, Wi-Fi mutation, firewall changes, route changes, Docker/Kubernetes plugins, and background daemons are intentionally excluded until the action permission model is implemented end to end.

## License

MIT
