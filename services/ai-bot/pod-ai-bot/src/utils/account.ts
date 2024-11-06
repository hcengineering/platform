//
// Copyright © 2024 Hardcore Engineering Inc.
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
  AccountRole,
  BaseWorkspaceInfo,
  isWorkspaceCreating,
  MeasureContext,
  systemAccountEmail
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import { getWorkspaceInfo, assignWorkspace } from '@hcengineering/server-client'
import aiBot, { aiBotAccountEmail } from '@hcengineering/ai-bot'

import { wait } from './common'

const ASSIGN_WORKSPACE_DELAY_MS = 5 * 1000 // 5 secs
const MAX_ASSIGN_ATTEMPTS = 5

async function tryGetWorkspaceInfo (ws: string, ctx: MeasureContext): Promise<BaseWorkspaceInfo | undefined> {
  const systemToken = generateToken(systemAccountEmail, { name: ws })
  for (let i = 0; i < 5; i++) {
    try {
      const info = await getWorkspaceInfo(systemToken)

      if (info == null) {
        await wait(ASSIGN_WORKSPACE_DELAY_MS)
        continue
      }

      return info
    } catch (e) {
      ctx.error('Error during get workspace info:', { e })
      await wait(ASSIGN_WORKSPACE_DELAY_MS)
    }
  }
}

const timeoutByWorkspace = new Map<string, NodeJS.Timeout>()
const attemptsByWorkspace = new Map<string, number>()

export async function tryAssignToWorkspace (
  workspace: string,
  ctx: MeasureContext,
  clearAttempts = true
): Promise<boolean> {
  if (clearAttempts) {
    attemptsByWorkspace.delete(workspace)
  }
  clearTimeout(timeoutByWorkspace.get(workspace))
  try {
    const info = await tryGetWorkspaceInfo(workspace, ctx)

    if (info === undefined) {
      return false
    }

    if (isWorkspaceCreating(info?.mode)) {
      const t = setTimeout(() => {
        void tryAssignToWorkspace(workspace, ctx, false)
      }, ASSIGN_WORKSPACE_DELAY_MS)

      timeoutByWorkspace.set(workspace, t)

      return false
    }

    // const token = generateToken(systemAccountEmail, { name: '-' }, { service: 'aibot' })
    await assignWorkspace(
      aiBotAccountEmail,
      workspace,
      AccountRole.User,
      undefined,
      false,
      undefined,
      aiBot.account.AIBot
    )
    ctx.info('Assigned to workspace: ', { workspace })
    return true
  } catch (e) {
    ctx.error('Error during assign workspace:', { e })
    const attempts = attemptsByWorkspace.get(workspace) ?? 0
    if (attempts < MAX_ASSIGN_ATTEMPTS) {
      attemptsByWorkspace.set(workspace, attempts + 1)
      const t = setTimeout(() => {
        void tryAssignToWorkspace(workspace, ctx, false)
      }, ASSIGN_WORKSPACE_DELAY_MS)
      timeoutByWorkspace.set(workspace, t)
    }
  }

  return false
}
