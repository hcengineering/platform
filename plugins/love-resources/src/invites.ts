//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { AccountRole, getCurrentAccount, type Ref } from '@hcengineering/core'
import { getCurrentEmployee, type Person } from '@hcengineering/contact'
import { type PopupResult, showPopup } from '@hcengineering/ui'
import { type UnsubscribeCallback } from '@hcengineering/hulypulse-client'
import presentation, { createPulseClient } from '@hcengineering/presentation'
import { getMetadata } from '@hcengineering/platform'
import { get } from 'svelte/store'
import { myInfo } from './stores'
import love, { type Room } from '@hcengineering/love'
import InviteRequestPopup from './components/meeting/invites/InviteRequestPopup.svelte'
import InviteResponsePopup from './components/meeting/invites/InviteResponsePopup.svelte'
import { joinOrCreateMeetingByInvite } from './meetings'

export const inviteRequestSecondsToLive = 5
const responseSecondsToLive = 2

const pulsePrefix = 'love/invite'

export interface InviteRequest {
  from: Ref<Person>
  meetingId: string
}

export interface InviteResponse {
  from: Ref<Person>
  meetingId: string
  accept: boolean
}

const requestPopupCategory = 'inviteRequest'
let unsubscribeResponse: UnsubscribeCallback | undefined
let requestPopup: PopupResult | undefined
let requestPersons: Array<Ref<Person>> | undefined

export async function subscribeInviteResponses (): Promise<void> {
  const client = await createPulseClient()
  if (client === undefined) return

  const currentPerson = getCurrentEmployee()

  unsubscribeResponse = await client.subscribe(
    `${getPulsePrefix()}/response/${currentPerson}/`,
    (key: string, inviteResponse: InviteResponse | undefined) => {
      void onInviteResponse(key, inviteResponse)
    }
  )
}

export async function unsubscribeInviteResponses (): Promise<void> {
  if (unsubscribeResponse !== undefined) {
    await unsubscribeResponse()
  }
}

export function sendInvites (persons: Array<Ref<Person>>): void {
  if (getCurrentAccount().role === AccountRole.ReadOnlyGuest) return
  closeInvitesPopup()
  requestPersons = persons
  const myParticipation = get(myInfo)
  const room = myParticipation?.room
  if (room === undefined || room === love.ids.Reception) return
  requestPopup = showPopup(InviteRequestPopup, { persons, meetingId: room }, undefined, undefined, undefined, {
    category: requestPopupCategory,
    overlay: false,
    fixed: true
  })
}

export function closeInvitesPopup (): void {
  requestPopup?.close()
  requestPopup = undefined
}

export async function updateInvites (persons: Array<Ref<Person>>, meetingId: string): Promise<void> {
  if (getCurrentAccount().role === AccountRole.ReadOnlyGuest) return
  const client = await createPulseClient()
  const currentPerson = getCurrentEmployee()

  if (client === undefined) return

  try {
    for (const person of persons) {
      await client.put(
        `${getPulsePrefix()}/request/${person}/${currentPerson}/${meetingId}`,
        { from: currentPerson, meetingId },
        inviteRequestSecondsToLive
      )
    }
  } catch (error) {
    console.warn('failed to put invite info:', error)
  }
}

export async function cancelInvites (meetingId: string): Promise<void> {
  const client = await createPulseClient()
  const currentPerson = getCurrentEmployee()

  if (client === undefined || requestPersons === undefined) return
  try {
    for (const person of requestPersons) {
      await client.delete(`${getPulsePrefix()}/request/${person}/${currentPerson}/${meetingId}`)
    }
  } catch (error) {
    console.warn('failed to delete invite info:', error)
  }
}

async function onInviteResponse (_key: string, response: InviteResponse | undefined): Promise<void> {
  const client = await createPulseClient()
  if (client === undefined || response === undefined || requestPersons === undefined) return

  const currentPerson = getCurrentEmployee()
  await client.delete(`${getPulsePrefix()}/request/${response.from}/${currentPerson}/${response.meetingId}`)
  await client.delete(`${getPulsePrefix()}/response/${currentPerson}/${response.from}/${response.meetingId}`)
  requestPersons = requestPersons.filter((p) => p !== response.from)
  if (requestPersons.length === 0) {
    closeInvitesPopup()
  } else {
    requestPopup?.update({ persons: requestPersons })
  }

  if (!response.accept) return
  await joinOrCreateMeetingByInvite(response.meetingId as Ref<Room>)
}

const responsePopupCategory = 'inviteResponse'
let responsePopup: PopupResult | undefined
let unsubscribeRequest: UnsubscribeCallback | undefined
let activeRequestKey: string | undefined
let activeRequestsMap: Map<string, InviteRequest | undefined>

export async function subscribeInviteRequests (): Promise<void> {
  if (getCurrentAccount().role === AccountRole.ReadOnlyGuest) return
  const client = await createPulseClient()
  if (client === undefined) return

  const currentPerson = getCurrentEmployee()

  activeRequestsMap = new Map<string, InviteRequest>()
  unsubscribeRequest = await client.subscribe(`${getPulsePrefix()}/request/${currentPerson}/`, onInviteRequest)
}

export async function unsubscribeInviteRequests (): Promise<void> {
  if (unsubscribeRequest !== undefined) {
    await unsubscribeRequest()
  }
}

export async function responseToInviteRequest (accept: boolean): Promise<void> {
  if (activeRequestKey === undefined) return

  const client = await createPulseClient()
  if (client === undefined) return

  const activeInvite = activeRequestsMap.get(activeRequestKey)
  if (activeInvite === undefined) return

  const currentPerson = getCurrentEmployee()
  await client.put(
    `${getPulsePrefix()}/response/${activeInvite.from}/${currentPerson}/${activeInvite.meetingId}`,
    { accept, from: currentPerson, meetingId: activeInvite.meetingId },
    responseSecondsToLive
  )

  responsePopup?.close()
  responsePopup = undefined
  if (activeRequestKey === undefined) return
  activeRequestsMap.set(activeRequestKey, undefined)
  activeRequestKey = undefined

  if (!accept) return
  await joinOrCreateMeetingByInvite(activeInvite.meetingId as Ref<Room>)
}

function onInviteRequest (key: string, request: InviteRequest | undefined): void {
  if (request === undefined) {
    activeRequestsMap.delete(key)
    if (activeRequestKey === key) {
      activeRequestKey = undefined
    }
  } else if (!activeRequestsMap.has(key)) {
    activeRequestsMap.set(key, request)
  }
  let keyChanged: boolean = false
  if (activeRequestKey === undefined && activeRequestsMap.size > 0) {
    const requests = Array.from(activeRequestsMap.entries())
    const unprocessedRequest = requests.find((v: [string, InviteRequest | undefined]) => v[1] !== undefined)
    if (unprocessedRequest !== undefined) {
      activeRequestKey = unprocessedRequest[0]
      keyChanged = true
    }
  }
  if (activeRequestKey === undefined) {
    responsePopup?.close()
    responsePopup = undefined
    return
  }

  if (responsePopup === undefined) {
    responsePopup = showPopup(
      InviteResponsePopup,
      { invite: activeRequestsMap.get(activeRequestKey) },
      undefined,
      undefined,
      undefined,
      {
        category: responsePopupCategory,
        overlay: false,
        fixed: true
      }
    )
    return
  }
  if (keyChanged) {
    responsePopup?.update({ invite: activeRequestsMap.get(activeRequestKey) })
  }
}

function getPulsePrefix (): string {
  const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
  return `${workspace}/${pulsePrefix}`
}
