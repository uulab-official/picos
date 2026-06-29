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
3. Move relevant `CHANGELOG.md` entries out of `[Unreleased]`.
4. Run `bun run verify`.
5. Run `bun run release:check`.
6. Create and push a `vX.Y.Z` tag.
7. Create a GitHub Release from the tag.
8. Run `npm publish --access public` when publishing `@uulab/picos` for the
   first public scoped release.

## Current Decision

Do not publish yet. The package has enough metadata for a future public scoped
npm release, but the v0.3 stack should be merged and the version should be
bumped intentionally before the first external package is published.
