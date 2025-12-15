# Differences between this fork and the original Huly Platform repository

This document briefly describes how my personal branch/fork (`foundation`) differs from upstream (`hcengineering/platform`). It is prepared based on a comparison of the fork's `develop` branch with `upstream/develop` and serves as a quick reference to the main changes and the reasons behind them.

> In short: the main focus is personal experiments and adding support for new infrastructure/media capabilities, some cleanup (removal of unused modules), and tweaks to improve the local development experience.

---

## Key differences (short)

- Added new components and foundation packages for media/streaming and DSP:
  - `foundations/hulylake` (Rust service), `foundations/hulypulse`, `foundations/stream`, `foundations/net`.
  - Native library/package `@hcengineering/audio-dsp` for audio processing (FFT, VAD, noise reduction, etc.).
- Infrastructure and image updates:
  - New/updated Docker images and scripts in `dev/base-image/*`, changes in `dev/docker-compose.yaml`, `common/scripts/docker.sh`.
- Configuration and CI:
  - Fixes/adjustments in `.github/workflows/*` and helper scripts; added instructions and improvements for local build/testing.
- New features and installation options:
  - Ability to disable features at installation level (`docs/disableFeatures.md`).
  - Enabling local AIBot support for development.
  - Password aging / security-related improvements.
- Simplifications / removals:
  - Removed some old/unused plugins and packages (for example, `bitrix-*`, `board-*`, some QMS packages, etc.) to simplify the codebase and the build.
- Many bug fixes and small improvements in UI and server logic (navigation, performance, tests, etc.).
- Documentation:
  - Updated `changelog.md` and added user-facing instructions (e.g., `docs/disableFeatures.md`).

---

## Details and examples (where to look)

- Example of the new audio processing package:
```foundation/packages/audio-dsp/README.md#L1-4
# @hcengineering/audio-dsp
Audio Digital Signal Processing library for Huly platform.
```

- Document for disabling features:
```foundation/docs/disableFeatures.md#L1-8
# Overview
A configuration guide, for self-hosted users.
```

- New streaming/media logic and packages live in:
```
foundations/hulylake/
foundations/hulypulse/
foundations/stream/
```

---

## How to view the full list of changes (locally)

If you want a precise list of files/patches, run the following in your local repository:

```/dev/null/git-commands.sh#L1-3
git fetch upstream
git diff --name-status upstream/develop..develop
```

(this command shows which files were added/modified/deleted relative to upstream)

---

## Recommendations for syncing with upstream

1. Pull changes from the original repository:
```/dev/null/git-commands.sh#L1-4
git fetch upstream
git checkout develop
# Option 1 (merge)
git merge upstream/develop
# Or option 2 (rebase), if you prefer a clean history
git rebase upstream/develop
```
2. Resolve conflicts and run tests and builds (`rush install`, `rush build`).
3. Test locally via `rush docker:build` / `rush docker:up` as needed.
4. Push to your `origin` as needed.

---

## Compatibility and notes for users

- I try to keep API compatibility with Huly, but some platform modules (removed or heavily modified) may affect installation or export compatibility. Test your specific scenarios before using in production.
- If you need to stay as close to upstream as possible, run `git diff` and the tests before upgrading/merging, and pick only the changes you need (cherry-pick).
- If you have local patches in `diff/*` — put them there or send a dump and I will analyze them separately (currently the `diff/` directory at the repo root does not contain patches).

---

If you'd like, I can add a short note to `README.md` linking to this file and a brief description. I can also prepare a detailed per-file list of changes (file changelog) or a PR to the upstream repository (if you plan to do that).
