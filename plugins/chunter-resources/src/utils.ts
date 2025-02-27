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
import activity, {
  type ActivityMessage,
  type ActivityMessagesFilter,
  type DisplayActivityMessage,
  type DisplayDocUpdateMessage,
  type DocUpdateMessage
} from '@hcengineering/activity'
import { isReactionMessage } from '@hcengineering/activity-resources'
import { type Channel, type ChatMessage, type DirectMessage, type ThreadMessage } from '@hcengineering/chunter'
import contact, { getName, getCurrentEmployee, type Employee, type Person } from '@hcengineering/contact'
import {
  PersonIcon,
  employeeByAccountStore,
  employeeByIdStore,
  personRefByAccountUuidStore
} from '@hcengineering/contact-resources'
import core, {
  getCurrentAccount,
  type Class,
  type Client,
  type Doc,
  type Ref,
  type Space,
  type Timestamp,
  type AccountUuid,
  notEmpty
} from '@hcengineering/core'
import notification, { type DocNotifyContext, type InboxNotification } from '@hcengineering/notification'
import {
  InboxNotificationsClientImpl,
  isActivityNotification,
  isMentionNotification
} from '@hcengineering/notification-resources'
import { translate, type Asset, getMetadata } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { type AnySvelteComponent, languageStore } from '@hcengineering/ui'
import { classIcon, getDocLinkTitle, getDocTitle } from '@hcengineering/view-resources'
import { get, writable, type Unsubscriber } from 'svelte/store'
import aiBot from '@hcengineering/ai-bot'
import { translate as aiTranslate } from '@hcengineering/ai-bot-resources'

import ChannelIcon from './components/ChannelIcon.svelte'
import DirectIcon from './components/DirectIcon.svelte'
import { openChannelInSidebar, resetChunterLocIfEqual } from './navigation'
import chunter from './plugin'
import { shownTranslatedMessagesStore, translatedMessagesStore, translatingMessagesStore } from './stores'

export async function getDmName (client: Client, space?: Space): Promise<string> {
  if (space === undefined) {
    return ''
  }

  return await buildDmName(client, space.members)
}

export async function buildDmName (client: Client, accounts: AccountUuid[]): Promise<string> {
  if (accounts.length === 0) {
    return ''
  }

  let unsub: Unsubscriber | undefined
  const employeeByAccountPromise = new Promise<Map<AccountUuid, Employee | undefined>>((resolve) => {
    unsub = employeeByAccountStore.subscribe((p) => {
      resolve(p)
    })
  })

  const me = getCurrentEmployee()
  const employeeByAccount = await employeeByAccountPromise

  unsub?.()

  const names: string[] = []
  const processedPersons: Array<Ref<Person>> = []

  let myName = ''

  for (const acc of accounts) {
    const employee = employeeByAccount.get(acc)

    if (employee === undefined) {
      continue
    }

    if (processedPersons.includes(employee._id)) {
      continue
    }

    if (me === employee._id) {
      myName = getName(client.getHierarchy(), employee)
      processedPersons.push(employee._id)
      continue
    }

    names.push(getName(client.getHierarchy(), employee))
    processedPersons.push(employee._id)
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

  return doc.createdBy !== undefined && me.socialIds.includes(doc.createdBy)
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

export async function getDmPersons (client: Client, space: Space): Promise<Person[]> {
  if (space === undefined) {
    return []
  }

  const accounts = space.members.length > 0 ? space.members : [getCurrentAccount().uuid]

  return await client.findAll(contact.class.Person, {
    personUuid: { $in: accounts }
  })
}

export async function DirectTitleProvider (
  client: Client,
  id: Ref<DirectMessage>,
  doc?: DirectMessage
): Promise<string> {
  const direct = doc ?? (await client.findOne(chunter.class.DirectMessage, { _id: id }))

  if (direct === undefined) {
    return ''
  }

  return await getDmName(client, direct)
}

export async function ChannelTitleProvider (client: Client, id: Ref<Channel>, doc?: Channel): Promise<string> {
  const channel = doc ?? (await client.findOne(chunter.class.Channel, { _id: id }))

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

export async function joinChannel (channel: Channel, value: AccountUuid | AccountUuid[]): Promise<void> {
  const client = getClient()

  if (Array.isArray(value)) {
    if (value.length > 0) {
      await client.update(channel, { $push: { members: { $each: value, $position: 0 } } })
    }
  } else {
    await client.update(channel, { $push: { members: value } })
  }
}

export async function leaveChannel (channel: Channel | undefined, value: AccountUuid | AccountUuid[]): Promise<void> {
  if (channel === undefined) return

  const client = getClient()

  if (Array.isArray(value)) {
    if (value.length > 0) {
      await client.update(channel, { $pull: { members: { $in: value } } })
    }
  } else {
    await client.update(channel, { $pull: { members: value } })
    await resetChunterLocIfEqual(channel._id, channel._class, channel)
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
      const _client = client.apply(undefined, 'recheckNotifications', true)
      await inboxClient.readNotifications(_client, toReadData)
      await _client.commit()
    })()
  }, 500)
}

export async function readChannelMessages (
  messages: DisplayActivityMessage[],
  contextId: Ref<DocNotifyContext>
): Promise<void> {
  if (messages.length === 0) {
    return
  }

  const inboxClient = InboxNotificationsClientImpl.getClient()
  const context = get(inboxClient.contextById).get(contextId)
  if (context === undefined) return

  const op = getClient().apply(undefined, 'readViewportMessages', true)

  try {
    const allIds = getAllIds(messages)
    const notifications = get(inboxClient.activityInboxNotifications)
      .filter(({ attachedTo, $lookup, isViewed }) => {
        if (isViewed) return false
        const includes = allIds.includes(attachedTo)
        if (includes) return true
        const msg = $lookup?.attachedTo
        if (isReactionMessage(msg)) {
          return allIds.includes(msg.attachedTo as Ref<ActivityMessage>)
        }
        return false
      })
      .map((n) => n._id)

    const relatedMentions = get(inboxClient.otherInboxNotifications)
      .filter((n) => !n.isViewed && isMentionNotification(n) && allIds.includes(n.mentionedIn as Ref<ActivityMessage>))
      .map((n) => n._id)

    chatReadMessagesStore.update((store) => new Set([...store, ...allIds]))

    const storedTimestampUpdates = get(contextsTimestampStore).get(context._id)
    const newTimestamp = messages[messages.length - 1].createdOn ?? 0
    const prevTimestamp = Math.max(storedTimestampUpdates ?? 0, context.lastViewedTimestamp ?? 0)

    if (prevTimestamp < newTimestamp) {
      contextsTimestampStore.update((store) => {
        store.set(context._id, newTimestamp)
        return store
      })
      await op.update(context, { lastViewedTimestamp: newTimestamp })
    }
    await inboxClient.readNotifications(op, [...notifications, ...relatedMentions])
  } finally {
    await op.commit()
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
    props?.object ?? (await client.findOne(chunter.class.Channel, { _id: context.objectId as Ref<Channel> }))

  if (channel === undefined) {
    return
  }

  await leaveChannel(channel, getCurrentAccount().uuid)
  await client.remove(context)
  await resetChunterLocIfEqual(channel._id, channel._class, channel)
}

export async function removeChannelAction (context?: DocNotifyContext, _?: Event): Promise<void> {
  if (context === undefined) {
    return
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const { objectId, objectClass, objectSpace } = context

  if (hierarchy.isDerived(objectClass, chunter.class.Channel)) {
    const channel = await client.findOne(chunter.class.Channel, { _id: objectId as Ref<Channel>, space: objectSpace })
    await leaveChannel(channel, getCurrentAccount().uuid)
    await client.remove(context)
  } else {
    const object = await client.findOne(objectClass, { _id: objectId, space: objectSpace })
    await client.update(context, { hidden: true })
    await resetChunterLocIfEqual(objectId, objectClass, object)
  }
}

export function isThreadMessage (message: ActivityMessage): message is ThreadMessage {
  return message._class === chunter.class.ThreadMessage
}

export function getChannelSpace (_class: Ref<Class<Doc>>, _id: Ref<Doc>, space: Ref<Space>): Ref<Space> {
  return getClient().getHierarchy().isDerived(_class, core.class.Space) ? (_id as Ref<Space>) : space
}

export async function translateMessage (message: ChatMessage): Promise<void> {
  if (get(translatingMessagesStore).has(message._id)) {
    return
  }

  if (get(translatedMessagesStore).has(message._id)) {
    shownTranslatedMessagesStore.update((store) => store.add(message._id))
    return
  }

  translatingMessagesStore.update((store) => store.add(message._id))
  const response = await aiTranslate(message.message, get(languageStore))

  if (response !== undefined) {
    translatedMessagesStore.update((store) => store.set(message._id, response.text))
    shownTranslatedMessagesStore.update((store) => store.add(message._id))
  }

  translatingMessagesStore.update((store) => {
    store.delete(message._id)
    return store
  })
}

export async function showOriginalMessage (message: ChatMessage): Promise<void> {
  shownTranslatedMessagesStore.update((store) => {
    store.delete(message._id)
    return store
  })
}

export async function canTranslateMessage (): Promise<boolean> {
  const url = getMetadata(aiBot.metadata.EndpointURL) ?? ''
  return url !== ''
}

export async function startConversationAction (docs?: Employee | Employee[]): Promise<void> {
  if (docs === undefined) return
  const employees = Array.isArray(docs) ? docs : [docs]
  const employeeIds = employees.map(({ _id }) => _id)

  const dm = await createDirect(employeeIds)

  if (dm !== undefined) {
    await openChannelInSidebar(dm, chunter.class.DirectMessage, undefined, undefined, true)
  }
}

export async function createDirect (employeeIds: Array<Ref<Person>>): Promise<Ref<DirectMessage>> {
  const client = getClient()
  const me = getCurrentEmployee()
  const myAcc = getCurrentAccount()

  const existingDms = await client.findAll(chunter.class.DirectMessage, {})
  const newDirectPersons = employeeIds.includes(me) ? employeeIds : [...employeeIds, me]
  const newPersonsSet = new Set(newDirectPersons)

  let direct: DirectMessage | undefined
  const personRefByAccountUuid = get(personRefByAccountUuidStore)
  const employeeById = get(employeeByIdStore)

  for (const dm of existingDms) {
    const existPersonsSet = new Set(dm.members.map((acc) => personRefByAccountUuid.get(acc)).filter(notEmpty))

    if (existPersonsSet.size !== newPersonsSet.size) {
      continue
    }

    let match = true
    for (const person of existPersonsSet) {
      if (!newPersonsSet.has(person as Ref<Person>)) {
        match = false
        break
      }
    }

    if (match) {
      direct = dm
      break
    }
  }

  const dmId =
    direct?._id ??
    (await client.createDoc(chunter.class.DirectMessage, core.space.Space, {
      name: '',
      description: '',
      private: true,
      archived: false,
      members: newDirectPersons.map((person) => {
        const employee = employeeById.get(person as Ref<Employee>)

        if (employee?.personUuid === undefined) {
          throw new Error(`Account id not found for person ${person}`)
        }

        return employee.personUuid
      })
    }))

  const context = await client.findOne(notification.class.DocNotifyContext, {
    user: myAcc.uuid,
    objectId: dmId,
    objectClass: chunter.class.DirectMessage
  })

  if (context !== undefined) {
    if (context.hidden) {
      await client.updateDoc(context._class, context.space, context._id, { hidden: false })
    }
  } else {
    const space = await client.findOne(contact.class.PersonSpace, { person: me }, { projection: { _id: 1 } })
    if (space == null) return dmId
    await client.createDoc(notification.class.DocNotifyContext, space._id, {
      user: myAcc.uuid,
      objectId: dmId,
      objectClass: chunter.class.DirectMessage,
      objectSpace: core.space.Space,
      hidden: false,
      isPinned: false
    })
  }

  return dmId
}
