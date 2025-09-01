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
import core, { PersonId, systemAccountUuid, TxOperations, WorkspaceUuid } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { Execution, parseContext, Transition } from '@hcengineering/process'
import serverProcess, { ProcessControl } from '@hcengineering/server-process'
import { generateToken } from '@hcengineering/server-token'
import config from './config'

export const SERVICE_NAME = 'process-service'

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

export async function releaseClient (workspaceUuid: WorkspaceUuid, socialId?: PersonId): Promise<void> {
  const key = `${workspaceUuid}-${socialId ?? ''}`
  let usage = clientUsage.get(key)
  if (usage === undefined) {
    console.warn(`Client for ${key} not found`)
    return
  }
  usage--
  clientUsage.set(key, usage)
  if (usage <= 0) {
    setTimeout(() => {
      close(key).catch((err) => {
        console.error(`Failed to close client for ${key}`, err)
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
  let accountClient = getAccountClient(config.AccountsUrl, token)

  if (socialId !== undefined && socialId !== core.account.System) {
    const personUuid = await accountClient.findPersonBySocialId(socialId, true)
    if (personUuid === undefined) {
      throw new Error('Global person not found')
    }
    const token = generateToken(personUuid, workspaceUuid, { service: SERVICE_NAME })
    accountClient = getAccountClient(config.AccountsUrl, token)
  }

  const wsInfo = await accountClient.getLoginInfoByToken()
  if (wsInfo == null || !('endpoint' in wsInfo)) {
    throw new Error('Invalid login info')
  }
  const transactorUrl = wsInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
  const client = await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token, true)
  return client
}

export async function pickTransition (
  control: ProcessControl,
  execution: Execution,
  transitions: Transition[],
  context: Record<string, any>
): Promise<Transition | undefined> {
  for (const tr of transitions) {
    const trigger = control.client.getModel().findObject(tr.trigger)
    if (trigger === undefined) continue
    if (trigger.checkFunction === undefined) return tr
    const impl = control.client.getHierarchy().as(trigger, serverProcess.mixin.TriggerImpl)
    if (impl?.serverCheckFunc === undefined) return tr
    const filled = fillParams(tr.triggerParams, execution)
    const checkFunc = await getResource(impl.serverCheckFunc)
    if (checkFunc === undefined) continue
    const res = await checkFunc(filled, context, control.client.getHierarchy())
    if (res) return tr
  }
}

function fillParams (params: Record<string, any>, execution: Execution): Record<string, any> {
  const res: Record<string, any> = {}
  for (const key in params) {
    const value = params[key]
    const context = parseContext(value)
    if (context === undefined) {
      res[key] = value
      continue
    }
    if (context.type === 'context') {
      res[key] = execution.context[context.id]
    }
  }
  return res
}
