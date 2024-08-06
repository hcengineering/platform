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

import core, {
  AccountRole,
  AttachedDoc,
  Data,
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
import { TriggerControl } from '@hcengineering/server-core'
import chunter, { ChatMessage, DirectMessage, ThreadMessage } from '@hcengineering/chunter'
import aiBot, { aiBotAccountEmail, AIBotResponseEvent } from '@hcengineering/ai-bot'
import serverAIBot, { AIBotServiceAdapter, serverAiBotId } from '@hcengineering/server-ai-bot'
import contact, { PersonAccount } from '@hcengineering/contact'
import { ActivityInboxNotification, MentionInboxNotification } from '@hcengineering/notification'
import { getMetadata } from '@hcengineering/platform'
import analytics from '@hcengineering/analytics-collector'

async function processWorkspace (control: TriggerControl): Promise<void> {
  const adapter = control.serviceAdaptersManager.getAdapter(serverAiBotId) as AIBotServiceAdapter | undefined

  if (adapter !== undefined) {
    await adapter.processWorkspace(control.workspace)
  } else {
    console.error('Cannot find server adapter: ', serverAiBotId)
  }
}

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

async function isAvailableDoc (doc: Doc, control: TriggerControl): Promise<boolean> {
  if (doc._class === chunter.class.DirectMessage) {
    return await isDirectAvailable(doc as DirectMessage, control)
  }

  return true
}

async function getMessageDoc (message: ChatMessage, control: TriggerControl): Promise<Doc | undefined> {
  if (control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
    const thread = message as ThreadMessage
    const _id = thread.objectId
    const _class = thread.objectClass

    return (await control.findAll(_class, { _id }))[0]
  } else {
    const _id = message.attachedTo
    const _class = message.attachedToClass

    return (await control.findAll(_class, { _id }))[0]
  }
}

async function getMessageData (
  doc: Doc,
  message: ChatMessage,
  control: TriggerControl
): Promise<Data<AIBotResponseEvent> | undefined> {
  if (!(await isAvailableDoc(doc, control))) {
    return
  }

  return {
    objectId: message.attachedTo,
    objectClass: message.attachedToClass,
    objectSpace: doc.space,
    collection: message.collection,
    messageClass: message._class,
    message: message.message,
    user: message.createdBy ?? message.modifiedBy
  }
}

async function getThreadMessageData (
  doc: Doc,
  message: ThreadMessage,
  control: TriggerControl
): Promise<Data<AIBotResponseEvent> | undefined> {
  if (!(await isAvailableDoc(doc, control))) {
    return
  }

  return {
    objectId: message.attachedTo,
    objectClass: message.attachedToClass,
    objectSpace: message.space,
    collection: message.collection,
    messageClass: message._class,
    message: message.message,
    user: message.createdBy ?? message.modifiedBy
  }
}

// Note: temporally commented until open ai will be added
// async function createAIBotEvent (message: ChatMessage, control: TriggerControl): Promise<Tx[]> {
// const doc = await getMessageDoc(message, control)
//
// if (doc === undefined) {
//   return []
// }
//
// let data: Data<AIBotResponseEvent> | undefined
//
// if (control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
//   data = await getThreadMessageData(doc, message as ThreadMessage, control)
// } else {
//   data = await getMessageData(doc, message, control)
// }
//
// if (data === undefined) {
//   return []
// }
//
// const eventTx = control.txFactory.createTxCreateDoc(aiBot.class.AIBotResponseEvent, message.space, data)
//
// await processWorkspace(control)
//
// return [eventTx]
// return []
// }

async function getThreadParent (control: TriggerControl, message: ChatMessage): Promise<Ref<ChatMessage> | undefined> {
  if (!control.hierarchy.isDerived(message.attachedToClass, chunter.class.ChatMessage)) {
    return undefined
  }

  const parentInfo = (
    await control.findAll(message.attachedToClass, {
      _id: message.attachedTo as Ref<ChatMessage>,
      [aiBot.mixin.TransferredMessage]: { $exists: true }
    })
  )[0]

  if (parentInfo !== undefined) {
    return control.hierarchy.as(parentInfo, aiBot.mixin.TransferredMessage).messageId
  }

  return message.attachedTo as Ref<ChatMessage>
}

function getSupportWorkspaceId (): string | undefined {
  const supportWorkspaceId = getMetadata(serverAIBot.metadata.SupportWorkspaceId)

  if (supportWorkspaceId === '') {
    return undefined
  }

  return supportWorkspaceId
}

async function onBotDirectMessageSend (control: TriggerControl, message: ChatMessage): Promise<Tx[]> {
  const supportWorkspaceId = getSupportWorkspaceId()

  if (supportWorkspaceId === undefined) {
    return []
  }

  const direct = (await getMessageDoc(message, control)) as DirectMessage

  if (direct === undefined) {
    return []
  }

  const isAvailable = await isDirectAvailable(direct, control)

  if (!isAvailable) {
    return []
  }

  const account = control.modelDb.findAllSync(contact.class.PersonAccount, {
    _id: (message.createdBy ?? message.modifiedBy) as Ref<PersonAccount>
  })[0]

  if (account === undefined || account.role !== AccountRole.Owner) {
    return []
  }

  let data: Data<AIBotResponseEvent> | undefined

  if (control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
    data = await getThreadMessageData(direct, message as ThreadMessage, control)
  } else {
    data = await getMessageData(direct, message, control)
  }

  if (data === undefined) {
    return []
  }

  const eventTx = control.txFactory.createTxCreateDoc(aiBot.class.AIBotTransferEvent, message.space, {
    messageClass: data.messageClass,
    message: message.message,
    collection: data.collection,
    toWorkspace: supportWorkspaceId,
    toEmail: account.email,
    fromWorkspace: toWorkspaceString(control.workspace),
    messageId: message._id,
    parentMessageId: await getThreadParent(control, message)
  })

  await processWorkspace(control)

  return [eventTx]
}

async function onSupportWorkspaceMessage (control: TriggerControl, message: ChatMessage): Promise<Tx[]> {
  const supportWorkspaceId = getSupportWorkspaceId()

  if (supportWorkspaceId === undefined) {
    return []
  }

  if (toWorkspaceString(control.workspace) !== supportWorkspaceId) {
    return []
  }

  const channel = await getMessageDoc(message, control)

  if (channel === undefined) {
    return []
  }

  if (!control.hierarchy.hasMixin(channel, analytics.mixin.AnalyticsChannel)) {
    return []
  }

  const mixin = control.hierarchy.as(channel, analytics.mixin.AnalyticsChannel)
  const { workspace, email } = mixin

  let data: Data<AIBotResponseEvent> | undefined

  if (control.hierarchy.isDerived(message._class, chunter.class.ThreadMessage)) {
    data = await getThreadMessageData(channel, message as ThreadMessage, control)
  } else {
    data = await getMessageData(channel, message, control)
  }

  if (data === undefined) {
    return []
  }

  await processWorkspace(control)

  return [
    control.txFactory.createTxCreateDoc(aiBot.class.AIBotTransferEvent, message.space, {
      messageClass: data.messageClass,
      message: message.message,
      collection: data.collection,
      toEmail: email,
      toWorkspace: workspace,
      fromWorkspace: toWorkspaceString(control.workspace),
      messageId: message._id,
      parentMessageId: await getThreadParent(control, message)
    })
  ]
}

export async function OnMessageSend (
  originTx: TxCollectionCUD<Doc, AttachedDoc>,
  control: TriggerControl
): Promise<Tx[]> {
  const { hierarchy } = control
  const tx = TxProcessor.extractTx(originTx) as TxCreateDoc<ChatMessage>
  if (tx._class !== core.class.TxCreateDoc || !hierarchy.isDerived(tx.objectClass, chunter.class.ChatMessage)) {
    return []
  }

  if (tx.modifiedBy === aiBot.account.AIBot || tx.modifiedBy === core.account.System) {
    return []
  }

  const isThread = hierarchy.isDerived(tx.objectClass, chunter.class.ThreadMessage)
  const message = TxProcessor.createDoc2Doc(tx)

  const docClass = isThread ? (message as ThreadMessage).objectClass : message.attachedToClass

  if (!hierarchy.isDerived(docClass, chunter.class.ChunterSpace)) {
    return []
  }

  const res: Tx[] = []

  if (docClass === chunter.class.DirectMessage) {
    const txes = await onBotDirectMessageSend(control, message)
    res.push(...txes)
  }

  if (docClass === chunter.class.Channel) {
    const txes = await onSupportWorkspaceMessage(control, message)
    res.push(...txes)
  }

  return res
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
  // await createAIBotEvent(message, control)

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
  //   return await createAIBotEvent(message, control)
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
  //   return await createAIBotEvent(message, control)
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

  if (tx._class === core.class.TxUpdateDoc) {
    const updateTx = tx as TxUpdateDoc<UserStatus>
    const val = updateTx.operations.online
    if (val !== true) {
      return []
    }
  }

  const account = control.modelDb.findAllSync(contact.class.PersonAccount, { email: aiBotAccountEmail })[0]

  if (account !== undefined) {
    return []
  }

  await processWorkspace(control)

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

export * from './adapter'
