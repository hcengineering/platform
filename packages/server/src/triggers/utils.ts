//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type CardID, type Message, type MessageID, SortingOrder } from '@hcengineering/communication-types'
import { loadGroupFile } from '@hcengineering/communication-yaml'
import { applyPatches } from '@hcengineering/communication-shared'

import type { TriggerCtx } from '../types'

export async function findMessage(
  ctx: TriggerCtx,
  card: CardID,
  id: MessageID,
  created: Date
): Promise<Message | undefined> {
  const message = (await ctx.db.findMessages({ card, id, limit: 1, files: true }))[0]
  if (message !== undefined) {
    return message
  }
  return await findMessageInFiles(ctx, card, id, created)
}

export async function findMessageInFiles(
  ctx: TriggerCtx,
  card: CardID,
  id: MessageID,
  created: Date
): Promise<Message | undefined> {
  const filesUrl = ctx.metadata.filesUrl
  if (filesUrl === '') {
    ctx.ctx.error('FILES_URL is missing', { filesUrl })
    return undefined
  }

  const group = (
    await ctx.db.findMessagesGroups({
      card,
      fromDate: { lessOrEqual: created },
      toDate: { greaterOrEqual: created },
      limit: 1,
      order: SortingOrder.Ascending,
      orderBy: 'fromDate'
    })
  )[0]

  if (group === undefined) {
    return undefined
  }

  try {
    const parsedFile = await loadGroupFile(ctx.workspace, filesUrl, group, { retries: 3 })
    const messageFromFile = parsedFile.messages.find((it) => it.id === id)
    if (messageFromFile === undefined) {
      return undefined
    }

    const patches = (group.patches ?? []).filter((it) => it.message === id)

    return patches.length > 0 ? applyPatches(messageFromFile, patches) : messageFromFile
  } catch (e) {
    ctx.ctx.error('Failed to find message in files', { card, id, created })
    ctx.ctx.error('Error:', { error: e })
  }
}
