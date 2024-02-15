//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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

import chunter, {
  Backlink,
  Channel,
  ChatMessage,
  chunterId,
  ChunterSpace,
  DirectMessage,
  ThreadMessage
} from '@hcengineering/chunter'
import core, {
  Account,
  AttachedDoc,
  Class,
  concatLink,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  Ref,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxFactory,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import notification, { NotificationContent } from '@hcengineering/notification'
import { getMetadata, IntlString } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import {
  getDocCollaborators,
  getMixinTx,
  pushActivityInboxNotifications
} from '@hcengineering/server-notification-resources'
import { workbenchId } from '@hcengineering/workbench'
import { stripTags } from '@hcengineering/text'
import { Person, PersonAccount } from '@hcengineering/contact'
import activity, { ActivityMessage } from '@hcengineering/activity'

import {
  getCreateBacklinksTxes,
  getRemoveBacklinksTxes,
  getUpdateBacklinksTxes,
  guessBacklinkTx,
  isMarkupType,
  isCollaborativeType
} from './backlinks'
import { IsChannelMessage, IsDirectMessage, IsMeMentioned, IsThreadMessage } from './utils'

/**
 * @public
 */
export async function channelHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const channel = doc as ChunterSpace
  const front = getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.workspaceUrl}/${chunterId}/${channel._id}`
  const link = concatLink(front, path)
  return `<a href='${link}'>${channel.name}</a>`
}

/**
 * @public
 */
export async function channelTextPresenter (doc: Doc): Promise<string> {
  const channel = doc as ChunterSpace
  return `${channel.name}`
}

/**
 * @public
 */
export async function CommentRemove (
  doc: Doc,
  hiearachy: Hierarchy,
  findAll: <T extends Doc>(
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
): Promise<Doc[]> {
  if (!hiearachy.isDerived(doc._class, chunter.class.ChatMessage)) {
    return []
  }

  const chatMessage = doc as ChatMessage
  return await findAll(chunter.class.Backlink, {
    backlinkId: chatMessage.attachedTo,
    backlinkClass: chatMessage.attachedToClass,
    attachedDocId: chatMessage._id
  })
}

async function OnThreadMessageCreated (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const actualTx = TxProcessor.extractTx(tx)

  if (actualTx._class !== core.class.TxCreateDoc) {
    return []
  }

  const doc = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<Doc>)

  if (!hierarchy.isDerived(doc._class, chunter.class.ThreadMessage)) {
    return []
  }

  const threadMessage = doc as ThreadMessage

  if (!hierarchy.isDerived(threadMessage.attachedToClass, activity.class.ActivityMessage)) {
    return []
  }

  const lastReplyTx = control.txFactory.createTxUpdateDoc<ActivityMessage>(
    threadMessage.attachedToClass,
    threadMessage.space,
    threadMessage.attachedTo,
    {
      lastReply: tx.modifiedOn
    }
  )

  const employee = control.modelDb.getObject(tx.modifiedBy) as PersonAccount
  const employeeTx = control.txFactory.createTxUpdateDoc<ActivityMessage>(
    threadMessage.attachedToClass,
    threadMessage.space,
    threadMessage.attachedTo,
    {
      $push: { repliedPersons: employee.person }
    }
  )

  return [lastReplyTx, employeeTx]
}

async function OnChatMessageCreated (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const actualTx = TxProcessor.extractTx(tx)

  if (actualTx._class !== core.class.TxCreateDoc) {
    return []
  }

  const chatMessage = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<ChatMessage>)

  if (!hierarchy.isDerived(chatMessage._class, chunter.class.ChatMessage)) {
    return []
  }

  const mixin = hierarchy.classHierarchyMixin(chatMessage.attachedToClass, notification.mixin.ClassCollaborators)

  if (mixin === undefined) {
    return []
  }

  const targetDoc = (
    await control.findAll(chatMessage.attachedToClass, { _id: chatMessage.attachedTo }, { limit: 1 })
  )[0]

  if (targetDoc === undefined) {
    return []
  }
  const res: Tx[] = []
  const isChannel = hierarchy.isDerived(targetDoc._class, chunter.class.Channel)

  if (hierarchy.hasMixin(targetDoc, notification.mixin.Collaborators)) {
    const collaboratorsMixin = hierarchy.as(targetDoc, notification.mixin.Collaborators)
    if (!collaboratorsMixin.collaborators.includes(chatMessage.modifiedBy)) {
      res.push(
        control.txFactory.createTxMixin(
          targetDoc._id,
          targetDoc._class,
          targetDoc.space,
          notification.mixin.Collaborators,
          {
            $push: {
              collaborators: chatMessage.modifiedBy
            }
          }
        )
      )
    }
  } else {
    const collaborators = await getDocCollaborators(targetDoc, mixin, control)
    if (!collaborators.includes(chatMessage.modifiedBy)) {
      collaborators.push(chatMessage.modifiedBy)
    }
    res.push(getMixinTx(tx, control, collaborators))
  }

  if (isChannel && !(targetDoc as Channel).members.includes(chatMessage.modifiedBy)) {
    res.push(
      control.txFactory.createTxUpdateDoc(targetDoc._class, targetDoc.space, targetDoc._id, {
        $push: { members: chatMessage.modifiedBy }
      })
    )
  }

  return res
}

async function OnThreadMessageDeleted (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const removeTx = TxProcessor.extractTx(tx) as TxRemoveDoc<ThreadMessage>

  if (!hierarchy.isDerived(removeTx.objectClass, chunter.class.ThreadMessage)) {
    return []
  }

  const message = control.removedMap.get(removeTx.objectId) as ThreadMessage

  if (message === undefined) {
    return []
  }

  const messages = await control.findAll(chunter.class.ThreadMessage, {
    attachedTo: message.attachedTo
  })

  const updateTx = control.txFactory.createTxUpdateDoc<ActivityMessage>(
    message.attachedToClass,
    message.space,
    message.attachedTo,
    {
      repliedPersons: messages
        .map(({ createdBy }) =>
          createdBy !== undefined ? (control.modelDb.getObject(createdBy) as PersonAccount).person : undefined
        )
        .filter((person): person is Ref<Person> => person !== undefined),
      lastReply:
        messages.length > 0
          ? Math.max(...messages.map(({ createdOn, modifiedOn }) => createdOn ?? modifiedOn))
          : undefined
    }
  )

  return [updateTx]
}

async function BacklinksCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxCreateDoc<Doc>

  if (ctx._class !== core.class.TxCreateDoc) return []
  if (control.hierarchy.isDerived(ctx.objectClass, chunter.class.Backlink)) return []

  control.storageFx(async (adapter) => {
    const txFactory = new TxFactory(control.txFactory.account)

    const doc = TxProcessor.createDoc2Doc(ctx)
    const targetTx = guessBacklinkTx(control.hierarchy, tx as TxCUD<Doc>)
    const txes: Tx[] = await getCreateBacklinksTxes(
      control,
      adapter,
      txFactory,
      doc,
      targetTx.objectId,
      targetTx.objectClass
    )

    if (txes.length !== 0) {
      await control.apply(txes, true)
    }
  })

  return []
}

async function BacklinksUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxUpdateDoc<Doc>

  let hasUpdates = false
  const attributes = control.hierarchy.getAllAttributes(ctx.objectClass)
  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class) || isCollaborativeType(attr.type._class)) {
      if (TxProcessor.txHasUpdate(ctx, attr.name)) {
        hasUpdates = true
        break
      }
    }
  }

  if (hasUpdates) {
    const rawDoc = (await control.findAll(ctx.objectClass, { _id: ctx.objectId }))[0]

    if (rawDoc !== undefined) {
      control.storageFx(async (adapter) => {
        const txFactory = new TxFactory(control.txFactory.account)
        const doc = TxProcessor.updateDoc2Doc(rawDoc, ctx)
        const targetTx = guessBacklinkTx(control.hierarchy, tx as TxCUD<Doc>)
        const txes: Tx[] = await getUpdateBacklinksTxes(
          control,
          adapter,
          txFactory,
          doc,
          targetTx.objectId,
          targetTx.objectClass
        )

        if (txes.length !== 0) {
          await control.apply(txes, true)
        }
      })
    }
  }

  return []
}

async function BacklinksRemove (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = TxProcessor.extractTx(tx) as TxRemoveDoc<Doc>

  let hasMarkdown = false
  const attributes = control.hierarchy.getAllAttributes(ctx.objectClass)
  for (const attr of attributes.values()) {
    if (isMarkupType(attr.type._class)) {
      hasMarkdown = true
      break
    }
  }

  if (hasMarkdown) {
    const txFactory = new TxFactory(control.txFactory.account)

    const txes: Tx[] = await getRemoveBacklinksTxes(control, txFactory, ctx.objectId)
    if (txes.length !== 0) {
      await control.apply(txes, true)
    }
  }

  return []
}

/**
 * @public
 */
export async function ChunterTrigger (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const res = await Promise.all([
    OnThreadMessageCreated(tx, control),
    OnThreadMessageDeleted(tx, control),
    OnChatMessageCreated(tx as TxCUD<Doc>, control)
  ])
  return res.flat()
}

/**
 * @public
 * Sends notification to the message sender in case when DM
 * notifications are deleted or hidden. This is required for
 * the DM to re-appear in the sender's inbox.
 */
export async function OnDirectMessageSent (originTx: Tx, control: TriggerControl): Promise<Tx[]> {
  const tx = TxProcessor.extractTx(originTx) as TxCreateDoc<ChatMessage>

  if (tx._class !== core.class.TxCreateDoc) {
    return []
  }

  const message = TxProcessor.createDoc2Doc(tx)

  if (
    message.createdBy === undefined ||
    !control.hierarchy.isDerived(message.attachedToClass, chunter.class.DirectMessage)
  ) {
    return []
  }

  const directChannel = (
    await control.findAll(chunter.class.DirectMessage, { _id: message.attachedTo as Ref<DirectMessage> })
  ).shift()

  if (directChannel === undefined || directChannel.members.length !== 2 || !directChannel.private) {
    return []
  }

  const notifyContexts = await control.findAll(notification.class.DocNotifyContext, { attachedTo: directChannel._id })

  // binding notification to the DM creation tx to properly display it in inbox
  const dmCreationTx = (
    await control.findAll(core.class.TxCreateDoc, { objectClass: directChannel._class, objectId: directChannel._id })
  ).shift()

  if (dmCreationTx === undefined) {
    return []
  }

  const sender = message.createdBy
  const notifyContext = notifyContexts.find(({ user }) => user === sender)
  const res: Tx[] = []

  if (notifyContext === undefined) {
    let anotherPerson: Ref<Account> | undefined
    for (const person of directChannel.members) {
      if (person !== sender) {
        anotherPerson = person
        break
      }
    }

    if (anotherPerson == null) return []

    await pushActivityInboxNotifications(dmCreationTx, control, res, anotherPerson, directChannel, notifyContexts, [
      message
    ])
  } else if (notifyContext.hidden) {
    res.push(
      control.txFactory.createTxUpdateDoc(notifyContext._class, notifyContext.space, notifyContext._id, {
        hidden: false
      })
    )
  }

  return res
}

/**
 * @public
 */
export async function BacklinkTrigger (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []

  const ctx = TxProcessor.extractTx(tx) as TxCreateDoc<Doc>
  if (control.hierarchy.isDerived(ctx.objectClass, chunter.class.Backlink)) return []

  if (ctx._class === core.class.TxCreateDoc) {
    result.push(...(await BacklinksCreate(tx, control)))
  }
  if (ctx._class === core.class.TxUpdateDoc) {
    result.push(...(await BacklinksUpdate(tx, control)))
  }
  if (ctx._class === core.class.TxRemoveDoc) {
    result.push(...(await BacklinksRemove(tx, control)))
  }
  return result
}

const NOTIFICATION_BODY_SIZE = 50

/**
 * @public
 */
export async function getChunterNotificationContent (_: Doc, tx: TxCUD<Doc>): Promise<NotificationContent> {
  const title: IntlString = chunter.string.DirectNotificationTitle
  let body: IntlString = chunter.string.Message
  const intlParams: Record<string, string | number> = {}

  let message: string | undefined

  if (tx._class === core.class.TxCollectionCUD) {
    const ptx = tx as TxCollectionCUD<Doc, AttachedDoc>
    if (ptx.tx._class === core.class.TxCreateDoc) {
      if (ptx.tx.objectClass === chunter.class.ChatMessage) {
        const createTx = ptx.tx as TxCreateDoc<ChatMessage>
        message = createTx.attributes.message
      } else if (ptx.tx.objectClass === chunter.class.Backlink) {
        const createTx = ptx.tx as TxCreateDoc<Backlink>
        message = createTx.attributes.message
      }
    }
  }

  if (message !== undefined) {
    intlParams.message = stripTags(message, NOTIFICATION_BODY_SIZE)
    body = chunter.string.DirectNotificationBody
  }

  return {
    title,
    body,
    intlParams
  }
}

async function OnChatMessageRemoved (tx: TxCollectionCUD<Doc, ChatMessage>, control: TriggerControl): Promise<Tx[]> {
  if (tx.tx._class !== core.class.TxRemoveDoc) {
    return []
  }

  const res: Tx[] = []
  const notifications = await control.findAll(notification.class.InboxNotification, { attachedTo: tx.tx.objectId })

  notifications.forEach((notification) => {
    res.push(control.txFactory.createTxRemoveDoc(notification._class, notification.space, notification._id))
  })

  return res
}

function combineAttributes (attributes: any[], key: string, operator: string, arrayKey: string): any[] {
  return Array.from(
    new Set(
      attributes.flatMap((attr) =>
        Array.isArray(attr[operator]?.[key]?.[arrayKey]) ? attr[operator]?.[key]?.[arrayKey] : attr[operator]?.[key]
      )
    )
  ).filter((v) => v != null)
}

async function OnChannelMembersChanged (tx: TxUpdateDoc<Channel>, control: TriggerControl): Promise<Tx[]> {
  const changedAttributes = Object.entries(tx.operations)
    .flatMap(([id, val]) => (['$push', '$pull'].includes(id) ? Object.keys(val) : id))
    .filter((id) => !id.startsWith('$'))

  if (!changedAttributes.includes('members')) {
    return []
  }

  const added = combineAttributes([tx.operations], 'members', '$push', '$each')
  const removed = combineAttributes([tx.operations], 'members', '$pull', '$in')

  const res: Tx[] = []
  const allContexts = await control.findAll(notification.class.DocNotifyContext, { attachedTo: tx.objectId })

  if (removed.length > 0) {
    res.push(
      control.txFactory.createTxMixin(tx.objectId, tx.objectClass, tx.objectSpace, notification.mixin.Collaborators, {
        $pull: {
          collaborators: { $in: removed }
        }
      })
    )
  }

  for (const addedMember of added) {
    const context = allContexts.find(({ user }) => user === addedMember)

    if (context === undefined) {
      res.push(
        control.txFactory.createTxCreateDoc(notification.class.DocNotifyContext, tx.objectSpace, {
          attachedTo: tx.objectId,
          attachedToClass: tx.objectClass,
          user: addedMember,
          hidden: false,
          lastViewedTimestamp: tx.modifiedOn
        })
      )
    } else {
      res.push(
        control.txFactory.createTxUpdateDoc(context._class, context.space, context._id, {
          hidden: false,
          lastViewedTimestamp: tx.modifiedOn
        })
      )
    }
  }

  const contextsToRemove = allContexts.filter(({ user }) => removed.includes(user))

  if (contextsToRemove.length === 0) {
    return res
  }

  const channel = (await control.findAll(chunter.class.Channel, { _id: tx.objectId }))[0]

  if (channel !== undefined) {
    for (const context of contextsToRemove) {
      res.push(control.txFactory.createTxRemoveDoc(context._class, context.space, context._id))
    }
  }

  return res
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    BacklinkTrigger,
    ChunterTrigger,
    OnDirectMessageSent,
    OnChatMessageRemoved,
    OnChannelMembersChanged
  },
  function: {
    CommentRemove,
    ChannelHTMLPresenter: channelHTMLPresenter,
    ChannelTextPresenter: channelTextPresenter,
    ChunterNotificationContentProvider: getChunterNotificationContent,
    IsDirectMessage,
    IsThreadMessage,
    IsMeMentioned,
    IsChannelMessage
  }
})
