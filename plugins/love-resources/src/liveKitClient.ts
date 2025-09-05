import {
  ConnectionState,
  type RemoteParticipant,
  Room as LKRoom,
  RoomEvent,
  type VideoCaptureOptions,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
  LocalTrackPublication,
  LocalParticipant,
  TrackPublication,
  Participant
} from 'livekit-client'
import { translate } from '@hcengineering/platform'
import { getMediaDevices, getSelectedSpeakerId, type MediaSession } from '@hcengineering/media'
import { LoveEvents } from '@hcengineering/love'
import { useMedia } from '@hcengineering/media-resources'
import { get, writable } from 'svelte/store'
import { Analytics } from '@hcengineering/analytics'
import { addNotification, NotificationSeverity } from '@hcengineering/ui'
import { getCurrentLanguage } from '@hcengineering/theme'
import LastParticipantNotification from './components/meeting/LastParticipantNotification.svelte'
import love from './plugin'
import { leaveRoom } from './utils'
import { $myPreferences, myInfo, myOffice } from './stores'

export enum ScreenSharingState {
  Inactive,
  Local,
  Remote
}

export const screenSharingState = writable<ScreenSharingState>(ScreenSharingState.Inactive)
export const lkSessionConnected = writable<boolean>(false)

const LAST_PARTICIPANT_NOTIFICATION_DELAY_MS = 2 * 60 * 1000
const AUTO_DISCONNECT_DELAY_MS = 60 * 1000

export function getLiveKitClient(): LiveKitClient {
  return new LiveKitClient()
}

const defaultCaptureOptions: VideoCaptureOptions = {
  facingMode: 'user',
  resolution: {
    width: 1280,
    height: 720,
    frameRate: 30
  }
}

export class LiveKitClient {
  public readonly liveKitRoom: LKRoom

  public isConnecting: boolean = false
  public currentMediaSession: MediaSession | undefined = undefined
  private currentSessionSupportsVideo: boolean = false
  private lastParticipantNotificationTimeout: number = -1
  private lastParticipantDisconnectTimeout: number = -1

  constructor() {
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
      videoCaptureDefaults: defaultCaptureOptions
    })
    lkRoom.on(RoomEvent.Connected, this.onConnected)
    lkRoom.on(RoomEvent.Disconnected, this.onDisconnected)
    this.liveKitRoom = lkRoom
  }

  async prepareConnection(wsUrl: string, token: string): Promise<void> {
    await this.liveKitRoom.prepareConnection(wsUrl, token)
  }

  async connect(wsURL: string, token: string, withVideo: boolean): Promise<void> {
    this.isConnecting = true
    this.currentSessionSupportsVideo = withVideo
    try {
      const setupMediaSession = async (): Promise<void> => {
        this.currentMediaSession = await useMedia({
          state: {
            camera: this.currentSessionSupportsVideo ? { enabled: $myPreferences?.camEnabled ?? true } : undefined,
            microphone: { enabled: $myPreferences?.micEnabled ?? this.liveKitRoom.remoteParticipants.size < 16 }
          },
          autoDestroy: false
        })
      }
      await Promise.all([
        this.liveKitRoom.connect(wsURL, token, {
          maxRetries: 1,
          websocketTimeout: 10000,
          peerConnectionTimeout: 10000
        }),
        setupMediaSession()
      ])

      this.currentMediaSession?.on('camera', (enabled) => {
        void this.setCameraEnabled(enabled)
      })
      this.currentMediaSession?.on('microphone', (enabled) => {
        void this.setMicrophoneEnabled(enabled)
      })
      this.currentMediaSession?.on('selected-camera', (deviceId) => {
        void this.setActiveCamera(deviceId)
      })
      this.currentMediaSession?.on('selected-microphone', (deviceId) => {
        void this.setActiveMicrophone(deviceId)
      })
      this.currentMediaSession?.on('selected-speaker', (deviceId) => {
        void this.setActiveSpeaker(deviceId)
      })
      this.currentMediaSession?.on('feature', (feature, enabled) => {
        if (feature !== 'sharing') return
        void this.setScreenShareEnabled(enabled, true)
      })

      await this.updateActiveDevices()
    } catch (error) {
      this.isConnecting = false
      this.currentMediaSession?.close()
      this.currentMediaSession?.removeAllListeners()
      this.currentMediaSession = undefined
      throw error
    }
  }

  async disconnect(): Promise<void> {
    screenSharingState.set(ScreenSharingState.Inactive)
    clearTimeout(this.lastParticipantNotificationTimeout)
    const me = this.liveKitRoom.localParticipant
    await Promise.all([me.setScreenShareEnabled(false), me.setCameraEnabled(false), me.setMicrophoneEnabled(false)])
    await this.liveKitRoom.disconnect()
    this.currentSessionSupportsVideo = false
    this.currentMediaSession?.close()
    this.currentMediaSession?.removeAllListeners()
    this.currentMediaSession = undefined
  }

  async awaitConnect(): Promise<void> {
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
    this.isConnecting = false
    lkSessionConnected.set(true)
    this.liveKitRoom.on(RoomEvent.ParticipantConnected, this.onParticipantConnected)
    this.liveKitRoom.on(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected)
    this.liveKitRoom.on(RoomEvent.TrackSubscribed, this.onTrackSubscribed)
    this.liveKitRoom.on(RoomEvent.TrackUnsubscribed, this.onTrackUnsubscribed)
    this.liveKitRoom.on(RoomEvent.LocalTrackPublished, this.onLocalTrackPublished)
    this.liveKitRoom.on(RoomEvent.LocalTrackUnpublished, this.onLocalTrackUnpublished)
    this.liveKitRoom.on(RoomEvent.TrackMuted, this.onTrackMuted)
    this.liveKitRoom.on(RoomEvent.TrackUnmuted, this.onTrackUnmuted)
  }

  onDisconnected = (): void => {
    lkSessionConnected.set(false)
    this.liveKitRoom.off(RoomEvent.ParticipantConnected, this.onParticipantConnected)
    this.liveKitRoom.off(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected)
    this.liveKitRoom.off(RoomEvent.TrackSubscribed, this.onTrackSubscribed)
    this.liveKitRoom.off(RoomEvent.TrackUnsubscribed, this.onTrackUnsubscribed)
    this.liveKitRoom.off(RoomEvent.LocalTrackPublished, this.onLocalTrackPublished)
    this.liveKitRoom.off(RoomEvent.LocalTrackUnpublished, this.onLocalTrackUnpublished)
    this.liveKitRoom.off(RoomEvent.TrackMuted, this.onTrackMuted)
    this.liveKitRoom.off(RoomEvent.TrackUnmuted, this.onTrackUnmuted)
    Analytics.handleEvent(LoveEvents.DisconnectedFromRoom)
  }

  onParticipantConnected = (_participant: RemoteParticipant): void => {
    clearTimeout(this.lastParticipantDisconnectTimeout)
    clearTimeout(this.lastParticipantNotificationTimeout)
  }

  onParticipantDisconnected = (_participant: RemoteParticipant): void => {
    if (this.liveKitRoom.remoteParticipants.size === 0) {
      clearTimeout(this.lastParticipantDisconnectTimeout)
      clearTimeout(this.lastParticipantNotificationTimeout)
      this.lastParticipantNotificationTimeout = window.setTimeout(() => {
        void this.showLastParticipantNotification()
      }, LAST_PARTICIPANT_NOTIFICATION_DELAY_MS)
    }
  }

  onTrackSubscribed = (
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    _participant: RemoteParticipant
  ): void => {
    if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
      screenSharingState.set(ScreenSharingState.Remote)
    }
  }

  onTrackUnsubscribed = (
    track: RemoteTrack,
    _publication: RemoteTrackPublication,
    _participant: RemoteParticipant
  ): void => {
    if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
      screenSharingState.set(ScreenSharingState.Inactive)
    }
  }

  onLocalTrackPublished = (publication: LocalTrackPublication, _participant: LocalParticipant) => {
    const session = this.currentMediaSession
    const track = publication.track?.mediaStreamTrack
    const deviceId = track?.getSettings().deviceId
    if (publication.track?.kind === Track.Kind.Video) {
      if (publication.track.source === Track.Source.ScreenShare) {
        session?.setFeature('sharing', { enabled: true, track, deviceId })
        screenSharingState.set(ScreenSharingState.Local)
      } else {
        session?.setCamera({ enabled: true, track, deviceId })
      }
    } else if (publication.track?.kind === Track.Kind.Audio) {
      session?.setMicrophone({ enabled: true, track, deviceId })
    }
  }
  
  onLocalTrackUnpublished = (publication: LocalTrackPublication, _participant: LocalParticipant) => {
    const session = this.currentMediaSession
    if (publication.track?.kind === Track.Kind.Video) {
      if (publication.track.source === Track.Source.ScreenShare) {
        session?.setFeature('sharing', { enabled: false })
        screenSharingState.set(ScreenSharingState.Inactive)
      } else {
        session?.setCamera({ enabled: false })
      }
    } else if (publication.track?.kind === Track.Kind.Audio) {
      session?.setMicrophone({ enabled: false })
    }
  }
  
  onTrackMuted = (publication: TrackPublication, participant: Participant) => {
    if (!participant.isLocal) return
    const session = this.currentMediaSession
    if (publication.track?.kind === Track.Kind.Video && publication.track.source === Track.Source.Camera) {
      session?.setCamera({ enabled: false })
    } else if (publication.track?.kind === Track.Kind.Audio) {
      session?.setMicrophone({ enabled: false })
    }
  }
  
  onTrackUnmuted = (publication: TrackPublication, participant: Participant) => {
    if (!participant.isLocal) return
    const session = this.currentMediaSession
    const track = publication.track?.mediaStreamTrack
    const deviceId = track?.getSettings().deviceId
    if (publication.track?.kind === Track.Kind.Video && publication.track?.source === Track.Source.Camera) {
      session?.setCamera({ enabled: true, track, deviceId })
    } else if (publication.track?.kind === Track.Kind.Audio) {
      session?.setMicrophone({ enabled: true, track, deviceId })
    }
  }

  async showLastParticipantNotification(): Promise<void> {
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
    }, AUTO_DISCONNECT_DELAY_MS)
  }

  async updateActiveDevices(): Promise<void> {
    await this.setActiveCamera(this.currentMediaSession?.state.camera?.deviceId)
    await this.setActiveMicrophone(this.currentMediaSession?.state.microphone?.deviceId)
    await this.setCameraEnabled(this.currentMediaSession?.state.camera?.enabled ?? false)
    await this.setMicrophoneEnabled(this.currentMediaSession?.state.microphone?.enabled ?? false)
  }

  async setActiveCamera(deviceId: string | undefined): Promise<void> {
    if (deviceId === undefined || deviceId === null) return
    if (!this.currentSessionSupportsVideo) return
    await this.liveKitRoom.switchActiveDevice('videoinput', deviceId, true)
  }

  async setActiveMicrophone(deviceId: string | undefined): Promise<void> {
    if (deviceId === undefined || deviceId === null) return
    await this.liveKitRoom.switchActiveDevice('audioinput', deviceId, true)
  }

  async setActiveSpeaker(deviceId: string | undefined): Promise<void> {
    if (deviceId === undefined || deviceId === null) return
    try {
      await this.liveKitRoom.switchActiveDevice('audiooutput', deviceId, true)
    } catch (error) {
      console.log(error)
    }
  }

  async setCameraEnabled(value: boolean): Promise<void> {
    if (!this.currentSessionSupportsVideo) return
    try {
      await this.liveKitRoom.localParticipant.setCameraEnabled(value)
    } catch (e) {
      if (value) {
        const mediaDevices = await getMediaDevices(false, true)
        if (mediaDevices.activeCamera !== undefined) {
          await this.setActiveCamera(mediaDevices.activeCamera.deviceId)
          await this.liveKitRoom.localParticipant.setCameraEnabled(true)
        }
      }
    }
  }

  async setMicrophoneEnabled(value: boolean): Promise<void> {
    try {
      await this.liveKitRoom.localParticipant.setMicrophoneEnabled(value)
    } catch (e) {
      if (value) {
        const mediaDevices = await getMediaDevices(true, false)
        if (mediaDevices.activeMicrophone !== undefined) {
          await this.setActiveMicrophone(mediaDevices.activeMicrophone.deviceId)
          await this.liveKitRoom.localParticipant.setMicrophoneEnabled(true)
        }
      }
    }
  }

  async setScreenShareEnabled(value: boolean, withAudio: boolean = false): Promise<void> {
    try {
      await this.liveKitRoom.localParticipant.setScreenShareEnabled(value, { audio: withAudio })
    } catch (e) {
      console.log(e)
    }
  }
}
