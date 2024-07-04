//
// Copyright © 2023 Hardcore Engineering Inc.
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
import {
  type Channel,
  type ChatExtension,
  type ChatMessage,
  type DirectMessage,
  type ThreadMessage,
  type ExternalChannel,
  type CreateMessageData,
  type EditMessageData,
  type ExternalChatMessage
} from '@hcengineering/chunter'
import contact, {
  type ChannelProvider,
  type Contact,
  getName,
  type Person,
  type PersonAccount
} from '@hcengineering/contact'
import { personByIdStore, PersonIcon } from '@hcengineering/contact-resources'
import { getClient, isSpace } from '@hcengineering/presentation'
import { type Asset, getResource, translate } from '@hcengineering/platform'
import activity, {
  type ActivityMessage,
  type ActivityMessagesFilter,
  type DisplayActivityMessage,
  type DisplayDocUpdateMessage,
  type DocUpdateMessage
} from '@hcengineering/activity'
import {
  generateId,
  getCurrentAccount,
  type Account,
  type Class,
  type Client,
  type Doc,
  type IdMap,
  type Ref,
  type Space,
  type Timestamp,
  type TxOperations
} from '@hcengineering/core'
import notification, { type DocNotifyContext, type InboxNotification } from '@hcengineering/notification'
import {
  InboxNotificationsClientImpl,
  archiveContextNotifications,
  isActivityNotification,
  isMentionNotification
} from '@hcengineering/notification-resources'
import contactPlugin from '@hcengineering/contact'
import { Analytics } from '@hcengineering/analytics'
import { type IntegrationType } from '@hcengineering/setting'
import { type AnySvelteComponent } from '@hcengineering/ui'
import { classIcon, getDocLinkTitle, getDocTitle } from '@hcengineering/view-resources'
import { get, writable, type Unsubscriber } from 'svelte/store'

import ChannelIcon from './components/ChannelIcon.svelte'
import DirectIcon from './components/DirectIcon.svelte'
import { resetChunterLocIfEqual } from './navigation'
import { getDirectCompanion } from './components/chat/utils'
import chunter from './plugin'

export async function getDmName (client: Client, space?: Space): Promise<string> {
  if (space === undefined) {
    return ''
  }

  const accounts: PersonAccount[] = await getDmAccounts(client, space)

  return await buildDmName(client, accounts)
}

export async function buildDmName (client: Client, personAccounts: PersonAccount[]): Promise<string> {
  if (personAccounts.length === 0) {
    return ''
  }

  let unsub: Unsubscriber | undefined
  const promise = new Promise<IdMap<Person>>((resolve) => {
    unsub = personByIdStore.subscribe((p) => {
      if (p.size !== 0) {
        resolve(p)
      }
    })
  })

  const me = getCurrentAccount() as PersonAccount
  const map = await promise

  unsub?.()

  const names: string[] = []
  const processedPersons: Array<Ref<Person>> = []

  let myName = ''

  for (const acc of personAccounts) {
    if (processedPersons.includes(acc.person)) {
      continue
    }

    const person = map.get(acc.person)

    if (person === undefined) {
      continue
    }

    if (me.person === person._id) {
      myName = getName(client.getHierarchy(), person)
      processedPersons.push(acc.person)
      continue
    }

    names.push(getName(client.getHierarchy(), person))
    processedPersons.push(acc.person)
  }
  return names.length > 0 ? names.join(', ') : myName
}

export function getDmNameByContacts (contacts: Contact[]): string {
  const names: string[] = []
  const me = getCurrentAccount() as PersonAccount
  const client = getClient()

  let myName = ''

  for (const c of contacts) {
    if (me.person === c._id) {
      myName = getName(client.getHierarchy(), c)
      continue
    }

    names.push(getName(client.getHierarchy(), c))
  }

  return names.length > 0 ? names.join(', ') : myName
}

export async function dmIdentifierProvider (): Promise<string> {
  return await translate(chunter.string.Direct, {})
}

export async function canDeleteMessage (doc?: ChatMessage): Promise<boolean> {
  if (doc === undefined) {
    return false
  }

  const me = getCurrentAccount()

  if (doc.createdBy !== me._id) {
    return false
  }

  const extension = await getMessageExtension(doc)

  return extension?.options.removable ?? true
}

export function canReplyToThread (doc?: ActivityMessage): boolean {
  if (doc === undefined) {
    return false
  }

  if (doc._class === chunter.class.ThreadMessage) {
    return false
  }

  if (doc._class === activity.class.DocUpdateMessage) {
    return (doc as DocUpdateMessage).objectClass !== activity.class.Reaction
  }

  return true
}

export async function canCopyMessageLink (doc?: ActivityMessage | ActivityMessage[]): Promise<boolean> {
  const message = Array.isArray(doc) ? doc[0] : doc

  if (message === undefined) {
    return false
  }

  if (message._class === activity.class.DocUpdateMessage) {
    return (message as DocUpdateMessage).objectClass !== activity.class.Reaction
  }

  return true
}

async function getDmAccounts (client: Client, space?: Space): Promise<PersonAccount[]> {
  if (space === undefined) {
    return []
  }

  return await client.findAll(contact.class.PersonAccount, {
    _id: { $in: (space.members ?? []) as Array<Ref<PersonAccount>> }
  })
}

export async function getDmPersons (client: Client, space: Space): Promise<Person[]> {
  const personAccounts: PersonAccount[] = await getDmAccounts(client, space)
  const me = getCurrentAccount() as PersonAccount
  const persons: Person[] = []

  const personRefs = new Set(personAccounts.map(({ person }) => person))
  let myPerson: Person | undefined

  for (const personRef of personRefs) {
    const person = await client.findOne(contact.class.Person, { _id: personRef })
    if (person === undefined) {
      continue
    }

    if (me.person === person._id) {
      myPerson = person
      continue
    }

    persons.push(person)
  }

  if (persons.length > 0) {
    return persons
  }

  return myPerson !== undefined ? [myPerson] : []
}

export async function DirectTitleProvider (client: Client, id: Ref<DirectMessage>): Promise<string> {
  const direct = await client.findOne(chunter.class.DirectMessage, { _id: id })

  if (direct === undefined) {
    return ''
  }

  return await getDmName(client, direct)
}

export async function ChannelTitleProvider (client: Client, id: Ref<Channel>): Promise<string> {
  const channel = await client.findOne(chunter.class.Channel, { _id: id })

  if (channel === undefined) {
    return ''
  }

  return channel.name
}

export enum SearchType {
  Messages,
  Files,
  Contacts
}

export async function getTitle (doc: Doc): Promise<string> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  let clazz = hierarchy.getClass(doc._class)
  let label = clazz.shortLabel
  while (label === undefined && clazz.extends !== undefined) {
    clazz = hierarchy.getClass(clazz.extends)
    label = clazz.shortLabel
  }
  label = label ?? doc._class
  return `${label}-${doc._id}`
}

export function getObjectIcon (_class: Ref<Class<Doc>>): Asset | AnySvelteComponent | undefined {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  if (_class === chunter.class.Channel) {
    return ChannelIcon
  }

  if (_class === chunter.class.DirectMessage) {
    return DirectIcon
  }

  if (hierarchy.isDerived(_class, contact.class.Person)) {
    return PersonIcon
  }

  return classIcon(client, _class)
}

export async function getChannelName (
  _id: Ref<Doc>,
  _class: Ref<Class<Doc>>,
  object?: Doc
): Promise<string | undefined> {
  const client = getClient()

  if (client.getHierarchy().isDerived(_class, chunter.class.ChunterSpace)) {
    return await getDocTitle(client, _id, _class, object)
  }

  return await getDocLinkTitle(client, _id, _class, object)
}

export function getUnreadThreadsCount (): number {
  const notificationClient = InboxNotificationsClientImpl.getClient()

  const threadIds = get(notificationClient.activityInboxNotifications)
    .filter(({ attachedToClass, isViewed }) => attachedToClass === chunter.class.ThreadMessage && !isViewed)
    .map(({ $lookup }) => $lookup?.attachedTo?.attachedTo)
    .filter((_id) => _id !== undefined)

  return new Set(threadIds).size
}

export function getClosestDate (selectedDate: Timestamp, dates: Timestamp[]): Timestamp | undefined {
  if (dates.length === 0) {
    return
  }

  let closestDate: Timestamp | undefined = dates[dates.length - 1]
  const reversedDates = [...dates].reverse()

  for (const date of reversedDates) {
    if (date < selectedDate) {
      break
    } else if (date - selectedDate < closestDate - selectedDate) {
      closestDate = date
    }
  }

  return closestDate
}

export function filterChatMessages (
  messages: DisplayActivityMessage[],
  filters: ActivityMessagesFilter[],
  filterResources: Map<Ref<ActivityMessagesFilter>, (message: ActivityMessage, _class?: Ref<Doc>) => boolean>,
  objectClass: Ref<Class<Doc>>,
  selectedIds: Array<Ref<ActivityMessagesFilter>>
): DisplayActivityMessage[] {
  if (selectedIds.length === 0 || selectedIds.includes(activity.ids.AllFilter)) {
    return messages
  }

  const selectedFilters = filters.filter(({ _id }) => selectedIds.includes(_id))

  if (selectedFilters.length === 0) {
    return messages
  }
  const filtersFns: Array<(message: ActivityMessage, _class?: Ref<Doc>) => boolean> = []

  for (const filter of selectedFilters) {
    const filterFn = filterResources.get(filter._id)
    if (filterFn !== undefined) {
      filtersFns.push(filterFn)
    }
  }

  return messages.filter((message) => filtersFns.some((filterFn) => filterFn(message, objectClass)))
}

export async function joinChannel (channel: Channel, value: Ref<Account> | Array<Ref<Account>>): Promise<void> {
  const client = getClient()

  if (Array.isArray(value)) {
    if (value.length > 0) {
      await client.update(channel, { $push: { members: { $each: value, $position: 0 } } })
    }
  } else {
    await client.update(channel, { $push: { members: value } })
  }
}

export async function leaveChannel (channel: Channel, value: Ref<Account> | Array<Ref<Account>>): Promise<void> {
  const client = getClient()

  if (Array.isArray(value)) {
    if (value.length > 0) {
      await client.update(channel, { $pull: { members: { $in: value } } })
    }
  } else {
    const context = await client.findOne(notification.class.DocNotifyContext, { attachedTo: channel._id })

    await client.update(channel, { $pull: { members: value } })
    await removeChannelAction(context, undefined, { object: channel })
  }
}

// NOTE: Store timestamp updates to avoid unnecessary updates when if the server takes a long time to respond
const contextsTimestampStore = writable<Map<Ref<DocNotifyContext>, number>>(new Map())
// NOTE: Sometimes user can read message before notification is created and we should mark it as viewed when notification is received
export const chatReadMessagesStore = writable<Set<Ref<ActivityMessage>>>(new Set())

function getAllIds (messages: DisplayActivityMessage[]): Array<Ref<ActivityMessage>> {
  return messages
    .map((message) => {
      const combined =
        message._class === activity.class.DocUpdateMessage
          ? (message as DisplayDocUpdateMessage)?.combinedMessagesIds
          : undefined

      return [message._id, ...(combined ?? [])]
    })
    .flat()
}

let toReadTimer: any
const toRead = new Set<Ref<InboxNotification>>()

export function recheckNotifications (context: DocNotifyContext): void {
  const client = getClient()
  const inboxClient = InboxNotificationsClientImpl.getClient()

  const messages = get(chatReadMessagesStore)

  if (messages.size === 0) {
    return
  }

  const notifications = get(inboxClient.inboxNotificationsByContext).get(context._id) ?? []

  notifications
    .filter((it) => {
      if (it.isViewed) {
        return false
      }

      if (isMentionNotification(it)) {
        return messages.has(it.mentionedIn as Ref<ActivityMessage>)
      }

      if (isActivityNotification(it)) {
        return messages.has(it.attachedTo)
      }

      return false
    })
    .forEach((n) => toRead.add(n._id))

  clearTimeout(toReadTimer)
  toReadTimer = setTimeout(() => {
    const toReadData = Array.from(toRead)
    toRead.clear()
    void (async () => {
      const _client = client.apply(generateId())
      await inboxClient.readNotifications(_client, toReadData)
      await _client.commit()
    })()
  }, 500)
}

export async function readChannelMessages (
  messages: DisplayActivityMessage[],
  context: DocNotifyContext | undefined
): Promise<void> {
  if (messages.length === 0) {
    return
  }

  const inboxClient = InboxNotificationsClientImpl.getClient()

  const client = getClient().apply(generateId())
  try {
    const readMessages = get(chatReadMessagesStore)
    const allIds = getAllIds(messages).filter((id) => !readMessages.has(id))

    const notifications = get(inboxClient.activityInboxNotifications)
      .filter(({ _id, attachedTo }) => allIds.includes(attachedTo))
      .map((n) => n._id)

    const relatedMentions = get(inboxClient.otherInboxNotifications)
      .filter((n) => !n.isViewed && isMentionNotification(n) && allIds.includes(n.mentionedIn as Ref<ActivityMessage>))
      .map((n) => n._id)

    chatReadMessagesStore.update((store) => new Set([...store, ...allIds]))

    await inboxClient.readNotifications(client, [...notifications, ...relatedMentions])

    if (context === undefined) {
      return
    }

    const storedTimestampUpdates = get(contextsTimestampStore).get(context._id)
    const newTimestamp = messages[messages.length - 1].createdOn ?? 0
    const prevTimestamp = Math.max(storedTimestampUpdates ?? 0, context.lastViewedTimestamp ?? 0)

    if (prevTimestamp < newTimestamp) {
      context.lastViewedTimestamp = newTimestamp
      contextsTimestampStore.update((store) => {
        store.set(context._id, newTimestamp)
        return store
      })
      await client.update(context, { lastViewedTimestamp: newTimestamp })
    }
  } finally {
    await client.commit()
  }
}

export async function leaveChannelAction (
  context?: DocNotifyContext,
  _?: Event,
  props?: { object?: Channel }
): Promise<void> {
  if (context === undefined) {
    return
  }
  const client = getClient()
  const channel =
    props?.object ?? (await client.findOne(chunter.class.Channel, { _id: context.attachedTo as Ref<Channel> }))

  if (channel === undefined) {
    return
  }

  await leaveChannel(channel, getCurrentAccount()._id)
  await resetChunterLocIfEqual(channel._id, channel._class, channel)
}

export async function removeChannelAction (
  context?: DocNotifyContext,
  _?: Event,
  props?: { object?: Doc }
): Promise<void> {
  if (context === undefined) {
    return
  }

  const client = getClient()

  await archiveContextNotifications(context)
  await client.remove(context)

  await resetChunterLocIfEqual(context.attachedTo, context.attachedToClass, props?.object)
}

export function isThreadMessage (message: ActivityMessage): message is ThreadMessage {
  return message._class === chunter.class.ThreadMessage
}

export function getChannelContacts (
  object: Doc | undefined,
  personAccountById: IdMap<PersonAccount>
): Array<Ref<Contact>> {
  if (object === undefined) {
    return []
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const me = getCurrentAccount() as PersonAccount

  if (!hierarchy.isDerived(object._class, chunter.class.DirectMessage)) {
    return []
  }

  const direct = object as DirectMessage
  const account = getDirectCompanion(direct, me, personAccountById)

  if (account === undefined) {
    return []
  }

  const contact = personAccountById.get(account as Ref<PersonAccount>)?.person
  return contact != null ? [contact] : []
}

export async function getAvailableChannelProviders (_class: Ref<Class<Doc>>): Promise<ChannelProvider[]> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const integrationResources = client.getModel().findAllSync(chunter.class.ChatExtension, {})

  const allowedIntegrationTypes = integrationResources
    .filter(({ allowedChannelsTypes }) => {
      const isAllowed: boolean = allowedChannelsTypes.includes(_class)
      if (isAllowed) return true
      return allowedChannelsTypes.some((it) => hierarchy.isDerived(_class, it))
    })
    .map(({ type }) => type)

  if (allowedIntegrationTypes.length === 0) {
    return []
  }

  return await client.findAll(contactPlugin.class.ChannelProvider, {
    integrationType: { $in: allowedIntegrationTypes }
  })
}

async function getChatExtension (channel: ExternalChannel): Promise<ChatExtension | undefined> {
  const client = getClient()
  const provider = await client.findOne(contact.class.ChannelProvider, { _id: channel.provider })
  const type = provider?.integrationType as Ref<IntegrationType> | undefined

  if (type === undefined) {
    return
  }

  return await client.findOne(chunter.class.ChatExtension, { type })
}

async function editInternalMessage (client: TxOperations, message: ChatMessage, data: EditMessageData): Promise<void> {
  await client.update(message, { message: data.message, attachments: data.attachments, editedOn: Date.now() })
}

async function createInternalMessage (client: TxOperations, object: Doc, data: CreateMessageData): Promise<void> {
  const { _id, _class, message, attachments, collection } = data
  if (client.getHierarchy().isDerived(data._class, chunter.class.ThreadMessage)) {
    await createInternalThreadMessage(client, object, data)
    return
  }

  await client.addCollection<Doc, ChatMessage>(
    _class,
    isSpace(object) ? object._id : object.space,
    object._id,
    object._class,
    collection,
    { message, attachments },
    _id
  )
}

async function createInternalThreadMessage (client: TxOperations, object: Doc, data: CreateMessageData): Promise<void> {
  const { _id, _class, message, attachments } = data
  const parentMessage = object as ActivityMessage

  await client.addCollection<ActivityMessage, ThreadMessage>(
    _class,
    parentMessage.space,
    parentMessage._id,
    parentMessage._class,
    'replies',
    {
      message,
      attachments,
      objectClass: parentMessage.attachedToClass,
      objectId: parentMessage.attachedTo
    },
    _id as Ref<ThreadMessage>
  )
}

async function editExternalMessage (
  client: TxOperations,
  message: ChatMessage,
  channel: ExternalChannel,
  data: EditMessageData
): Promise<void> {
  const extension = await getChatExtension(channel)

  if (extension === undefined) {
    return
  }

  const editFn = await getResource(extension.editMessageFn)

  await editFn(client, message, channel, data)
}

async function createExternalMessage (
  client: TxOperations,
  object: Doc,
  channel: ExternalChannel,
  data: CreateMessageData
): Promise<void> {
  const extension = await getChatExtension(channel)

  if (extension === undefined) {
    return
  }

  const createFn = await getResource(extension.createMessageFn)

  await createFn(client, object, channel, data)
}

export async function editChatMessage (
  message: ChatMessage,
  data: EditMessageData,
  channel?: ExternalChannel
): Promise<void> {
  const client = getClient()
  const op = client.apply(message._id)
  const doneOp = await client.measure(`chunter.edit.${message._class} ${message.attachedToClass}`)

  try {
    if (channel !== undefined) {
      await editExternalMessage(op, message, channel, data)
    } else {
      await editInternalMessage(op, message, data)
    }
    await op.commit()
    const d1 = Date.now()
    void doneOp().then((res) => {
      console.log(`edit.${message._class} measure`, res, Date.now() - d1)
    })
  } catch (err: any) {
    void doneOp()
    Analytics.handleError(err)
    console.error(err)
  }
}

export async function createChatMessage (
  object: Doc,
  data: CreateMessageData,
  channel?: ExternalChannel
): Promise<void> {
  const client = getClient()
  const op = client.apply(data._id)
  const doneOp = await client.measure(`chunter.create.${data._class} ${object._class}`)

  try {
    if (channel !== undefined) {
      await createExternalMessage(op, object, channel, data)
    } else {
      await createInternalMessage(op, object, data)
    }
    await op.commit()
    const d1 = Date.now()
    void doneOp().then((res) => {
      console.log(`create.${data._class} measure`, res, Date.now() - d1)
    })
  } catch (err: any) {
    void doneOp()
    Analytics.handleError(err)
    console.error(err)
  }
}

export const hulyChannelId = 'huly' as Ref<ExternalChannel>
export const allChannelId = 'all' as Ref<ExternalChannel>

export async function getMessageExtension (value: ChatMessage | undefined): Promise<ChatExtension | undefined> {
  if (value === undefined) {
    return
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()

  if (!hierarchy.isDerived(value._class, chunter.class.ExternalChatMessage)) {
    return
  }

  const externalMessage = value as ExternalChatMessage
  const channel = await client.findOne(
    externalMessage.channelClass,
    { _id: externalMessage.channelId },
    {
      lookup: {
        provider: contact.class.ChannelProvider
      }
    }
  )
  const provider = channel?.$lookup?.provider

  if (provider?.integrationType === undefined) {
    return
  }

  return client
    .getModel()
    .findAllSync(chunter.class.ChatExtension, { type: provider.integrationType as Ref<IntegrationType> })[0]
}
