# Backup & Restore Guide

Download a workspace backup and restore it into another Huly instance —
whether that's a self-hosted deployment or one of the hosted options. This is
the recommended way to move your data off a hosted workspace before it
becomes unavailable.

> [!TIP]
> Don't want to run your own server? You can also move to one of the
> existing hosted Huly forks instead of self-hosting. We're glad to help
> with the data migration either way — just keep in mind that none of these
> hosting options are free, since keeping servers running costs real money.
> See [Need help?](#need-help) below to get in touch.

## Overview

1. **Download** — from *Settings → Backup* in the workspace you want to move,
   grab a full copy of your data.
2. **Restore** — replay that backup into the destination workspace — either
   with the ready-made [huly-selfhost](https://github.com/hcengineering/huly-selfhost)
   scripts (`restore-workspace.sh`) or with the platform's admin tool
   (`dev/tool`) directly.

## Step 1. Download your backup

Open the workspace and go to:

```
<your-workspace-url>/setting/setting/backup
```

(*Settings → Backup* in the left sidebar.) The page shows when the backup was
last taken, how many snapshots and files it contains, and its total size.

> [!NOTE]
> Backups are taken periodically, not continuously, so the latest backup can
> lag behind your live data by some time. Check **Last backup** on the page
> before you rely on it, and give it time to catch up if you just made
> important changes.

You have two ways to get the files:

- **Download full backup** — bundles every backup file into a single `.zip`
  you can keep on your computer. A `RESTORE.md` with restore instructions is
  included inside the archive.
- **Copy download script** (+ **Copy token**) — copies a small shell script
  that downloads every file with `curl`. The script is safe to save or share:
  it does **not** contain your token — it reads it from the
  `HULY_BACKUP_TOKEN` environment variable, or prompts for it when you run it.

Either option produces a folder that the restore tool can consume directly
(see Step 2).

> [!TIP]
> **Large workspace?** Prefer the download script over the button. "Download
> full backup" assembles the whole archive in your browser's memory before
> saving it, which can be slow or fail outright once a workspace has a lot of
> data. The script downloads files one by one with `curl`, so it handles
> large backups more reliably.

You can also expand **Backup Snapshots** or **Backup Files** to download
individual files, e.g. to verify access or fetch a single snapshot.

> [!IMPORTANT]
> The **Not backed up** section lists blobs that are intentionally excluded
> from the regular backup (video, audio, and any file larger than the
> server's blob-size limit). Their content isn't in the archive or script
> above — if you need them on the destination, download each one individually
> from that list before you migrate.

## Step 2. Restore into a Huly instance

You'll need a Huly platform you control to restore into — either
[huly-selfhost](https://github.com/hcengineering/huly-selfhost), a
self-hosted deployment built from this monorepo, or another hosted instance
where you have admin access.

### Option A: huly-selfhost scripts (recommended)

The [huly-selfhost](https://github.com/hcengineering/huly-selfhost)
repository ships helper scripts that wrap the admin tool with the right
connection settings read from your `huly_v7.conf` (created by `./setup.sh`).
Make sure the stack is running (`docker compose up -d`), then from the
`huly-selfhost` folder:

- [`restore-workspace.sh`](https://github.com/hcengineering/huly-selfhost/blob/main/restore-workspace.sh)
  — one-shot migration: creates the admin account, creates and assigns the
  workspace, then restores the backup into it.

  ```
  ./restore-workspace.sh <backup-dir> <workspace> [options] [-- <extra args>]
  ```

  Useful options: `-e/--email` and `-p/--password` for the admin account
  (password is generated and printed if omitted), `--skip-account` /
  `--skip-workspace` if they already exist, `--date <ms>` to pick a
  snapshot. Anything after `--` is passed to the underlying restore
  (e.g. `-- --merge`).

- [`backup-restore.sh`](https://github.com/hcengineering/huly-selfhost/blob/main/backup-restore.sh)
  — restore into an **existing** workspace:

  ```
  ./backup-restore.sh <backup-dir> <workspace> [date] [--no-accounts] [--no-upgrade]
  ```

  Accounts restore and the post-restore workspace upgrade are **on by
  default** (disable with `--no-accounts` / `--no-upgrade`), so there's no
  need to pass `--accounts` or configure `ACCOUNT_DB_URL` manually.

- [`run-tool.sh`](https://github.com/hcengineering/huly-selfhost/blob/main/run-tool.sh)
  — general-purpose wrapper that runs any admin tool command (or an
  interactive shell) against your deployment, e.g.
  `./run-tool.sh create-account user@example.com -p pass -f First -l Last`.

Example — full migration in one command:

```
./restore-workspace.sh ./backups/myws myws -e me@example.com
```

### Option B: run the admin tool manually

For other deployments, restoring is done with the `backup-restore` command
of the platform admin tool (`@hcengineering/tool`, `dev/tool` in this repo).
Create the destination workspace first if it doesn't exist yet. Exactly how
you invoke the tool depends on how the destination platform is run:

- **huly-selfhost deployment** — use
  [`run-tool.sh`](https://github.com/hcengineering/huly-selfhost/blob/main/run-tool.sh):
  it starts the `hardcoreeng/tool` container with all connection settings
  taken from your `huly_v7.conf`. Mount the backup folder into the container
  via `RUN_TOOL_DOCKER_ARGS`:

  ```
  RUN_TOOL_DOCKER_ARGS="-v /abs/path/to/backup:/backup" \
    ./run-tool.sh backup-restore /backup <target-workspace> --accounts
  ```

- **Other Docker setups** — run the `hardcoreeng/tool` image on your stack's
  network with the same environment variables your services use
  (`SERVER_SECRET`, `DB_URL`, `ACCOUNT_DB_URL`, `STORAGE_CONFIG`,
  `ACCOUNTS_URL`, `TRANSACTOR_URL`, ...) and the backup folder mounted —
  `run-tool.sh` is a good reference for the full invocation.
- **Monorepo checkout with Rush** — from `dev/tool`, run it against your
  configured environment, e.g. `rushx run-local backup-restore ...` for a
  local dev stack, or your own script that sets the same environment
  variables against your real databases.

In all cases the command and its arguments are the same:

```
backup-restore <path-to-backup-folder> <target-workspace> [date] --accounts
```

- `<path-to-backup-folder>` — the folder you downloaded/unzipped in Step 1.
- `<target-workspace>` — the destination workspace's identifier.
- `--accounts` — also restores the original users (their profile and social
  identities) into the target workspace. Without this flag only documents are
  restored, and every member has to be invited again by email.
- `--upgrade` — add this if the destination runs a newer model version than
  the backup.
- `-m/--merge` — don't delete documents that are missing from the backup
  (useful when merging into a workspace that already has data).

> [!NOTE]
> Restoring accounts (`--accounts`) needs its own connection to the account
> database, configured via the `ACCOUNT_DB_URL` (and optional
> `ACCOUNT_DB_NS`) environment variables. See
> [`server/backup/README.md`](../../server/backup/README.md) for the full
> reference of flags and per-entry-point environment variables.

Once the restore finishes, users sign in with their original email via a
one-time code (OTP) — make sure the destination platform can send mail.

## Need help?

Our team is happy to help with migration. Join the [Huly community](https://link.huly.io/slack) to ask questions and get updates, or email us directly at [artem@hardcoreeng.com](mailto:artem@hardcoreeng.com).

## Troubleshooting

- **401 Unauthorized while downloading** — your token expired, or you're not
  an owner/admin of the workspace. Get a fresh token from the Backup page.
- **Members are missing after restore** — re-run with `--accounts` and a
  valid `ACCOUNT_DB_URL`; without both, only documents are restored. (The
  huly-selfhost scripts do this by default — check you didn't pass
  `--no-accounts`.)
- **A file/video is missing on the destination** — check the **Not backed
  up** list on the Backup page and download it individually; it isn't part
  of the regular backup.
- **Restore fails with a model/version error** — add `--upgrade` if the
  destination runs a newer platform version than the source. (The
  huly-selfhost `backup-restore.sh` upgrades the workspace after restore by
  default.)
- **`Config not found: huly_v7.conf`** — the huly-selfhost scripts read
  connection settings from the config created by `./setup.sh`; run it first.
- **`Network ... not found`** — the huly-selfhost scripts need the stack
  running; start it with `docker compose up -d`.
- **Warning about `blobs/blobs.json`** — the backup came from a
  datalake-based deployment and contains extra blobs the minio-based
  self-host stack can't ingest automatically; those blobs were not uploaded.

## See also

- [huly-selfhost](https://github.com/hcengineering/huly-selfhost) — official
  self-hosted distribution, including
  [`restore-workspace.sh`](https://github.com/hcengineering/huly-selfhost/blob/main/restore-workspace.sh),
  [`backup-restore.sh`](https://github.com/hcengineering/huly-selfhost/blob/main/backup-restore.sh) and
  [`run-tool.sh`](https://github.com/hcengineering/huly-selfhost/blob/main/run-tool.sh).
