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

import { applyPatches } from '@hcengineering/communication-shared'
import {
  type CardID,
  type FindNotificationsParams,
  type Message,
  type MessageID,
  type MessagesGroup,
  type Notification,
  type Patch,
  SortingOrder,
  type WorkspaceID
} from '@hcengineering/communication-types'
import { loadGroupFile } from '@hcengineering/communication-yaml'
import type { FindClient } from '@hcengineering/communication-sdk-types'

export async function findMessage (
  client: FindClient,
  workspace: WorkspaceID,
  filesUrl: string,
  card: CardID,
  id: MessageID,
  created: Date,
  reactions?: boolean,
  files?: boolean,
  replies?: boolean
): Promise<Message | undefined> {
  const message = (await client.findMessages({ card, id, limit: 1, files, reactions, replies }))[0]
  if (message !== undefined) {
    return message
  }
  return await findMessageInFiles(client, workspace, filesUrl, card, id, created)
}

export async function findMessageInFiles (
  client: FindClient,
  workspace: WorkspaceID,
  filesUrl: string,
  card: CardID,
  id: MessageID,
  created: Date
): Promise<Message | undefined> {
  if (filesUrl === '') {
    return undefined
  }

  const group = (
    await client.findMessagesGroups({
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
    const parsedFile = await loadGroupFile(workspace, filesUrl, group, { retries: 3 })
    const messageFromFile = parsedFile.messages.find((it) => it.id === id)
    if (messageFromFile === undefined) {
      return undefined
    }

    const patches = (group.patches ?? []).filter((it) => it.messageId === id)

    return patches.length > 0 ? applyPatches(messageFromFile, patches) : messageFromFile
  } catch (e) {
    console.error('Failed to find message in files', { card, id, created })
    console.error('Error:', { error: e })
  }
}

export async function loadMessageFromGroup (
  id: MessageID,
  workspace: WorkspaceID,
  filesUrl: string,
  group?: MessagesGroup,
  patches: Patch[] = []
): Promise<Message | undefined> {
  if (group == null) return

  const parsedFile = await loadGroupFile(workspace, filesUrl, group, { retries: 5 })

  const message = parsedFile.messages.find((it) => it.id === id)
  if (message == null) return

  return applyPatches(message, patches)
}

export function matchNotification (notification: Notification, params: FindNotificationsParams): boolean {
  if (params.type !== undefined && params.type !== notification.type) return false
  if (params.read !== undefined && params.read !== notification.read) return false
  if (params.id !== undefined && params.id !== notification.id) return false
  if (params.context !== undefined && params.context !== notification.contextId) return false
  if (params.card !== undefined && params.card !== notification.cardId) return false

  const created = notification.created.getTime()

  if (params.created != null) {
    if (params.created instanceof Date) {
      if (created !== params.created.getTime()) return false
    } else {
      const { greater, less, greaterOrEqual, lessOrEqual } = params.created
      if (greater != null && created <= greater.getTime()) return false
      if (less != null && created >= less.getTime()) return false
      if (greaterOrEqual != null && created < greaterOrEqual.getTime()) return false
      if (lessOrEqual != null && created > lessOrEqual.getTime()) return false
    }
  }

  return true
}
