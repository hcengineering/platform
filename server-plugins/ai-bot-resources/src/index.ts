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

import core, {
  Doc,
  PersonId,
  systemAccountUuid,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxUpdateDoc,
  UserStatus
} from '@hcengineering/core'
import { TriggerControl } from '@hcengineering/server-core'
import { getAccountBySocialKey } from '@hcengineering/server-contact'
import { aiBotEmailSocialKey, AIEventRequest } from '@hcengineering/ai-bot'
import chunter, { ChatMessage, DirectMessage, ThreadMessage } from '@hcengineering/chunter'
import contact from '@hcengineering/contact'
import { type SocialIdentity } from '@hcengineering/contact'

import { createAccountRequest, hasAiEndpoint, sendAIEvents } from './utils'

async function OnUserStatus (txes: TxCUD<UserStatus>[], control: TriggerControl): Promise<Tx[]> {
  if (!hasAiEndpoint()) {
    return []
  }

  for (const tx of txes) {
    if (![core.class.TxCreateDoc, core.class.TxUpdateDoc].includes(tx._class)) {
      continue
    }

    if (tx._class === core.class.TxCreateDoc) {
      const createTx = tx as TxCreateDoc<UserStatus>
      const status = TxProcessor.createDoc2Doc(createTx)
      if (status.user === systemAccountUuid) {
        continue
      }
    }

    if (tx._class === core.class.TxUpdateDoc) {
      const updateTx = tx as TxUpdateDoc<UserStatus>
      const val = updateTx.operations.online
      if (val !== true) {
        continue
      }

      const status = (await control.findAll(control.ctx, core.class.UserStatus, { _id: updateTx.objectId }))[0]
      if (status === undefined || status.user === systemAccountUuid) {
        continue
      }
    }

    const socialIdentity = await findAiBotSocialIdentity(control)
    if (socialIdentity === undefined) {
      await createAccountRequest(control.workspace.uuid, control.ctx)
      return []
    }
  }

  return []
}

async function OnMessageSend (originTxs: TxCreateDoc<ChatMessage>[], control: TriggerControl): Promise<Tx[]> {
  if (!hasAiEndpoint()) {
    return []
  }

  const aiBotSocialIdentity = await findAiBotSocialIdentity(control)
  if (aiBotSocialIdentity === undefined) {
    return []
  }

  const allAiSocialIds = await findAiBotAllSocialIds(control, aiBotSocialIdentity)
  const notAiBotTxes = originTxs.filter((it) => !allAiSocialIds.includes(it.modifiedBy))

  for (const notAiBotTx of notAiBotTxes) {
    const message = TxProcessor.createDoc2Doc(notAiBotTx)
    const messageDoc = await getMessageDoc(message, control)

    if (messageDoc !== undefined) {
      const aiBotShouldReply = await isAiBotShouldReply(control, message, messageDoc, aiBotSocialIdentity)
      if (aiBotShouldReply) {
        await OnAiBotShouldReply(control, message, messageDoc)
      }
    }
  }

  return []
}

async function findAiBotSocialIdentity (control: TriggerControl): Promise<SocialIdentity | undefined> {
  return (
    await control.findAll(control.ctx, contact.class.SocialIdentity, { key: aiBotEmailSocialKey }, { limit: 1 })
  )[0]
}

async function findAiBotAllSocialIds (control: TriggerControl, socialIdentity: SocialIdentity): Promise<PersonId[]> {
  const { account } = control.ctx.contextData
  if (account.socialIds.includes(socialIdentity._id)) {
    return account.socialIds
  }

  return (
    await control.findAll(control.ctx, contact.class.SocialIdentity, { attachedTo: socialIdentity.attachedTo })
  ).map((it) => it._id)
}

function isThreadMessage (control: TriggerControl, message: ChatMessage): boolean {
  return control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)
}

async function getMessageDoc (message: ChatMessage, control: TriggerControl): Promise<Doc | undefined> {
  if (isThreadMessage(control, message)) {
    const thread = message as ThreadMessage
    const _id = thread.objectId
    const _class = thread.objectClass

    return (await control.findAll(control.ctx, _class, { _id }))[0]
  }
  const _id = message.attachedTo
  const _class = message.attachedToClass

  return (await control.findAll(control.ctx, _class, { _id }))[0]
}

async function isDirectAvailable (direct: DirectMessage, control: TriggerControl): Promise<boolean> {
  const account = await getAccountBySocialKey(control, aiBotEmailSocialKey)
  if (account == null) {
    return false
  }

  return direct.members.length === 2 && direct.members.includes(account)
}

async function isAiBotShouldReply (
  control: TriggerControl,
  message: ChatMessage,
  messageDoc: Doc,
  aiBotSocialIdentity: SocialIdentity
): Promise<boolean> {
  const aiBotPersonId = aiBotSocialIdentity.attachedTo

  const isDirect =
    messageDoc._class === chunter.class.DirectMessage && (await isDirectAvailable(messageDoc as DirectMessage, control))
  const isAiBotPersonalChat = messageDoc._id === aiBotPersonId
  const isAiBotMentioned = message.message.includes(aiBotPersonId)

  return isDirect || isAiBotPersonalChat || isAiBotMentioned
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

async function OnAiBotShouldReply (control: TriggerControl, message: ChatMessage, messageDoc: Doc): Promise<void> {
  const messageEvent = isThreadMessage(control, message)
    ? getThreadMessageData(message as ThreadMessage)
    : getMessageData(messageDoc, message)

  await sendAIEvents([messageEvent], control.workspace.uuid, control.ctx)
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnUserStatus,
    OnMessageSend
  }
})
