//
// Copyright © 2025 Hardcore Engineering Inc.
// Copyright © 2026 Intabia Fusion.
// Copyright © 2026 TraceX SAS.
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
// limitations under the License

import { type Employee, type Person } from '@hcengineering/contact'
import {
  AccountRole,
  getCurrentAccount,
  hasAccountRole,
  type Class,
  type Doc,
  type Ref,
  type Space
} from '@hcengineering/core'
import { createQuery, getClient } from '@hcengineering/presentation'
import pulse, { type DocumentPresence } from '@hcengineering/pulse'
import { restrictionStore } from '@hcengineering/view-resources'
import { get } from 'svelte/store'

export interface PresenceInfo {
  personId: Ref<Person>
  objectId: string
  objectClass: Ref<Class<Doc>>
  space: Ref<Space>
}

export interface PresenceActionParams {
  personId: Ref<Employee>
  objectId: string
  objectClass: Ref<Class<Doc>>
  onPresence: (presence: Map<string, Ref<Person>>) => void
}

/**
 * Pulse transactions (presence, typing) are allowed only for Guest role and above.
 * Anonymous and read-only guest accounts must not send them.
 * @public
 */
export function canSendPulse (): boolean {
  return !get(restrictionStore).readonly && hasAccountRole(getCurrentAccount(), AccountRole.Guest)
}

function presenceDocId (objectId: string, personId: Ref<Person>): Ref<DocumentPresence> {
  return `presence:${objectId}:${personId}` as Ref<DocumentPresence>
}

export function presence (node: HTMLElement, params: PresenceActionParams): any {
  const liveQuery = createQuery(true)
  let presenceMap = new Map<string, Ref<Person>>()

  let personId = params.personId
  let objectId = params.objectId
  let objectClass = params.objectClass
  let onPresence = params.onPresence

  function runQuery (): void {
    liveQuery.query(pulse.class.DocumentPresence, { objectId: objectId as Ref<Doc>, objectClass }, (result) => {
      const next = new Map<string, Ref<Person>>()
      for (const doc of result) {
        if (doc.person === personId) continue
        next.set(doc._id, doc.person)
      }
      presenceMap = next
      onPresence(presenceMap)
    })
  }

  runQuery()

  return {
    update: (params: PresenceActionParams) => {
      const needResubscribe =
        objectId !== params.objectId || objectClass !== params.objectClass || personId !== params.personId
      personId = params.personId
      objectId = params.objectId
      objectClass = params.objectClass
      onPresence = params.onPresence

      if (needResubscribe) {
        presenceMap = new Map<string, Ref<Person>>()
        onPresence(presenceMap)
        runQuery()
      }
    },
    destroy: () => {
      liveQuery.unsubscribe()
    }
  }
}

export async function updatePresence (info: PresenceInfo): Promise<void> {
  if (!canSendPulse()) return
  try {
    const client = getClient()
    const id = presenceDocId(info.objectId, info.personId)
    const existing = await client.findOne(pulse.class.DocumentPresence, { _id: id })
    const now = Date.now()
    if (existing !== undefined) {
      await client.diffUpdate(existing, { lastActive: now })
      return
    }
    await client.createDoc(
      pulse.class.DocumentPresence,
      info.space,
      {
        objectId: info.objectId as Ref<Doc>,
        objectClass: info.objectClass,
        person: info.personId,
        lastActive: now
      },
      id
    )
  } catch (err) {
    console.warn('failed to update presence:', err)
  }
}

export async function deletePresence (info: PresenceInfo): Promise<void> {
  if (!canSendPulse()) return
  try {
    const client = getClient()
    const id = presenceDocId(info.objectId, info.personId)
    const existing = await client.findOne(pulse.class.DocumentPresence, { _id: id })
    if (existing !== undefined) {
      await client.removeDoc(pulse.class.DocumentPresence, existing.space, existing._id)
    }
  } catch (err) {
    console.warn('failed to delete presence:', err)
  }
}
