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
  type ChatMessage,
  chunterId,
  type ChunterSpace,
  type DirectMessage,
  type ThreadMessage
} from '@hcengineering/chunter'
import contact, { type Employee, type PersonAccount, getName, type Person } from '@hcengineering/contact'
import { employeeByIdStore, PersonIcon } from '@hcengineering/contact-resources'
import {
  type Client,
  type Doc,
  getCurrentAccount,
  type IdMap,
  type Ref,
  type Space,
  type Class,
  type Timestamp,
  type Account,
  generateId
} from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import {
  type AnySvelteComponent,
  getCurrentResolvedLocation,
  getLocation,
  type Location,
  navigate
} from '@hcengineering/ui'
import { workbenchId } from '@hcengineering/workbench'
import { type Asset, getResource, translate } from '@hcengineering/platform'
import { classIcon, getDocLinkTitle, getDocTitle } from '@hcengineering/view-resources'
import activity, {
  type ActivityMessage,
  type ActivityMessagesFilter,
  type DisplayActivityMessage,
  type DisplayDocUpdateMessage,
  type DocUpdateMessage
} from '@hcengineering/activity'
import { deleteContextNotifications, InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
import notification, { type DocNotifyContext, notificationId } from '@hcengineering/notification'
import { get, type Unsubscriber } from 'svelte/store'

import chunter from './plugin'
import DirectIcon from './components/DirectIcon.svelte'
import ChannelIcon from './components/ChannelIcon.svelte'
import { chatSpecials } from './components/chat/utils'

export async function getDmName (client: Client, space?: Space): Promise<string> {
  if (space === undefined) {
    return ''
  }

  const employeeAccounts: PersonAccount[] = await getDmAccounts(client, space)

  return await buildDmName(client, employeeAccounts)
}

export async function buildDmName (client: Client, employeeAccounts: PersonAccount[]): Promise<string> {
  if (employeeAccounts.length === 0) {
    return ''
  }

  let unsub: Unsubscriber | undefined
  const promise = new Promise<IdMap<Employee>>((resolve) => {
    unsub = employeeByIdStore.subscribe((p) => {
      if (p.size !== 0) {
        resolve(p)
      }
    })
  })

  const map = await promise

  unsub?.()

  const names: string[] = []
  const processedPersons: Array<Ref<Person>> = []

  for (const acc of employeeAccounts) {
    if (processedPersons.includes(acc.person)) {
      continue
    }

    const employee = map.get(acc.person as unknown as Ref<Employee>)

    if (employee !== undefined) {
      names.push(getName(client.getHierarchy(), employee))
      processedPersons.push(acc.person)
    }
  }
  return names.join(', ')
}

export async function dmIdentifierProvider (): Promise<string> {
  return await translate(chunter.string.Direct, {})
}

export async function canDeleteMessage (doc?: ChatMessage): Promise<boolean> {
  if (doc === undefined) {
    return false
  }

  const me = getCurrentAccount()

  return doc.createdBy === me._id
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

  const myAccId = getCurrentAccount()._id

  const employeeAccounts: PersonAccount[] = await client.findAll(contact.class.PersonAccount, {
    _id: { $in: (space.members ?? []) as Array<Ref<PersonAccount>> }
  })

  return employeeAccounts.filter((p) => p._id !== myAccId)
}

export async function getDmPersons (client: Client, space: Space): Promise<Person[]> {
  const personAccounts: PersonAccount[] = await getDmAccounts(client, space)
  const persons: Person[] = []

  const personRefs = new Set(personAccounts.map(({ person }) => person))

  for (const personRef of personRefs) {
    const person = await client.findOne(contact.class.Person, { _id: personRef })
    if (person !== undefined) {
      persons.push(person)
    }
  }

  return persons
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

export async function openMessageFromSpecial (message?: ActivityMessage): Promise<void> {
  if (message === undefined) {
    return
  }

  const inboxClient = InboxNotificationsClientImpl.getClient()
  const loc = getCurrentResolvedLocation()

  if (message._class === chunter.class.ThreadMessage) {
    const threadMessage = message as ThreadMessage

    loc.path[4] = threadMessage.attachedTo
  } else {
    const context = get(inboxClient.contextByDoc).get(message.attachedTo)

    if (context === undefined) {
      return
    }

    loc.path[4] = context._id
  }

  loc.query = { ...loc.query, message: message._id }

  navigate(loc)
}

export function navigateToSpecial (specialId: string): void {
  const loc = getLocation()
  loc.path[2] = chunterId
  loc.path[3] = specialId
  navigate(loc)
}

export enum SearchType {
  Messages,
  Channels,
  Files,
  Contacts
}

export async function getMessageLink (message: ActivityMessage): Promise<string> {
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const location = getCurrentResolvedLocation()

  let context: DocNotifyContext | undefined
  let threadParent: string = ''

  if (message._class === chunter.class.ThreadMessage) {
    const threadMessage = message as ThreadMessage
    threadParent = `/${threadMessage.attachedTo}`
    context = get(inboxClient.contextByDoc).get(threadMessage.objectId)
  } else {
    context = get(inboxClient.contextByDoc).get(message.attachedTo)
  }

  if (context === undefined) {
    return ''
  }

  return `${window.location.protocol}//${window.location.host}/${workbenchId}/${location.path[1]}/${chunterId}/${context._id}${threadParent}?message=${message._id}`
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

export async function chunterSpaceLinkFragmentProvider (doc: ChunterSpace): Promise<Location> {
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const context = get(inboxClient.contextByDoc).get(doc._id)
  const loc = getCurrentResolvedLocation()

  if (context === undefined) {
    return loc
  }

  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = chunterId
  loc.path[3] = context._id

  return loc
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

export async function filterChatMessages (
  messages: DisplayActivityMessage[],
  filters: ActivityMessagesFilter[],
  objectClass: Ref<Class<Doc>>,
  selectedIds: Array<Ref<ActivityMessagesFilter>>
): Promise<DisplayActivityMessage[]> {
  if (selectedIds.length === 0 || selectedIds.includes(activity.ids.AllFilter)) {
    return messages
  }

  const selectedFilters = filters.filter(({ _id }) => selectedIds.includes(_id))

  if (selectedFilters.length === 0) {
    return messages
  }
  const filtersFns: Array<(message: ActivityMessage, _class?: Ref<Doc>) => boolean> = []

  for (const filter of selectedFilters) {
    const filterFn = await getResource(filter.filter)
    filtersFns.push(filterFn)
  }

  return messages.filter((message) => filtersFns.some((filterFn) => filterFn(message, objectClass)))
}

export function buildThreadLink (loc: Location, contextId: Ref<DocNotifyContext>, _id: Ref<ActivityMessage>): Location {
  const specials = chatSpecials.map(({ id }) => id)
  const isSameContext = loc.path[3] === contextId

  if (!isSameContext) {
    loc.query = { message: _id }
  }

  if (loc.path[2] === chunterId && specials.includes(loc.path[3])) {
    loc.path[4] = _id
    return loc
  }

  if (loc.path[2] !== notificationId) {
    loc.path[2] = chunterId
  }

  loc.path[3] = contextId
  loc.path[4] = _id
  loc.fragment = undefined

  return loc
}

export async function getThreadLink (doc: ThreadMessage): Promise<Location> {
  const loc = getCurrentResolvedLocation()
  const client = getClient()
  const inboxClient = InboxNotificationsClientImpl.getClient()

  let contextId: Ref<DocNotifyContext> | undefined = get(inboxClient.contextByDoc).get(doc.objectId)?._id

  if (contextId === undefined) {
    contextId = await client.createDoc(notification.class.DocNotifyContext, doc.space, {
      attachedTo: doc.attachedTo,
      attachedToClass: doc.attachedToClass,
      user: getCurrentAccount()._id,
      hidden: false,
      lastViewedTimestamp: Date.now()
    })
  }

  if (contextId === undefined) {
    return loc
  }

  return buildThreadLink(loc, contextId, doc.attachedTo)
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
    await removeChannelAction(context)
  }
}

export async function readChannelMessages (
  messages: DisplayActivityMessage[],
  context: DocNotifyContext | undefined
): Promise<void> {
  if (messages.length === 0) {
    return
  }

  const inboxClient = InboxNotificationsClientImpl.getClient()
  const client = getClient()

  const allIds = messages
    .map((message) => {
      const combined =
        message._class === activity.class.DocUpdateMessage
          ? (message as DisplayDocUpdateMessage)?.combinedMessagesIds
          : undefined

      return [message._id, ...(combined ?? [])]
    })
    .flat()

  const ops = getClient().apply(generateId())

  void inboxClient.readMessages(ops, allIds).then(() => {
    void ops.commit()
  })

  if (context === undefined) {
    return
  }

  const lastTimestamp = messages[messages.length - 1].createdOn ?? 0

  if ((context.lastViewedTimestamp ?? 0) < lastTimestamp) {
    void client.update(context, { lastViewedTimestamp: lastTimestamp })
  }
}

export async function leaveChannelAction (context?: DocNotifyContext): Promise<void> {
  if (context === undefined) {
    return
  }
  const client = getClient()
  const channel = await client.findOne(chunter.class.Channel, { _id: context.attachedTo as Ref<Channel> })

  if (channel === undefined) {
    return
  }

  await leaveChannel(channel, getCurrentAccount()._id)
}

export async function removeChannelAction (context?: DocNotifyContext): Promise<void> {
  if (context === undefined) {
    return
  }

  const client = getClient()

  await deleteContextNotifications(context)
  await client.remove(context)
}
