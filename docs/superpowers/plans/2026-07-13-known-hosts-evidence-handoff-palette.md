# Known Hosts Evidence Handoff Palette Plan

> **For agentic workers:** REQUIRED SUB-SKILL: TDD. Reuse the selected known_hosts evidence clipboard/audit-export helpers. Do not add trust, `known_hosts` writes, local trust-file reads, network transport, host scans, or remote mutation.

**Goal:** Make direct recovered Remotes known_hosts evidence copy/export handoffs discoverable and executable from the command palette.

**Architecture:** Keep the Action Center as the discovery surface, reuse the selected `remote-known-hosts` Status Evidence export as context, and route palette dispatch through the same Status Activity clipboard/audit-export helpers that back the `y`/`e` fallback path.

**Tech Stack:** Bun, TypeScript, Ink, existing command palette, Status Activity, clipboard preview, and audit export infrastructure.

## Safety Boundaries

- No local `known_hosts` file read.
- No SFTP transport open.
- No host-key scan.
- No host trust application.
- No `known_hosts` write.
- No remote mutation.

## Steps

- [x] **Step 1: Expose palette actions**
  Add enabled read-only `status.remoteKnownHostsEvidence.copy` and `status.remoteKnownHostsEvidence.export` actions.

- [x] **Step 2: Preview direct handoffs**
  Extend command-palette previews so copy shows locked clipboard handoff intent and export shows selected audit handoff intent for the selected recovered evidence export.

- [x] **Step 3: Dispatch through existing safe helpers**
  Wire palette dispatch into selected known_hosts evidence clipboard and audit-export helpers, and make Status `y`/`e` fallbacks share those helpers.

- [x] **Step 4: Preserve audit/result history**
  Record palette copy/export operations as Status Activity result rows and Timeline-searchable audit messages while keeping the normal copy-intent audit row for clipboard handoffs.

- [x] **Step 5: Update docs and roadmap**
  Record README, CHANGELOG, and ROADMAP notes for the new command-palette copy/export discovery path.

## Validation

- [x] `bun test tests/actions.test.ts tests/palette.test.ts`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
