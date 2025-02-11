import aiBot from '@hcengineering/ai-bot'
import { connectMeeting, disconnectMeeting } from '@hcengineering/ai-bot-resources'
import { Analytics } from '@hcengineering/analytics'
import calendar, { type Event, getAllEvents } from '@hcengineering/calendar'
import chunter from '@hcengineering/chunter'
import contact, { getCurrentEmployee, getName, type Person } from '@hcengineering/contact'
import { personByIdStore } from '@hcengineering/contact-resources'
import core, {
  AccountRole,
  concatLink,
  type Data,
  type Doc,
  generateId,
  getCurrentAccount,
  type Hierarchy,
  type IdMap,
  type Ref,
  type Space,
  type TxOperations
} from '@hcengineering/core'
import login from '@hcengineering/login'
import {
  getFreeRoomPlace,
  type Invite,
  isOffice,
  type JoinRequest,
  LoveEvents,
  loveId,
  type Meeting,
  type MeetingMinutes,
  MeetingStatus,
  type Office,
  type ParticipantInfo,
  RequestStatus,
  type Room,
  RoomAccess,
  type RoomMetadata,
  RoomType,
  TranscriptionStatus
} from '@hcengineering/love'
import { getEmbeddedLabel, getMetadata, getResource, type IntlString } from '@hcengineering/platform'
import presentation, {
  copyTextToClipboard,
  createQuery,
  type DocCreatePhase,
  getClient
} from '@hcengineering/presentation'
import {
  closePanel,
  type DropdownTextItem,
  getCurrentLocation,
  navigate,
  panelstore,
  showPopup
} from '@hcengineering/ui'
import view from '@hcengineering/view'
import { getObjectLinkFragment } from '@hcengineering/view-resources'
import { type Widget, type WidgetTab } from '@hcengineering/workbench'
import {
  currentWorkspaceStore,
  openWidget,
  openWidgetTab,
  sidebarStore,
  updateWidgetState
} from '@hcengineering/workbench-resources'
import { isKrispNoiseFilterSupported, KrispNoiseFilter } from '@livekit/krisp-noise-filter'
import { BackgroundBlur, type BackgroundOptions, type ProcessorWrapper } from '@livekit/track-processors'
import {
  type AudioCaptureOptions,
  ConnectionState,
  Room as LKRoom,
  LocalAudioTrack,
  type LocalTrack,
  type LocalTrackPublication,
  LocalVideoTrack,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  RoomEvent,
  type ScreenShareCaptureOptions,
  Track,
  type VideoCaptureOptions
} from 'livekit-client'
import { get, writable } from 'svelte/store'

import { sendMessage } from './broadcast'
import RoomSettingsPopup from './components/RoomSettingsPopup.svelte'
import love from './plugin'
import { $myPreferences, currentMeetingMinutes, currentRoom, myOffice, selectedRoomPlace } from './stores'

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
  const currentWorkspace = get(currentWorkspaceStore)

  return `${currentWorkspace?.url ?? loc.path[1]}_${roomName}_${roomId}`
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
export const isTranscription = writable<boolean>(false)
export const isRecordingAvailable = writable<boolean>(false)
export const isMicEnabled = writable<boolean>(false)
export const isCameraEnabled = writable<boolean>(false)
export const isSharingEnabled = writable<boolean>(false)
export const isFullScreen = writable<boolean>(false)
export const isShareWithSound = writable<boolean>(false)
export const isMicAllowed = writable<boolean>(false)
export const isCamAllowed = writable<boolean>(false)

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
      if (err?.message !== 'SDK_ALREADY_INITIALIZED') {
        console.error(err)
        Analytics.handleError(err)
      }
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
    const space = getCurrentEmployee() as string as Ref<Space>
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
  const data = parseMetadata(metadata)
  if (data.recording !== undefined) {
    isRecording.set(data.recording)
  }
  if (data.transcription !== undefined) {
    isTranscription.set(data.transcription === TranscriptionStatus.InProgress)
  }
})

lk.on(RoomEvent.Connected, () => {
  isConnected.set(true)
  sendMessage({ type: 'connect', value: true })
  isCurrentInstanceConnected.set(true)
  isRecording.set(lk.isRecording)
  void initRoom()
  Analytics.handleEvent(LoveEvents.ConnectedToRoom)
})
lk.on(RoomEvent.Disconnected, () => {
  isConnected.set(false)
  sendMessage({ type: 'connect', value: true })
  isCurrentInstanceConnected.set(false)
  Analytics.handleEvent(LoveEvents.DisconnectedFromRoom)
})

async function initRoom (): Promise<void> {
  const room = get(currentRoom)
  if (room !== undefined) {
    await initMeetingMinutes(room)
  }
  await initRoomMetadata(lk.metadata)
}

async function initRoomMetadata (metadata: string | undefined): Promise<void> {
  const room = get(currentRoom)
  const data: RoomMetadata = parseMetadata(metadata)

  isTranscription.set(data.transcription === TranscriptionStatus.InProgress)

  if (
    (data.transcription == null || data.transcription === TranscriptionStatus.Idle) &&
    room?.startWithTranscription === true
  ) {
    await startTranscription(room)
  }

  if (get(isRecordingAvailable) && data.recording == null && room?.startWithRecording === true && !get(isRecording)) {
    await record(room)
  }
}

function parseMetadata (metadata: string | undefined): RoomMetadata {
  try {
    return metadata == null || metadata === '' ? {} : JSON.parse(metadata)
  } catch (err: any) {
    Analytics.handleError(err)
    return {}
  }
}

async function withRetries (fn: () => Promise<void>, retries: number, delay: number): Promise<void> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await fn()
      return
    } catch (error) {
      if (attempt >= retries) {
        throw error
      }
      console.error(error)
      console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

async function connect (name: string, room: Room, _id: string): Promise<void> {
  const wsURL = getMetadata(love.metadata.WebSocketURL)
  if (wsURL === undefined) {
    return
  }

  const token = await getToken(room.name, room._id, _id, name)
  await lk.connect(wsURL, token)
  sendMessage({ type: 'connect', value: true })
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
  closeMeetingMinutes()
}

function closeMeetingMinutes (): void {
  const loc = getCurrentLocation()

  if (loc.path[2] === loveId) {
    const meetingMinutes = get(currentMeetingMinutes)
    const panel = get(panelstore).panel
    const { _id } = panel ?? {}

    if (_id !== undefined && meetingMinutes !== undefined && _id === meetingMinutes._id) {
      closePanel()
    }
  }
  currentMeetingMinutes.set(undefined)
}

function isRoomOpened (room: Room): boolean {
  const loc = getCurrentLocation()

  if (loc.path[2] === loveId) {
    const panel = get(panelstore).panel
    const { _id } = panel ?? {}

    if (_id !== undefined && room._id !== undefined && _id === room._id) {
      return true
    }
  }
  return false
}

export async function setCam (value: boolean): Promise<void> {
  if (value && get(currentRoom)?.type !== RoomType.Video) return
  if ($isCurrentInstanceConnected) {
    try {
      const opt: VideoCaptureOptions = {}
      const selectedDevice = localStorage.getItem(selectedCamId)
      const devices = await LKRoom.getLocalDevices('videoinput')
      isCamAllowed.set(devices.length > 0)
      if (selectedDevice !== null) {
        const available = devices.find((p) => p.deviceId === selectedDevice)
        if (available !== undefined) {
          opt.deviceId = available.deviceId
        }
      }
      await lk.localParticipant.setCameraEnabled(value, opt)
    } catch (err) {
      console.error(err)
      isCamAllowed.set(false)
    }
  } else {
    sendMessage({ type: 'set_cam', value })
  }
}

export async function setMic (value: boolean): Promise<void> {
  if ($isCurrentInstanceConnected) {
    try {
      const speaker = localStorage.getItem(selectedSpeakerId)
      if (speaker !== null) {
        const devices = await LKRoom.getLocalDevices('audiooutput')
        const available = devices.find((p) => p.deviceId === speaker)
        if (available !== undefined) {
          await lk.switchActiveDevice('audiooutput', speaker)
        }
      }
    } catch (err) {
      console.error(err)
    }
    try {
      const opt: AudioCaptureOptions = {}
      const selectedDevice = localStorage.getItem(selectedMicId)
      const devices = await LKRoom.getLocalDevices('audioinput')
      isMicAllowed.set(devices.length > 0)
      if (selectedDevice !== null) {
        const available = devices.find((p) => p.deviceId === selectedDevice)
        if (available !== undefined) {
          opt.deviceId = available.deviceId
        }
      }
      await lk.localParticipant.setMicrophoneEnabled(value, opt)
    } catch (err) {
      console.error(err)
      isMicAllowed.set(false)
    }
  } else {
    sendMessage({ type: 'set_mic', value })
  }
}

export async function setShare (value: boolean, withAudio: boolean = false): Promise<void> {
  if ($isCurrentInstanceConnected) {
    try {
      const options: ScreenShareCaptureOptions = {}
      if (withAudio) {
        options.audio = true
      }
      await lk.localParticipant.setScreenShareEnabled(value, options)
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
  room: Room,
  sessionId: string | null
): Promise<void> {
  const client = getClient()
  if (currentInfo !== undefined) {
    await client.diffUpdate(currentInfo, {
      x,
      y,
      room: room._id,
      sessionId
    })
  } else {
    await client.createDoc(love.class.ParticipantInfo, core.space.Workspace, {
      x,
      y,
      room: room._id,
      person: currentPerson._id,
      name: currentPerson.name,
      sessionId
    })
  }

  if (!isRoomOpened(room)) {
    await navigateToOfficeDoc(client.getHierarchy(), room)
  }
}

async function connectLK (currentPerson: Person, room: Room): Promise<void> {
  await connect(currentPerson.name, room, currentPerson._id)
  await Promise.all([
    setMic($myPreferences?.micEnabled ?? lk.remoteParticipants.size < 16),
    setCam(room.type === RoomType.Video && ($myPreferences?.camEnabled ?? true))
  ])
}

async function navigateToOfficeDoc (hierarchy: Hierarchy, object: Doc): Promise<void> {
  const panelComponent = hierarchy.classHierarchyMixin(object._class, view.mixin.ObjectPanel)
  const comp = panelComponent?.component ?? view.component.EditDoc
  const loc = await getObjectLinkFragment(hierarchy, object, {}, comp)
  loc.path[2] = loveId
  loc.path.length = 3
  loc.query = undefined
  navigate(loc)
}

async function initMeetingMinutes (room: Room): Promise<void> {
  const client = getClient()
  const doc = await client.findOne(love.class.MeetingMinutes, {
    attachedTo: room._id,
    status: MeetingStatus.Active
  })

  if (doc === undefined) {
    const date = new Date()
      .toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      .replace(',', ' at')
    const _id = generateId<MeetingMinutes>()
    const newDoc: MeetingMinutes = {
      _id,
      _class: love.class.MeetingMinutes,
      attachedTo: room._id,
      attachedToClass: room._class,
      collection: 'meetings',
      space: core.space.Workspace,
      title: `${getRoomName(room, get(personByIdStore))} ${date}`,
      description: null,
      status: MeetingStatus.Active,
      modifiedBy: getCurrentAccount().primarySocialId,
      modifiedOn: Date.now()
    }
    await client.addCollection(
      love.class.MeetingMinutes,
      core.space.Workspace,
      room._id,
      room._class,
      'meetings',
      { title: newDoc.title, description: newDoc.description, status: newDoc.status },
      _id
    )
    currentMeetingMinutes.set(newDoc)
    const loc = getCurrentLocation()
    if (loc.path[2] === loveId || room.type === RoomType.Video) {
      await navigateToOfficeDoc(client.getHierarchy(), newDoc)
    }
  } else {
    currentMeetingMinutes.set(doc)
    const loc = getCurrentLocation()
    if (loc.path[2] === loveId || room.type === RoomType.Video) {
      await navigateToOfficeDoc(client.getHierarchy(), doc)
    }
  }
}

export async function connectRoom (
  x: number,
  y: number,
  currentInfo: ParticipantInfo | undefined,
  currentPerson: Person,
  room: Room
): Promise<void> {
  await disconnect()
  await moveToRoom(x, y, currentInfo, currentPerson, room, getMetadata(presentation.metadata.SessionId) ?? null)
  selectedRoomPlace.set(undefined)
  try {
    await withRetries(
      async () => {
        await connectLK(currentPerson, room)
      },
      3,
      1000
    )
  } catch (err) {
    console.error(err)
    await leaveRoom(currentInfo, get(myOffice))
  }
}

export const joinRequest: Ref<JoinRequest> | undefined = undefined
const requestsQuery = createQuery(true)

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

export async function connectToMeeting (
  personByIdStore: IdMap<Person>,
  currentInfo: ParticipantInfo | undefined,
  info: ParticipantInfo[],
  currentRequests: JoinRequest[],
  currentInvites: Invite[],
  meetId: string
): Promise<void> {
  const client = getClient()
  const meeting = await client.findOne(love.mixin.Meeting, { _id: meetId as Ref<Meeting> })
  if (meeting === undefined) return
  const room = await client.findOne(love.class.Room, { _id: meeting.room })
  if (room === undefined) return

  // check time (it should be 10 minutes before the meeting or active in roomInfo)
  const now = new Date()
  const res = getAllEvents([meeting], now.setMinutes(now.getMinutes() - 10), new Date().getTime())
  if (res.length === 0) {
    console.log('Meeting is not active')
    return
  }

  await tryConnect(
    personByIdStore,
    currentInfo,
    room,
    info.filter((p) => p.room === room._id),
    currentRequests,
    currentInvites
  )
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
  const me = getCurrentEmployee()
  const currentPerson = personByIdStore.get(me)
  if (currentPerson === undefined) return
  const client = getClient()

  // guests can't join without invite
  if (!client.getHierarchy().hasMixin(currentPerson, contact.mixin.Employee)) return

  if (room._id === currentInfo?.room) return
  if (room.access === RoomAccess.DND) return
  for (const req of currentRequests) {
    await client.remove(req)
  }
  if (place !== undefined && !checkPlace(room, info, place.x, place.y)) {
    place = undefined
  }
  if (place === undefined) {
    place = getFreeRoomPlace(room, info, me)
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
    requestsQuery.query(love.class.JoinRequest, { person: me, _id }, (res) => {
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

export async function endMeeting (
  room: Office,
  rooms: Room[],
  infos: ParticipantInfo[],
  currentInfo: ParticipantInfo
): Promise<void> {
  const roomInfos = infos.filter((p) => p.room === room._id && room.person !== p.person)
  for (const roomInfo of roomInfos) {
    await kick(roomInfo.person, rooms, infos)
  }
  await leaveRoom(currentInfo, room)
}

export async function kick (person: Ref<Person>, rooms: Room[], infos: ParticipantInfo[]): Promise<void> {
  const personInfo = infos.find((p) => p.person === person)
  if (personInfo === undefined) return
  const personOffice = rooms.find((r) => isOffice(r) && r.person === personInfo.person)
  const client = getClient()
  await client.update(personInfo, { room: personOffice?._id ?? love.ids.Reception, x: 0, y: 0 })
}

export async function invite (person: Ref<Person>, room: Ref<Room> | undefined): Promise<void> {
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
    const endpoint = getLoveEndpoint()
    const token = getPlatformToken()
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
        body: JSON.stringify({ roomName, room: room.name, meetingMinutes: get(currentMeetingMinutes)?._id })
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

export async function createMeeting (
  client: TxOperations,
  _id: Ref<Event>,
  space: Space,
  data: Data<Event>,
  store: Record<string, any>,
  phase: DocCreatePhase
): Promise<void> {
  if (phase === 'post' && store.room != null && store.isMeeting === true) {
    await client.createMixin<Event, Meeting>(_id, calendar.class.Event, space._id, love.mixin.Meeting, {
      room: store.room as Ref<Room>
    })
    const event = await client.findOne(calendar.class.Event, { _id })
    if (event === undefined) return
    const navigateUrl = getCurrentLocation()
    navigateUrl.path[2] = loveId
    navigateUrl.query = {
      meetId: _id
    }
    const func = await getResource(login.function.GetInviteLink)
    const link = await func(-1, '', -1, AccountRole.Guest, encodeURIComponent(JSON.stringify(navigateUrl)))
    await client.update(event, { location: link })
  }
}

export function getLoveEndpoint (): string {
  const endpoint = getMetadata(love.metadata.ServiceEnpdoint)
  if (endpoint === undefined) {
    throw new Error('Love service endpoint not found')
  }

  return endpoint
}

export function getPlatformToken (): string {
  const token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    throw new Error('Token not found')
  }

  return token
}

export async function startTranscription (room: Room): Promise<void> {
  const current = get(currentRoom)
  if (current === undefined || room._id !== current._id) return

  await connectMeeting(room._id, room.language, { transcription: true })
}

export async function stopTranscription (room: Room): Promise<void> {
  const current = get(currentRoom)
  if (current === undefined || room._id !== current._id) return

  await disconnectMeeting(room._id)
}

export async function updateSessionLanguage (room: Room): Promise<void> {
  const current = get(currentRoom)
  if (current === undefined || room._id !== current._id || !get(isTranscription)) return

  try {
    const endpoint = getLoveEndpoint()
    const token = getPlatformToken()
    const roomName = getTokenRoomName(room.name, room._id)

    await fetch(concatLink(endpoint, '/language'), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roomName, room: room.name, language: room.language })
    })
  } catch (err: any) {
    Analytics.handleError(err)
    console.error(err)
  }
}

export async function showRoomSettings (room?: Room): Promise<void> {
  if (room === undefined) return

  showPopup(RoomSettingsPopup, { room }, 'top')
}

export async function copyGuestLink (room?: Room): Promise<void> {
  if (room === undefined) return

  await copyTextToClipboard(getRoomGuestLink(room))
}

async function getRoomGuestLink (room: Room): Promise<string> {
  const client = getClient()
  const roomInfo = await client.findOne(love.class.RoomInfo, { room: room._id })
  if (roomInfo !== undefined) {
    const navigateUrl = getCurrentLocation()
    navigateUrl.query = {
      sessionId: roomInfo._id
    }

    const func = await getResource(login.function.GetInviteLink)
    return await func(24, '', -1, AccountRole.Guest, encodeURIComponent(JSON.stringify(navigateUrl)))
  }
  return ''
}

export function isTranscriptionAllowed (): boolean {
  const url = getMetadata(aiBot.metadata.EndpointURL) ?? ''
  return url !== ''
}

export function createMeetingWidget (widget: Widget, room: Ref<Room>, video: boolean): void {
  const tabs: WidgetTab[] = [
    ...(video
      ? [
          {
            id: 'video',
            label: love.string.Video,
            icon: love.icon.Cam,
            readonly: true
          }
        ]
      : []),
    {
      id: 'chat',
      label: chunter.string.Chat,
      icon: view.icon.Bubble,
      readonly: true
    },
    {
      id: 'transcription',
      label: love.string.Transcription,
      icon: view.icon.Feather,
      readonly: true
    }
  ]
  openWidget(
    widget,
    {
      room
    },
    { active: true, openedByUser: false },
    tabs
  )
}

export function createMeetingVideoWidgetTab (widget: Widget): void {
  const state = get(sidebarStore)
  const { widgetsState } = state
  const widgetState = widgetsState.get(widget._id)

  if (widgetState === undefined) return

  const tab: WidgetTab = {
    id: 'video',
    label: love.string.Video,
    icon: love.icon.Cam,
    readonly: true
  }
  updateWidgetState(widget._id, {
    tabs: [tab, ...widgetState.tabs],
    tab: 'video'
  })
  openWidgetTab(love.ids.MeetingWidget, 'video')
}

export async function getMeetingMinutesTitle (
  client: TxOperations,
  ref: Ref<MeetingMinutes>,
  doc?: MeetingMinutes
): Promise<string> {
  const meeting = doc ?? (await client.findOne(love.class.MeetingMinutes, { _id: ref }))

  return meeting?.title ?? ''
}
