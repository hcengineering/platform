import { getCurrentEmployee, type Person } from '@hcengineering/contact'
import { type Ref } from '@hcengineering/core'
import { type UnsubscribeCallback } from '@hcengineering/hulypulse-client'
import { getMetadata } from '@hcengineering/platform'
import presentation, { createPulseClient } from '@hcengineering/presentation'
import { writable } from 'svelte/store'
import { type MeetingType } from './types'

const pulsePrefix = 'love/meeting'

export interface MeetingPresence {
  person: Ref<Person>
  meetingId: string
  meetingType: MeetingType
}

export interface OngoingMeeting {
  meetingId: string
  meetingType: MeetingType
  persons: Array<Ref<Person>>
}

export const ongoingMeetings = writable<OngoingMeeting[]>([])

export const meetingPresenceTtlSeconds: number = 5
let unsubscribePresenceCallback: UnsubscribeCallback | undefined
let meetingsById: Map<string, { type: MeetingType, personsSet: Set<Ref<Person>> }> | undefined
let presenceByKey: Map<string, MeetingPresence> | undefined

export async function subscribeMeetingPresence (): Promise<void> {
  const client = await createPulseClient()
  if (client === undefined) return

  const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
  unsubscribePresenceCallback = await client.subscribe(`${workspace}/${pulsePrefix}/`, handleMeetingPresenceInfo)
  meetingsById = new Map<string, { type: MeetingType, personsSet: Set<Ref<Person>> }>()
  presenceByKey = new Map<string, MeetingPresence>()
}

export async function unsubscribeMeetingPresence (): Promise<void> {
  if (unsubscribePresenceCallback !== undefined) {
    await unsubscribePresenceCallback()
    unsubscribePresenceCallback = undefined
  }
  meetingsById = undefined
  presenceByKey = undefined
  ongoingMeetings.set([])
}

function handleMeetingPresenceInfo (key: string, value: MeetingPresence | undefined): void {
  if (meetingsById === undefined || presenceByKey === undefined) return
  let updateStore = false
  if (value !== undefined) {
    const meetingInfo = meetingsById.get(value.meetingId)
    if (meetingInfo === undefined) {
      meetingsById.set(value.meetingId, { type: value.meetingType, personsSet: new Set<Ref<Person>>([value.person]) })
      updateStore = true
    } else if (!meetingInfo.personsSet.has(value.person)) {
      meetingInfo.personsSet.add(value.person)
      updateStore = true
    }
    presenceByKey.set(key, value)
  } else {
    const presence = presenceByKey.get(key)
    if (presence === undefined) return
    presenceByKey.delete(key)
    const meetingInfo = meetingsById.get(presence.meetingId)
    if (meetingInfo === undefined) return
    meetingInfo.personsSet.delete(presence.person)
    updateStore = true
    if (meetingInfo.personsSet.size === 0) {
      meetingsById.delete(presence.meetingId)
      updateStore = true
    }
  }
  if (!updateStore) return
  const newMeetings: OngoingMeeting[] = []
  meetingsById.forEach((info: { type: MeetingType, personsSet: Set<Ref<Person>> }, meetingId: string) => {
    const persons = Array.from(info.personsSet)
    newMeetings.push({
      meetingId,
      meetingType: info.type,
      persons
    })
  })
  ongoingMeetings.set(newMeetings)
}

export async function updateMyMeetingPresence (meetingId: string, meetingType: MeetingType): Promise<void> {
  const client = await createPulseClient()
  const person = getCurrentEmployee()

  if (client !== undefined) {
    const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
    try {
      await client.put(
        `${workspace}/${pulsePrefix}/${meetingId}/${person}`,
        { person, meetingId, meetingType },
        meetingPresenceTtlSeconds
      )
    } catch (error) {
      console.warn('failed to put presence info:', error)
    }
  }
}

export async function deleteMyMeetingPresence (meetingId: string): Promise<void> {
  const client = await createPulseClient()
  const person = getCurrentEmployee()

  if (client !== undefined) {
    const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
    try {
      await client.delete(`${workspace}/${pulsePrefix}/${meetingId}/${person}`)
    } catch (error) {
      console.warn('failed to delete presence info:', error)
    }
  }
}
