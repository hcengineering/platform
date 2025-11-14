# Version Bump Script - Quick Reference

## Auto-detect Latest Version Tag

The `bump-changes-from-tag.sh` script now automatically detects the latest version tag in format `v*.*.*` (e.g., `v0.7.4`).

## Quick Start

### Option 1: Auto-detect + patch bump

```bash
./common/scripts/bump-changes-from-tag.sh
```

### Option 2: Auto-detect + specific bump type

```bash
./common/scripts/bump-changes-from-tag.sh minor
./common/scripts/bump-changes-from-tag.sh major
```

### Option 3: Manual git revision

```bash
./common/scripts/bump-changes-from-tag.sh v0.7.0 major
./common/scripts/bump-changes-from-tag.sh HEAD~5 minor
```

## Documentation

- **[BUMP_USAGE.md](./BUMP_USAGE.md)** - Complete usage guide
- **[CHANGES.md](./CHANGES.md)** - Changelog and improvements

## Test Script

Check which tag will be auto-detected:

```bash
./common/scripts/test-bump-tag-detection.sh
```
