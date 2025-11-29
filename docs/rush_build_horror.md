# Rush Build Performance Mystery: Why `rush update --recheck` Makes Your Build 8x Slower

## TL;DR

After running `rush update --recheck`, your first `rush build` can take **8x longer** than subsequent builds. 
The root cause is that `pnpm install --force` **recreates all files in node_modules with new inodes**, 
invalidating the OS page cache and forcing Node.js to read everything from disk.


| Scenario | Build Time |
|----------|------------|
| After `rush update --recheck` | **~1 min 20 sec** |
| Subsequent build | **~10-12 sec** |

## The Problem

We noticed strange behavior with Rush builds:

1. Run `rush update --recheck`
2. Delete build cache: `rm -rf ./common/temp/build-cache`
3. Run `rush build` → **~1 minute 20 seconds**
4. Delete build cache again: `rm -rf ./common/temp/build-cache`
5. Run `rush build` → **~10 seconds**

Why is there such a dramatic difference?

## Investigation

### Initial Hypothesis: Page Cache (WRONG!)

Our first thought was that `rush update --recheck` reads 2.4GB of node_modules to verify integrity, evicting files from page cache.

We tested by manually clearing page cache:
```bash
$ sudo purge  # Clear macOS page cache
$ rm -rf ./common/temp/build-cache
$ rush build
rush build (10.97 seconds)  # FAST! Not what we expected
```

**Page cache eviction is NOT the cause** — build is still fast after `sudo purge`.

### Measuring Per-Package Times

We captured build times for all 459 packages:

**After `rush update --recheck`:**
```
Average per package: 2.55 seconds
Total sum: 1172 seconds
```

**Subsequent build:**
```
Average per package: 0.30 seconds  
Total sum: 135 seconds
```

Each package takes **8.5x longer** in the first build!

### The Real Culprit: pnpm --force

`rush update --recheck` internally runs `pnpm install --force`. Let's test pnpm directly:

```bash
$ cd ./common/temp
$ time pnpm install
Done in 0.79s  # Fast, no changes needed

$ time pnpm install --force
Done in 1m 55.1s  # Slow! Refetches everything
```

After `pnpm install --force`:
```bash
$ rm -rf ./common/temp/build-cache
$ rush build
rush build (1 minute 21.8 seconds)  # SLOW!

$ rm -rf ./common/temp/build-cache  
$ rush build
rush build (12.04 seconds)  # Fast again
```

**`pnpm install --force` is the trigger!**

### The Smoking Gun: New Inodes

We checked file inodes before and after `--force`:

```bash
# Before pnpm install --force
$ ls -li ./common/temp/node_modules/.pnpm/esbuild@0.25.12/.../main.js
233503881 -rw-r--r--  1 user  staff  88706 main.js

$ pnpm install --force

# After pnpm install --force  
$ ls -li ./common/temp/node_modules/.pnpm/esbuild@0.25.12/.../main.js
233691414 -rw-r--r--  1 user  staff  88706 main.js
```

**The inode changed!** This means `pnpm install --force` **recreates the files** — they are new files as far as the OS is concerned.

## Root Cause

### What Actually Happens

1. **`rush update --recheck`** runs `pnpm install --force`

2. **`pnpm install --force`** refetches/recreates ALL packages in node_modules
   - Files get new inodes (even if content is identical)
   - This takes ~2 minutes for 2.4GB of node_modules

3. **OS page cache is inode-based** — new inode = cache miss
   - Even though `sudo purge` clears page cache, the files with OLD inodes would still be quickly re-cached
   - With NEW inodes, there's nothing to re-cache — they're brand new files

4. **First `rush build`** must read 2.4GB from disk
   - 459 packages × Node.js startup = lots of file reads
   - Each package reads esbuild, typescript, etc. from disk
   - **Result: ~1 min 20 sec**

5. **Second `rush build`** benefits from page cache
   - Files are now cached (new inodes are in cache)
   - **Result: ~10-12 sec**

### Why `sudo purge` Alone Doesn't Reproduce It

When you run `sudo purge`:
- Page cache is cleared
- But files still have the same inodes
- OS quickly re-caches frequently accessed files
- Build remains fast because file metadata (dentries) is still valid

When `pnpm install --force` runs:
- Files are recreated with NEW inodes
- Old page cache entries become orphaned (wrong inodes)
- OS must read everything fresh from disk
- Directory entry cache is also invalidated

## Verification Matrix

| Action | First Build | Second Build |
|--------|-------------|--------------|
| After `rush update --recheck` | 1:20 | 0:12 |
| After `rush update` (no --recheck) | 0:12 | 0:12 |
| After `sudo purge` alone | 0:11 | 0:11 |
| After `pnpm install --force` | 1:22 | 0:12 |
| After `pnpm install --force` + `sudo purge` | 1:19 | 0:12 |

## System Details

- **Machine**: Apple Silicon Mac with 48GB RAM
- **node_modules size**: 2.4GB
- **Number of packages**: 465 (459 with build scripts)
- **Rush version**: 5.163.0
- **pnpm version**: 10.24.0

## Implications

### When This Matters

1. **CI/CD pipelines**: If you run `rush update --recheck` as part of your CI, expect slower builds
2. **Fresh clones**: Similar effect when cloning repo and running first install
3. **Dependency updates**: Major dependency changes trigger similar behavior

### When to Use `--recheck`

Only use `rush update --recheck` when you:
- Suspect package corruption
- Changed pnpm settings
- Need to verify integrity after disk issues
- Debugging dependency resolution problems

For normal development, plain `rush update` is sufficient and **much** faster.

## Recommendations

1. **Avoid `--recheck` in CI unless necessary**
   ```yaml
   # Use this
   - run: rush update
   
   # Not this (unless you have a reason)
   - run: rush update --recheck
   ```

2. **Warm up the build after --recheck** if you must use it:
   ```bash
   rush update --recheck
   rush build  # First build will be slow, but warms cache
   # Subsequent builds will be fast
   ```

3. **Use remote build cache** (Redis, S3, etc.) to skip rebuilding entirely when possible

4. **Consider CI caching strategies**:
   - Cache `common/temp/node_modules` between CI runs
   - Use pnpm's content-addressable store

## Conclusion

The 8x slowdown after `rush update --recheck` is caused by `pnpm install --force` recreating all node_modules files with new inodes. This invalidates the OS page cache at the inode level, forcing the first build to read 2.4GB from disk.

Key insight: **It's not about cache eviction, it's about cache invalidation through inode replacement.**

Understanding this behavior helps you:
- Make informed decisions about when to use `--recheck`
- Properly diagnose "slow build" issues  
- Optimize your CI/CD pipelines
- Know that the second build will always be fast

---

*Investigation performed on 2025-11-30. Times may vary based on hardware, node_modules size, and system load.*
