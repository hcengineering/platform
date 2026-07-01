//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { Installation, InstallationQuery, InstallationStore } from '@slack/bolt'
import config from './config'

//
// Simple JSON-file installation store. Persists one Installation per Slack team
// (or enterprise for org installs). Good for a single service instance.
// For horizontally-scaled deployments, replace this with a shared DB/Redis store.
//
type Store = Record<string, Installation>

function load (): Store {
  try {
    if (existsSync(config.InstallStorePath)) {
      return JSON.parse(readFileSync(config.InstallStorePath, 'utf-8')) as Store
    }
  } catch (e) {
    console.warn('[slack] could not read installation store:', String(e))
  }
  return {}
}

function save (store: Store): void {
  writeFileSync(config.InstallStorePath, JSON.stringify(store, null, 2))
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
