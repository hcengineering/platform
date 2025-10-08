import { aiBotSocialIdentityStore } from '@hcengineering/ai-bot-resources'
import { getCurrentEmployee } from '@hcengineering/contact'
import { getPersonRefByPersonId } from '@hcengineering/contact-resources'
import { type Ref } from '@hcengineering/core'
import {
  type DevicesPreference,
  type Floor,
  type MeetingMinutes,
  type Office,
  type ParticipantInfo,
  type Room
} from '@hcengineering/love'
import { createQuery, onClient } from '@hcengineering/presentation'
import { derived, get, writable } from 'svelte/store'

import love from './plugin'

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

export const myPreferences = writable<DevicesPreference | undefined>()
export let $myPreferences: DevicesPreference | undefined

export const selectedRoomPlace = writable<{ _id: Ref<Room>, x: number, y: number } | undefined>(undefined)

async function filterParticipantInfo (value: ParticipantInfo[]): Promise<ParticipantInfo[]> {
  const map = new Map<string, ParticipantInfo>()
  const aiSid = get(aiBotSocialIdentityStore)
  const aiPerson = aiSid !== undefined ? await getPersonRefByPersonId(aiSid._id) : undefined
  for (const val of value) {
    if (aiPerson !== undefined && val.person === aiPerson) {
      map.set(val._id, val)
    } else {
      map.set(val.person, val)
    }
  }
  return Array.from(map.values())
}

const officeLoaded = writable(false)

const query = createQuery(true)
const statusQuery = createQuery(true)
const floorsQuery = createQuery(true)
const preferencesQuery = createQuery(true)

onClient(() => {
  const roomPromise = new Promise<void>((resolve) =>
    query.query(love.class.Room, {}, (res) => {
      rooms.set(res)
      resolve()
    })
  )
  const infoPromise = new Promise<void>((resolve) =>
    statusQuery.query(love.class.ParticipantInfo, {}, async (res) => {
      infos.set(await filterParticipantInfo(res))
      resolve()
    })
  )
  const floorPromise = new Promise<void>((resolve) =>
    floorsQuery.query(love.class.Floor, {}, (res) => {
      floors.set(res)
      resolve()
    })
  )
  const preferencePromise = new Promise<void>((resolve) =>
    preferencesQuery.query(love.class.DevicesPreference, {}, (res) => {
      myPreferences.set(res[0])
      $myPreferences = res[0]
      resolve()
    })
  )

  void Promise.all([roomPromise, infoPromise, floorPromise, preferencePromise]).then(() => {
    officeLoaded.set(true)
  })
})

export async function waitForOfficeLoaded (): Promise<void> {
  if (!get(officeLoaded)) {
    await new Promise((resolve) => {
      const unsubscribe = officeLoaded.subscribe((loaded) => {
        if (loaded) {
          unsubscribe()
          resolve(null)
        }
      })
    })
  }
}

export const lockedRoom = writable<string>('')
