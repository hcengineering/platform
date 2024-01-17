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
  type ChatMessage,
  chunterId,
  type ChunterSpace,
  type DirectMessage,
  type ThreadMessage
} from '@hcengineering/chunter'
import contact, { type Employee, type PersonAccount, getName, type Person } from '@hcengineering/contact'
import { employeeByIdStore } from '@hcengineering/contact-resources'
import { type Client, type Doc, getCurrentAccount, type IdMap, type Ref, type Space } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import {
  type AnySvelteComponent,
  getCurrentResolvedLocation,
  getLocation,
  type Location,
  navigate
} from '@hcengineering/ui'
import { workbenchId } from '@hcengineering/workbench'
import { type Asset, translate } from '@hcengineering/platform'
import { classIcon } from '@hcengineering/view-resources'
import { type ActivityMessage } from '@hcengineering/activity'
import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
import { type DocNotifyContext } from '@hcengineering/notification'
import { get, type Unsubscriber } from 'svelte/store'

import chunter from './plugin'
import DirectIcon from './components/DirectIcon.svelte'
import ChannelIcon from './components/ChannelIcon.svelte'

export async function getDmName (client: Client, space?: Space): Promise<string> {
  if (space === undefined) {
    return ''
  }

  const employeeAccounts: PersonAccount[] = await getDmAccounts(client, space)

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

export async function DirectMessageTitleProvider (client: Client, id: Ref<DirectMessage>): Promise<string> {
  const space = await client.findOne(chunter.class.DirectMessage, { _id: id })

  if (space === undefined) {
    return ''
  }

  return await getDmName(client, space)
}

export async function openMessageFromSpecial (message?: ActivityMessage): Promise<void> {
  if (message === undefined) {
    return
  }
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const loc = getCurrentResolvedLocation()

  if (message._class === chunter.class.ThreadMessage) {
    const threadMessage = message as ThreadMessage
    const context = get(inboxClient.docNotifyContextByDoc).get(threadMessage.objectId)
    if (context === undefined) {
      return
    }
    loc.path[2] = chunterId
    loc.path[3] = context._id
    loc.path[4] = message.attachedTo
  } else {
    const context = get(inboxClient.docNotifyContextByDoc).get(message.attachedTo)
    if (context === undefined) {
      return
    }
    loc.path[2] = chunterId
    loc.path[3] = context._id
  }

  loc.fragment = message._id

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

export async function getLink (message: ActivityMessage): Promise<string> {
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const fragment = message._id
  const location = getCurrentResolvedLocation()

  let context: DocNotifyContext | undefined
  let threadParent: string = ''

  if (message._class === chunter.class.ThreadMessage) {
    const threadMessage = message as ThreadMessage
    threadParent = `/${threadMessage.attachedTo}`
    context = get(inboxClient.docNotifyContextByDoc).get(threadMessage.objectId)
  } else {
    context = get(inboxClient.docNotifyContextByDoc).get(message.attachedTo)
  }

  if (context === undefined) {
    return ''
  }

  return `${window.location.protocol}//${window.location.host}/${workbenchId}/${location.path[1]}/${chunterId}/${context._id}${threadParent}#${fragment}`
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
  const context = get(inboxClient.docNotifyContextByDoc).get(doc._id)
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

export function getChannelIcon (doc: Doc): Asset | AnySvelteComponent | undefined {
  const client = getClient()

  if (doc._class === chunter.class.Channel) {
    return ChannelIcon
  }

  if (doc._class === chunter.class.DirectMessage) {
    return DirectIcon
  }

  return classIcon(client, doc._class)
}
