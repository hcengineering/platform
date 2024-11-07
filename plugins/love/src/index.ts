import { Event } from '@hcengineering/calendar'
import { Person } from '@hcengineering/contact'
import { Class, Doc, Mixin, Ref } from '@hcengineering/core'
import { Drive } from '@hcengineering/drive'
import { NotificationType } from '@hcengineering/notification'
import { Asset, IntlString, Metadata, Plugin, plugin } from '@hcengineering/platform'
import { Preference } from '@hcengineering/preference'
import { AnyComponent } from '@hcengineering/ui/src/types'
import { Action } from '@hcengineering/view'
import { Widget } from '@hcengineering/workbench'

export const loveId = 'love' as Plugin
export type { ScreenSource } from './utils'
export const GRID_WIDTH = 15

export * from './analytics'

export enum RoomAccess {
  Open,
  Knock,
  DND
}

export enum RoomType {
  Video,
  Audio,
  Reception
}

export interface Floor extends Doc {
  name: string
}

export enum TranscriptionStatus {
  Idle = 'idle',
  InProgress = 'inProgress',
  Completed = 'completed'
}

export type RoomLanguage =
  | 'bg'
  | 'ca'
  | 'zh'
  | 'zh-TW'
  | 'zh-HK'
  | 'cs'
  | 'da'
  | 'nl'
  | 'en'
  | 'en-US'
  | 'en-AU'
  | 'en-GB'
  | 'en-NZ'
  | 'en-IN'
  | 'et'
  | 'fi'
  | 'nl-BE'
  | 'fr'
  | 'fr-CA'
  | 'de'
  | 'de-CH'
  | 'el'
  | 'hi'
  | 'hu'
  | 'id'
  | 'it'
  | 'ja'
  | 'ko'
  | 'lv'
  | 'lt'
  | 'ms'
  | 'no'
  | 'pl'
  | 'pt'
  | 'pt-BR'
  | 'pt-PT'
  | 'ro'
  | 'ru'
  | 'sk'
  | 'es'
  | 'es-419'
  | 'sv'
  | 'th'
  | 'tr'
  | 'uk'
  | 'vi'

export interface RoomMetadata {
  recording?: boolean
  transcription?: TranscriptionStatus
  language?: RoomLanguage
}

export interface Room extends Doc {
  name: string
  type: RoomType
  access: RoomAccess
  floor: Ref<Floor>
  width: number
  height: number
  x: number
  y: number
  language: RoomLanguage
  startWithTranscription: boolean
}

export interface Office extends Room {
  person: Ref<Person> | null
}

// transient data for status
export interface ParticipantInfo extends Doc {
  // isActive: boolean (disabled until server connection to check it for all active rooms)
  person: Ref<Person>
  name: string
  room: Ref<Room>
  x: number
  y: number
  sessionId: string | null
}

export interface RoomInfo extends Doc {
  persons: Ref<Person>[]
  room: Ref<Room>
  isOffice: boolean
}

export interface Meeting extends Event {
  room: Ref<Room>
}

export enum RequestStatus {
  Pending,
  Approved,
  Rejected
}

export interface JoinRequest extends Doc {
  person: Ref<Person>
  room: Ref<Room>
  status: RequestStatus
}

export interface Invite extends Doc {
  from: Ref<Person>
  target: Ref<Person>
  room: Ref<Room>
  status: RequestStatus
}

export interface DevicesPreference extends Preference {
  micEnabled: boolean
  noiseCancellation: boolean
  blurRadius: number
  camEnabled: boolean
}

export interface MeetingMinutes extends Doc {
  sid: string
  title: string
  room: Ref<Room>
  transcription?: number
  messages?: number
}

export * from './utils'

const love = plugin(loveId, {
  class: {
    Room: '' as Ref<Class<Room>>,
    Floor: '' as Ref<Class<Floor>>,
    Office: '' as Ref<Class<Office>>,
    ParticipantInfo: '' as Ref<Class<ParticipantInfo>>,
    JoinRequest: '' as Ref<Class<JoinRequest>>,
    DevicesPreference: '' as Ref<Class<DevicesPreference>>,
    RoomInfo: '' as Ref<Class<RoomInfo>>,
    Invite: '' as Ref<Class<Invite>>,
    MeetingMinutes: '' as Ref<Class<MeetingMinutes>>
  },
  mixin: {
    Meeting: '' as Ref<Mixin<Meeting>>
  },
  action: {
    ToggleMic: '' as Ref<Action>,
    ToggleVideo: '' as Ref<Action>
  },
  string: {
    Office: '' as IntlString,
    Room: '' as IntlString,
    IsKnocking: '' as IntlString,
    KnockingLabel: '' as IntlString,
    InivitingLabel: '' as IntlString,
    InvitingYou: '' as IntlString,
    RoomType: '' as IntlString,
    Knock: '' as IntlString,
    Open: '' as IntlString,
    DND: '' as IntlString,
    StartTranscription: '' as IntlString,
    StopTranscription: '' as IntlString,
    Meeting: '' as IntlString,
    Transcription: '' as IntlString,
    StartWithTranscription: '' as IntlString,
    MeetingMinutes: '' as IntlString
  },
  ids: {
    MainFloor: '' as Ref<Floor>,
    Reception: '' as Ref<Room>,
    InviteNotification: '' as Ref<NotificationType>,
    KnockNotification: '' as Ref<NotificationType>,
    LoveWidget: '' as Ref<Widget>,
    MeetingWidget: '' as Ref<Widget>
  },
  icon: {
    Love: '' as Asset,
    LeaveRoom: '' as Asset,
    EnterRoom: '' as Asset,
    Mic: '' as Asset,
    MicEnabled: '' as Asset,
    MicDisabled: '' as Asset,
    Cam: '' as Asset,
    CamEnabled: '' as Asset,
    CamDisabled: '' as Asset,
    SharingEnabled: '' as Asset,
    SharingDisabled: '' as Asset,
    Open: '' as Asset,
    Knock: '' as Asset,
    DND: '' as Asset,
    Record: '' as Asset,
    StopRecord: '' as Asset,
    FullScreen: '' as Asset,
    ExitFullScreen: '' as Asset,
    Invite: '' as Asset
  },
  sound: {
    Knock: '' as Asset
  },
  metadata: {
    WebSocketURL: '' as Metadata<string>,
    ServiceEnpdoint: '' as Metadata<string>
  },
  space: {
    Drive: '' as Ref<Drive>
  },
  component: {
    SelectScreenSourcePopup: '' as AnyComponent
  }
})

export const roomAccessIcon = {
  [RoomAccess.Open]: love.icon.Open,
  [RoomAccess.Knock]: love.icon.Knock,
  [RoomAccess.DND]: love.icon.DND
}

export const roomAccessLabel = {
  [RoomAccess.Open]: love.string.Open,
  [RoomAccess.Knock]: love.string.Knock,
  [RoomAccess.DND]: love.string.DND
}

export default love
