# Release And Version Policy

picos is not published to npm yet. Until the first public package is published,
local development remains the default installation path.

## Do We Need A GitHub Release?

For external npm installation, the required publishing step is `npm publish`.
A GitHub Release is not required by npm, but picos should still use one for
public milestones because it gives users a tagged source checkpoint, release
notes, and downloadable artifacts.

Project policy:

- Use `npm publish` for the installable package.
- Use Git tags and GitHub Releases for public version history.
- Do not publish a stable npm version until `bun run verify` and
  `bun run release:check` pass.
- Do not enable OS-changing actions in a release unless they have risk,
  privilege, preview, and confirmation coverage.

## Version Source Of Truth

Two files must stay synchronized:

- `package.json` `version`
- `src/core/version.ts` `VERSION`

`bun run release:check` fails when they diverge.

Use the version helper before publishing:

```bash
bun run version:plan 0.3.0
bun run version:next minor
bun run version:set 0.3.0 --write
```

`version:plan` and `version:next` are dry-run commands. `version:set` is also a
dry-run unless `--write` is provided.

Draft release notes from `CHANGELOG.md` before creating the GitHub Release:

```bash
bun run release:notes 0.3.0
```

Finalize the `[Unreleased]` changelog entries into a dated version section after
the release-note draft is reviewed:

```bash
bun run release:changelog 0.3.0 2026-06-30
bun run release:changelog 0.3.0 2026-06-30 --write
```

`release:changelog` is a dry-run unless `--write` is provided.

## 0.x Version Rules

- `0.2.x`: current local preview baseline.
- `0.3.x`: stacked development PRs for filesystem, lazyifconfig parity, and
  release readiness.
- `0.4.x`: privileged-control framework preview.
- `0.5.x`: plugin and developer-environment expansion.
- `1.0.0`: first stable release after mutation safety, docs, install, CI, and
  cross-platform smoke checks are mature.

Patch releases are for fixes only. Minor releases can add new read-only panels,
commands, and locked future actions while the package remains pre-1.0.

## Release Checklist

1. Merge stacked feature PRs in order.
2. Pick the published version and update both version files.
3. Run `bun run version:plan <version>`.
4. Run `bun run version:set <version> --write`.
5. Run `bun run release:notes <version>` and review the draft.
6. Run `bun run release:changelog <version> <date> --write`.
7. Run `bun run verify`.
8. Run `bun run release:check`.
9. Create and push a `vX.Y.Z` tag.
10. Create a GitHub Release from the tag.
11. Run `npm publish --access public` when publishing `@uulab/picos` for the
   first public scoped release.

## GitHub Actions

CI runs `bun run verify` on Linux, macOS, and Windows, then runs
`bun run release:check` on Linux to validate package metadata and the dry-run
npm package contents.

The `Release` workflow is manual (`workflow_dispatch`) and defaults to
`dry_run: true`. Use dry-run first for every release candidate. To publish to
npm, the repository must have an `NPM_TOKEN` secret, and the workflow must be
run with `dry_run: false`.

The manual workflow does not create tags or GitHub Releases yet. Keep tag and
release creation as an explicit maintainer action until the first public npm
publish process has settled.

## Current Decision

Do not publish yet. The package has enough metadata for a future public scoped
npm release, but the v0.3 stack should be merged and the version should be
bumped intentionally before the first external package is published.
