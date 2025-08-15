import { ConnectionState, type RemoteParticipant, Room as LKRoom, RoomEvent } from 'livekit-client'
import { getMetadata, translate } from '@hcengineering/platform'
import { getSelectedSpeakerId, type MediaSession } from '@hcengineering/media'
import { LoveEvents } from '@hcengineering/love'
import { useMedia } from '@hcengineering/media-resources'
import { get, writable } from 'svelte/store'
import { Analytics } from '@hcengineering/analytics'
import { addNotification, NotificationSeverity } from '@hcengineering/ui'
import { getCurrentLanguage } from '@hcengineering/theme'
import LastParticipantNotification from './components/meeting/LastParticipantNotification.svelte'
import love from './plugin'
import { leaveRoom } from './utils'
import { myInfo, myOffice } from './stores'

export const lkSessionConnected = writable<boolean>(false)

export function getLiveKitClient (): LiveKitClient {
  const wsURL = getMetadata(love.metadata.WebSocketURL)
  return new LiveKitClient(wsURL ?? '')
}

export class LiveKitClient {
  public readonly liveKitRoom: LKRoom

  public currentMediaSession: MediaSession | undefined = undefined
  private currentSessionSupportsVideo: boolean = false
  private lastParticipantNotificationTimeout: number = -1
  private lastParticipantDisconnectTimeout: number = -1

  private readonly wsUrl: string

  constructor (wsUrl: string) {
    this.wsUrl = wsUrl
    const lkRoom = new LKRoom({
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
        deviceId: getSelectedSpeakerId()
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
    void lkRoom.prepareConnection(this.wsUrl)
    lkRoom.on(RoomEvent.Connected, this.onConnected)
    lkRoom.on(RoomEvent.Disconnected, this.onDisconnected)
    this.liveKitRoom = lkRoom
  }

  async connect (token: string, withVideo: boolean): Promise<void> {
    this.currentSessionSupportsVideo = withVideo
    await this.liveKitRoom.connect(this.wsUrl, token)
  }

  async disconnect (): Promise<void> {
    clearTimeout(this.lastParticipantNotificationTimeout)
    const me = this.liveKitRoom.localParticipant
    await Promise.all([me.setScreenShareEnabled(false), me.setCameraEnabled(false), me.setMicrophoneEnabled(false)])
    await this.liveKitRoom.disconnect()
    this.currentSessionSupportsVideo = false
  }

  async awaitConnect (): Promise<void> {
    await new Promise<void>((resolve) => {
      if (this.liveKitRoom.state === ConnectionState.Connected) {
        resolve()
      }
      this.liveKitRoom.once(RoomEvent.Connected, () => {
        resolve()
      })
    })
  }

  onConnected = (): void => {
    const session = useMedia({
      state: {
        camera: this.currentSessionSupportsVideo ? { enabled: false } : undefined,
        microphone: { enabled: false }
      },
      autoDestroy: false
    })
    lkSessionConnected.set(true)
    this.currentMediaSession = session
    this.liveKitRoom.on(RoomEvent.ParticipantConnected, this.onParticipantConnected)
    this.liveKitRoom.on(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected)
    console.log(this.liveKitRoom.numParticipants)
  }

  onDisconnected = (): void => {
    this.currentMediaSession?.close()
    this.currentMediaSession?.removeAllListeners()
    this.currentMediaSession = undefined
    lkSessionConnected.set(false)
    this.liveKitRoom.off(RoomEvent.ParticipantConnected, this.onParticipantConnected)
    this.liveKitRoom.off(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected)
    Analytics.handleEvent(LoveEvents.DisconnectedFromRoom)
  }

  onParticipantConnected = (participant: RemoteParticipant): void => {
    clearTimeout(this.lastParticipantDisconnectTimeout)
    clearTimeout(this.lastParticipantNotificationTimeout)
  }

  onParticipantDisconnected = (participant: RemoteParticipant): void => {
    if (this.liveKitRoom.remoteParticipants.size === 0) {
      clearTimeout(this.lastParticipantDisconnectTimeout)
      clearTimeout(this.lastParticipantNotificationTimeout)
      this.lastParticipantNotificationTimeout = window.setTimeout(
        () => {
          void this.showLastParticipantNotification()
        },
        2 * 60 * 1000
      )
    }
  }

  async showLastParticipantNotification (): Promise<void> {
    addNotification(
      await translate(love.string.MeetingEmptyTitle, {}, getCurrentLanguage()),
      await translate(love.string.MeetingEmptyMessage, {}, getCurrentLanguage()),
      LastParticipantNotification,
      undefined,
      NotificationSeverity.Info,
      'love'
    )
    this.lastParticipantDisconnectTimeout = window.setTimeout(() => {
      void leaveRoom(get(myInfo), get(myOffice))
    }, 60 * 1000)
  }
}
