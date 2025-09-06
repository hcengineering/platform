//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { getClient as getAccountClient } from '@hcengineering/account-client'
import { createRestTxOperations } from '@hcengineering/api-client'
import core, { MeasureContext, PersonId, systemAccountUuid, TxOperations, WorkspaceUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import config from './config'

export const SERVICE_NAME = 'mail-worker'

const clients = new Map<string, TxOperations | Promise<TxOperations>>()
const clientUsage = new Map<string, number>()

export async function getClient (workspaceUuid: WorkspaceUuid, socialId?: PersonId): Promise<TxOperations> {
  const key = `${workspaceUuid}-${socialId ?? ''}`
  let usage = clientUsage.get(key) ?? 0
  usage++
  clientUsage.set(key, usage)
  const current = clients.get(key)
  if (current !== undefined) {
    if (current instanceof Promise) {
      return await current
    }
    return current
  }

  const client = createClient(workspaceUuid, socialId)
  clients.set(key, client)
  const cl = await client
  clients.set(key, cl)
  return cl
}

export async function releaseClient (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  socialId?: PersonId
): Promise<void> {
  const key = `${workspaceUuid}-${socialId ?? ''}`
  let usage = clientUsage.get(key)
  if (usage === undefined) {
    ctx.warn(`Client for ${key} not found`)
    return
  }
  usage--
  clientUsage.set(key, usage)
  if (usage <= 0) {
    setTimeout(() => {
      close(key).catch((err) => {
        ctx.error(`Failed to close client for ${key}`, err)
      })
    }, 60000)
  }
}

async function close (key: string): Promise<void> {
  const usage = clientUsage.get(key) ?? 0
  if (usage > 0) return
  const current = clients.get(key)
  if (current !== undefined) {
    clients.delete(key)
    if (current instanceof Promise) {
      const resolvedClient = await current
      await resolvedClient.close()
    } else {
      await current.close()
    }
  }
}

async function createClient (workspaceUuid: WorkspaceUuid, socialId?: PersonId): Promise<TxOperations> {
  const token = generateToken(systemAccountUuid, workspaceUuid, { service: SERVICE_NAME })
  let accountClient = getAccountClient(config.accountsUrl, token)

  if (socialId !== undefined && socialId !== core.account.System) {
    const personUuid = await accountClient.findPersonBySocialId(socialId, true)
    if (personUuid === undefined) {
      throw new Error('Global person not found')
    }
    const token = generateToken(personUuid, workspaceUuid, { service: SERVICE_NAME })
    accountClient = getAccountClient(config.accountsUrl, token)
  }

  const wsInfo = await accountClient.getLoginInfoByToken()
  if (wsInfo == null || !('endpoint' in wsInfo)) {
    throw new Error('Invalid login info')
  }
  const transactorUrl = wsInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
  const client = await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token, true)
  return client
}
