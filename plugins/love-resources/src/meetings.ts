import core, { AccountRole, getCurrentAccount, type Ref } from '@hcengineering/core'
import love, { getFreeRoomPlace, MeetingStatus, type Room, RoomType, isOffice, RoomAccess } from '@hcengineering/love'
import presentation, { getClient } from '@hcengineering/presentation'
import {
  closeMeetingMinutes,
  getLiveKitEndpoint,
  getRoomName,
  liveKitClient,
  loveClient,
  navigateToMeetingMinutes,
  navigateToOfficeDoc
} from './utils'
import { get } from 'svelte/store'
import { infos, myInfo, myOffice, rooms } from './stores'
import { getCurrentEmployee, type Person } from '@hcengineering/contact'
import { getPersonByPersonRef } from '@hcengineering/contact-resources'
import { getMetadata } from '@hcengineering/platform'
import { sendJoinRequest, unsubscribeJoinRequests } from './joinRequests'

export let currentMeetingRoom: Ref<Room> | undefined

export async function createMeeting (room: Room): Promise<void> {
  if (room.access === RoomAccess.DND) return

  const me = getCurrentEmployee()
  const currentPerson = await getPersonByPersonRef(me)

  if (isOffice(room) && room.person !== currentPerson?._id) {
    sendJoinRequest(room._id)
    return
  }

  const client = getClient()
  const meeting = await client.findOne(love.class.MeetingMinutes, {
    attachedTo: room._id,
    status: MeetingStatus.Active
  })

  if (meeting !== undefined) {
    await joinMeeting(room)
    return
  }

  await createMeetingDocument(room)
  await connectToMeeting(room)
}

export async function leaveMeeting (): Promise<void> {
  const client = getClient()
  const currentParticipationInfo = get(myInfo)
  const office = get(myOffice)
  if (currentParticipationInfo === undefined) return

  if (office === undefined) {
    await client.update(currentParticipationInfo, { room: love.ids.Reception, x: 0, y: 0 })
  } else {
    if (currentParticipationInfo.room !== office._id) {
      await client.update(currentParticipationInfo, { room: office._id, x: 0, y: 0 })
    } else {
      // kick all participants in case of own office
      const allRooms = get(rooms)
      const participantsInfo = get(infos)
      const otherParticipants = participantsInfo.filter((p) => p.room === office._id && p !== currentParticipationInfo)
      for (const participantInfo of otherParticipants) {
        const participantOffice = allRooms.find((r) => isOffice(r) && r.person === participantInfo.person)
        await client.update(participantInfo, { room: participantOffice?._id ?? love.ids.Reception, x: 0, y: 0 })
      }
    }
  }
  await liveKitClient.disconnect()
  await unsubscribeJoinRequests()
  closeMeetingMinutes()
  currentMeetingRoom = undefined
}

export async function joinMeeting (room: Room): Promise<void> {
  if (room.access === RoomAccess.DND) return

  const isGuest = getCurrentAccount().role === AccountRole.Guest
  if (room.access === RoomAccess.Knock || isOffice(room) || isGuest) {
    sendJoinRequest(room._id)
    return
  }

  await connectToMeeting(room)
}

export async function joinOrCreateMeetingByInvite (roomId: Ref<Room>): Promise<void> {
  if (currentMeetingRoom === roomId) return

  const client = getClient()
  const room = getRoomById(roomId)

  if (room === undefined) return

  const meeting = await client.findOne(love.class.MeetingMinutes, {
    attachedTo: room._id,
    status: MeetingStatus.Active
  })
  if (meeting === undefined) {
    await createMeetingDocument(room)
  }

  await connectToMeeting(room)
}

export async function kick (person: Ref<Person>): Promise<void> {
  const client = getClient()
  const allRooms = get(rooms)
  const participantsInfo = get(infos)
  const participantInfo = participantsInfo.find((p) => p.person === person)
  if (participantInfo === undefined) return
  const participantOffice = allRooms.find((r) => isOffice(r) && r.person === person)
  await client.update(participantInfo, { room: participantOffice?._id ?? love.ids.Reception, x: 0, y: 0 })
}

async function connectToMeeting (room: Room): Promise<void> {
  if (getCurrentAccount().role === AccountRole.ReadOnlyGuest) return
  if (currentMeetingRoom === room._id) return

  if (currentMeetingRoom !== undefined) {
    await leaveMeeting()
  }

  currentMeetingRoom = room._id

  await navigateToOfficeDoc(room)
  await moveToMeetingRoom(room)

  try {
    const token = await loveClient.getRoomToken(room)
    const wsURL = getLiveKitEndpoint()
    await liveKitClient.connect(wsURL, token, room.type === RoomType.Video)
    await navigateToMeetingMinutes(room)
  } catch (err) {
    console.error(err)
    await leaveMeeting()
  }
}

async function moveToMeetingRoom (room: Room): Promise<void> {
  const me = getCurrentEmployee()
  const currentPerson = await getPersonByPersonRef(me)
  const client = getClient()
  const myParticipation = get(myInfo)
  if (myParticipation?.room === room._id) return
  if (room === undefined || currentPerson == null) return
  const roomParticipants = get(infos).filter((p) => p.room === room._id)
  const place = getFreeRoomPlace(room, roomParticipants, me)
  const sessionId = getMetadata(presentation.metadata.SessionId) ?? null

  const currentInfo = get(myInfo)
  if (currentInfo !== undefined) {
    await client.diffUpdate(currentInfo, {
      x: place.x,
      y: place.y,
      room: room._id,
      sessionId
    })
  } else {
    await client.createDoc(love.class.ParticipantInfo, core.space.Workspace, {
      x: place.x,
      y: place.y,
      room: room._id,
      person: currentPerson._id,
      name: currentPerson.name,
      account: getCurrentAccount().uuid,
      sessionId
    })
  }
}

async function createMeetingDocument (room: Room): Promise<void> {
  const client = getClient()
  await client.addCollection(love.class.MeetingMinutes, core.space.Workspace, room._id, love.class.Room, 'meetings', {
    description: null,
    status: MeetingStatus.Active,
    title: await getNewMeetingTitle(room)
  })
}

async function getNewMeetingTitle (room: Room): Promise<string> {
  const date = new Date()
    .toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    .replace(',', ' at')
  return `${await getRoomName(room)} ${date}`
}

function getRoomById (roomId: Ref<Room>): Room | undefined {
  const allRooms = get(rooms)
  return allRooms.find((p) => p._id === roomId)
}
