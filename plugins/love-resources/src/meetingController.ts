import core, { AccountRole, getCurrentAccount, type Ref } from "@hcengineering/core";
import love, { getFreeRoomPlace, MeetingStatus, type Room, RoomType, isOffice, RoomAccess, RequestStatus, type JoinRequest, type Invite } from "@hcengineering/love";
import presentation, { createQuery, getClient } from "@hcengineering/presentation";
import { closeMeetingMinutes, getLiveKitEndpoint, getRoomName, liveKitClient, loveClient, navigateToOfficeDoc } from "./utils";
import { get } from "svelte/store";
import { infos, myInfo, myOffice, rooms } from "./stores";
import { getCurrentEmployee, type Person } from "@hcengineering/contact";
import { getPersonByPersonRef } from '@hcengineering/contact-resources'
import { getMetadata } from "@hcengineering/platform";

const requestsQuery = createQuery(true)

export async function createMeeting(room: Room) {
  if (room.access === RoomAccess.DND) return

  const me = getCurrentEmployee()
  const currentPerson = await getPersonByPersonRef(me)

  if (isOffice(room) && room.person !== currentPerson?._id) {
    sendJoinRequest(room)
    return
  }

  const client = getClient()
  let meeting = await client.findOne(love.class.MeetingMinutes, {
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
      //kick all participants in case of own office
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
  closeMeetingMinutes()

}

export async function joinMeeting (room: Room) {
  if (room.access === RoomAccess.DND) return

  const isGuest = getCurrentAccount().role === AccountRole.Guest
  if (room.access === RoomAccess.Knock || isOffice(room) || isGuest) {
    sendJoinRequest(room)
    return
  }

  connectToMeeting(room)
}

export async function acceptInvite (invite: Invite) {
  const client = getClient()
  await client.update(invite, { status: RequestStatus.Approved })
  const room = getRoomById(invite.room)

  if (room === undefined) return

  connectToMeeting(room)
}

export async function rejectInvite (invite: Invite): Promise<void> {
  const client = getClient()
  await client.update(invite, { status: RequestStatus.Rejected })
}

export async function cancelInvites (invites: Invite[]): Promise<void> {
  const client = getClient()
  for (const invite of invites) {
    if (invite.status === RequestStatus.Pending) {
      await client.remove(invite)
    }
  }
}

export async function sendInvite (person: Ref<Person>, room: Ref<Room> | undefined): Promise<void> {
  if (room === undefined || room === love.ids.Reception) return
  const client = getClient()
  const me = getCurrentEmployee()
  await client.createDoc(love.class.Invite, core.space.Workspace, {
    target: person,
    room,
    status: RequestStatus.Pending,
    from: me
  })
}

export async function acceptJoinRequest (request: JoinRequest) {
  const client = getClient()
  const room = getRoomById(request.room) 

  if (room === undefined) return

  const meeting = await client.findOne(love.class.MeetingMinutes, {
    attachedTo: room._id,
    status: MeetingStatus.Active
  })
  if (meeting !== undefined) {
    await createMeetingDocument(room)
  }

  await client.update(request, { status: RequestStatus.Approved })
  await connectToMeeting(room)
}

export async function rejectJoinRequest (request: JoinRequest): Promise<void> {
  const client = getClient() 
  await client.update(request, { status: RequestStatus.Rejected })
}

export async function cancelJoinRequest (request: JoinRequest): Promise<void> {
  if (request.status === RequestStatus.Pending) {
    const client = getClient()
    await client.remove(request)
  }
}

async function sendJoinRequest (room: Room) {
  if (room.access === RoomAccess.DND) return

  const me = getCurrentEmployee()
  const currentPerson = await getPersonByPersonRef(me)

  if (currentPerson == null) {
    return
  }

  if (isOffice(room) && room.person === currentPerson._id) {
    return
  }

  const client = getClient()
  const _id = await client.createDoc(love.class.JoinRequest, core.space.Workspace, {
    person: currentPerson._id,
    room: room._id,
    status: RequestStatus.Pending
  })
  requestsQuery.query(love.class.JoinRequest, { person: me, _id }, (res) => {
    const req = res[0]
    if (req === undefined) return
    if (req.status === RequestStatus.Pending) return
    requestsQuery.unsubscribe()
    if (req.status === RequestStatus.Approved) {
      connectToMeeting(room)
    }
  })
}

export async function kick (person: Ref<Person>): Promise<void> {
  //TODO: Office kick participant
}

async function connectToMeeting (room: Room): Promise<void> {
  if (getCurrentAccount().role === AccountRole.ReadOnlyGuest) return

  await navigateToOfficeDoc(room)
  await moveToMeetingRoom(room)

  const token = await loveClient.getRoomToken(room)
  try {
    const wsURL = getLiveKitEndpoint()
    await liveKitClient.connect(wsURL, token, room.type === RoomType.Video)
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
  await client.createDoc(
    love.class.MeetingMinutes,
    core.space.Workspace,
    {
      description: null,
      attachedTo: room._id,
      status: MeetingStatus.Active,
      title: await getNewMeetingTitle(room),
      attachedToClass: love.class.Room,
      collection: 'meetings'
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
