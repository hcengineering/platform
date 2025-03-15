//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import {
  type WorkspaceInfoWithStatus,
  isWorkspaceCreating,
  type WorkspaceUuid,
  AccountRole,
  type Person as GlobalPerson,
  type AccountUuid
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import { getAccountClient, withRetry } from '@hcengineering/server-client'
import { aiBotAccountEmail, aiBotEmailSocialKey } from '@hcengineering/ai-bot'
import { MeasureContext, PersonUuid, systemAccountUuid } from '@hcengineering/core'

import config from '../config'
import { wait } from './common'

const ASSIGN_WORKSPACE_DELAY = 5 * 1000
const ASSIGN_WORKSPACE_ATTEMPTS = 5

const GET_WORKSPACE_DELAY = 3 * 1000
const GET_WORKSPACE_ATTEMPTS = 3

const WAIT_WORKSPACE_CREATION_STEP = 5 * 1000
const MAX_WAIT_WORKSPACE_CREATION_TIME = 20 * 60 * 1000

async function getWorkspaceInfo (ws: WorkspaceUuid, ctx: MeasureContext): Promise<WorkspaceInfoWithStatus | undefined> {
  const systemToken = generateToken(systemAccountUuid, ws, { service: 'aibot' })
  const accountClient = getAccountClient(systemToken)
  return await withRetry(
    async () => await accountClient.getWorkspaceInfo(),
    (_, attempt) => attempt >= GET_WORKSPACE_ATTEMPTS,
    GET_WORKSPACE_DELAY
  )()
}

async function waitWorkspaceCreation (
  workspace: WorkspaceUuid,
  ctx: MeasureContext
): Promise<WorkspaceInfoWithStatus | undefined> {
  let waitedTime = 0
  let attempt = 0
  while (waitedTime < MAX_WAIT_WORKSPACE_CREATION_TIME) {
    attempt++
    const info = await getWorkspaceInfo(workspace, ctx)

    if (info === undefined) {
      ctx.error('Workspace not found', { workspace })
      return undefined
    }

    if (isWorkspaceCreating(info?.mode)) {
      await waitWorkspaceCreation(workspace, ctx)
      const delay = WAIT_WORKSPACE_CREATION_STEP * attempt
      waitedTime += delay
      if (waitedTime > MAX_WAIT_WORKSPACE_CREATION_TIME) {
        ctx.error('Workspace creation timeout', { workspace })
        return undefined
      }
      await wait(delay)
    } else {
      return info
    }
  }
}

export async function getGlobalPerson (token: string): Promise<GlobalPerson | undefined> {
  try {
    const accountClient = getAccountClient(token)
    return await accountClient.getPerson()
  } catch (err) {
    console.error('Error getting global person', err)
    return undefined
  }
}

export async function tryAssignToWorkspace (workspace: WorkspaceUuid, ctx: MeasureContext): Promise<boolean> {
  try {
    const systemToken = generateToken(systemAccountUuid, undefined, { service: 'aibot' })
    const accountClient = getAccountClient(systemToken)
    const info = await getWorkspaceInfo(workspace, ctx)

    if (info === undefined) {
      ctx.error('Workspace not found', { workspace })
      return false
    }

    if (isWorkspaceCreating(info?.mode)) {
      await waitWorkspaceCreation(workspace, ctx)
    }

    await withRetry(
      async () => {
        await accountClient.assignWorkspace(aiBotAccountEmail, workspace, AccountRole.User)
      },
      (_, attempt) => attempt >= ASSIGN_WORKSPACE_ATTEMPTS,
      ASSIGN_WORKSPACE_DELAY
    )()

    ctx.info('Assigned to workspace: ', { workspace })
    return true
  } catch (e) {
    ctx.error('Error during assign workspace:', { workspace, e })
  }

  return false
}

async function confirmAccount (uuid: PersonUuid): Promise<void> {
  const token = generateToken(uuid, undefined, { service: 'aibot', confirmEmail: aiBotAccountEmail })
  const client = getAccountClient(token)
  try {
    await client.confirm()
  } catch (error: any) {
    // ignore
  }
}

let account: AccountUuid | undefined

export async function getAccountUuid (ctx?: MeasureContext): Promise<AccountUuid | undefined> {
  if (account !== undefined) return account

  const token = generateToken(systemAccountUuid, undefined, { service: 'aibot', confirmEmail: aiBotAccountEmail })
  const accountClient = getAccountClient(token)
  const personUuid = await accountClient.findPersonBySocialKey(aiBotEmailSocialKey)

  if (personUuid !== undefined) {
    await confirmAccount(personUuid)
    account = personUuid as AccountUuid
    return account
  }

  const result = await accountClient.signUp(aiBotAccountEmail, config.Password, config.FirstName, config.LastName)

  if (result !== undefined) {
    await confirmAccount(result.account)
    account = result.account
    return account
  }

  return undefined
}
