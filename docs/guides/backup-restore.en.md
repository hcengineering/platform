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
2. **Restore** — replay that backup into the destination workspace using the
   platform's admin tool (`dev/tool`).

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
where you have admin access. Create the destination workspace first if it
doesn't exist yet.

Restoring is done with the `backup-restore` command of the platform admin
tool (`@hcengineering/tool`, `dev/tool` in this repo). Exactly how you invoke
it depends on how the destination platform is run:

- **Docker / self-hosted setup** — run it inside your `tool` container
  (e.g. `docker compose run --rm tool backup-restore ...` or
  `docker compose exec tool ...`, adjusted to your compose service name).
- **Monorepo checkout with Rush** — from `dev/tool`, run it against your
  configured environment, e.g. `rushx run-local backup-restore ...` for a
  local dev stack, or your own script that sets the same environment
  variables against your real databases.

In both cases the command and its arguments are the same:

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
  valid `ACCOUNT_DB_URL`; without both, only documents are restored.
- **A file/video is missing on the destination** — check the **Not backed
  up** list on the Backup page and download it individually; it isn't part
  of the regular backup.
- **Restore fails with a model/version error** — add `--upgrade` if the
  destination runs a newer platform version than the source.

## See also

- [`server/backup/README.md`](../../server/backup/README.md) — full CLI
  reference for `backup-restore`, including environment variables.
- [huly-selfhost](https://github.com/hcengineering/huly-selfhost) — official
  self-hosted distribution.
