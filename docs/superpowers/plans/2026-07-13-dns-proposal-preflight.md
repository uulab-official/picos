# DNS Server Proposal Preflight

## Goal

Start target-specific DNS edit preflight prompts without enabling DNS mutation.

## Scope

- Add a pure DNS server proposal model for proposed resolver lists.
- Parse, deduplicate, and validate typed resolver IPs.
- Compare proposed resolvers with the current DNS server snapshot.
- Render current, proposed, added, removed, invalid, preflight, rollback, and disabled-execution rows in the DNS workspace.
- Add DNS workspace controls for `S` proposal input and `C` clear.
- Update README, CHANGELOG, and ROADMAP.

## Safety

- No DNS command is executed.
- No platform adapter mutation is added.
- The proposal action stays `enabled=false`.
- The proposal requires admin/write posture and the future exact phrase `set dns servers`.
- Preflight rows explicitly state `execution=disabled`.

## Validation

- [x] `bun test tests/dnsControl.test.ts`
- [x] `bun run lint`
- [x] `bun run typecheck`
- [x] `bun run verify`
- [x] `bun run release:check`
