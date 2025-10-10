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

import { AccountRole, getCurrentAccount, readOnlyGuestAccountUuid, type Ref } from '@hcengineering/core'
import { getCurrentEmployee, type Person } from '@hcengineering/contact'
import { type PopupResult, showPopup } from '@hcengineering/ui'
import { type UnsubscribeCallback } from '@hcengineering/hulypulse-client'
import presentation, { createPulseClient } from '@hcengineering/presentation'
import { getMetadata } from '@hcengineering/platform'
import { type Room } from '@hcengineering/love'
import { joinOrCreateMeetingByInvite } from './meetings'
import JoinRequestPopup from './components/meeting/invites/JoinRequestPopup.svelte'
import JoinResponsePopup from './components/meeting/invites/JoinResponsePopup.svelte'
import { getPersonByPersonRef } from '@hcengineering/contact-resources'

export const joinRequestSecondsToLive = 5
const responseSecondsToLive = 2

const pulsePrefix = 'love/join'

export interface JoinRequest {
  from: Ref<Person>
  meetingId: string
}

export interface JoinResponse {
  meetingId: string
  accept: boolean
}

const requestPopupCategory = 'joinRequest'
let unsubscribeResponse: UnsubscribeCallback | undefined
let requestPopup: PopupResult | undefined
let requestMeetingId: string | undefined

export async function subscribeJoinResponses (): Promise<void> {
  const client = await createPulseClient()
  const currentPerson = getCurrentEmployee()

  if (client === undefined) return

  unsubscribeResponse = await client.subscribe(
    `${getPulsePrefix()}/response/${currentPerson}/`,
    (key: string, inviteResponse: JoinResponse | undefined) => {
      void onJoinResponse(key, inviteResponse)
    }
  )
}

export async function unsubscribeJoinResponses (): Promise<void> {
  if (unsubscribeResponse !== undefined) {
    await unsubscribeResponse()
  }
}

export function sendJoinRequest (meetingId: string): void {
  if (getCurrentAccount().role === AccountRole.ReadOnlyGuest) return
  closeJoinRequestPopup()
  requestMeetingId = meetingId
  requestPopup = showPopup(JoinRequestPopup, { meetingId }, undefined, undefined, undefined, {
    category: requestPopupCategory,
    overlay: false,
    fixed: true
  })
}

export function closeJoinRequestPopup (): void {
  requestPopup?.close()
  requestPopup = undefined
}

export async function updateJoinRequest (): Promise<void> {
  if (getCurrentAccount().role === AccountRole.ReadOnlyGuest) return
  const client = await createPulseClient()
  const currentPerson = getCurrentEmployee()

  if (client === undefined) return

  try {
    await client.put(
      `${getPulsePrefix()}/request/${requestMeetingId}/${currentPerson}`,
      { from: currentPerson, meetingId: requestMeetingId },
      joinRequestSecondsToLive
    )
  } catch (error) {
    console.warn('failed to put joinRequest:', error)
  }
}

export async function cancelJoinRequest (): Promise<void> {
  const client = await createPulseClient()
  const currentPerson = getCurrentEmployee()

  if (client === undefined) return
  try {
    await client.delete(`${getPulsePrefix()}/request/${requestMeetingId}/${currentPerson}`)
  } catch (error) {
    console.warn('failed to delete invite info:', error)
  }
  requestMeetingId = undefined
}

async function onJoinResponse (_key: string, response: JoinResponse | undefined): Promise<void> {
  const client = await createPulseClient()
  if (
    client === undefined ||
    response === undefined ||
    requestMeetingId === undefined ||
    requestMeetingId !== response.meetingId
  ) {
    return
  }

  const currentPerson = getCurrentEmployee()
  await client.delete(`${getPulsePrefix()}/request/${requestMeetingId}/${currentPerson}`)
  await client.delete(`${getPulsePrefix()}/response/${currentPerson}/${requestMeetingId}`)
  closeJoinRequestPopup()
  if (!response.accept) return
  await joinOrCreateMeetingByInvite(response.meetingId as Ref<Room>)
}

const responsePopupCategory = 'joinResponse'
let responsePopup: PopupResult | undefined
let unsubscribeRequest: UnsubscribeCallback | undefined
let activeRequestKey: string | undefined
let activeRequestsMap: Map<string, JoinRequest | undefined> | undefined

export async function subscribeJoinRequests (meetingId: string | undefined): Promise<void> {
  if (getCurrentAccount().role === AccountRole.ReadOnlyGuest) return
  if (meetingId === undefined) return

  const client = await createPulseClient()
  if (client === undefined) return

  activeRequestsMap = new Map<string, JoinRequest>()
  unsubscribeRequest = await client.subscribe(`${getPulsePrefix()}/request/${meetingId}/`, onJoinRequest)
}

export async function unsubscribeJoinRequests (): Promise<void> {
  activeRequestsMap = undefined
  if (unsubscribeRequest !== undefined) {
    await unsubscribeRequest()
  }
}

export async function responseToJoinRequest (joinRequest: JoinRequest, accept: boolean): Promise<void> {
  if (activeRequestKey === undefined) return

  const client = await createPulseClient()
  if (client === undefined || activeRequestsMap === undefined) return

  const activeRequest = activeRequestsMap.get(activeRequestKey)
  if (activeRequest === undefined) return

  await client.put(
    `${getPulsePrefix()}/response/${joinRequest.from}/${joinRequest.meetingId}`,
    { accept, meetingId: joinRequest.meetingId },
    responseSecondsToLive
  )

  responsePopup?.close()
  responsePopup = undefined
  if (activeRequestKey === undefined) return
  activeRequestsMap.set(activeRequestKey, undefined)
  activeRequestKey = undefined

  if (!accept) return
  await joinOrCreateMeetingByInvite(joinRequest.meetingId as Ref<Room>)
}

function onJoinRequest (key: string, request: JoinRequest | undefined): void {
  if (activeRequestsMap === undefined) return
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
    const unprocessedRequest = requests.find((v: [string, JoinRequest | undefined]) => v[1] !== undefined)
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
      JoinResponsePopup,
      { request: activeRequestsMap.get(activeRequestKey) },
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
