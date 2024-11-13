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

import aiBot, {
  aiBotAccountEmail,
  AIEventType,
  AIMessageEventRequest,
  AITransferEventRequest
} from '@hcengineering/ai-bot'
import analyticsCollector, { OnboardingChannel } from '@hcengineering/analytics-collector'
import chunter, { ChatMessage, DirectMessage, ThreadMessage } from '@hcengineering/chunter'
import contact, { PersonAccount } from '@hcengineering/contact'
import core, {
  AccountRole,
  AttachedDoc,
  Doc,
  Ref,
  toWorkspaceString,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxUpdateDoc,
  UserStatus
} from '@hcengineering/core'
import { ActivityInboxNotification, MentionInboxNotification } from '@hcengineering/notification'
import { TriggerControl } from '@hcengineering/server-core'

import { createAccountRequest, getSupportWorkspaceId, sendAIEvents } from './utils'

async function isDirectAvailable (direct: DirectMessage, control: TriggerControl): Promise<boolean> {
  const { members } = direct

  if (!members.includes(aiBot.account.AIBot)) {
    return false
  }

  const personAccounts = await control.modelDb.findAll(contact.class.PersonAccount, {
    _id: { $in: members as Ref<PersonAccount>[] }
  })
  const persons = new Set(personAccounts.map((account) => account.person))

  return persons.size === 2
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

function getMessageData (doc: Doc, message: ChatMessage, email: string): AIMessageEventRequest {
  return {
    type: AIEventType.Message,
    createdOn: message.createdOn ?? message.modifiedOn,
    objectId: message.attachedTo,
    objectClass: message.attachedToClass,
    objectSpace: doc.space,
    collection: message.collection,
    messageClass: message._class,
    messageId: message._id,
    message: message.message,
    user: message.createdBy ?? message.modifiedBy,
    email
  }
}

function getThreadMessageData (message: ThreadMessage, email: string): AIMessageEventRequest {
  return {
    type: AIEventType.Message,
    createdOn: message.createdOn ?? message.modifiedOn,
    objectId: message.attachedTo,
    objectClass: message.attachedToClass,
    objectSpace: message.space,
    collection: message.collection,
    messageClass: message._class,
    message: message.message,
    messageId: message._id,
    user: message.createdBy ?? message.modifiedBy,
    email
  }
}

async function getThreadParent (control: TriggerControl, message: ChatMessage): Promise<Ref<ChatMessage> | undefined> {
  if (!control.hierarchy.isDerived(message.attachedToClass, chunter.class.ChatMessage)) {
    return undefined
  }

  const parentInfo = (
    await control.findAll(control.ctx, message.attachedToClass, {
      _id: message.attachedTo as Ref<ChatMessage>,
      [aiBot.mixin.TransferredMessage]: { $exists: true }
    })
  )[0]

  if (parentInfo !== undefined) {
    return control.hierarchy.as(parentInfo, aiBot.mixin.TransferredMessage).messageId
  }

  return message.attachedTo as Ref<ChatMessage>
}

async function createTransferEvent (
  control: TriggerControl,
  message: ChatMessage,
  account: PersonAccount,
  data: AIMessageEventRequest
): Promise<AITransferEventRequest | undefined> {
  if (account.role !== AccountRole.Owner) {
    return
  }

  const supportWorkspaceId = getSupportWorkspaceId()

  if (supportWorkspaceId === undefined) {
    return
  }

  return {
    type: AIEventType.Transfer,
    createdOn: message.createdOn ?? message.modifiedOn,
    messageClass: data.messageClass,
    message: message.message,
    collection: data.collection,
    toWorkspace: supportWorkspaceId,
    toEmail: account.email,
    fromWorkspace: toWorkspaceString(control.workspace),
    fromWorkspaceName: control.workspace.workspaceName,
    fromWorkspaceUrl: control.workspace.workspaceUrl,
    messageId: message._id,
    parentMessageId: await getThreadParent(control, message)
  }
}

async function onBotDirectMessageSend (control: TriggerControl, message: ChatMessage): Promise<void> {
  const account = control.modelDb.findAllSync(contact.class.PersonAccount, {
    _id: (message.createdBy ?? message.modifiedBy) as Ref<PersonAccount>
  })[0]

  if (account === undefined) {
    return
  }

  const direct = (await getMessageDoc(message, control)) as DirectMessage

  if (direct === undefined) {
    return
  }

  const isAvailable = await isDirectAvailable(direct, control)

  if (!isAvailable) {
    return
  }

  let messageEvent: AIMessageEventRequest

  if (control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
    messageEvent = getThreadMessageData(message as ThreadMessage, account.email)
  } else {
    messageEvent = getMessageData(direct, message, account.email)
  }

  const transferEvent = await createTransferEvent(control, message, account, messageEvent)
  const events = transferEvent !== undefined ? [messageEvent, transferEvent] : [messageEvent]

  await sendAIEvents(events, control.workspace, control.ctx)
}

async function onSupportWorkspaceMessage (control: TriggerControl, message: ChatMessage): Promise<void> {
  const supportWorkspaceId = getSupportWorkspaceId()

  if (supportWorkspaceId === undefined) {
    return
  }

  if (toWorkspaceString(control.workspace) !== supportWorkspaceId) {
    return
  }

  if (!control.hierarchy.isDerived(message.attachedToClass, analyticsCollector.class.OnboardingChannel)) {
    return
  }

  const channel = (await getMessageDoc(message, control)) as OnboardingChannel

  if (channel === undefined) {
    return
  }

  const { workspaceId, email } = channel
  const account = control.modelDb.findAllSync(contact.class.PersonAccount, {
    _id: (message.createdBy ?? message.modifiedBy) as Ref<PersonAccount>
  })[0]

  let data: AIMessageEventRequest
  if (control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
    data = getThreadMessageData(message as ThreadMessage, account.email)
  } else {
    data = getMessageData(channel, message, account.email)
  }

  const transferEvent: AITransferEventRequest = {
    type: AIEventType.Transfer,
    createdOn: data.createdOn,
    messageClass: data.messageClass,
    message: message.message,
    collection: data.collection,
    toEmail: email,
    toWorkspace: workspaceId,
    fromWorkspace: toWorkspaceString(control.workspace),
    fromWorkspaceUrl: control.workspace.workspaceUrl,
    fromWorkspaceName: control.workspace.workspaceName,
    messageId: message._id,
    parentMessageId: await getThreadParent(control, message)
  }

  await sendAIEvents([transferEvent], control.workspace, control.ctx)
}

export async function OnMessageSend (
  originTxs: TxCollectionCUD<Doc, AttachedDoc>[],
  control: TriggerControl
): Promise<Tx[]> {
  const { hierarchy } = control
  const txes = originTxs
    .map((it) => TxProcessor.extractTx(it) as TxCreateDoc<ChatMessage>)
    .filter(
      (it) =>
        it._class === core.class.TxCreateDoc &&
        hierarchy.isDerived(it.objectClass, chunter.class.ChatMessage) &&
        !(it.modifiedBy === aiBot.account.AIBot || it.modifiedBy === core.account.System)
    )
  if (txes.length === 0) {
    return []
  }
  for (const tx of txes) {
    const isThread = hierarchy.isDerived(tx.objectClass, chunter.class.ThreadMessage)
    const message = TxProcessor.createDoc2Doc(tx)

    const docClass = isThread ? (message as ThreadMessage).objectClass : message.attachedToClass

    if (!hierarchy.isDerived(docClass, chunter.class.ChunterSpace)) {
      continue
    }

    if (docClass === chunter.class.DirectMessage) {
      await onBotDirectMessageSend(control, message)
    }

    if (docClass === analyticsCollector.class.OnboardingChannel) {
      await onSupportWorkspaceMessage(control, message)
    }
  }

  return []
}

export async function OnMention (tx: TxCreateDoc<MentionInboxNotification>, control: TriggerControl): Promise<Tx[]> {
  // Note: temporally commented until open ai will be added
  // if (tx.objectClass !== notification.class.MentionInboxNotification || tx._class !== core.class.TxCreateDoc) {
  //   return []
  // }
  //
  // const mention = TxProcessor.createDoc2Doc(tx)
  //
  // if (mention.user !== aiBot.account.AIBot) {
  //   return []
  // }
  //
  // if (!control.hierarchy.isDerived(mention.mentionedInClass, chunter.class.ChatMessage)) {
  //   return []
  // }
  //
  // const message = (
  //   await control.findAll<ChatMessage>(mention.mentionedInClass, { _id: mention.mentionedIn as Ref<ChatMessage> })
  // )[0]
  //
  // if (message === undefined) {
  //   return []
  // }
  //
  // await createResponseEvent(message, control)

  return []
}

export async function OnMessageNotified (
  tx: TxCreateDoc<ActivityInboxNotification>,
  control: TriggerControl
): Promise<Tx[]> {
  // Note: temporally commented until open ai will be added
  // if (tx.objectClass !== notification.class.ActivityInboxNotification || tx._class !== core.class.TxCreateDoc) {
  //   return []
  // }
  //
  // const doc = TxProcessor.createDoc2Doc(tx)
  //
  // if (doc.user !== aiBot.account.AIBot) {
  //   return []
  // }
  //
  // if (!control.hierarchy.isDerived(doc.attachedToClass, chunter.class.ChatMessage)) {
  //   return []
  // }
  //
  // const personAccount = await control.modelDb.findOne(contact.class.PersonAccount, { email: aiBotAccountEmail })
  //
  // if (personAccount === undefined) {
  //   return []
  // }
  //
  // const message = (
  //   await control.findAll<ChatMessage>(doc.attachedToClass, { _id: doc.attachedTo as Ref<ChatMessage> })
  // )[0]
  //
  // if (message === undefined) {
  //   return []
  // }
  //
  // if (isDocMentioned(personAccount.person, message.message)) {
  //   return await createResponseEvent(message, control)
  // }
  //
  // if (!control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
  //   return []
  // }
  //
  // const thread = message as ThreadMessage
  // TODO: do we really need to find parent???
  // const parent = (await control.findAll(thread.attachedToClass, { _id: thread.attachedTo }))[0]
  //
  // if (parent === undefined) {
  //   return []
  // }
  //
  // if (parent.createdBy === aiBot.account.AIBot) {
  //   return await createResponseEvent(message, control)
  // }

  return []
}

export async function OnUserStatus (originTx: Tx, control: TriggerControl): Promise<Tx[]> {
  const tx = TxProcessor.extractTx(originTx) as TxCUD<UserStatus>

  if (
    tx.objectClass !== core.class.UserStatus ||
    ![core.class.TxCreateDoc, core.class.TxUpdateDoc].includes(tx._class)
  ) {
    return []
  }

  if (tx._class === core.class.TxCreateDoc) {
    const createTx = tx as TxCreateDoc<UserStatus>
    const status = TxProcessor.createDoc2Doc(createTx)
    if (status.user === aiBot.account.AIBot || status.user === core.account.System || !status.online) {
      return []
    }
  }

  if (tx._class === core.class.TxUpdateDoc) {
    const updateTx = tx as TxUpdateDoc<UserStatus>
    const val = updateTx.operations.online
    if (val !== true) {
      return []
    }

    const status = (await control.findAll(control.ctx, core.class.UserStatus, { _id: updateTx.objectId }))[0]
    if (status === undefined || status.user === aiBot.account.AIBot || status.user === core.account.System) {
      return []
    }
  }

  const account = control.modelDb.findAllSync(contact.class.PersonAccount, { email: aiBotAccountEmail })[0]

  if (account !== undefined) {
    return []
  }

  await createAccountRequest(control.workspace, control.ctx)

  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnMessageSend,
    OnMention,
    OnMessageNotified,
    OnUserStatus
  }
})
