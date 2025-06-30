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

import {
  type AccountID,
  type CardID,
  type Message,
  type MessageID,
  type Markdown,
  type SocialID,
  SortingOrder,
  type WorkspaceID
} from '@hcengineering/communication-types'
import { loadGroupFile } from '@hcengineering/communication-yaml'
import { applyPatches } from '@hcengineering/communication-shared'
import type { DbAdapter } from '@hcengineering/communication-sdk-types'

import type { TriggerCtx } from '../types'
import { findAccount } from '../utils'

export async function findMessage (
  db: DbAdapter,
  filesUrl: string,
  workspace: WorkspaceID,
  card: CardID,
  id: MessageID,
  ops?: {
    files?: boolean
    replies?: boolean
    links?: boolean
    reactions?: boolean
  }
): Promise<Message | undefined> {
  const message = (await db.findMessages({ card, id, limit: 1, ...ops }))[0]
  if (message !== undefined) {
    return message
  }
  return await findMessageInFiles(db, filesUrl, workspace, card, id)
}

export async function findMessageInFiles (
  db: DbAdapter,
  filesUrl: string,
  workspace: WorkspaceID,
  cardId: CardID,
  messageId: MessageID
): Promise<Message | undefined> {
  if (filesUrl === '') {
    return undefined
  }

  const created = await db.getMessageCreated(cardId, messageId)

  if (created == null) return undefined
  const group = (
    await db.findMessagesGroups({
      card: cardId,
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
    const parsedFile = await loadGroupFile(workspace, filesUrl, group, { retries: 3 })
    const messageFromFile = parsedFile.messages.find((it) => it.id === messageId)
    if (messageFromFile === undefined) {
      return undefined
    }

    const patches = (group.patches ?? []).filter((it) => it.messageId === messageId)

    return patches.length > 0 ? applyPatches(messageFromFile, patches) : messageFromFile
  } catch (e) {
    console.error('Failed to find message in files', { card: cardId, id: messageId, created })
    console.error('Error:', { error: e })
  }
}

export async function getNameBySocialID (ctx: TriggerCtx, id: SocialID): Promise<string> {
  const account = await findAccount(ctx, id)
  return account != null ? (await ctx.db.getNameByAccount(account)) ?? 'System' : 'System'
}

export async function getAddCollaboratorsMessageContent (
  ctx: TriggerCtx,
  sender: AccountID | undefined,
  collaborators: AccountID[]
): Promise<Markdown> {
  if (sender != null && collaborators.length === 1 && collaborators.includes(sender)) {
    return 'Joined card'
  }

  const collaboratorsNames = (await Promise.all(collaborators.map((it) => ctx.db.getNameByAccount(it)))).filter(
    (it): it is string => it != null && it !== ''
  )

  return `Added ${collaboratorsNames.join(', ')}`
}

export async function getRemoveCollaboratorsMessageContent (
  ctx: TriggerCtx,
  sender: AccountID | undefined,
  collaborators: AccountID[]
): Promise<Markdown> {
  if (sender != null && collaborators.length === 1 && collaborators.includes(sender)) {
    return 'Left card'
  }

  const collaboratorsNames = (await Promise.all(collaborators.map((it) => ctx.db.getNameByAccount(it)))).filter(
    (it): it is string => it != null && it !== ''
  )

  return `Removed ${collaboratorsNames.join(', ')}`
}
