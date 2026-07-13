# v0.4.322 macOS Interface Service Map Plan

## Goal

Collect macOS `networksetup -listallhardwareports` evidence and feed BSD-device-to-service mappings into locked interface enable/disable proposals.

## Scope

- Add a macOS hardware-port command and parser.
- Retain hardware-port source output in network summaries only on macOS.
- Add `macosServiceNamesByDevice` to `NetworkSummary`.
- Show the service map in Interfaces platform/source panes.
- Include hardware-port source evidence in interface source copy/export/open handoffs.
- Pass the service map into keyboard and command-palette interface state proposals.
- Update README, CHANGELOG, ROADMAP, and tests.

## Safety

- No interface mutation command is executed.
- No dry-run execution is enabled.
- Proposals remain locked with `enabled=false`.
- The mapping only changes preview/target resolution evidence.

## Validation

- [x] `bun test tests/interfaceStats.test.ts tests/network.test.ts tests/interfacePanel.test.ts tests/palette.test.ts tests/interfaceControl.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `git diff --check`
- [x] `bun run verify`
- [x] `bun run release:check`
