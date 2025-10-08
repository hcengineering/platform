import { getCurrentEmployee, type Person } from '@hcengineering/contact'
import { type Ref } from '@hcengineering/core'
import { type UnsubscribeCallback } from '@hcengineering/hulypulse-client'
import { type Room } from '@hcengineering/love'
import { getMetadata } from '@hcengineering/platform'
import presentation, { createPulseClient } from '@hcengineering/presentation'
import { get, writable } from 'svelte/store'
import { rooms } from './stores'

const pulsePrefix = 'love/meeting'

export interface MeetingPresence {
  person: Ref<Person>
  room: Ref<Room>
}

export interface ActiveRoom {
  room: Room
  persons: Array<Ref<Person>>
  myRoom: boolean
}

export const activeRooms = writable<ActiveRoom[]>([])

export const meetingPresenceTtlSeconds: number = 5
let unsubscribePresenceCallback: UnsubscribeCallback | undefined
let personsByRoom: Map<Ref<Room>, Set<Ref<Person>>> | undefined
let presenceByKey: Map<string, MeetingPresence> | undefined

export async function subscribeMeetingPresence (): Promise<void> {
  const client = await createPulseClient()
  if (client === undefined) return

  const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
  unsubscribePresenceCallback = await client.subscribe(`${workspace}/${pulsePrefix}/`, handleMeetingPresenceInfo)
  personsByRoom = new Map<Ref<Room>, Set<Ref<Person>>>()
  presenceByKey = new Map<string, MeetingPresence>()
}

export async function unsubscribeMeetingPresence (): Promise<void> {
  if (unsubscribePresenceCallback !== undefined) {
    await unsubscribePresenceCallback()
    unsubscribePresenceCallback = undefined
  }
  personsByRoom = undefined
  presenceByKey = undefined
}

function handleMeetingPresenceInfo (key: string, value: MeetingPresence | undefined): void {
  if (personsByRoom === undefined || presenceByKey === undefined) return
  let updateStore = false
  if (value !== undefined) {
    const roomSet = personsByRoom.get(value.room)
    if (roomSet === undefined) {
      personsByRoom.set(value.room, new Set<Ref<Person>>([value.person]))
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
    const roomSet = personsByRoom.get(presence.room)
    if (roomSet === undefined) return
    roomSet.delete(presence.person)
    updateStore = true
    if (roomSet.size === 0) {
      personsByRoom.delete(presence.room)
      updateStore = true
    }
  }
  if (!updateStore) return
  const person = getCurrentEmployee()
  const newActiveRooms: ActiveRoom[] = []
  const roomsStore = get(rooms)
  personsByRoom.forEach((participants: Set<Ref<Person>>, roomId: Ref<Room>) => {
    const room = roomsStore.find((r) => r._id === roomId)
    if (room === undefined) return
    const persons = Array.from(participants)
    newActiveRooms.push({
      room,
      persons,
      myRoom: participants.has(person)
    })
  })
  activeRooms.set(newActiveRooms)
}

export async function updateMyMeetingPresence (room: Ref<Room>): Promise<void> {
  const client = await createPulseClient()
  const person = getCurrentEmployee()

  if (client !== undefined) {
    const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
    try {
      await client.put(`${workspace}/${pulsePrefix}/${room}/${person}`, { person, room }, meetingPresenceTtlSeconds)
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
