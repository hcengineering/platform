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

import activity, { ActivityMessage, ActivityReference } from '@hcengineering/activity'
import chunter, { Channel, ChatMessage, chunterId, ChunterSpace, ThreadMessage } from '@hcengineering/chunter'
import contact, { Person } from '@hcengineering/contact'
import { getAccountBySocialId, getPerson } from '@hcengineering/server-contact'
import core, {
  PersonId,
  Class,
  concatLink,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  Ref,
  Timestamp,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxUpdateDoc,
  UserStatus,
  type MeasureContext,
  combineAttributes,
  AccountUuid
} from '@hcengineering/core'
import notification, { DocNotifyContext, NotificationContent } from '@hcengineering/notification'
import { getMetadata, IntlString, translate } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import {
  createCollaboratorNotifications,
  getDocCollaborators,
  getMixinTx
} from '@hcengineering/server-notification-resources'
import { markupToHTML, markupToText, stripTags } from '@hcengineering/text-core'
import { workbenchId } from '@hcengineering/workbench'

import { NOTIFICATION_BODY_SIZE } from '@hcengineering/server-notification'
import { encodeObjectURI } from '@hcengineering/view'

const updateChatInfoDelay = 12 * 60 * 60 * 1000 // 12 hours
const hideChannelDelay = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * @public
 */
export async function channelHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const channel = doc as ChunterSpace
  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.url}/${chunterId}/${encodeObjectURI(channel._id, channel._class)}`
  const link = concatLink(front, path)
  const name = await channelTextPresenter(channel)
  return `<a href='${link}'>${name}</a>`
}

/**
 * @public
 */
export async function channelTextPresenter (doc: Doc): Promise<string> {
  const channel = doc as ChunterSpace

  if (channel._class === chunter.class.DirectMessage) {
    return await translate(chunter.string.Direct, {})
  }

  return `#${channel.name}`
}

export async function ChatMessageTextPresenter (doc: ChatMessage): Promise<string> {
  return markupToText(doc.message)
}

export async function ChatMessageHtmlPresenter (doc: ChatMessage): Promise<string> {
  return markupToHTML(doc.message)
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

async function OnThreadMessageCreated (originTx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const tx = originTx as TxCreateDoc<ThreadMessage>

  const threadMessage = TxProcessor.createDoc2Doc(tx)
  const message = (
    await control.findAll(control.ctx, activity.class.ActivityMessage, { _id: threadMessage.attachedTo })
  )[0]

  if (message === undefined) {
    return []
  }

  const lastReplyTx = control.txFactory.createTxUpdateDoc<ActivityMessage>(
    threadMessage.attachedToClass,
    threadMessage.space,
    threadMessage.attachedTo,
    {
      lastReply: originTx.modifiedOn
    }
  )

  const person = await getPerson(control, originTx.modifiedBy)
  if (person === undefined) {
    return []
  }

  if ((message.repliedPersons ?? []).includes(person._id)) {
    return [lastReplyTx]
  }

  const repliedPersonTx = control.txFactory.createTxUpdateDoc<ActivityMessage>(
    threadMessage.attachedToClass,
    threadMessage.space,
    threadMessage.attachedTo,
    {
      $push: { repliedPersons: person._id }
    }
  )

  return [lastReplyTx, repliedPersonTx]
}

async function OnChatMessageCreated (ctx: MeasureContext, tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const actualTx = tx as TxCreateDoc<ChatMessage>

  const message = TxProcessor.createDoc2Doc(actualTx)
  if (message.modifiedBy === core.account.System) return []
  const mixin = hierarchy.classHierarchyMixin(message.attachedToClass, notification.mixin.ClassCollaborators)

  if (mixin === undefined) {
    return []
  }

  const targetDoc = (await control.findAll(ctx, message.attachedToClass, { _id: message.attachedTo }, { limit: 1 }))[0]
  if (targetDoc === undefined) {
    return []
  }
  const isChannel = hierarchy.isDerived(targetDoc._class, chunter.class.Channel)
  const res: Tx[] = []
  const account = await getAccountBySocialId(control, message.modifiedBy)

  if (account == null) {
    return []
  }

  if (hierarchy.hasMixin(targetDoc, notification.mixin.Collaborators)) {
    const collaboratorsMixin = hierarchy.as(targetDoc, notification.mixin.Collaborators)
    if (!collaboratorsMixin.collaborators.includes(account)) {
      res.push(
        control.txFactory.createTxMixin(
          targetDoc._id,
          targetDoc._class,
          targetDoc.space,
          notification.mixin.Collaborators,
          {
            $push: {
              collaborators: account
            }
          }
        )
      )
    }
  } else {
    const collaborators = await getDocCollaborators(ctx, targetDoc, mixin, control)
    if (!collaborators.includes(account)) {
      collaborators.push(account)
    }
    res.push(getMixinTx(tx, control, collaborators))
  }

  if (isChannel && !(targetDoc as Channel).members.includes(account)) {
    res.push(...joinChannel(control, targetDoc as Channel, account))
  }

  return res
}

async function ChatNotificationsHandler (txes: TxCUD<Doc>[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const actualTx = tx as TxCreateDoc<ChatMessage>

    if (actualTx._class !== core.class.TxCreateDoc) {
      continue
    }

    const chatMessage = TxProcessor.createDoc2Doc(actualTx)

    result.push(...(await createCollaboratorNotifications(control.ctx, tx, control, [chatMessage])))
  }
  return result
}

function joinChannel (control: TriggerControl, channel: Channel, user: AccountUuid): Tx[] {
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
  // TODO: FIXME
  return []
  // const removeTx = tx as TxRemoveDoc<ThreadMessage>

  // const message = control.removedMap.get(removeTx.objectId) as ThreadMessage

  // if (message === undefined) {
  //   return []
  // }

  // const messages = await control.findAll(control.ctx, chunter.class.ThreadMessage, {
  //   attachedTo: message.attachedTo
  // })

  // const repliedPersons = await getPersons(control, messages.map((m) => m.createdBy).filter((pid) => pid !== undefined))

  // const updateTx = control.txFactory.createTxUpdateDoc<ActivityMessage>(
  //   message.attachedToClass,
  //   message.space,
  //   message.attachedTo,
  //   {
  //     repliedPersons: repliedPersons.map((p) => p._id),
  //     lastReply:
  //       messages.length > 0
  //         ? Math.max(...messages.map(({ createdOn, modifiedOn }) => createdOn ?? modifiedOn))
  //         : undefined
  //   }
  // )

  // return [updateTx]
}

/**
 * @public
 */
export async function ChunterTrigger (txes: TxCUD<Doc>[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (
      tx._class === core.class.TxCreateDoc &&
      control.hierarchy.isDerived(tx.objectClass, chunter.class.ThreadMessage)
    ) {
      res.push(...(await control.ctx.with('OnThreadMessageCreated', {}, (ctx) => OnThreadMessageCreated(tx, control))))
    }
    if (
      tx._class === core.class.TxRemoveDoc &&
      control.hierarchy.isDerived(tx.objectClass, chunter.class.ThreadMessage)
    ) {
      res.push(...(await control.ctx.with('OnThreadMessageDeleted', {}, (ctx) => OnThreadMessageDeleted(tx, control))))
    }
    if (
      tx._class === core.class.TxCreateDoc &&
      control.hierarchy.isDerived(tx.objectClass, chunter.class.ChatMessage)
    ) {
      res.push(...(await control.ctx.with('OnChatMessageCreated', {}, (ctx) => OnChatMessageCreated(ctx, tx, control))))
    }
  }
  return res
}

/**
 * @public
 */
export async function getChunterNotificationContent (
  _: Doc,
  tx: TxCUD<Doc>,
  target: PersonId,
  control: TriggerControl
): Promise<NotificationContent> {
  let title: IntlString = notification.string.CommonNotificationTitle
  let body: IntlString = chunter.string.Message
  const intlParams: Record<string, string | number> = {}
  let intlParamsNotLocalized: Record<string, IntlString> | undefined

  let message: string | undefined

  if (tx._class === core.class.TxCreateDoc) {
    if (control.hierarchy.isDerived(tx.objectClass, chunter.class.ChatMessage)) {
      const createTx = tx as TxCreateDoc<ChatMessage>
      message = createTx.attributes.message
    } else if (tx.objectClass === activity.class.ActivityReference) {
      const createTx = tx as TxCreateDoc<ActivityReference>
      message = createTx.attributes.message
    }
  }

  if (message !== undefined) {
    intlParams.message = stripTags(message, NOTIFICATION_BODY_SIZE)

    body = chunter.string.MessageNotificationBody

    if (tx.attachedToClass != null && control.hierarchy.isDerived(tx.attachedToClass, chunter.class.DirectMessage)) {
      body = chunter.string.DirectNotificationBody
      title = chunter.string.DirectNotificationTitle
    }
  }

  if (tx.attachedToClass != null && control.hierarchy.isDerived(tx.attachedToClass, chunter.class.ChatMessage)) {
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

async function OnChatMessageRemoved (txes: TxCUD<ChatMessage>[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxRemoveDoc) {
      continue
    }

    const notifications = await control.findAll(control.ctx, notification.class.InboxNotification, {
      attachedTo: tx.objectId
    })

    notifications.forEach((notification) => {
      res.push(control.txFactory.createTxRemoveDoc(notification._class, notification.space, notification._id))
    })
  }
  return res
}

function getDirectsToHide (directs: DocNotifyContext[], date: Timestamp): DocNotifyContext[] {
  const minVisibleDirects = 10

  if (directs.length <= minVisibleDirects) return []
  const hideCount = directs.length - minVisibleDirects

  const toHide: DocNotifyContext[] = []

  for (const context of directs) {
    const { lastUpdateTimestamp = 0, lastViewedTimestamp = 0 } = context
    if (lastViewedTimestamp === 0) continue
    if (lastUpdateTimestamp > lastViewedTimestamp) continue
    if (date - lastUpdateTimestamp > hideChannelDelay) {
      toHide.push(context)
    }
  }

  toHide.sort((a, b) => (a.lastUpdateTimestamp ?? 0) - (b.lastUpdateTimestamp ?? 0))

  return toHide.slice(0, hideCount)
}

function getActivityToHide (contexts: DocNotifyContext[], date: Timestamp): DocNotifyContext[] {
  if (contexts.length === 0) return []
  const toHide: DocNotifyContext[] = []

  for (const context of contexts) {
    const { lastUpdateTimestamp = 0, lastViewedTimestamp = 0 } = context
    if (lastViewedTimestamp === 0) continue
    if (lastUpdateTimestamp > lastViewedTimestamp) continue
    if (date - lastUpdateTimestamp > hideChannelDelay) {
      toHide.push(context)
    }
  }

  return toHide
}

export async function syncChat (control: TriggerControl, status: UserStatus, date: Timestamp): Promise<void> {
  const person = (await control.findAll(control.ctx, contact.class.Person, { personUuid: status.user }))[0]
  if (person == null) return

  const syncInfo = (await control.findAll(control.ctx, chunter.class.ChatSyncInfo, { user: person._id })).shift()
  const shouldSync = syncInfo === undefined || date - syncInfo.timestamp > updateChatInfoDelay
  if (!shouldSync) return

  const contexts = await control.findAll(control.ctx, notification.class.DocNotifyContext, {
    user: status.user,
    hidden: false,
    isPinned: false
  })

  if (contexts.length === 0) return

  const { hierarchy } = control
  const res: Tx[] = []

  const directContexts = contexts.filter(({ objectClass }) =>
    hierarchy.isDerived(objectClass, chunter.class.DirectMessage)
  )
  const activityContexts = contexts.filter(
    ({ objectClass }) =>
      !hierarchy.isDerived(objectClass, chunter.class.ChunterSpace) &&
      !hierarchy.isDerived(objectClass, activity.class.ActivityMessage)
  )

  const directsToHide = getDirectsToHide(directContexts, date)
  const activityToHide = getActivityToHide(activityContexts, date)
  const contextsToHide = directsToHide.concat(activityToHide)

  for (const context of contextsToHide) {
    res.push(
      control.txFactory.createTxUpdateDoc(context._class, context.space, context._id, {
        hidden: true
      })
    )
  }

  if (syncInfo === undefined) {
    const personSpace = (await control.findAll(control.ctx, contact.class.PersonSpace, { person: person._id })).shift()
    if (personSpace !== undefined) {
      res.push(
        control.txFactory.createTxCreateDoc(chunter.class.ChatSyncInfo, personSpace._id, {
          user: person._id,
          timestamp: date
        })
      )
    }
  } else {
    res.push(
      control.txFactory.createTxUpdateDoc(syncInfo._class, syncInfo.space, syncInfo._id, {
        timestamp: date
      })
    )
  }

  await control.apply(control.ctx, res, true)
}

async function OnUserStatus (txes: TxCUD<UserStatus>[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    if (tx.objectClass !== core.class.UserStatus) {
      continue
    }
    if (tx._class === core.class.TxCreateDoc) {
      const createTx = tx as TxCreateDoc<UserStatus>
      const { online } = createTx.attributes
      if (online) {
        const status = TxProcessor.createDoc2Doc(createTx)
        await syncChat(control, status, tx.modifiedOn)
      }
    } else if (tx._class === core.class.TxUpdateDoc) {
      const updateTx = tx as TxUpdateDoc<UserStatus>
      const { online } = updateTx.operations
      if (online === true) {
        const status = (await control.findAll(control.ctx, core.class.UserStatus, { _id: updateTx.objectId }))[0]
        await syncChat(control, status, tx.modifiedOn)
      }
    }
  }

  return []
}

function JoinChannelTypeMatch (originTx: Tx, _: Doc, person: Person, user: PersonId[]): boolean {
  if (user.includes(originTx.modifiedBy)) return false
  if (originTx._class !== core.class.TxUpdateDoc) return false

  const tx = originTx as TxUpdateDoc<Channel>
  const added = combineAttributes([tx.operations], 'members', '$push', '$each')

  return user.some((it) => added.includes(it))
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    ChunterTrigger,
    OnChatMessageRemoved,
    ChatNotificationsHandler,
    OnUserStatus
  },
  function: {
    CommentRemove,
    ChannelHTMLPresenter: channelHTMLPresenter,
    ChannelTextPresenter: channelTextPresenter,
    ChunterNotificationContentProvider: getChunterNotificationContent,
    ChatMessageTextPresenter,
    ChatMessageHtmlPresenter,
    JoinChannelTypeMatch
  }
})
