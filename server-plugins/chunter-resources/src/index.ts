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
import contact, { Employee, Person } from '@hcengineering/contact'
import core, {
  AccountUuid,
  Class,
  combineAttributes,
  concatLink,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  notEmpty,
  PersonId,
  Ref,
  Space,
  Timestamp,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxUpdateDoc,
  UserStatus,
  getClassCollaborators,
  resolveMentionGrantTarget,
  type MeasureContext,
  type Collaborator
} from '@hcengineering/core'
import { computeMentionGrantDelta, type ExistingMentionGrant } from './mentionGrantsDelta'
import notification, { DocNotifyContext, NotificationContent } from '@hcengineering/notification'
import { getMetadata, IntlString, translate } from '@hcengineering/platform'
import { getAccountBySocialId, getPerson } from '@hcengineering/server-contact'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import {
  createCollaboratorNotifications,
  getAddCollaboratTxes,
  getDocCollaborators
} from '@hcengineering/server-notification-resources'
import { jsonToHTML, markupToJSON } from '@hcengineering/text'
import { extractReferences, markupToText, stripTags } from '@hcengineering/text-core'
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
  return jsonToHTML(markupToJSON(doc.message))
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

async function OnThreadMessageCreated (
  ctx: MeasureContext,
  originTx: TxCUD<Doc>,
  control: TriggerControl
): Promise<Tx[]> {
  const tx = originTx as TxCreateDoc<ThreadMessage>

  const threadMessage = TxProcessor.createDoc2Doc(tx)
  const message = await ctx.with(
    'load-message',
    {},
    async () => (await control.findAll(ctx, activity.class.ActivityMessage, { _id: threadMessage.attachedTo }))[0]
  )

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

  const person = await ctx.with('load-message', {}, () => getPerson(control, originTx.modifiedBy))
  if (person === undefined) {
    return [lastReplyTx]
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
  const mixin = getClassCollaborators(control.modelDb, hierarchy, message.attachedToClass)

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
  const node = markupToJSON(message.message)
  const references = extractReferences(node)
  const personRefs = references.filter(({ objectClass }) =>
    control.hierarchy.isDerived(objectClass, contact.class.Person)
  )
  // Notification fan-out list (Channels/DMs): everyone not explicitly denied.
  // This is deliberately NOT the grant list — a channel mention must keep
  // notifying people WITHOUT granting document access (M-G.2 separation).
  const mentionedForNotify = personRefs
    .filter(({ grantsAccess }) => grantsAccess !== 'false')
    .map(({ objectId }) => objectId as Ref<Person>)
  // Grant list (fail-closed, M-G.2): ONLY mentions the author explicitly
  // consented to via the send-time disclosure (grantsAccess === 'true'). A
  // missing/unknown flag grants nothing.
  const mentionedForGrant = new Set(
    personRefs.filter(({ grantsAccess }) => grantsAccess === 'true').map(({ objectId }) => objectId as Ref<Person>)
  )
  const employees =
    mentionedForNotify.length > 0
      ? await control.findAll(ctx, contact.mixin.Employee, { _id: { $in: mentionedForNotify as Ref<Employee>[] } })
      : []
  // Author is added as a structural (provenance-free) subscriber, exactly as
  // before — participation subscription, never auto-revoked.
  const notifyAccounts = [...employees.map((it) => it.personUuid), account].filter(notEmpty)
  const grantAccounts = employees
    .filter((e) => mentionedForGrant.has(e._id as Ref<Person>))
    .map((e) => e.personUuid)
    .filter(notEmpty)
  let currentCollaborators = (
    await control.findAll(ctx, core.class.Collaborator, {
      attachedTo: targetDoc._id
    })
  ).map((it) => it.collaborator)

  if (currentCollaborators.length === 0) {
    const mixin = getClassCollaborators(control.modelDb, control.hierarchy, targetDoc._class)
    if (mixin !== undefined) {
      const collaborators = await getDocCollaborators(ctx, targetDoc, mixin, control)
      currentCollaborators = collaborators
      res.push(...getAddCollaboratTxes(tx.objectId, tx.objectClass, tx.objectSpace, control, collaborators))
    }
  }

  // Resolve the Doc the mention-Collaborator records should land on.
  //   - targetDoc has provideSecurity:true && mentionsGrantAccess:true:
  //     helper returns targetDoc itself → grants access on that doc.
  //   - targetDoc unprotected, but its attachedTo chain reaches an opted-in
  //     ancestor (e.g. ThreadMessage → ChatMessage → Issue): helper returns
  //     that ancestor → grants access on the Issue, not the thread.
  //   - nothing in the chain is opted in: helper returns null.
  // The grant-target branch writes Collaborator on the resolved doc and
  // dedups against THAT doc's collaborator list (not against targetDoc's,
  // which is the wrong basis when targetDoc is a child like ThreadMessage).
  const grantTarget = await resolveMentionGrantTarget(targetDoc, (cls, q) => control.findAll(control.ctx, cls, q))
  const targetClassCollab = (
    await control.findAll(control.ctx, core.class.ClassCollaborators, { attachedTo: targetDoc._class })
  )[0]
  const isProtectedTarget = targetClassCollab?.provideSecurity === true

  if (grantTarget != null) {
    const grantTargetCollabs = await control.findAll<Collaborator>(control.ctx, core.class.Collaborator, {
      attachedTo: grantTarget._id
    })
    const allCollabAccounts = new Set(grantTargetCollabs.map((c) => c.collaborator))

    // Author-membership gate (M-G.3): only a member of the grant-target space
    // may spread access through a mention. A collab-only guest (who was granted
    // access themselves) must NOT be able to transitively re-grant to others.
    const grantSpace = (
      await control.findAll<Space>(control.ctx, core.class.Space, { _id: grantTarget.space }, { limit: 1 })
    )[0]
    const authorIsMember = account != null && grantSpace?.members?.includes(account)

    // Dedup basis is now per (collaborator, grantedVia:'mention', grantedByMessage)
    // — NOT global. A person who is a structural/manual collaborator still gets a
    // mention-read record so that removing the mention revokes exactly that record.
    const existingMention: ExistingMentionGrant[] = grantTargetCollabs
      .filter((c) => c.grantedVia === 'mention' && c.grantedByMessage === message._id)
      .map((c) => ({ _id: c._id, _class: c._class, space: c.space, collaborator: c.collaborator }))
    const desired = authorIsMember ? grantAccounts : []
    const { toCreate } = computeMentionGrantDelta(desired, existingMention)
    for (const collab of toCreate) {
      res.push(
        control.txFactory.createTxCreateDoc(core.class.Collaborator, grantTarget.space, {
          attachedTo: grantTarget._id,
          attachedToClass: grantTarget._class,
          collaborator: collab,
          collection: 'collaborators',
          grantedVia: 'mention',
          grantedBy: account ?? undefined,
          grantedByMessage: message._id,
          level: 'read'
        })
      )
    }

    // Author subscription (structural, provenance-free) — preserves prior behavior.
    if (account != null && !allCollabAccounts.has(account)) {
      res.push(
        control.txFactory.createTxCreateDoc(core.class.Collaborator, grantTarget.space, {
          attachedTo: grantTarget._id,
          attachedToClass: grantTarget._class,
          collaborator: account,
          collection: 'collaborators'
        })
      )
    }
  } else if (!isProtectedTarget) {
    // Legacy notification-routing path: targetDoc is not provideSecurity,
    // so Collaborator records here are purely for notification fan-out
    // (today's behavior for Channels, DirectMessages, etc.).
    for (const collab of notifyAccounts) {
      if (currentCollaborators.includes(collab)) {
        continue
      }
      res.push(
        control.txFactory.createTxCreateDoc(core.class.Collaborator, targetDoc.space, {
          attachedTo: targetDoc._id,
          attachedToClass: targetDoc._class,
          collaborator: collab,
          collection: 'collaborators'
        })
      )
    }
  }
  // Else: protected target without mentionsGrantAccess (QMS / Love today)
  // → no-op, preserving pre-PR behavior for those classes.

  if (account != null && isChannel && !(targetDoc as Channel).members.includes(account)) {
    res.push(...joinChannel(control, targetDoc as Channel, account))
  }

  return res
}

// P5 (M-G.4a): self-contained mention-grant RECONCILER used ONLY by
// OnChatMessageUpdated. Do NOT refactor OnChatMessageCreated to call this —
// the create path is live-tested and follows its own (structural-author +
// grant) shape. Both paths share only the small pure `computeMentionGrantDelta`
// helper, which is unit-tested in isolation.
//
// Unlike the old add-only V3d version, this diffs the CURRENTLY mentioned +
// consented people against the mention records THIS message already seeded:
//   - a mention added on edit  -> new grantedVia:'mention' record
//   - a mention removed on edit -> TxRemoveDoc of exactly that record
// Only records with grantedByMessage === message._id are ever touched;
// structural and other-message/other-provenance records are left untouched.
async function applyMentionGrants (ctx: MeasureContext, message: ChatMessage, control: TriggerControl): Promise<Tx[]> {
  if (message.modifiedBy === core.account.System) return []
  const mixin = getClassCollaborators(control.modelDb, control.hierarchy, message.attachedToClass)
  if (mixin === undefined) return []

  const targetDoc = (await control.findAll(ctx, message.attachedToClass, { _id: message.attachedTo }, { limit: 1 }))[0]
  if (targetDoc === undefined) return []

  const grantTarget = await resolveMentionGrantTarget(targetDoc, (cls, q) => control.findAll(control.ctx, cls, q))
  if (grantTarget == null) return [] // grants only apply to opted-in (protected) targets

  // Full revocation scope: the mention records THIS message seeded on the target.
  const existingMention: ExistingMentionGrant[] = (
    await control.findAll<Collaborator>(control.ctx, core.class.Collaborator, {
      attachedTo: grantTarget._id,
      grantedVia: 'mention',
      grantedByMessage: message._id
    })
  ).map((c) => ({ _id: c._id, _class: c._class, space: c.space, collaborator: c.collaborator }))

  const node = markupToJSON(message.message)
  const references = extractReferences(node)
  const mentionedForGrant = new Set(
    references
      .filter(({ objectClass }) => control.hierarchy.isDerived(objectClass, contact.class.Person))
      .filter(({ grantsAccess }) => grantsAccess === 'true') // fail-closed consent (M-G.2)
      .map(({ objectId }) => objectId as Ref<Person>)
  )

  // Author-membership gate (M-G.3), evaluated against the EDIT actor. A
  // non-member editor cannot spread access (desired stays empty → any prior
  // mention grants from this message are reconciled away).
  const account = await getAccountBySocialId(control, message.modifiedBy)
  const grantSpace = (
    await control.findAll<Space>(control.ctx, core.class.Space, { _id: grantTarget.space }, { limit: 1 })
  )[0]
  const authorIsMember = account != null && grantSpace?.members?.includes(account)

  let desired: AccountUuid[] = []
  if (authorIsMember && mentionedForGrant.size > 0) {
    const employees = await control.findAll(ctx, contact.mixin.Employee, {
      _id: { $in: Array.from(mentionedForGrant) as Ref<Employee>[] }
    })
    desired = employees.map((it) => it.personUuid).filter(notEmpty)
  }

  const { toCreate, toRemove } = computeMentionGrantDelta(desired, existingMention)
  const res: Tx[] = []
  for (const collab of toCreate) {
    res.push(
      control.txFactory.createTxCreateDoc(core.class.Collaborator, grantTarget.space, {
        attachedTo: grantTarget._id,
        attachedToClass: grantTarget._class,
        collaborator: collab,
        collection: 'collaborators',
        grantedVia: 'mention',
        grantedBy: account ?? undefined,
        grantedByMessage: message._id,
        level: 'read'
      })
    )
  }
  for (const record of toRemove) {
    res.push(control.txFactory.createTxRemoveDoc(record._class, record.space, record._id))
  }
  return res
}

async function OnChatMessageUpdated (ctx: MeasureContext, tx: TxCUD<Doc>, control: TriggerControl): Promise<Tx[]> {
  const actualTx = tx as TxUpdateDoc<ChatMessage>
  // Only act when the message body changed (a new mention may have been added).
  if (actualTx.operations.message === undefined) return []

  const current = (await control.findAll(ctx, tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0] as
    | ChatMessage
    | undefined
  if (current === undefined) return []

  // Apply the update to the stored doc so the message text AND the actor
  // (modifiedBy) reflect THIS edit — not the original author. applyMentionGrants
  // guards on message.modifiedBy === System, so it must see the edit actor.
  // Reconcile: currently-mentioned+consented people are (re)granted, mentions
  // removed on this edit have their grantedVia:'mention' record revoked (M-G.4a).
  const message = TxProcessor.updateDoc2Doc({ ...current }, actualTx)
  return await applyMentionGrants(ctx, message, control)
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
      res.push(
        ...(await control.ctx.with('OnThreadMessageCreated', {}, (ctx) => OnThreadMessageCreated(ctx, tx, control)))
      )
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
    if (
      tx._class === core.class.TxUpdateDoc &&
      control.hierarchy.isDerived(tx.objectClass, chunter.class.ChatMessage)
    ) {
      res.push(...(await control.ctx.with('OnChatMessageUpdated', {}, (ctx) => OnChatMessageUpdated(ctx, tx, control))))
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
  target: Ref<Person>,
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

export async function OnChatMessageRemoved (txes: TxCUD<ChatMessage>[], control: TriggerControl): Promise<Tx[]> {
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

    // M-G.4(b): revoke the mention grants this deleted message seeded. Only
    // grantedVia:'mention' records with this grantedByMessage are torn down;
    // structural, manual and group records — and mention grants from OTHER
    // messages — are left untouched.
    const staleGrants = await control.findAll<Collaborator>(control.ctx, core.class.Collaborator, {
      grantedVia: 'mention',
      grantedByMessage: tx.objectId
    })
    staleGrants.forEach((grant) => {
      res.push(control.txFactory.createTxRemoveDoc(grant._class, grant.space, grant._id))
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

function JoinChannelTypeMatch (originTx: Tx, _: Doc, person: Ref<Person>, user: PersonId[]): boolean {
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
