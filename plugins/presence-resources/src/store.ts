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

import { type Doc, type Ref } from '@hcengineering/core'
import { getCurrentEmployee, type Person } from '@hcengineering/contact'
import { type PresenceData } from '@hcengineering/presence'
import { type Readable, derived, writable, get } from 'svelte/store'

import type { PersonRoomPresence, Room, RoomPresence, MyDataItem } from './types'

type PersonPresenceMap = Map<Ref<Person>, RoomPresence[]>

export const myPresence = writable<RoomPresence[]>([])
export const myData = writable<Map<string, MyDataItem>>(new Map())
export const otherPresence = writable<PersonPresenceMap>(new Map())
export const personToFollow = writable<Ref<Person> | undefined>(undefined)

const otherDataMap = new Map<Ref<Person>, Map<string, any>>()
const otherDataHandlers = new Map<string, Set<(data: any) => void>>()

export const presenceByObjectId = derived<Readable<PersonPresenceMap>, Map<Ref<Doc>, PersonRoomPresence[]>>(
  otherPresence,
  ($presence) => {
    const map = new Map<Ref<Doc>, PersonRoomPresence[]>()
    for (const [person, presences] of $presence.entries()) {
      if (person === getCurrentEmployee()) continue

      presences.forEach((presence) => {
        const values = map.get(presence.room.objectId) ?? []
        values.push({ person, ...presence })

        map.set(presence.room.objectId, values)
      })
    }

    return map
  }
)

export function updateMyPresence (room: Room, presence: PresenceData): void {
  myPresence.update((rooms) => {
    const value = { room, presence, lastUpdated: Date.now() }

    const index = rooms.findIndex((it) => it.room.objectId === room.objectId)
    if (index >= 0) {
      rooms[index] = value
    } else {
      rooms.push(value)
    }

    return rooms
  })
}

export function removeMyPresence (room: Room): void {
  myPresence.update((old) => {
    return old.filter((it) => it.room.objectId !== room.objectId)
  })
}

export function onPersonUpdate (person: Ref<Person>, presence: RoomPresence[]): void {
  otherPresence.update((map) => {
    map.set(person, [...presence])
    return map
  })
}

export function onPersonLeave (person: Ref<Person>): void {
  otherPresence.update((map) => {
    map.delete(person)
    personToFollow.update((p) => (p === person ? undefined : p))
    return map
  })
}

export function onPersonData (person: Ref<Person>, key: string, data: any): void {
  const otherData = otherDataMap.get(person)
  if (otherData !== undefined) {
    otherData.set(key, data)
  } else {
    otherDataMap.set(person, new Map([[key, data]]))
  }
  if (person === get(personToFollow)) {
    const handlers = otherDataHandlers.get(key)
    if (handlers !== undefined) {
      for (const handler of handlers) {
        handler(data)
      }
    }
  }
}

export function subscribeToOtherData (key: string, callback: (data: any) => void): void {
  const handlers = otherDataHandlers.get(key)
  if (handlers !== undefined) {
    handlers.add(callback)
  } else {
    otherDataHandlers.set(key, new Set([callback]))
  }
  const p = get(personToFollow)
  if (p !== undefined) {
    const otherData = otherDataMap.get(p)
    if (otherData !== undefined) {
      const data = otherData.get(key)
      if (data !== undefined) {
        callback(data)
      }
    }
  }
}

export function unsubscribeFromOtherData (key: string, callback: (data: any) => void): void {
  const handlers = otherDataHandlers.get(key)
  if (handlers !== undefined) {
    handlers.delete(callback)
  }
}

export function togglePersonFollowing (person: Ref<Person>): void {
  personToFollow.update((p) => (p === person ? undefined : person))

  const p = get(personToFollow)
  if (p !== undefined) {
    const otherData = otherDataMap.get(p)
    if (otherData !== undefined) {
      for (const [key, data] of otherData) {
        const handlers = otherDataHandlers.get(key)
        if (handlers !== undefined) {
          handlers.forEach((callback) => {
            callback(data)
          })
        }
      }
    }
  }
}

export function sendMyData (key: string, data: any, forceSend: boolean = false): void {
  myData.update((map) => {
    map.set(key, { lastUpdated: Date.now(), data, forceSend })
    return map
  })
}
