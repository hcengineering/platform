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
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  WorkspaceInfoWithStatus,
  isWorkspaceCreating,
  MeasureContext,
  systemAccountUuid,
  type WorkspaceUuid,
  AccountRole
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import { getAccountClient } from '@hcengineering/server-client'
import { aiBotAccountEmail } from '@hcengineering/ai-bot'

import { wait } from './common'

const ASSIGN_WORKSPACE_DELAY_MS = 5 * 1000 // 5 secs
const MAX_ASSIGN_ATTEMPTS = 5

async function tryGetWorkspaceInfo (
  ws: WorkspaceUuid,
  ctx: MeasureContext
): Promise<WorkspaceInfoWithStatus | undefined> {
  const systemToken = generateToken(systemAccountUuid, ws, { service: 'aibot' })
  const accountClient = getAccountClient(systemToken)
  for (let i = 0; i < 5; i++) {
    try {
      const info = await accountClient.getWorkspaceInfo()

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
  workspace: WorkspaceUuid,
  ctx: MeasureContext,
  clearAttempts = true
): Promise<boolean> {
  if (clearAttempts) {
    attemptsByWorkspace.delete(workspace)
  }
  clearTimeout(timeoutByWorkspace.get(workspace))
  try {
    const systemToken = generateToken(systemAccountUuid, undefined, { service: 'aibot' })
    const accountClient = getAccountClient(systemToken)
    const info = await tryGetWorkspaceInfo(workspace, ctx)

    if (info === undefined) {
      ctx.error('Workspace not found', { workspace })
      return false
    }

    if (isWorkspaceCreating(info?.mode)) {
      const t = setTimeout(() => {
        void tryAssignToWorkspace(workspace, ctx, false)
      }, ASSIGN_WORKSPACE_DELAY_MS)

      timeoutByWorkspace.set(workspace, t)

      return false
    }

    await accountClient.assignWorkspace(aiBotAccountEmail, workspace, AccountRole.User)
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
