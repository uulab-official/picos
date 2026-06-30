<p align="center">
  <img src="assets/picos-logo.svg" alt="picos logo" width="620">
</p>

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

- `1-9`: select Dashboard, Files, Remotes, Editor, System, Hardware, Storage, Processes, or Interfaces
- `left/right` or `h/l`: move between workspaces
- `up/down` or `j/k`: move through workspaces, or actions inside Action Center
- `enter`: enter the focused workspace mode, run the selected action, open a directory, or preview a file
- `?` or `/`: open the command palette, then type to filter commands
- Files workspace: `enter` opens file focus, `j/k` selects entries, `enter` opens, `..` appears as a parent entry, `f` filters by name/path/type, `enter` applies the filter, `esc` clears it, `c`/`m`/`x` open locked copy/move/delete previews, `b` returns to the previous file location, `1-9` jumps system locations, `:` opens path input with `.`/`..` support, `g` cycles system locations, `u` goes to the parent directory, and `h`/`esc` returns to workspace navigation
- Interfaces workspace: `j/k` selects interfaces and `Tab` cycles list/detail/stats/platform source panes
- Routes workspace: `Tab` cycles table/raw/diagnostics/path panes, `s` cycles route row sorting, and `:` opens destination path lookup
- Connections and Ports workspaces: show parsed rows plus clipped raw OS command output; `j/k` selects endpoints, `f` filters, `F` clears, `P` saves the active filter, `]` cycles filter presets, `Tab` cycles detail/raw/process panes, `enter` opens the selected PID in Processes, `s` cycles endpoint sorting, PID matches show process snapshots, and `c` opens a locked clipboard preview
- Processes workspace: endpoint handoffs show PID detail plus labeled cwd/open-file/resource rows; `j/k` selects an item, `enter` opens local filesystem paths in Files or Editor, socket/pipe/unix resources are logged for inspection, and `c` opens a locked clipboard preview
- Tools workspace: `j/k` selects previous runs, `Tab` cycles raw/summary/command detail panes, `f` filters history, `P` saves the active filter as a session preset, `]` cycles saved presets, `s` cycles sorting, `G` groups by tool/action or status, `r` reruns, `y` copies summaries, `c` copies raw output, and `e`/`E` exports selected/all runs
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
picos tools dns example.com
picos tools whois github.com
picos tools ip-info 8.8.8.8
picos tools port-check github.com 443
picos tools tls github.com:443
picos tools traceroute 8.8.8.8
picos routes
picos routes --sort interface
picos routes --sort=-metric
picos route 8.8.8.8
picos connections
picos connections --filter 443 --sort remotePort
picos connections --sort=-remotePort
picos ports
picos ports --filter node --sort process
picos ports --sort=-pid
picos process 12345
picos process 12345 --files
picos locations
picos remotes
picos remote dev
picos dir /
picos dir ~
picos pwd
picos dir
picos type README.md
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
- `picos tools`: list lazyifconfig-style Tools Hub commands.
- `picos tools dns <target>`: resolve DNS records and reverse DNS.
- `picos tools whois <target>`: read public RDAP registration metadata.
- `picos tools ip-info <ip>`: read public IP metadata.
- `picos tools port-check <host> <port>`: run the TCP connect check through Tools Hub.
- `picos tools tls <host:port>`: inspect TLS protocol, cipher, and certificate metadata.
- `picos tools ping <host>`: run platform ping through Tools Hub.
- `picos tools traceroute <host>`: run platform traceroute/tracert through Tools Hub.
- `picos routes`: inspect the local route table.
- `picos routes --sort <key>`: sort route rows by `default`, `destination`, `gateway`, `interface`, `family`, or `metric`; prefix with `-` for descending.
- `picos routes --raw`: print the raw route command output.
- `picos route <destination>`: inspect how the OS routes a destination.
- `picos connections`: list active TCP/UDP endpoints from the local OS.
- `picos connections --filter <query>`: filter connections by address, port, state, protocol, or PID.
- `picos connections --sort <key>`: sort connections by `protocol`, `local`, `localPort`, `remote`, `remotePort`, `state`, or `pid`; prefix with `-` for descending.
- `picos connections --raw`: print raw connection command output.
- `picos ports`: list listening TCP ports with process metadata where available.
- `picos ports --filter <query>`: filter listening ports by address, port, process, PID, user, or protocol.
- `picos ports --sort <key>`: sort listening ports by `protocol`, `address`, `port`, `process`, `pid`, or `user`; prefix with `-` for descending.
- `picos ports --raw`: print raw listening-port command output.
- `picos process <pid>`: inspect one local process with parent PID, user, state, CPU, memory, elapsed time, path, and command where the OS exposes them.
- `picos process <pid> --files`: include current working directory and open file snapshot where available.
- `picos locations` or `picos drives`: list filesystem entry points such as root, home, workspace, and temp.
- `picos remotes`: list configured remote file profiles without opening a network session.
- `picos remote <id>`: inspect the remote provider boundary for a configured profile without opening a network session.
- `picos pwd`: print the current local file root.
- `picos dir [path]` or `picos ls [path]`: list local files; supports `.`, absolute paths, `/`, and `~`.
- `picos type <path>` or `picos cat <path>`: print a local text file.
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

Clipboard writes follow the same rule: platform adapters exist for `pbcopy`, `xclip`, and `clip.exe`, and confirmed plans execute through `safeExec()` stdin so copy text is never interpolated into a shell command. In the TUI, endpoint, process-resource, and Tools summary/raw-output copy actions open a `:clipboard` confirmation prompt and log the resulting audit event, including fallback guidance when the platform clipboard tool is missing. The `timeline.export` action writes the current console audit log under the picos config directory, and Tools history export writes selected or full diagnostic runs under the config `tools` directory.

All OS command execution must go through `src/utils/safeExec.ts`; OS-specific commands belong in `src/adapters`.

## Network Console Roadmap

picos takes inspiration from tools like `lazyifconfig` for local network inspection patterns while keeping a broader terminal OS scope.

Reference-inspired modules now tracked in picos:

- Interfaces inventory
- Interface type, CIDR prefix, MAC/netmask, MTU, RX/TX counters, gateway, DNS inventory, and TUI list/detail/stats/platform panes
- Subnet/network grouping for LAN, loopback, VPN, container, link-local, and public addresses with operator scope/hint labels
- Route Inspector with TUI table/raw/diagnostics/path panes, destination path lookup, route rows, VPN hints, split-tunnel diagnostics, and raw command output
- Connections view with parsed rows, CLI filtering/sorting, TUI search presets, detail/raw/process panes, PID process enrichment, copy preview, and raw OS command output
- Ports view with process metadata, CLI filtering/sorting, TUI search presets, detail/raw/process panes, PID process enrichment, copy preview, and raw OS command output
- Tools Hub with read-only DNS/RDAP/IP/TCP/TLS/ping/traceroute commands, target prompts, filterable/sortable/groupable/selectable result history, raw/summary/command detail panes, session filter presets, rerun, locked summary/raw-output copy, scoped markdown export, and raw output handoff
- Timeline with network/action/audit/raw event filters, audit export, latest audit reload, and network state-change events
- Raw output viewer

See [docs/superpowers/plans/2026-06-28-lazyifconfig-parity-plan.md](docs/superpowers/plans/2026-06-28-lazyifconfig-parity-plan.md).

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the sequential version plan.

## Release Status

The package is still unpublished. External installation needs an npm publish;
a GitHub Release is not required by npm, but picos uses releases and tags as
the public version history. See [docs/RELEASE.md](docs/RELEASE.md).

Release helpers:

```bash
bun run version:plan 0.3.0
bun run version:set 0.3.0 --write
bun run release:notes 0.3.0
bun run release:changelog 0.3.0 2026-06-30 --write
bun run release:check
bun run release:commands 0.3.0
```

## OS Console Direction

v0.2 expands picos toward an OS-like console:

- System, hardware, storage, process, runtime, and permission inventory.
- Network tools for ping, TCP connect, DNS, routes, ports, and connections.
- Process drill-down for endpoint PIDs through `picos process <pid>`.
- Telnet-like reachability is implemented as `picos connect`, a non-interactive TCP check, instead of an interactive telnet session.
- DOS-style file navigation and text editing are planned after the read-only inventory and network tool layer is stable.

v0.3 starts that filesystem layer with local read-only file commands and a provider boundary for future editor and SFTP support.
The Files workspace supports keyboard-driven local navigation, numbered system location jumps, direct path input, entry filtering, locked file-operation previews, and read-only file preview into the Editor workspace. The Remotes workspace surfaces configured SFTP-style profiles, lets you stage a locked remote file context, and never opens network sessions yet.

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
	"enableExperimentalControls": false,
	"remoteProfiles": []
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

Remote profile shape:

```json
{
	"remoteProfiles": [
		{
			"id": "dev",
			"host": "dev.example.com",
			"port": 22,
			"username": "alice",
			"root": ".",
			"keyPath": "~/.ssh/id_ed25519"
		}
	]
}
```

Remote passwords are not part of the config schema.

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
