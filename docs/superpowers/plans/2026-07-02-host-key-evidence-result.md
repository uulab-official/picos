# Remote Host Key Evidence Result Plan

## Goal

Model provided host-key evidence results and connect them to selected `known_hosts` candidate comparison without opening sockets, scanning host keys, trusting hosts, writing trust files, or mutating remote state.

## Tasks

- [x] **Step 1: Write failing tests**
  - Cover provided host-key evidence result rows.
  - Cover compare detail matching provided evidence against a selected candidate while trust remains blocked.

- [x] **Step 2: Implement evidence result model**
  - Add a safe host-key evidence result type and formatter.
  - Keep execution flags explicit and disabled.

- [x] **Step 3: Connect compare detail**
  - Accept evidence results in compare detail.
  - Report matched/mismatched only from provided data.

- [x] **Step 4: Update surfaces and docs**
  - Add provider/TUI rows for evidence result.
  - Update README, CHANGELOG, and ROADMAP.

- [x] **Step 5: Verify and ship**
  - Focused remotes tests passed.
  - `bun run verify` passed.
  - `bun run release:check` passed.
  - `git diff --check` passed.
  - Pushed branch and opened draft PR #355.
