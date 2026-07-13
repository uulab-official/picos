# v0.4.321 Interface Control Targets Plan

## Goal

Show platform-specific interface control targets inside locked enable/disable proposals before any OS mutation path is added.

## Scope

- Add an interface control-target model to state proposals.
- Resolve Linux interface names to `ip link` command previews.
- Resolve Windows adapter names to `Enable-NetAdapter` / `Disable-NetAdapter -WhatIf` command previews.
- Represent macOS `networksetup` service-name lookup as missing until a BSD-device-to-service map is available.
- Show control-target confidence, source, command preview, and resolution guidance in Interfaces and command-palette proposal rows.
- Update README, CHANGELOG, ROADMAP, and tests.

## Safety

- No adapter command execution is added.
- No privileged command is added.
- No dry-run execution is enabled.
- Proposals remain locked with `enabled=false`.
- macOS service targets remain non-executable unless an exact service mapping is available in the proposal model.

## Validation

- [x] `bun test tests/interfaceControl.test.ts tests/interfacePanel.test.ts tests/palette.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `git diff --check`
- [x] `bun run verify`
- [x] `bun run release:check`
