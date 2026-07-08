//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { readFileSync, writeFileSync, existsSync, renameSync, copyFileSync } from 'fs'
import type { Installation, InstallationQuery, InstallationStore } from '@slack/bolt'
import config from './config'

//
// Simple JSON-file installation store. Persists one Installation per Slack team
// (or enterprise for org installs). Good for a single service instance.
// For horizontally-scaled deployments, replace this with a shared DB/Redis store.
//
type Store = Record<string, Installation>

function load (): Store {
  // File absent is normal (first run). File present but unreadable is NOT —
  // treating it as empty would silently drop every workspace's tokens, so
  // preserve the corrupt file and scream.
  if (!existsSync(config.InstallStorePath)) return {}
  try {
    return JSON.parse(readFileSync(config.InstallStorePath, 'utf-8')) as Store
  } catch (e) {
    console.error(
      `[slack] installation store ${config.InstallStorePath} is unreadable — ` +
      `all workspaces will appear disconnected until it is restored:`,
      String(e)
    )
    try {
      copyFileSync(config.InstallStorePath, `${config.InstallStorePath}.corrupt`)
      console.error(`[slack] corrupt store preserved at ${config.InstallStorePath}.corrupt`)
    } catch {}
    return {}
  }
}

function save (store: Store): void {
  // Atomic write: a crash mid-write must not truncate the only copy of every
  // workspace's OAuth tokens.
  const tmp = `${config.InstallStorePath}.tmp`
  writeFileSync(tmp, JSON.stringify(store, null, 2), { mode: 0o600 })
  renameSync(tmp, config.InstallStorePath)
}

/** Reject installs from Slack workspaces not on the SLACK_ALLOWED_TEAMS allowlist. */
function assertTeamAllowed (installation: Installation): void {
  if (config.AllowedTeams.length === 0) {
    console.warn(
      '[slack] SLACK_ALLOWED_TEAMS is not set — ANY Slack workspace can install this app ' +
      'and create tasks in your Huly workspace. Set it before exposing this service publicly.'
    )
    return
  }
  const teamId = installation.team?.id
  const enterpriseId = installation.enterprise?.id
  if (
    (teamId !== undefined && config.AllowedTeams.includes(teamId)) ||
    (enterpriseId !== undefined && config.AllowedTeams.includes(enterpriseId))
  ) {
    return
  }
  console.warn(`[slack] rejected install from non-allowlisted team ${teamId ?? enterpriseId ?? 'unknown'} (${installation.team?.name ?? 'n/a'})`)
  throw Error('This Slack workspace is not authorized to install this app.')
}

function keyFor (input: { isEnterpriseInstall?: boolean, enterpriseId?: string, teamId?: string }): string {
  if (input.isEnterpriseInstall === true && input.enterpriseId !== undefined) return `e:${input.enterpriseId}`
  return `t:${input.teamId}`
}

/** Returns the bot token of the first stored installation (single-workspace convenience). */
export function firstBotToken (): string | undefined {
  const store = load()
  const first = Object.values(store)[0]
  return first?.bot?.token
}

export const fileInstallationStore: InstallationStore = {
  storeInstallation: async (installation: Installation): Promise<void> => {
    assertTeamAllowed(installation)
    const store = load()
    const key = keyFor({
      isEnterpriseInstall: installation.isEnterpriseInstall,
      enterpriseId: installation.enterprise?.id,
      teamId: installation.team?.id
    })
    store[key] = installation
    save(store)
    console.log(`[slack] stored installation ${key} (team: ${installation.team?.name ?? 'n/a'})`)
  },
  fetchInstallation: async (query: InstallationQuery<boolean>): Promise<Installation> => {
    const store = load()
    const key = keyFor({
      isEnterpriseInstall: query.isEnterpriseInstall,
      enterpriseId: query.enterpriseId,
      teamId: query.teamId
    })
    const found = store[key]
    if (found === undefined) throw Error(`No installation found for ${key}`)
    return found
  },
  deleteInstallation: async (query: InstallationQuery<boolean>): Promise<void> => {
    const store = load()
    const key = keyFor({
      isEnterpriseInstall: query.isEnterpriseInstall,
      enterpriseId: query.enterpriseId,
      teamId: query.teamId
    })
    /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete */
    delete store[key]
    save(store)
  }
}
