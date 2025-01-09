//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { type Readable, derived, writable } from 'svelte/store'

import { type PersonRoomPresence, type Room, type RoomPresence } from './types'

type PersonPresenceMap = Map<Ref<Person>, RoomPresence[]>

export const myPresence = writable<RoomPresence[]>([])
export const otherPresence = writable<PersonPresenceMap>(new Map())

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
    return map
  })
}
