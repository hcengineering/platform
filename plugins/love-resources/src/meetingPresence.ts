import { getCurrentEmployee, type Person } from '@hcengineering/contact'
import { type Ref } from '@hcengineering/core'
import { type UnsubscribeCallback } from '@hcengineering/hulypulse-client'
import { type Room } from '@hcengineering/love'
import { getMetadata } from '@hcengineering/platform'
import presentation, { createPulseClient } from '@hcengineering/presentation'
import { writable } from 'svelte/store'

const pulsePrefix = 'love/meeting'

export interface MeetingPresence {
  person: Ref<Person>
  meetingId: string
}

export interface OngoingMeeting {
  meetingId: string
  persons: Array<Ref<Person>>
}

export const ongoingMeetings = writable<OngoingMeeting[]>([])

export const meetingPresenceTtlSeconds: number = 5
let unsubscribePresenceCallback: UnsubscribeCallback | undefined
let personsByMeeting: Map<string, Set<Ref<Person>>> | undefined
let presenceByKey: Map<string, MeetingPresence> | undefined

export async function subscribeMeetingPresence (): Promise<void> {
  const client = await createPulseClient()
  if (client === undefined) return

  const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
  unsubscribePresenceCallback = await client.subscribe(`${workspace}/${pulsePrefix}/`, handleMeetingPresenceInfo)
  personsByMeeting = new Map<Ref<Room>, Set<Ref<Person>>>()
  presenceByKey = new Map<string, MeetingPresence>()
}

export async function unsubscribeMeetingPresence (): Promise<void> {
  if (unsubscribePresenceCallback !== undefined) {
    await unsubscribePresenceCallback()
    unsubscribePresenceCallback = undefined
  }
  personsByMeeting = undefined
  presenceByKey = undefined
  ongoingMeetings.set([])
}

function handleMeetingPresenceInfo (key: string, value: MeetingPresence | undefined): void {
  if (personsByMeeting === undefined || presenceByKey === undefined) return
  let updateStore = false
  if (value !== undefined) {
    const roomSet = personsByMeeting.get(value.meetingId)
    if (roomSet === undefined) {
      personsByMeeting.set(value.meetingId, new Set<Ref<Person>>([value.person]))
      updateStore = true
    } else if (!roomSet.has(value.person)) {
      roomSet.add(value.person)
      updateStore = true
    }
    presenceByKey.set(key, value)
  } else {
    const presence = presenceByKey.get(key)
    if (presence === undefined) return
    presenceByKey.delete(key)
    const roomSet = personsByMeeting.get(presence.meetingId)
    if (roomSet === undefined) return
    roomSet.delete(presence.person)
    updateStore = true
    if (roomSet.size === 0) {
      personsByMeeting.delete(presence.meetingId)
      updateStore = true
    }
  }
  if (!updateStore) return
  const newMeetings: OngoingMeeting[] = []
  personsByMeeting.forEach((participants: Set<Ref<Person>>, meetingId: string) => {
    const persons = Array.from(participants)
    newMeetings.push({
      meetingId,
      persons
    })
  })
  ongoingMeetings.set(newMeetings)
}

export async function updateMyMeetingPresence (room: Ref<Room>): Promise<void> {
  const client = await createPulseClient()
  const person = getCurrentEmployee()

  if (client !== undefined) {
    const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
    try {
      await client.put(
        `${workspace}/${pulsePrefix}/${room}/${person}`,
        { person, meetingId: room },
        meetingPresenceTtlSeconds
      )
    } catch (error) {
      console.warn('failed to put presence info:', error)
    }
  }
}

export async function deleteMyMeetingPresence (room: Ref<Room>): Promise<void> {
  const client = await createPulseClient()
  const person = getCurrentEmployee()

  if (client !== undefined) {
    const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
    try {
      await client.delete(`${workspace}/${pulsePrefix}/${room}/${person}`)
    } catch (error) {
      console.warn('failed to delete presence info:', error)
    }
  }
}
