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

import chunter, { Channel, ChatMessage, chunterId, ChunterSpace, ThreadMessage } from '@hcengineering/chunter'
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
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import notification, { Collaborators, NotificationContent } from '@hcengineering/notification'
import { getMetadata, IntlString } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import {
  getDocCollaborators,
  getMixinTx,
  createCollaboratorNotifications
} from '@hcengineering/server-notification-resources'
import { workbenchId } from '@hcengineering/workbench'
import { stripTags } from '@hcengineering/text'
import { Person, PersonAccount } from '@hcengineering/contact'
import activity, { ActivityMessage, ActivityReference } from '@hcengineering/activity'

import { NOTIFICATION_BODY_SIZE } from '@hcengineering/server-notification'

/**
 * @public
 */
export async function channelHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const channel = doc as ChunterSpace
  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
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

  return await findAll(activity.class.ActivityReference, {
    srcDocId: chatMessage.attachedTo,
    srcDocClass: chatMessage.attachedToClass,
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
  const actualTx = TxProcessor.extractTx(tx) as TxCreateDoc<ChatMessage>

  if (
    actualTx._class !== core.class.TxCreateDoc ||
    !hierarchy.isDerived(actualTx.objectClass, chunter.class.ChatMessage)
  ) {
    return []
  }

  const message = TxProcessor.createDoc2Doc(actualTx)
  const mixin = hierarchy.classHierarchyMixin(message.attachedToClass, notification.mixin.ClassCollaborators)

  if (mixin === undefined) {
    return []
  }

  const targetDoc = (await control.findAll(message.attachedToClass, { _id: message.attachedTo }, { limit: 1 }))[0]
  if (targetDoc === undefined) {
    return []
  }
  const isChannel = hierarchy.isDerived(targetDoc._class, chunter.class.Channel)
  const res: Tx[] = []

  if (hierarchy.hasMixin(targetDoc, notification.mixin.Collaborators)) {
    const collaboratorsMixin = hierarchy.as(targetDoc, notification.mixin.Collaborators)
    if (!collaboratorsMixin.collaborators.includes(message.modifiedBy)) {
      res.push(
        control.txFactory.createTxMixin(
          targetDoc._id,
          targetDoc._class,
          targetDoc.space,
          notification.mixin.Collaborators,
          {
            $push: {
              collaborators: message.modifiedBy
            }
          }
        )
      )
    }
  } else {
    const collaborators = await getDocCollaborators(targetDoc, mixin, control)
    if (!collaborators.includes(message.modifiedBy)) {
      collaborators.push(message.modifiedBy)
    }
    res.push(getMixinTx(tx, control, collaborators))
  }

  if (isChannel && !(targetDoc as Channel).members.includes(message.modifiedBy)) {
    res.push(...joinChannel(control, targetDoc as Channel, message.modifiedBy))
  }

  return res
}

async function ChatNotificationsHandler (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx) as TxCreateDoc<ChatMessage>

  if (actualTx._class !== core.class.TxCreateDoc) {
    return []
  }

  const chatMessage = TxProcessor.createDoc2Doc(actualTx)

  return await createCollaboratorNotifications(control.ctx, tx, control, [chatMessage])
}

function joinChannel (control: TriggerControl, channel: Channel, user: Ref<Account>): Tx[] {
  if (channel.members.includes(user)) {
    return []
  }

  return [
    control.txFactory.createTxUpdateDoc(channel._class, channel.space, channel._id, {
      $push: { members: user }
    })
  ]
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

/**
 * @public
 */
export async function ChunterTrigger (tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const res = await Promise.all([
    OnThreadMessageCreated(tx, control),
    OnThreadMessageDeleted(tx, control),
    OnCollaboratorsChanged(tx as TxMixin<Doc, Collaborators>, control),
    OnChatMessageCreated(tx, control)
  ])
  return res.flat()
}

/**
 * @public
 */
export async function getChunterNotificationContent (
  _: Doc,
  tx: TxCUD<Doc>,
  target: Ref<Account>,
  control: TriggerControl
): Promise<NotificationContent> {
  let title: IntlString = notification.string.CommonNotificationTitle
  let body: IntlString = chunter.string.Message
  const intlParams: Record<string, string | number> = {}
  let intlParamsNotLocalized: Record<string, IntlString> | undefined

  let message: string | undefined

  if (tx._class === core.class.TxCollectionCUD) {
    const ptx = tx as TxCollectionCUD<Doc, AttachedDoc>
    if (ptx.tx._class === core.class.TxCreateDoc) {
      if (control.hierarchy.isDerived(ptx.tx.objectClass, chunter.class.ChatMessage)) {
        const createTx = ptx.tx as TxCreateDoc<ChatMessage>
        message = createTx.attributes.message
      } else if (ptx.tx.objectClass === activity.class.ActivityReference) {
        const createTx = ptx.tx as TxCreateDoc<ActivityReference>
        message = createTx.attributes.message
      }
    }
  }

  if (message !== undefined) {
    intlParams.message = stripTags(message, NOTIFICATION_BODY_SIZE)

    body = chunter.string.MessageNotificationBody

    if (control.hierarchy.isDerived(tx.objectClass, chunter.class.DirectMessage)) {
      body = chunter.string.DirectNotificationBody
      title = chunter.string.DirectNotificationTitle
    }
  }

  if (control.hierarchy.isDerived(tx.objectClass, chunter.class.ChatMessage)) {
    intlParamsNotLocalized = {
      title: chunter.string.ThreadMessage
    }
  }

  return {
    title,
    body,
    intlParams,
    intlParamsNotLocalized
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

  if (added.length > 0) {
    res.push(
      control.txFactory.createTxMixin(tx.objectId, tx.objectClass, tx.objectSpace, notification.mixin.Collaborators, {
        $push: {
          collaborators: { $each: added, $position: 0 }
        }
      })
    )
  }

  for (const addedMember of added) {
    const context = allContexts.find(({ user }) => user === addedMember)

    if (context === undefined) {
      const createTx = control.txFactory.createTxCreateDoc(notification.class.DocNotifyContext, tx.objectSpace, {
        attachedTo: tx.objectId,
        attachedToClass: tx.objectClass,
        user: addedMember,
        hidden: false,
        lastViewedTimestamp: tx.modifiedOn
      })

      await control.apply([createTx], true)
    } else {
      const updateTx = control.txFactory.createTxUpdateDoc(context._class, context.space, context._id, {
        hidden: false,
        lastViewedTimestamp: tx.modifiedOn
      })

      res.push(updateTx)
    }
  }

  const contextsToRemove = allContexts.filter(({ user }) => removed.includes(user))

  for (const context of contextsToRemove) {
    res.push(control.txFactory.createTxRemoveDoc(context._class, context.space, context._id))
  }

  return res
}

async function OnCollaboratorsChanged (tx: TxMixin<Doc, Collaborators>, control: TriggerControl): Promise<Tx[]> {
  if (tx._class !== core.class.TxMixin || tx.mixin !== notification.mixin.Collaborators) return []

  if (!control.hierarchy.isDerived(tx.objectClass, chunter.class.Channel)) return []

  const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId }))[0] as Channel | undefined

  if (doc === undefined) return []
  if (doc.private) return []

  const added = combineAttributes([tx.attributes], 'collaborators', '$push', '$each')
  const res: Tx[] = []

  for (const addedMember of added) {
    res.push(...joinChannel(control, doc, addedMember))
  }

  return res
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    ChunterTrigger,
    OnChatMessageRemoved,
    OnChannelMembersChanged,
    ChatNotificationsHandler
  },
  function: {
    CommentRemove,
    ChannelHTMLPresenter: channelHTMLPresenter,
    ChannelTextPresenter: channelTextPresenter,
    ChunterNotificationContentProvider: getChunterNotificationContent
  }
})
