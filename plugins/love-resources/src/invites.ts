import { type Ref } from '@hcengineering/core'
import { getCurrentEmployee, type Person } from '@hcengineering/contact'
import { type PopupResult, showPopup } from '@hcengineering/ui'
import { type UnsubscribeCallback } from '@hcengineering/hulypulse-client'
import presentation, { createPulseClient } from '@hcengineering/presentation'
import { getMetadata } from '@hcengineering/platform'
import { get } from 'svelte/store'
import { myInfo } from './stores'
import love, { type Room } from '@hcengineering/love'
import ActiveInvitesPopup from './components/meeting/invites/ActiveInvitesPopup.svelte'
import InvitePopup from './components/meeting/invites/InvitePopup.svelte'
import { joinOrCreateMeetingByInvite } from './meetings'

export const inviteSecondsToLive = 5
export const responseSecondsToLive = 2
const pulsePrefix = 'love/invite'
const myInvitesPopupCategory = 'myInvites'

export interface InviteRequest {
  from: Ref<Person>
  meetingId: string
}

export interface InviteResponse {
  from: Ref<Person>
  meetingId: string
  accept: boolean
}

let invitesPopup: PopupResult | undefined
let inviteResponseUnsubscribeCallback: UnsubscribeCallback | undefined
let invitePersons: Array<Ref<Person>> | undefined

export async function subscribeInviteResponses (): Promise<UnsubscribeCallback> {
  const client = await createPulseClient()
  const currentPerson = getCurrentEmployee()

  if (client !== undefined) {
    inviteResponseUnsubscribeCallback = await client.subscribe(
      `${getPulsePrefix()}/response/${currentPerson}/`,
      (key: string, inviteResponse: InviteResponse | undefined) => {
        void updateInviteResponse(key, inviteResponse)
      }
    )
  }

  return async () => false
}

export async function unsubscribeInviteResponses (): Promise<void> {
  if (inviteResponseUnsubscribeCallback !== undefined) {
    await inviteResponseUnsubscribeCallback()
  }
}

export async function showInvitesPopup (persons: Array<Ref<Person>>): Promise<void> {
  closeInvitesPopup()
  invitePersons = persons
  const myParticipation = get(myInfo)
  const room = myParticipation?.room
  if (room === undefined || room === love.ids.Reception) return
  invitesPopup = showPopup(ActiveInvitesPopup, { persons, meetingId: room }, undefined, undefined, undefined, {
    category: myInvitesPopupCategory,
    overlay: false,
    fixed: true
  })
}

export function closeInvitesPopup (): void {
  invitesPopup?.close()
  invitesPopup = undefined
}

export async function sendInvites (persons: Array<Ref<Person>>, meetingId: string): Promise<void> {
  const client = await createPulseClient()
  const currentPerson = getCurrentEmployee()

  if (client === undefined) return

  try {
    for (const person of persons) {
      await client.put(
        `${getPulsePrefix()}/request/${person}/${currentPerson}/${meetingId}`,
        { from: currentPerson, meetingId },
        inviteSecondsToLive
      )
    }
  } catch (error) {
    console.warn('failed to put invite info:', error)
  }
}

export async function cancelInvites (meetingId: string): Promise<void> {
  const client = await createPulseClient()
  const currentPerson = getCurrentEmployee()

  if (client === undefined || invitePersons === undefined) return
  try {
    for (const person of invitePersons) {
      await client.delete(`${getPulsePrefix()}/request/${person}/${currentPerson}/${meetingId}`)
    }
  } catch (error) {
    console.warn('failed to delete invite info:', error)
  }
}

async function updateInviteResponse (_key: string, inviteResponse: InviteResponse | undefined): Promise<void> {
  const client = await createPulseClient()
  if (client === undefined || inviteResponse === undefined || invitePersons === undefined) return

  const currentPerson = getCurrentEmployee()
  await client.delete(`${getPulsePrefix()}/request/${inviteResponse.from}/${currentPerson}/${inviteResponse.meetingId}`)
  await client.delete(
    `${getPulsePrefix()}/response/${currentPerson}/${inviteResponse.from}/${inviteResponse.meetingId}`
  )
  invitePersons = invitePersons.filter((p) => p !== inviteResponse.from)
  if (invitePersons.length === 0) {
    closeInvitesPopup()
  } else {
    invitesPopup?.update({ persons: invitePersons })
  }

  if (!inviteResponse.accept) return
  await joinOrCreateMeetingByInvite(inviteResponse.meetingId as Ref<Room>)
}

let inviteRequestPopup: PopupResult | undefined
let inviteRequestsUnsubscribeCallback: UnsubscribeCallback | undefined
let activeInviteKey: string | undefined
let inviteRequestsMap: Map<string, InviteRequest | undefined>

export async function subscribeInviteRequests (): Promise<UnsubscribeCallback> {
  const client = await createPulseClient()
  const currentPerson = getCurrentEmployee()

  if (client !== undefined) {
    inviteRequestsMap = new Map<string, InviteRequest>()
    inviteRequestsUnsubscribeCallback = await client.subscribe(
      `${getPulsePrefix()}/request/${currentPerson}/`,
      updateInviteRequest
    )
  }

  return async () => false
}

export async function unsubscribeInviteRequests (): Promise<void> {
  if (inviteRequestsUnsubscribeCallback !== undefined) {
    await inviteRequestsUnsubscribeCallback()
  }
}

export async function responseToInviteRequest (accept: boolean): Promise<void> {
  if (activeInviteKey === undefined) return

  const client = await createPulseClient()
  if (client === undefined) return

  const activeInvite = inviteRequestsMap.get(activeInviteKey)
  if (activeInvite === undefined) return

  const currentPerson = getCurrentEmployee()
  await client.put(
    `${getPulsePrefix()}/response/${activeInvite.from}/${currentPerson}/${activeInvite.meetingId}`,
    { accept, from: currentPerson, meetingId: activeInvite.meetingId },
    responseSecondsToLive
  )

  inviteRequestPopup?.close()
  inviteRequestPopup = undefined
  if (activeInviteKey === undefined) return
  inviteRequestsMap.set(activeInviteKey, undefined)
  activeInviteKey = undefined

  if (!accept) return
  await joinOrCreateMeetingByInvite(activeInvite.meetingId as Ref<Room>)
}

function updateInviteRequest (key: string, invite: InviteRequest | undefined): void {
  if (invite === undefined) {
    inviteRequestsMap.delete(key)
    if (activeInviteKey === key) {
      activeInviteKey = undefined
    }
  } else if (!inviteRequestsMap.has(key)) {
    inviteRequestsMap.set(key, invite)
  }
  let keyChanged: boolean = false
  if (activeInviteKey === undefined && inviteRequestsMap.size > 0) {
    const unprocessedInvite = inviteRequestsMap?.entries().find((v) => v[1] !== undefined)
    if (unprocessedInvite !== undefined) {
      activeInviteKey = unprocessedInvite[0]
      keyChanged = true
    }
  }
  if (activeInviteKey === undefined) {
    inviteRequestPopup?.close()
    inviteRequestPopup = undefined
    return
  }

  if (inviteRequestPopup === undefined) {
    inviteRequestPopup = showPopup(
      InvitePopup,
      { invite: inviteRequestsMap.get(activeInviteKey) },
      undefined,
      undefined,
      undefined,
      {
        category: myInvitesPopupCategory,
        overlay: false,
        fixed: true
      }
    )
    return
  }
  if (keyChanged) {
    inviteRequestPopup?.update({ invite: inviteRequestsMap.get(activeInviteKey) })
  }
}

function getPulsePrefix (): string {
  const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
  return `${workspace}/${pulsePrefix}`
}
