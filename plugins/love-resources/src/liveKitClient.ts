import {
  ConnectionState,
  Room as LKRoom,
  RoomEvent
} from 'livekit-client'
import { getMetadata } from '@hcengineering/platform'
import { getSelectedSpeakerId, type MediaSession } from '@hcengineering/media'
import love, { LoveEvents } from '@hcengineering/love'
import { useMedia } from '@hcengineering/media-resources'
import { writable } from 'svelte/store'
import { Analytics } from '@hcengineering/analytics'

export const lkSessionConnected = writable<boolean>(false)
export const lkSessionWithSharing = writable<boolean>(false)

export function getLiveKitClient (): LiveKitClient {
  const wsURL = getMetadata(love.metadata.WebSocketURL)
  return new LiveKitClient(wsURL ?? '')
}

export class LiveKitClient {
  public readonly liveKitRoom: LKRoom

  public currentMediaSession: MediaSession | undefined = undefined
  private currentSessionSupportsVideo: boolean = false

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
    // lkRoom.on(RoomEvent.ParticipantConnected, attachParticipant)
    // lkRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    this.liveKitRoom = lkRoom
  }

  async connect (token: string, withVideo: boolean): Promise<void> {
    this.currentSessionSupportsVideo = withVideo
    await this.liveKitRoom.connect(this.wsUrl, token)
  }

  async disconnect (): Promise<void> {
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
  }

  onDisconnected = (): void => {
    this.currentMediaSession?.close()
    this.currentMediaSession?.removeAllListeners()
    this.currentMediaSession = undefined
    lkSessionConnected.set(false)
    Analytics.handleEvent(LoveEvents.DisconnectedFromRoom)
  }
}
