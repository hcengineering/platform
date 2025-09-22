//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import { type Ref } from '@hcengineering/core'
import { type Person } from '@hcengineering/contact'
import { getPersonByPersonRef } from '@hcengineering/contact-resources'
import { writable, get } from 'svelte/store'

import type { RoomPresence, MyDataItem } from './types'

type PersonPresenceMap = Map<Ref<Person>, RoomPresence[]>

export const myPresence = writable<RoomPresence[]>([])
export const myData = writable<Map<string, MyDataItem>>(new Map())
export const otherPresence = writable<PersonPresenceMap>(new Map())
export const followee = writable<Ref<Person> | undefined>(undefined)

const personDataMap = new Map<Ref<Person>, Map<string, any>>()
const followeeDataHandlers = new Map<string, Set<(data: any) => Promise<void>>>()

export function onPersonUpdate (person: Ref<Person>, presence: RoomPresence[]): void {
  otherPresence.update((map) => {
    map.set(person, [...presence])
    return map
  })
  if (person === get(followee) && !isAnybodyInMyRoom()) {
    toggleFollowee(undefined)
  }
}

export function onPersonLeave (person: Ref<Person>): void {
  otherPresence.update((map) => {
    map.delete(person)
    toggleFollowee(person)
    return map
  })
}

export function onPersonData (person: Ref<Person>, topic: string, data: any): void {
  const personData = personDataMap.get(person)
  if (personData !== undefined) {
    personData.set(topic, data)
  } else {
    personDataMap.set(person, new Map([[topic, data]]))
  }
  if (person === get(followee)) {
    const handlers = followeeDataHandlers.get(topic)
    if (handlers !== undefined) {
      for (const handler of handlers) {
        void handler(data)
      }
    }
  }
}

export function followeeDataSubscribe (topic: string, handler: (data: any) => Promise<void>): void {
  const handlers = followeeDataHandlers.get(topic)
  if (handlers !== undefined) {
    handlers.add(handler)
  } else {
    followeeDataHandlers.set(topic, new Set([handler]))
  }
  const f = get(followee)
  if (f !== undefined) {
    const followeeData = personDataMap.get(f)
    if (followeeData !== undefined) {
      const data = followeeData.get(topic)
      if (data !== undefined) {
        void handler(data)
      }
    }
  }
}

export function followeeDataUnsubscribe (topic: string, handler: (data: any) => Promise<void>): void {
  const handlers = followeeDataHandlers.get(topic)
  if (handlers !== undefined) {
    handlers.delete(handler)
  }
}

export function toggleFollowee (person: Ref<Person> | undefined): void {
  followee.update((p) => (p === person ? undefined : person))

  const f = get(followee)
  if (f !== undefined) {
    const otherData = personDataMap.get(f)
    if (otherData !== undefined) {
      for (const [topic, data] of otherData) {
        const handlers = followeeDataHandlers.get(topic)
        if (handlers !== undefined) {
          for (const handler of handlers) {
            void handler(data)
          }
        }
      }
    }
  } else {
    for (const handlers of followeeDataHandlers.values()) {
      for (const handler of handlers) {
        void handler(undefined)
      }
    }
  }
}

export async function getFollowee (): Promise<Person | undefined> {
  const followeeId = get(followee)
  if (followeeId === undefined) {
    return undefined
  }

  return (await getPersonByPersonRef(followeeId)) ?? undefined
}

export function publishData (topic: string, data: any): void {
  myData.update((map) => {
    map.set(topic, { lastUpdated: Date.now(), data })
    return map
  })
}

export function isAnybodyInMyRoom (): boolean {
  for (const my of get(myPresence)) {
    for (const others of get(otherPresence).values()) {
      if (
        others.find(
          (other) => other.room.objectId === my.room.objectId && other.room.objectClass === my.room.objectClass
        ) !== undefined
      ) {
        return true
      }
    }
  }
  return false
}
