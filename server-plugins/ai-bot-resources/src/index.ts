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
  systemAccountUuid,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxUpdateDoc,
  UserStatus
} from '@hcengineering/core'
import { TriggerControl } from '@hcengineering/server-core'
import { getAccountBySocialId, getPerson } from '@hcengineering/server-contact'
import { aiBotEmailSocialId, AIEventRequest } from '@hcengineering/ai-bot'

import { createAccountRequest, hasAiEndpoint, sendAIEvents } from './utils'
import chunter, { ChatMessage, DirectMessage, ThreadMessage } from '@hcengineering/chunter'

async function OnUserStatus (txes: TxCUD<UserStatus>[], control: TriggerControl): Promise<Tx[]> {
  if (!hasAiEndpoint()) {
    return []
  }

  const account = await getAccountBySocialId(control, aiBotEmailSocialId)

  if (control.ctx.contextData.account.uuid === account) {
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

    const aiBotPerson = await getPerson(control, aiBotEmailSocialId)

    if (aiBotPerson === undefined) {
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

  const { hierarchy } = control
  const txes = originTxs.filter((it) => it.modifiedBy !== aiBotEmailSocialId)

  if (txes.length === 0) {
    return []
  }

  for (const tx of txes) {
    const message = TxProcessor.createDoc2Doc(tx)

    const isThread = hierarchy.isDerived(tx.objectClass, chunter.class.ThreadMessage)
    const docClass = isThread ? (message as ThreadMessage).objectClass : message.attachedToClass

    if (!hierarchy.isDerived(docClass, chunter.class.DirectMessage)) {
      continue
    }

    if (docClass === chunter.class.DirectMessage) {
      await onBotDirectMessageSend(control, message)
    }
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

    return (await control.findAll(control.ctx, _class, { _id }))[0]
  } else {
    const _id = message.attachedTo
    const _class = message.attachedToClass

    return (await control.findAll(control.ctx, _class, { _id }))[0]
  }
}

async function isDirectAvailable (direct: DirectMessage, control: TriggerControl): Promise<boolean> {
  const { members } = direct
  const account = await getAccountBySocialId(control, aiBotEmailSocialId)

  if (account == null) {
    return false
  }

  if (!members.includes(account)) {
    return false
  }

  return members.length === 2
}

async function onBotDirectMessageSend (control: TriggerControl, message: ChatMessage): Promise<void> {
  const direct = (await getMessageDoc(message, control)) as DirectMessage
  if (direct === undefined) {
    return
  }
  const isAvailable = await isDirectAvailable(direct, control)
  if (!isAvailable) {
    return
  }
  let messageEvent: AIEventRequest
  if (control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
    messageEvent = getThreadMessageData(message as ThreadMessage)
  } else {
    messageEvent = getMessageData(direct, message)
  }
  await sendAIEvents([messageEvent], control.workspace.uuid, control.ctx)
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnUserStatus,
    OnMessageSend
  }
})
