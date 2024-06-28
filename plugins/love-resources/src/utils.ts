import { Analytics } from '@hcengineering/analytics'
import contact, { getName, type Person, type PersonAccount } from '@hcengineering/contact'
import core, { concatLink, getCurrentAccount, type IdMap, type Ref, type Space } from '@hcengineering/core'
import { getEmbeddedLabel, getMetadata, type IntlString } from '@hcengineering/platform'
import presentation, { createQuery, getClient } from '@hcengineering/presentation'
import { getCurrentLocation, navigate, type DropdownTextItem } from '@hcengineering/ui'
import { KrispNoiseFilter, isKrispNoiseFilterSupported } from '@livekit/krisp-noise-filter'
import { BackgroundBlur, type BackgroundOptions, type ProcessorWrapper } from '@livekit/track-processors'
import {
  RequestStatus,
  RoomAccess,
  RoomType,
  isOffice,
  loveId,
  type Invite,
  type JoinRequest,
  type Office,
  type ParticipantInfo,
  type Room
} from '@hcengineering/love'
import {
  ConnectionState,
  Room as LKRoom,
  LocalAudioTrack,
  type LocalTrack,
  LocalVideoTrack,
  RoomEvent,
  Track,
  type AudioCaptureOptions,
  type LocalTrackPublication,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type VideoCaptureOptions
} from 'livekit-client'
import { get, writable } from 'svelte/store'
import { sendMessage } from './broadcast'
import love from './plugin'
import { $myPreferences, currentRoom } from './stores'

export const selectedCamId = 'selectedDevice_cam'
export const selectedMicId = 'selectedDevice_mic'
export const selectedSpeakerId = 'selectedDevice_speaker'

export async function getToken (
  roomName: string,
  roomId: Ref<Room>,
  userId: string,
  participantName: string
): Promise<string> {
  const endpoint = getMetadata(love.metadata.ServiceEnpdoint)
  if (endpoint === undefined) {
    throw new Error('Love service endpoint not found')
  }
  const res = await fetch(concatLink(endpoint, '/getToken'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ roomName: getTokenRoomName(roomName, roomId), _id: userId, participantName })
  })
  return await res.text()
}

function getTokenRoomName (roomName: string, roomId: Ref<Room>): string {
  const loc = getCurrentLocation()
  return `${loc.path[1]}_${roomName}_${roomId}`
}

export const lk: LKRoom = new LKRoom({
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    videoCodec: 'vp9',
    screenShareEncoding: {
      maxBitrate: 7_000_000,
      maxFramerate: 15,
      priority: 'high'
    }
  },
  audioCaptureDefaults: {
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true
  },
  audioOutput: {
    deviceId: localStorage.getItem(selectedSpeakerId) ?? undefined
  },
  videoCaptureDefaults: {
    facingMode: 'user',
    resolution: {
      width: 1280,
      height: 720,
      frameRate: 30
    }
  }
})

export function setCustomCreateScreenTracks (value: () => Promise<Array<LocalTrack<Track.Kind>>>): void {
  lk.localParticipant.createScreenTracks = value
}

async function prepare (): Promise<void> {
  const wsURL = getMetadata(love.metadata.WebSocketURL)
  if (wsURL !== undefined) {
    await lk.prepareConnection(wsURL)
  }
}

void prepare()

export const isConnected = writable<boolean>(false)
export const isCurrentInstanceConnected = writable<boolean>(false)
export let $isCurrentInstanceConnected: boolean = false
isCurrentInstanceConnected.subscribe((value) => {
  $isCurrentInstanceConnected = value
})
export const screenSharing = writable<boolean>(false)
export const isRecording = writable<boolean>(false)
export const isRecordingAvailable = writable<boolean>(false)
export const isMicEnabled = writable<boolean>(false)
export const isCameraEnabled = writable<boolean>(false)
export const isSharingEnabled = writable<boolean>(false)
export const isFullScreen = writable<boolean>(false)

function handleTrackSubscribed (
  track: RemoteTrack,
  publication: RemoteTrackPublication,
  participant: RemoteParticipant
): void {
  if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
    screenSharing.set(true)
  }
}

function handleTrackUnsubscribed (
  track: RemoteTrack,
  publication: RemoteTrackPublication,
  participant: RemoteParticipant
): void {
  if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
    screenSharing.set(false)
  }
}

lk.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
lk.on(RoomEvent.LocalTrackPublished, (pub, part) => {
  if (pub.track?.kind === Track.Kind.Video) {
    if (pub.track.source === Track.Source.ScreenShare) {
      screenSharing.set(true)
      isSharingEnabled.set(true)
      sendMessage({ type: 'share', value: true })
    } else {
      isCameraEnabled.set(true)
      sendMessage({ type: 'cam', value: true })
    }
  } else if (pub.track?.kind === Track.Kind.Audio) {
    isMicEnabled.set(!pub.track?.isMuted)
    sendMessage({ type: 'mic', value: !pub.track?.isMuted })
  }
})
lk.on(RoomEvent.LocalTrackUnpublished, (pub, part) => {
  if (pub.track?.kind === Track.Kind.Video) {
    if (pub.track.source === Track.Source.ScreenShare) {
      screenSharing.set(false)
      isSharingEnabled.set(false)
      sendMessage({ type: 'share', value: false })
    } else {
      isCameraEnabled.set(false)
      sendMessage({ type: 'cam', value: false })
    }
  } else if (pub.track?.kind === Track.Kind.Audio) {
    isMicEnabled.set(false)
    sendMessage({ type: 'mic', value: false })
  }
})
lk.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
lk.on(RoomEvent.TrackMuted, (pub, participant) => {
  if (participant.isLocal) {
    if (pub.track?.kind === Track.Kind.Video) {
      if (pub.track.source === Track.Source.ScreenShare) {
        screenSharing.set(false)
        isSharingEnabled.set(false)
        sendMessage({ type: 'share', value: false })
      } else {
        isCameraEnabled.set(false)
        sendMessage({ type: 'cam', value: false })
      }
    } else if (pub.track?.kind === Track.Kind.Audio) {
      isMicEnabled.set(false)
      sendMessage({ type: 'mic', value: false })
    }
  }
})
lk.on(RoomEvent.TrackUnmuted, (pub, participant) => {
  if (participant.isLocal) {
    if (pub.track?.kind === Track.Kind.Video) {
      if (pub.track.source === Track.Source.ScreenShare) {
        screenSharing.set(true)
        isSharingEnabled.set(true)
        sendMessage({ type: 'share', value: true })
      } else {
        isCameraEnabled.set(true)
        sendMessage({ type: 'cam', value: true })
      }
    } else if (pub.track?.kind === Track.Kind.Audio) {
      isMicEnabled.set(true)
      sendMessage({ type: 'mic', value: true })
    }
  }
})

export const krispProcessor = KrispNoiseFilter()
export let blurProcessor: ProcessorWrapper<BackgroundOptions> | undefined
let localVideo: LocalVideoTrack | undefined

try {
  blurProcessor = BackgroundBlur()
} catch (err) {
  console.log("Can't set blur processor", err)
}

async function setKrispProcessor (pub: LocalTrackPublication): Promise<void> {
  if (pub.track instanceof LocalAudioTrack) {
    if (!isKrispNoiseFilterSupported()) {
      console.warn('enhanced noise filter is currently not supported on this browser')
      return
    }
    try {
      // once instantiated the filter will begin initializing and will download additional resources
      console.log('enabling LiveKit enhanced noise filter')
      await pub.track.setProcessor(krispProcessor)
      await krispProcessor.setEnabled($myPreferences?.noiseCancellation ?? true)
    } catch (err: any) {
      console.error(err)
      Analytics.handleError(err)
    }
  }
}

async function setBlurProcessor (pub: LocalTrackPublication): Promise<void> {
  if (pub.track instanceof LocalVideoTrack) {
    if (blurProcessor !== undefined) {
      localVideo = pub.track
      const radius = $myPreferences?.blurRadius ?? 0.1
      if (radius >= 0.5) {
        try {
          await blurProcessor.updateTransformerOptions({ blurRadius: radius })
          await pub.track.setProcessor(blurProcessor)
        } catch (err: any) {
          console.error(err)
          Analytics.handleError(err)
        }
      }
    }
  }
}

export async function updateBlurRadius (value: number): Promise<void> {
  const client = getClient()
  if ($myPreferences !== undefined) {
    await client.update($myPreferences, { blurRadius: value })
  } else {
    const space = getCurrentAccount()._id as string as Ref<Space>
    await client.createDoc(love.class.DevicesPreference, space, {
      attachedTo: space,
      noiseCancellation: true,
      camEnabled: true,
      micEnabled: true,
      blurRadius: value
    })
  }
  try {
    if (blurProcessor !== undefined && localVideo !== undefined) {
      if (value < 0.5) {
        await localVideo.stopProcessor()
      } else {
        const current = localVideo.getProcessor()
        if (current !== undefined) {
          await blurProcessor.updateTransformerOptions({ blurRadius: value })
        } else {
          await blurProcessor.updateTransformerOptions({ blurRadius: value })
          await localVideo.setProcessor(blurProcessor)
        }
      }
    }
  } catch (err: any) {
    console.error(err)
    Analytics.handleError(err)
  }
}

lk.on(RoomEvent.LocalTrackPublished, (pub) => {
  if (pub.track?.kind === Track.Kind.Video && pub.track.source === Track.Source.ScreenShare) {
    screenSharing.set(true)
    isSharingEnabled.set(true)
    sendMessage({ type: 'share', value: true })
  }

  if (pub.source === Track.Source.Microphone) {
    void setKrispProcessor(pub)
  }

  if (pub.source === Track.Source.Camera) {
    void setBlurProcessor(pub)
  }
})
lk.on(RoomEvent.LocalTrackUnpublished, (pub) => {
  if (pub.track?.kind === Track.Kind.Video) {
    if (pub.track.source === Track.Source.ScreenShare) {
      screenSharing.set(false)
      isSharingEnabled.set(false)
      sendMessage({ type: 'share', value: false })
    } else if (pub.track.source === Track.Source.Camera) {
      if (localVideo !== undefined) {
        localVideo = undefined
      }
    }
  }
})
lk.on(RoomEvent.RecordingStatusChanged, (evt) => {
  isRecording.set(evt)
})
lk.on(RoomEvent.RoomMetadataChanged, (metadata) => {
  try {
    const data = JSON.parse(metadata)
    if (data.recording !== undefined) {
      isRecording.set(data.recording)
    }
  } catch (err: any) {
    Analytics.handleError(err)
  }
})
lk.on(RoomEvent.Connected, () => {
  isConnected.set(true)
  sendMessage({ type: 'connect', value: true })
  isCurrentInstanceConnected.set(true)
  isRecording.set(lk.isRecording)
})
lk.on(RoomEvent.Disconnected, () => {
  isConnected.set(false)
  sendMessage({ type: 'connect', value: true })
  isCurrentInstanceConnected.set(false)
})

export async function connect (name: string, room: Room, _id: string): Promise<void> {
  const wsURL = getMetadata(love.metadata.WebSocketURL)
  if (wsURL === undefined) {
    return
  }
  try {
    const token = await getToken(room.name, room._id, _id, name)
    await lk.connect(wsURL, token)
    sendMessage({ type: 'connect', value: true })
  } catch (err) {
    console.error(err)
  }
}

export async function awaitConnect (): Promise<void> {
  await new Promise<void>((resolve) => {
    if (lk.state === ConnectionState.Connected) {
      resolve()
    }
    lk.once(RoomEvent.Connected, () => {
      resolve()
    })
  })
}

export async function disconnect (): Promise<void> {
  const me = lk.localParticipant
  await Promise.all([me.setScreenShareEnabled(false), me.setCameraEnabled(false), me.setMicrophoneEnabled(false)])
  await lk.disconnect()
  screenSharing.set(false)
  isMicEnabled.set(false)
  isCameraEnabled.set(false)
  isSharingEnabled.set(false)
  sendMessage({ type: 'mic', value: false })
  sendMessage({ type: 'cam', value: false })
  sendMessage({ type: 'share', value: false })
  sendMessage({ type: 'connect', value: false })
}

export async function leaveRoom (ownInfo: ParticipantInfo | undefined, ownOffice: Office | undefined): Promise<void> {
  const me = lk.localParticipant
  await Promise.all([me.setScreenShareEnabled(false), me.setCameraEnabled(false), me.setMicrophoneEnabled(false)])
  if (ownInfo !== undefined) {
    const client = getClient()
    if (ownOffice !== undefined && ownInfo.room !== ownOffice._id) {
      await client.update(ownInfo, { room: ownOffice._id, x: 0, y: 0 })
    } else if (ownOffice === undefined) {
      await client.update(ownInfo, { room: love.ids.Reception, x: 0, y: 0 })
    }
  }
  await disconnect()
}

export async function setCam (value: boolean): Promise<void> {
  if (value && get(currentRoom)?.type !== RoomType.Video) return
  if ($isCurrentInstanceConnected) {
    try {
      const opt: VideoCaptureOptions = {}
      const selectedDevice = localStorage.getItem(selectedCamId)
      if (selectedDevice !== null) {
        const devices = await LKRoom.getLocalDevices('videoinput')
        const available = devices.find((p) => p.deviceId === selectedDevice)
        if (available !== undefined) {
          opt.deviceId = available.deviceId
        }
      }
      await lk.localParticipant.setCameraEnabled(value, opt)
    } catch (err) {
      console.error(err)
    }
  } else {
    sendMessage({ type: 'set_cam', value })
  }
}

export async function setMic (value: boolean): Promise<void> {
  if ($isCurrentInstanceConnected) {
    try {
      const opt: AudioCaptureOptions = {}
      const selectedDevice = localStorage.getItem(selectedMicId)
      if (selectedDevice !== null) {
        const devices = await LKRoom.getLocalDevices('audioinput')
        const available = devices.find((p) => p.deviceId === selectedDevice)
        if (available !== undefined) {
          opt.deviceId = available.deviceId
        }
      }
      await lk.localParticipant.setMicrophoneEnabled(value, opt)
    } catch (err) {
      console.error(err)
    }
  } else {
    sendMessage({ type: 'set_mic', value })
  }
}

export async function setShare (value: boolean): Promise<void> {
  if ($isCurrentInstanceConnected) {
    try {
      await lk.localParticipant.setScreenShareEnabled(value)
    } catch (err) {
      console.error(err)
    }
  } else {
    sendMessage({ type: 'set_share', value })
  }
}

export function getRoomName (room: Room, personByIdStore: IdMap<Person>): string {
  if (isOffice(room) && room.person !== null && room.name === '') {
    const employee = personByIdStore.get(room.person)
    if (employee !== undefined) {
      const client = getClient()
      return getName(client.getHierarchy(), employee)
    }
  }
  return room.name
}

export function getRoomLabel (room: Room, personByIdStore: IdMap<Person>): IntlString {
  const name = getRoomName(room, personByIdStore)
  if (name !== '') return getEmbeddedLabel(name)
  return isOffice(room) ? love.string.Office : love.string.Room
}

async function moveToRoom (
  x: number,
  y: number,
  currentInfo: ParticipantInfo | undefined,
  currentPerson: Person,
  room: Room
): Promise<void> {
  const client = getClient()
  if (currentInfo !== undefined) {
    await client.diffUpdate(currentInfo, {
      x,
      y,
      room: room._id
    })
  } else {
    await client.createDoc(love.class.ParticipantInfo, core.space.Workspace, {
      x,
      y,
      room: room._id,
      person: currentPerson._id,
      name: currentPerson.name
    })
  }
  const loc = getCurrentLocation()
  if (room.type === RoomType.Video && loc.path[2] !== loveId) {
    loc.path[2] = loveId
    loc.path.length = 3
    loc.fragment = undefined
    loc.query = undefined
    navigate(loc)
  }
}

async function connectLK (currentPerson: Person, room: Room): Promise<void> {
  await connect(currentPerson.name, room, currentPerson._id)
  await Promise.all([
    setMic($myPreferences?.micEnabled ?? lk.remoteParticipants.size < 16),
    setCam(room.type === RoomType.Video && ($myPreferences?.camEnabled ?? true))
  ])
}

export async function connectRoom (
  x: number,
  y: number,
  currentInfo: ParticipantInfo | undefined,
  currentPerson: Person,
  room: Room
): Promise<void> {
  await disconnect()
  await moveToRoom(x, y, currentInfo, currentPerson, room)
  await connectLK(currentPerson, room)
}

export const joinRequest: Ref<JoinRequest> | undefined = undefined
const requestsQuery = createQuery(true)

export function getFreePlace (room: Room, info: ParticipantInfo[]): { x: number, y: number } {
  const me = getCurrentAccount()
  let y = 0
  while (true) {
    for (let x = 0; x < room.width; x++) {
      if (info.find((p) => p.x === x && p.y === y) === undefined) {
        if (x === 0 && y === 0 && isOffice(room)) {
          if (room.person === (me as PersonAccount).person) {
            return { x: 0, y: 0 }
          }
        } else {
          return { x, y }
        }
      }
    }
    y++
  }
}

export function calculateFloorSize (_rooms: Room[], preview?: boolean): number {
  let fH: number = 5
  _rooms.forEach((room) => {
    if (room.y + room.height + 2 > fH) fH = room.y + room.height + 2
  })
  return fH
}

function checkPlace (room: Room, info: ParticipantInfo[], x: number, y: number): boolean {
  return !isOffice(room) && info.find((p) => p.x === x && p.y === y) === undefined
}

export async function tryConnect (
  personByIdStore: IdMap<Person>,
  currentInfo: ParticipantInfo | undefined,
  room: Room,
  info: ParticipantInfo[],
  currentRequests: JoinRequest[],
  currentInvites: Invite[],
  place?: { x: number, y: number }
): Promise<void> {
  const me = getCurrentAccount()
  const currentPerson = personByIdStore.get((me as PersonAccount).person)
  if (currentPerson === undefined) return
  const client = getClient()
  if (!client.getHierarchy().hasMixin(currentPerson, contact.mixin.Employee)) return
  if (room._id === currentInfo?.room) return
  if (room.access === RoomAccess.DND) return
  const thisRoomRequest = currentRequests.find((p) => p.room === room._id)
  if (thisRoomRequest !== undefined) return
  for (const req of currentRequests) {
    await client.remove(req)
  }
  if (place !== undefined && !checkPlace(room, info, place.x, place.y)) {
    place = undefined
  }
  if (place === undefined) {
    place = getFreePlace(room, info)
  }
  const x: number = place.x
  const y: number = place.y
  if (isOffice(room)) {
    if (room.person === null) return
    // we should check that office owner in office
    const owner = room.person
    if (owner === currentPerson._id) {
      // it's our office if it's empty let's disconnect
      if (info.length === 0) {
        await leaveRoom(currentInfo, room)
        return
      }
    } else {
      const ownerInfo = info.find((p) => p.person === owner)
      if (ownerInfo?.room !== room._id) {
        return
      }
    }
  }

  for (const invite of currentInvites) {
    await client.update(invite, { status: invite.room === room._id ? RequestStatus.Approved : RequestStatus.Rejected })
  }
  if (room.access === RoomAccess.Knock && (!isOffice(room) || room.person !== currentPerson._id)) {
    const _id = await client.createDoc(love.class.JoinRequest, core.space.Workspace, {
      person: currentPerson._id,
      room: room._id,
      status: RequestStatus.Pending
    })
    requestsQuery.query(love.class.JoinRequest, { person: (me as PersonAccount).person, _id }, (res) => {
      const req = res[0]
      if (req === undefined) return
      if (req.status === RequestStatus.Pending) return
      requestsQuery.unsubscribe()
      if (req.status === RequestStatus.Approved) {
        void connectRoom(x, y, currentInfo, currentPerson, room)
      }
    })
    // we should send request to room owner if it ouffice and all participants if not
  } else {
    await connectRoom(x, y, currentInfo, currentPerson, room)
  }
}

export async function invite (person: Ref<Person>, room: Ref<Room> | undefined): Promise<void> {
  if (room === undefined || room === love.ids.Reception) return
  const client = getClient()
  const me = getCurrentAccount()
  await client.createDoc(love.class.Invite, core.space.Workspace, {
    target: person,
    room,
    status: RequestStatus.Pending,
    from: (me as PersonAccount).person
  })
}

export function getActive (
  devices: DropdownTextItem[],
  activeId: string | undefined,
  prevId?: string | null
): DropdownTextItem {
  if (activeId !== undefined) {
    const res = devices.find((p) => p.id === activeId)
    if (res !== undefined) return res
  }
  if (prevId != null) {
    const res = devices.find((p) => p.id === prevId)
    if (res !== undefined) return res
  }
  return devices[0]
}

export async function toggleMic (): Promise<void> {
  await setMic(!get(isMicEnabled))
}

export async function toggleVideo (): Promise<void> {
  await setCam(!get(isCameraEnabled))
}

export async function record (room: Room): Promise<void> {
  try {
    const endpoint = getMetadata(love.metadata.ServiceEnpdoint)
    if (endpoint === undefined) {
      throw new Error('Love service endpoint not found')
    }
    const token = getMetadata(presentation.metadata.Token)
    if (token === undefined) {
      throw new Error('Token not found')
    }
    const roomName = getTokenRoomName(room.name, room._id)
    if (lk.isRecording) {
      await fetch(concatLink(endpoint, '/stopRecord'), {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roomName, room: room.name })
      })
    } else {
      await fetch(concatLink(endpoint, '/startRecord'), {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roomName, room: room.name })
      })
    }
  } catch (err: any) {
    Analytics.handleError(err)
    console.error(err)
  }
}

async function checkRecordAvailable (): Promise<void> {
  try {
    const endpoint = getMetadata(love.metadata.ServiceEnpdoint)
    if (endpoint === undefined) {
      setTimeout(() => {
        void checkRecordAvailable()
      }, 500)
    } else {
      const res = await fetch(concatLink(endpoint, '/checkRecordAvailable'))
      const result = await res.json()
      isRecordingAvailable.set(result)
    }
  } catch (err: any) {
    Analytics.handleError(err)
    console.error(err)
  }
}

void checkRecordAvailable()
