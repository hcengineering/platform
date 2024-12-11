import { getCurrentEmployee } from '@hcengineering/contact'
import { type Ref } from '@hcengineering/core'
import {
  RequestStatus,
  type DevicesPreference,
  type Floor,
  type Invite,
  type JoinRequest,
  type Office,
  type ParticipantInfo,
  type Room,
  type MeetingMinutes
} from '@hcengineering/love'
import { createQuery, getClient } from '@hcengineering/presentation'
import { derived, get, writable } from 'svelte/store'
import { aiBotEmailSocialId } from '@hcengineering/ai-bot'

import love from './plugin'
import { personRefByPersonIdStore } from '@hcengineering/contact-resources'

export const rooms = writable<Room[]>([])
export const myOffice = derived(rooms, (val) => {
  const personId = getCurrentEmployee()
  return val.find((p) => (p as Office).person === personId) as Office | undefined
})
export const infos = writable<ParticipantInfo[]>([])
export const myInfo = derived(infos, (val) => {
  const personId = getCurrentEmployee()
  return val.find((p) => p.person === personId)
})
export const currentRoom = derived([rooms, myInfo], ([rooms, myInfo]) => {
  return myInfo !== undefined ? rooms.find((p) => p._id === myInfo.room) : undefined
})
export const floors = writable<Floor[]>([])
export const selectedFloor = writable<Ref<Floor> | undefined>(undefined)
export const activeFloor = derived([rooms, myInfo, myOffice], ([rooms, myInfo, myOffice]) => {
  let res: Ref<Floor> | undefined
  if (myInfo !== undefined) {
    res = rooms.find((p) => p._id === myInfo.room)?.floor
  }
  if (res === undefined && myOffice !== undefined) {
    res = rooms.find((p) => p._id === myOffice._id)?.floor
  }
  return res ?? love.ids.MainFloor
})
export const myRequests = writable<JoinRequest[]>([])
export const invites = writable<Invite[]>([])
export const myInvites = derived([invites, myInfo], ([val, info]) => {
  const personId = getCurrentEmployee()
  return val.filter((p) => p.target === personId && info?.room !== p.room)
})
export const activeInvites = derived(invites, (val) => {
  const personId = getCurrentEmployee()
  return val.filter((p) => p.from === personId)
})

export const myPreferences = writable<DevicesPreference | undefined>()
export let $myPreferences: DevicesPreference | undefined

export const currentMeetingMinutes = writable<MeetingMinutes | undefined>(undefined)
export const selectedRoomPlace = writable<{ _id: Ref<Room>, x: number, y: number } | undefined>(undefined)

function filterParticipantInfo (value: ParticipantInfo[]): ParticipantInfo[] {
  const map = new Map<string, ParticipantInfo>()
  const aiPerson = get(personRefByPersonIdStore).get(aiBotEmailSocialId)
  for (const val of value) {
    if (aiPerson !== undefined && val.person === aiPerson) {
      map.set(val._id, val)
    } else {
      map.set(val.person, val)
    }
  }
  return Array.from(map.values())
}

export const storePromise = writable<Promise<void>>(new Promise((resolve) => {}))

function fillStores (): void {
  const client = getClient()
  if (client !== undefined) {
    const query = createQuery(true)
    const roomPromise = new Promise<void>((resolve) =>
      query.query(love.class.Room, {}, (res) => {
        rooms.set(res)
        resolve()
      })
    )
    const statusQuery = createQuery(true)
    const infoPromise = new Promise<void>((resolve) =>
      statusQuery.query(love.class.ParticipantInfo, {}, (res) => {
        infos.set(filterParticipantInfo(res))
        resolve()
      })
    )
    const floorsQuery = createQuery(true)
    const floorPromise = new Promise<void>((resolve) =>
      floorsQuery.query(love.class.Floor, {}, (res) => {
        floors.set(res)
        resolve()
      })
    )
    const requestsQuery = createQuery(true)
    const requestPromise = new Promise<void>((resolve) =>
      requestsQuery.query(
        love.class.JoinRequest,
        { person: getCurrentEmployee(), status: RequestStatus.Pending },
        (res) => {
          myRequests.set(res)
          resolve()
        }
      )
    )
    const preferencesQuery = createQuery(true)
    const preferencePromise = new Promise<void>((resolve) =>
      preferencesQuery.query(love.class.DevicesPreference, {}, (res) => {
        myPreferences.set(res[0])
        $myPreferences = res[0]
        resolve()
      })
    )
    const invitesQuery = createQuery(true)
    const invitesPromise = new Promise<void>((resolve) =>
      invitesQuery.query(love.class.Invite, { status: RequestStatus.Pending }, (res) => {
        invites.set(res)
        resolve()
      })
    )
    storePromise.set(
      new Promise((resolve) => {
        void Promise.all([
          roomPromise,
          infoPromise,
          floorPromise,
          requestPromise,
          preferencePromise,
          invitesPromise
        ]).then(() => {
          resolve()
        })
      })
    )
  } else {
    setTimeout(() => {
      fillStores()
    }, 50)
  }
}

fillStores()

export const lockedRoom = writable<string>('')
