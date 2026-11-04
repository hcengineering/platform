import aiBot from '@hcengineering/ai-bot'
import { connectMeeting, disconnectMeeting } from '@hcengineering/ai-bot-resources'
import { Analytics } from '@hcengineering/analytics'
import calendar, { type Event, type Schedule } from '@hcengineering/calendar'
import chunter from '@hcengineering/chunter'
import contact, { getName } from '@hcengineering/contact'
import workbench from '@hcengineering/workbench'
import core, {
  type Client,
  concatLink,
  type Data,
  type Doc,
  type DocumentQuery,
  getCurrentAccount,
  type Ref,
  type RelatedDocument,
  type Space,
  type TxOperations,
  type WithLookup,
  reduceCalls
} from '@hcengineering/core'
import {
  isOffice,
  LoveEvents,
  loveId,
  MeetingStatus,
  RecordingState,
  RoomAccess,
  TranscriptionState,
  type MeetingEventLink,
  type MeetingMinutes,
  type MeetingSchedule,
  type Room,
  type RoomMetadata,
  type UserMeetingInvite
} from '@hcengineering/love'
import { getEmbeddedLabel, getMetadata, translate, type IntlString } from '@hcengineering/platform'
import presentation, {
  copyTextToClipboard,
  type DocCreatePhase,
  getClient,
  type ObjectSearchResult
} from '@hcengineering/presentation'
import { closePanel, getCurrentLocation, navigate, panelstore, showPopup } from '@hcengineering/ui'
import { getCurrentLanguage } from '@hcengineering/theme'
import view from '@hcengineering/view'
import { getObjectLinkFragment } from '@hcengineering/view-resources'
import { type Widget, type WidgetTab } from '@hcengineering/workbench'
import { openWidget, openWidgetTab, sidebarStore, updateWidgetState } from '@hcengineering/workbench-resources'
import { isKrispNoiseFilterSupported, KrispNoiseFilter } from '@livekit/krisp-noise-filter'
import { BackgroundBlur, type BackgroundOptions, type ProcessorWrapper } from '@livekit/track-processors'
import {
  LocalAudioTrack,
  type LocalTrack,
  type LocalTrackPublication,
  LocalVideoTrack,
  type Room as LKRoom,
  RoomEvent,
  Track
} from 'livekit-client'
import { derived, get, writable } from 'svelte/store'

import { getPersonByPersonRef } from '@hcengineering/contact-resources'
import MeetingMinutesSearchItem from './components/MeetingMinutesSearchItem.svelte'
import RoomSettingsPopup from './components/RoomSettingsPopup.svelte'
import love from './plugin'
import { $myPreferences, currentMeetingMinutes } from './stores'
import { getLiveKitClient, lkSessionConnected } from './liveKitClient'
import { getLoveClient } from './loveClient'

export const liveKitClient = getLiveKitClient()
export const lk: LKRoom = liveKitClient.liveKitRoom

export const loveClient = getLoveClient()

export function setCustomCreateScreenTracks (value: () => Promise<Array<LocalTrack<Track.Kind>>>): void {
  lk.localParticipant.createScreenTracks = value
}

export const isRecording = writable<boolean>(false)
export const isTranscription = writable<boolean>(false)
export const isRecordingAvailable = writable<boolean>(false)
export const isTranscriptionAvailable = writable<boolean>(false)
export const isFullScreen = writable<boolean>(false)
export const isShareWithSound = writable<boolean>(false)

// Feature toggle: Krisp is a paid LiveKit add-on that has been failing to
// authenticate (404). When false, microphone audio uses only the WebRTC
// echoCancellation/noiseSuppression configured in audioCaptureDefaults.
const useKrisp = false

export let krispProcessor: ReturnType<typeof KrispNoiseFilter> | undefined = useKrisp ? KrispNoiseFilter() : undefined
export let blurProcessor: ProcessorWrapper<BackgroundOptions> | undefined
let localVideo: LocalVideoTrack | undefined

// Kill-switch: after KRISP_MAX_FAILURES consecutive setEnabled failures we stop
// attempting to enable Krisp for the session. Prevents 404 loops on broken deploys.
const KRISP_MAX_FAILURES = 3
let krispFailureCount = 0
let krispDisabled = false

try {
  blurProcessor = BackgroundBlur()
} catch (err) {
  console.log("Can't set blur processor", err)
}

/**
 * Internal immediate recreate. Callers that must observe the new krispProcessor
 * before proceeding should await this directly — reduceCalls-wrapped variants
 * resolve when the call is scheduled, not when the recreation completes.
 */
async function recreateKrispProcessorImmediate (): Promise<void> {
  if (!useKrisp) return
  try {
    // Stop processor on all local audio tracks before recreating
    // to release AudioContext references and avoid resource leaks
    for (const publication of lk.localParticipant.trackPublications.values()) {
      if (publication.track instanceof LocalAudioTrack) {
        await publication.track.stopProcessor().catch(() => {})
      }
    }

    krispProcessor = KrispNoiseFilter()
    console.log('[utils] Krisp processor recreated')
  } catch (err: any) {
    console.error('[utils] Failed to recreate Krisp processor', err)
  }
}

/**
 * Recreate Krisp noise filter processor. Called on reconnect to avoid
 * InvalidAccessError when old processor holds a stale AudioContext reference.
 * Stops processor on all local audio tracks before recreating to release resources.
 * Note: reduceCalls resolves when the call is scheduled, not when finished.
 * If you need to observe the new instance synchronously, use recreateKrispProcessorImmediate.
 */
export const recreateKrispProcessor = reduceCalls(recreateKrispProcessorImmediate)

async function setKrispProcessor (pub: LocalTrackPublication): Promise<void> {
  if (!useKrisp || krispProcessor === undefined) return
  if (pub.track instanceof LocalAudioTrack) {
    if (!isKrispNoiseFilterSupported()) {
      console.warn('enhanced noise filter is currently not supported on this browser')
      return
    }
    if (krispDisabled) {
      // Previous attempts failed repeatedly; don't route audio through Krisp.
      try {
        await pub.track.stopProcessor()
      } catch {}
      return
    }
    try {
      // Stop existing processor to avoid AudioContext conflicts
      try {
        await pub.track.stopProcessor()
      } catch {
        // Ignore if no processor was set
      }
      // once instantiated the filter will begin initializing and will download additional resources
      console.log('enabling LiveKit enhanced noise filter')
      await pub.track.setProcessor(krispProcessor)
      try {
        await krispProcessor.setEnabled($myPreferences?.noiseCancellation ?? true)
        krispFailureCount = 0
      } catch (err: any) {
        // Krisp failed to initialize (e.g. 404 on model resources). The processor is
        // attached to the track but not functional — detach it, otherwise outgoing
        // audio is routed through a dead processor and remote participants hear nothing.
        krispFailureCount++
        console.error(
          `[utils] Krisp setEnabled failed (${krispFailureCount}/${KRISP_MAX_FAILURES}), detaching processor`,
          err
        )
        try {
          await pub.track.stopProcessor()
        } catch {}
        if (krispFailureCount >= KRISP_MAX_FAILURES) {
          krispDisabled = true
          console.warn('[utils] Krisp disabled for this session after repeated failures')
        } else {
          // Recreate the shared instance so the next attempt does not reuse the broken one.
          // Use the immediate helper — reduceCalls returns before the recreation finishes.
          await recreateKrispProcessorImmediate()
        }
        Analytics.handleError(err)
      }
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
    const acc = getCurrentAccount().uuid
    await client.createDoc(love.class.DevicesPreference, core.space.Workspace, {
      attachedTo: acc,
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
  if (pub.source === Track.Source.Microphone) {
    void setKrispProcessor(pub)
  }

  if (pub.source === Track.Source.Camera) {
    void setBlurProcessor(pub)
  }
})
lk.on(RoomEvent.LocalTrackUnpublished, (pub) => {
  if (pub.track?.kind === Track.Kind.Video && pub.track.source === Track.Source.Camera) {
    if (localVideo !== undefined) {
      localVideo = undefined
    }
  }
})
lk.on(RoomEvent.RecordingStatusChanged, (evt) => {
  isRecording.set(evt)
})
lk.on(RoomEvent.RoomMetadataChanged, (metadata) => {
  const data = parseMetadata(metadata)
  isRecording.set(data.recording ?? false)
  isTranscription.set(data.transcription ?? false)
})

lk.on(RoomEvent.Connected, () => {
  const data: RoomMetadata = parseMetadata(lk.metadata)
  isTranscription.set(data.transcription ?? false)
  isRecording.set(data.recording ?? false)
  Analytics.handleEvent(LoveEvents.ConnectedToRoom)
})
if (useKrisp) {
  lk.on(RoomEvent.Disconnected, () => {
    // Recreate Krisp processor on disconnect so that the next connect
    // does not hit InvalidAccessError due to stale AudioContext references.
    void recreateKrispProcessor()
  })
  lk.on(RoomEvent.Reconnecting, () => {
    // Recreate Krisp processor on reconnecting to ensure fresh AudioContext
    // before the connection is re-established.
    void recreateKrispProcessor()
  })
  lk.on(RoomEvent.Reconnected, () => {
    // Ensure processor is fresh after successful reconnection
    // as the AudioContext may have changed during reconnect.
    void recreateKrispProcessor()
  })
}

function parseMetadata (metadata: string | undefined): RoomMetadata {
  try {
    return metadata == null || metadata === '' ? {} : JSON.parse(metadata)
  } catch (err: any) {
    Analytics.handleError(err)
    return {}
  }
}

export function closeMeetingMinutes (): void {
  const loc = getCurrentLocation()

  if (loc.path[2] === loveId) {
    const meetingMinutes = get(currentMeetingMinutes)
    const panel = get(panelstore).panel
    const { _id } = panel ?? {}

    if (_id !== undefined && meetingMinutes !== undefined && _id === meetingMinutes._id) {
      closePanel()
    }
  }
}

export async function getRoomName (room: Room): Promise<string> {
  if (isOffice(room) && room.person !== null && room.name === '') {
    const employee = await getPersonByPersonRef(room.person)
    if (employee != null) {
      const client = getClient()
      return getName(client.getHierarchy(), employee)
    }
  }
  return room.name
}

export async function getRoomLabel (room: Room): Promise<IntlString> {
  const name = await getRoomName(room)
  if (name !== '') return getEmbeddedLabel(name)
  return isOffice(room) ? love.string.Office : love.string.Room
}

export async function navigateToOfficeDoc (object: Doc): Promise<void> {
  const hierarchy = getClient().getHierarchy()
  const panelComponent = hierarchy.classHierarchyMixin(object._class, view.mixin.ObjectPanel)
  const comp = panelComponent?.component ?? view.component.EditDoc
  const loc = await getObjectLinkFragment(hierarchy, object, {}, comp)
  loc.path[2] = loveId
  loc.path.length = 3
  loc.query = undefined
  navigate(loc)
}

export async function navigateToMeetingMinutes (mm: MeetingMinutes): Promise<void> {
  await navigateToOfficeDoc(mm)
}

export function calculateFloorSize (_rooms: Room[], _preview?: boolean): number {
  let fH: number = 5
  _rooms.forEach((room) => {
    if (room.y + room.height + 2 > fH) fH = room.y + room.height + 2
  })
  return fH
}

async function checkTranscriptionAvailable (endpoint: string): Promise<void> {
  try {
    const res = await fetch(concatLink(endpoint, '/checkTranscriptionAvailable'))
    isTranscriptionAvailable.set((await res.json()) === true)
  } catch (err: any) {
    console.error(err)
  }
}

async function checkRecordAvailable (): Promise<void> {
  const endpoint = getMetadata(love.metadata.ServiceEndpoint)
  if (endpoint === undefined) {
    setTimeout(() => {
      void checkRecordAvailable()
    }, 500)
    return
  }
  if (endpoint === '') {
    console.info('office recording is not configured')
    return
  }

  // Availability checks are independent: a failure of one must not affect the other
  await Promise.all([checkRecordingAvailable(endpoint), checkTranscriptionAvailable(endpoint)])
}

async function checkRecordingAvailable (endpoint: string): Promise<void> {
  try {
    const res = await fetch(concatLink(endpoint, '/checkRecordAvailable'))
    const result = await res.json()
    isRecordingAvailable.set(result)
  } catch (err: any) {
    Analytics.handleError(err)
    console.error(err)
  }
}

void checkRecordAvailable()

// Re-check availability on every connection to a meeting
lkSessionConnected.subscribe((connected) => {
  if (connected) {
    void checkRecordAvailable()
  }
})

export async function createMeeting (
  client: TxOperations,
  _id: Ref<Event>,
  space: Space,
  _data: Data<Event>,
  store: Record<string, any>,
  phase: DocCreatePhase
): Promise<void> {
  if (phase === 'post' && store.room != null && store.isMeeting === true) {
    const event = await client.findOne(calendar.class.Event, { _id })
    if (event === undefined) return
    const events = await client.findAll(calendar.class.Event, { eventId: event.eventId })

    const meetingId = await client.addCollection(
      love.class.MeetingMinutes,
      space._id,
      store.room,
      love.class.Room,
      'meetings',
      {
        status: MeetingStatus.Scheduled,
        access: RoomAccess.Open,
        language: 'en',
        description: null,
        recordingState: RecordingState.NotStarted,
        transcriptionState: TranscriptionState.NotStarted,
        title: event.title,
        startWithRecording: false,
        startWithTranscription: false,
        meetingScheduledDate: event.date
      }
    )

    const meetingDoc = await client.findOne(love.class.MeetingMinutes, { _id: meetingId })
    if (meetingDoc === undefined) {
      throw new Error('Failed to create meeting minutes')
    }

    for (const event of events) {
      await client.createMixin<Event, MeetingEventLink>(
        event._id,
        calendar.class.Event,
        space._id,
        love.mixin.MeetingEventLink,
        {
          room: store.room as Ref<Room>,
          meetingId
        }
      )
    }
    const navigateUrl = getCurrentLocation()
    navigateUrl.path[2] = loveId
    navigateUrl.query = {
      meetId: _id
    }
    const link = await getMeetingGuestLink(meetingDoc)
    await client.update(event, { location: link })
  }
}

export async function createMeetingSchedule (
  client: TxOperations,
  _id: Ref<Schedule>,
  space: Space,
  _data: Data<Schedule>,
  store: Record<string, any>,
  phase: DocCreatePhase
): Promise<void> {
  if (phase === 'post') {
    const schedule = await client.findOne(calendar.class.Schedule, { _id })
    if (schedule === undefined) return
    await client.createMixin<Schedule, MeetingSchedule>(
      schedule._id,
      calendar.class.Schedule,
      space._id,
      love.mixin.MeetingSchedule,
      {
        room: store.room as Ref<Room>
      }
    )
  }
}

export function getLiveKitEndpoint (): string {
  const endpoint = getMetadata(love.metadata.WebSocketURL)
  if (endpoint === undefined) {
    throw new Error('Livekit endpoint not found')
  }

  return endpoint
}

export function getPlatformToken (): string {
  // TODO: Change to cookie
  const token = getMetadata(presentation.metadata.Token)
  if (token === undefined) {
    throw new Error('Token not found')
  }

  return token
}

export async function startTranscription (mm: MeetingMinutes): Promise<void> {
  const current = get(currentMeetingMinutes)
  if (current === undefined || mm._id !== current._id) return

  await connectMeeting(mm._id, mm.language, { transcription: true })
}

export async function stopTranscription (mm: MeetingMinutes): Promise<void> {
  const current = get(currentMeetingMinutes)
  if (current === undefined || mm._id !== current._id) return

  await disconnectMeeting(mm._id)
}

export async function showRoomSettings (room?: Room): Promise<void> {
  if (room === undefined) return

  showPopup(RoomSettingsPopup, { room }, 'top')
}

export async function copyGuestLink (mm: MeetingMinutes): Promise<void> {
  if (mm === undefined) return

  // Pass a Promise so ClipboardItem is created synchronously within the user gesture (Safari)
  await copyTextToClipboard(getMeetingGuestLink(mm))
}

async function getMeetingGuestLink (mm: MeetingMinutes): Promise<string> {
  const endpoint = getMetadata(love.metadata.ServiceEndpoint)
  if (endpoint === undefined) {
    console.error('Love service endpoint is not configured')
    return ''
  }

  const platformToken = getMetadata(presentation.metadata.Token)
  if (platformToken === undefined) {
    throw new Error('Platform token not found')
  }

  try {
    const guestToken = await getLoveClient().getGuestToken(mm)

    const navigateUrl = getCurrentLocation()
    navigateUrl.path = ['meetings']
    navigateUrl.query = {
      guestToken
    }

    // Build direct guest link (no createAccessLink). Use current front origin to build a full URL.
    // This simplifies the flow: result link will be like https://front/meetings?meetingId=...&guestToken=...
    try {
      const front = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin

      const query = new URLSearchParams({ guestToken })
      return concatLink(front, `/meetings?${query.toString()}`)
    } catch (err: any) {
      console.error('Failed to create guest link', err)
      return ''
    }
  } catch (err: any) {
    console.error('Failed to generate guest token', err)
    return ''
  }
}

export function isTranscriptionAllowed (): boolean {
  const url = getMetadata(aiBot.metadata.EndpointURL) ?? ''
  return url !== ''
}

export const videoVisible = derived(sidebarStore, (store) => {
  const widget = getClient().getModel().findAllSync(workbench.class.Widget, { _id: love.ids.MeetingWidget })[0]
  if (widget === undefined) return false

  const wstate = store.widgetsState.get(widget._id)
  if (store.widget !== widget._id) return false
  if (wstate === undefined) return false
  if (wstate.tab === 'video') return true

  return false
})

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

export async function getUserMeetingInviteTitle (
  client: TxOperations,
  ref: Ref<UserMeetingInvite>,
  doc?: UserMeetingInvite
): Promise<string> {
  const invite = doc ?? (await client.findOne(love.class.UserMeetingInvite, { _id: ref }))
  if (invite === undefined) return ''

  const sender = await client.findOne(contact.class.Person, { _id: invite.from })
  const senderName = sender?.name ?? ''

  return await translate(love.string.InvitingYou, { name: senderName }, getCurrentLanguage())
}

export async function queryMeetingMinutes (
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const q: DocumentQuery<MeetingMinutes> = { title: { $like: `%${search}%` } }
  if (filter?.in !== undefined || filter?.nin !== undefined) {
    q._id = {}
    if (filter.in !== undefined) {
      q._id.$in = filter.in?.map((it) => it._id as Ref<MeetingMinutes>)
    }
    if (filter.nin !== undefined) {
      q._id.$nin = filter.nin?.map((it) => it._id as Ref<MeetingMinutes>)
    }
  }
  return (await client.findAll(love.class.MeetingMinutes, q, { limit: 200 })).map(toMeetingMinutesObjectSearchResult)
}

const toMeetingMinutesObjectSearchResult = (e: WithLookup<MeetingMinutes>): ObjectSearchResult => ({
  doc: e,
  title: e.title,
  icon: love.icon.MeetingMinutes,
  component: MeetingMinutesSearchItem
})
