# Interface Evidence Recovery Plan

## Goal

Persist frequently used interface evidence searches and recover archive or retention outcomes from Status Activity into the exact Timeline audit trail.

## Tasks

- [x] Add normalized, bounded interface evidence search presets to config.
- [x] Add Status keyboard and command-palette save/cycle controls.
- [x] Show preset state in the interface evidence filter strip and palette previews.
- [x] Model archive/retention success and blocked outcomes as structured activity results.
- [x] Reuse the stored audit message for exact result-history Timeline recovery.
- [x] Focus archived evidence after a successful archive refresh.
- [x] Cover preferences, config, panel, palette, activity results, and Timeline recovery with tests.
- [ ] Open the stacked draft PR and record its CI result in the roadmap.

## Safety Boundary

Interface enable/disable execution remains unavailable. Archive and retention continue to use existing picos-owned path validation and exact confirmation prompts.
