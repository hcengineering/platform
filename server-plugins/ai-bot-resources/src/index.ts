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

import { AccountUuid, Doc, PersonId, Ref, Tx, TxCreateDoc, TxProcessor } from '@hcengineering/core'
import { PlatformQueueProducer, QueueTopic, TriggerControl } from '@hcengineering/server-core'
import { aiBotEmailSocialKey, AIEventRequest } from '@hcengineering/ai-bot'
import chunter, { ChatMessage, DirectMessage, ThreadMessage } from '@hcengineering/chunter'
import contact, { Employee, SocialIdentity } from '@hcengineering/contact'

import { MarkupNodeType, markupToJSON, traverseNode } from '@hcengineering/text'

interface WorkspaceCacheEntry {
  primary: SocialIdentity
  all: PersonId[]
  employee: Employee
}

const cacheKey = 'ai-info'

async function getAIWorkspaceID (control: TriggerControl): Promise<WorkspaceCacheEntry | undefined> {
  let wsEntry: WorkspaceCacheEntry | number | undefined = control.cache.get(cacheKey) as
    | WorkspaceCacheEntry
    | number
    | undefined
  if (typeof wsEntry === 'number') {
    if (Date.now() - wsEntry < 5000) {
      // Check every 5 seconds.
      return undefined
    }
    wsEntry = undefined
  }
  if (wsEntry === undefined) {
    const primaryIdentity = (
      await control.findAll(control.ctx, contact.class.SocialIdentity, { key: aiBotEmailSocialKey }, { limit: 1 })
    )[0]

    if (primaryIdentity === undefined) return undefined

    const allAiSocialIds: PersonId[] = (
      await control.findAll(control.ctx, contact.class.SocialIdentity, {
        attachedTo: primaryIdentity.attachedTo
      })
    ).map((it) => it._id)

    const employee = (
      await control.findAll(
        control.ctx,
        contact.mixin.Employee,
        { _id: primaryIdentity.attachedTo as Ref<Employee> },
        { limit: 1 }
      )
    ).shift()
    if (employee === undefined) {
      return undefined
    }
    wsEntry = {
      all: allAiSocialIds,
      primary: primaryIdentity,
      employee
    }
    control.cache.set(cacheKey, wsEntry)
  }
  return wsEntry
}

async function OnMessageSend (originTxs: TxCreateDoc<ChatMessage>[], control: TriggerControl): Promise<Tx[]> {
  const wsID = await getAIWorkspaceID(control)
  if (wsID === undefined) {
    // No activity for trigger
    return []
  }

  const { hierarchy } = control

  const producer = control.queue?.getProducer<AIEventRequest>(control.ctx, QueueTopic.AIQueue)
  if (producer === undefined) {
    return []
  }

  // IGNORE AI operations
  const txes = originTxs.filter((it) => !wsID.all.includes(it.modifiedBy))

  if (txes.length === 0) {
    return []
  }

  for (const tx of txes) {
    const message = TxProcessor.createDoc2Doc(tx)

    const isThread = hierarchy.isDerived(tx.objectClass, chunter.class.ThreadMessage)
    const docClass = isThread ? (message as ThreadMessage).objectClass : message.attachedToClass
    // Find out it message contains a mention of AIBot
    try {
      const jsonMarkup = markupToJSON(message.message)
      let mentioned = false
      traverseNode(jsonMarkup, (node) => {
        if (node.type === MarkupNodeType.reference && node.attrs != null) {
          const objectId = node.attrs.id as Ref<Doc>
          if (objectId === wsID.primary.attachedTo) {
            // AI bot has mentioned
            mentioned = true
            return false
          }
        }
        return !mentioned
      })

      if (docClass === chunter.class.DirectMessage) {
        await onBotDirectMessageSend(control, message, 'direct', wsID, producer)
      } else if (mentioned) {
        await onBotDirectMessageSend(control, message, 'mentioned', wsID, producer)
      }
    } catch (err: any) {
      control.ctx.error('Failed to prepare a ai bot message')
    }
    // }
  }

  return []
}

function getMessageData (doc: Doc, message: ChatMessage): AIEventRequest {
  return {
    createdOn: message.createdOn ?? message.modifiedOn,
    objectId: message.attachedTo,
    objectClass: message.attachedToClass,
    objectSpace: doc.space,
    collection: message.collection,
    messageClass: message._class,
    messageId: message._id,
    message: message.message,
    user: message.createdBy ?? message.modifiedBy
  }
}

function getThreadMessageData (message: ThreadMessage): AIEventRequest {
  return {
    createdOn: message.createdOn ?? message.modifiedOn,
    objectId: message.attachedTo,
    objectClass: message.attachedToClass,
    objectSpace: message.space,
    collection: message.collection,
    messageClass: message._class,
    message: message.message,
    messageId: message._id,
    user: message.createdBy ?? message.modifiedBy
  }
}

async function getMessageDoc (message: ChatMessage, control: TriggerControl): Promise<Doc | undefined> {
  if (control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
    const thread = message as ThreadMessage
    const _id = thread.objectId
    const _class = thread.objectClass

    return (await control.queryFind(control.ctx, _class, { _id }))[0]
  } else {
    const _id = message.attachedTo
    const _class = message.attachedToClass

    return (await control.queryFind(control.ctx, _class, { _id }))[0]
  }
}

function isDirectAvailable (direct: DirectMessage, control: TriggerControl, wsID: WorkspaceCacheEntry): boolean {
  const { members } = direct

  if (!members.includes(wsID.employee.personUuid as AccountUuid)) {
    return false
  }

  return members.length === 2
}

async function onBotDirectMessageSend (
  control: TriggerControl,
  message: ChatMessage,
  kind: 'direct' | 'mentioned',
  wsID: WorkspaceCacheEntry,
  producer: PlatformQueueProducer<AIEventRequest>
): Promise<void> {
  if (kind === 'direct') {
    const direct = (await getMessageDoc(message, control)) as DirectMessage
    if (direct === undefined) {
      return
    }
    const isAvailable = isDirectAvailable(direct, control, wsID)
    if (!isAvailable) {
      return
    }
    let messageEvent: AIEventRequest
    if (control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
      messageEvent = getThreadMessageData(message as ThreadMessage)
    } else {
      messageEvent = getMessageData(direct, message)
    }
    await producer.send(control.ctx, control.workspace.uuid, [messageEvent])
  } else if (kind === 'mentioned') {
    let messageEvent: AIEventRequest
    if (control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
      messageEvent = getThreadMessageData(message as ThreadMessage)
    } else {
      messageEvent = getMessageData(message, message)
    }

    await producer.send(control.ctx, control.workspace.uuid, [messageEvent])
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnMessageSend
  }
})
