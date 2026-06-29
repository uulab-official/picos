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

## lazyifconfig Parity Backlog

Goal: close the functional gap with `choihunchul/lazyifconfig` in focused slices.

- Interface details: MAC/prefix/gateway and MTU/RX/TX counters landed; next sortable rows and raw platform detail.
- Network grouping: subnet/LAN/loopback/VPN/container/link-local/public classification landed; next richer subnet labels.
- Route Inspector depth: route diagnostics, raw output view, and destination path lookup UI landed; next VPN route hints.
- Connections and Ports: sorting, filtering, details panes, process metadata, safe copy actions.
- Tools Hub: DNS, WHOIS/RDAP, IP info, TCP check, TLS, ping, traceroute as first-class TUI tools.
- Timeline: address/status/public-IP changes and local export.
- Raw output viewer for every OS command-backed panel.

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
