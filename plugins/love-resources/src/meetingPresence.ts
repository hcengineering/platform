import { getCurrentEmployee, type Person } from '@hcengineering/contact'
import { type Ref } from '@hcengineering/core'
import { type UnsubscribeCallback } from '@hcengineering/hulypulse-client'
import { getMetadata } from '@hcengineering/platform'
import presentation, { createPulseClient, getClient } from '@hcengineering/presentation'
import { writable } from 'svelte/store'
import { type ActiveMeeting } from './types'
import { type Card } from '@hcengineering/card'
import love, { type MeetingMinutes } from '@hcengineering/love'
import card from '@hcengineering/card'

const pulsePrefix = 'love/meeting'

export interface MeetingWithParticipants {
  meeting: ActiveMeeting
  persons: Array<Ref<Person>>
}

interface MeetingPresence {
  person: Ref<Person>
}

interface CardMeetingPresence extends MeetingPresence {
  type: 'card'
  id: Ref<Card>
}

interface RoomMeetingPresence extends MeetingPresence {
  type: 'room'
  id: Ref<MeetingMinutes>
}

export const ongoingMeetings = writable<MeetingWithParticipants[]>([])

export const meetingPresenceTtlSeconds: number = 5
let unsubscribePresenceCallback: UnsubscribeCallback | undefined
let meetingsById: Map<string, { meeting: ActiveMeeting, personsSet: Set<Ref<Person>> }> | undefined
let presenceByKey: Map<string, RoomMeetingPresence | CardMeetingPresence> | undefined

export async function subscribeMeetingPresence (): Promise<void> {
  const client = await createPulseClient()
  if (client === undefined) return

  const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
  unsubscribePresenceCallback = await client.subscribe(`${workspace}/${pulsePrefix}/`, onMeetingPresenceInfo)
  meetingsById = new Map<string, { meeting: ActiveMeeting, personsSet: Set<Ref<Person>> }>()
  presenceByKey = new Map<string, RoomMeetingPresence | CardMeetingPresence>()
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

function onMeetingPresenceInfo (key: string, value: RoomMeetingPresence | CardMeetingPresence | undefined): void {
  void handleMeetingPresenceInfo(key, value)
}

async function handleMeetingPresenceInfo (
  key: string,
  value: RoomMeetingPresence | CardMeetingPresence | undefined
): Promise<void> {
  if (meetingsById === undefined || presenceByKey === undefined) return
  let updateStore = false
  if (value !== undefined) {
    const meetingInfo = meetingsById.get(value.id)
    if (meetingInfo === undefined) {
      if (value.type === 'room') {
        const meetingMinutes = await getClient().findOne(love.class.MeetingMinutes, { _id: value.id })
        if (meetingMinutes === undefined) return
        meetingsById.set(value.id, {
          meeting: { type: 'room', document: meetingMinutes },
          personsSet: new Set<Ref<Person>>([value.person])
        })
      } else {
        const meetingCard = await getClient().findOne(card.class.Card, { _id: value.id })
        if (meetingCard === undefined) return
        meetingsById.set(value.id, {
          meeting: { type: 'card', document: meetingCard },
          personsSet: new Set<Ref<Person>>([value.person])
        })
      }
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
    const meetingInfo = meetingsById.get(presence.id)
    if (meetingInfo === undefined) return
    meetingInfo.personsSet.delete(presence.person)
    updateStore = true
    if (meetingInfo.personsSet.size === 0) {
      meetingsById.delete(presence.id)
      updateStore = true
    }
  }
  if (!updateStore) return
  const newMeetings: MeetingWithParticipants[] = []
  meetingsById.forEach((info: { meeting: ActiveMeeting, personsSet: Set<Ref<Person>> }, _meetingId: string) => {
    const persons = Array.from(info.personsSet)
    newMeetings.push({
      meeting: info.meeting,
      persons
    })
  })
  ongoingMeetings.set(newMeetings)
}

export async function updateMyMeetingPresence (meeting: ActiveMeeting): Promise<void> {
  const client = await createPulseClient()
  const person = getCurrentEmployee()

  if (client !== undefined) {
    const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
    try {
      await client.put(
        `${workspace}/${pulsePrefix}/${meeting.document._id}/${person}`,
        { person, type: meeting.type, id: meeting.document._id },
        meetingPresenceTtlSeconds
      )
    } catch (error) {
      console.warn('failed to put presence info:', error)
    }
  }
}

export async function deleteMyMeetingPresence (meeting: ActiveMeeting): Promise<void> {
  const client = await createPulseClient()
  const person = getCurrentEmployee()

  if (client !== undefined) {
    const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
    try {
      await client.delete(`${workspace}/${pulsePrefix}/${meeting.document._id}/${person}`)
    } catch (error) {
      console.warn('failed to delete presence info:', error)
    }
  }
}
