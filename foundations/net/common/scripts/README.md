# bump-changes-from-tag.sh

A shell script to automatically bump the version of Node.js packages that have changed since a specified git revision in a Rush.js monorepo, and update their dependencies accordingly.

## Features

- ✅ Detects packages that have changed since a given git revision
- ✅ Supports major, minor, and patch version bumps (patch is default)
- ✅ Updates workspace dependencies across all packages
- ✅ Handles both publishable and private packages
- ✅ Supports JSON with comments in rush.json
- ✅ Cross-shell compatible (bash 4+, zsh)
- ✅ Colored output for better visibility

## Usage

```bash
./common/scripts/bump-changes-from-tag.sh <git-revision> [major|minor|patch]
```

### Examples

```bash
# Patch bump (default) for packages changed in the last 5 commits
./common/scripts/bump-changes-from-tag.sh HEAD~5

# Minor bump for packages changed since a specific tag
./common/scripts/bump-changes-from-tag.sh v0.7.0 minor

# Major bump for packages changed since a specific commit
./common/scripts/bump-changes-from-tag.sh abc1234 major

# Patch bump (explicit)
./common/scripts/bump-changes-from-tag.sh HEAD~3 patch
```

## Version Bump Types

| Type    | Example           | Description                        |
| ------- | ----------------- | ---------------------------------- |
| `patch` | `1.2.3` → `1.2.4` | Bug fixes, small changes (default) |
| `minor` | `1.2.3` → `1.3.0` | New features, backward compatible  |
| `major` | `1.2.3` → `2.0.0` | Breaking changes                   |

## How it works

1. **Detects changes**: Uses `git diff --name-only` to find files changed since the specified revision
2. **Identifies packages**: Parses `rush.json` to get all packages and their folders
3. **Matches changes**: Determines which packages have changed files
4. **Bumps versions**: Increments the version based on the specified bump type (patch/minor/major)
5. **Updates dependencies**: Updates workspace dependencies in all packages to use the new versions

## Prerequisites

- Git repository with Rush.js monorepo setup
- Node.js (for JSON parsing and manipulation)
- Bash 4+ or zsh (for associative arrays)

## Output Example

```text
[INFO] Repository root: /path/to/repo
[INFO] Checking changes since: HEAD~3
[INFO] Bump type: minor
[INFO] Getting changed files since HEAD~3...
[INFO] Changed files:
  packages/core/src/index.ts
  packages/client/src/client.ts
[SUCCESS] Package @company/core changed: 0.7.0 -> 0.8.0 (minor)
[SUCCESS] Package @company/client changed: 0.7.0 -> 0.8.0 (minor)
[INFO] Found 2 package(s) to update
[INFO] Updating package versions...
[SUCCESS] Updated @company/core to version 0.8.0
[SUCCESS] Updated @company/client to version 0.8.0
[INFO] Updating dependencies across all packages...
[SUCCESS] Version bump complete!

[INFO] Summary of changes:
  ✓ @company/core -> 0.8.0 (will be published)
  ✓ @company/client -> 0.8.0 (will be published)

[INFO] Next steps:
  1. Review the changes: git diff
  2. Run tests: rush test
  3. Build all packages: rush build
  4. Commit changes: git add . && git commit -m 'Bump versions'
  5. For publishable packages, run: rush publish
```

## Safety Features

- ✅ Validates git repository and rush.json existence
- ✅ Handles version format validation
- ✅ Uses temporary files for safe processing
- ✅ Provides clear error messages
- ✅ Shows summary before completion

## Supported Version Formats

- Standard semver: `1.2.3`
- Pre-release versions: `1.2.3-alpha.1`

### Bump Behavior

- **Patch**: `1.2.3` → `1.2.4` (increments patch)
- **Minor**: `1.2.3` → `1.3.0` (increments minor, resets patch)
- **Major**: `1.2.3` → `2.0.0` (increments major, resets minor and patch)

## Dependencies Updated

The script updates package references in:

- `dependencies`
- `devDependencies`
- `peerDependencies`

Both regular dependencies (`^1.0.0`) and workspace dependencies (`workspace:^1.0.0`) are supported.
