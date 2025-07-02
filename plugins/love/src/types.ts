import { Event, Schedule } from '@hcengineering/calendar'
import { Person } from '@hcengineering/contact'
import { AccountUuid, AttachedDoc, Doc, MarkupBlobRef, Ref, Timestamp } from '@hcengineering/core'
import { Preference } from '@hcengineering/preference'

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
  startWithRecording: boolean
  description: MarkupBlobRef | null
  attachments?: number
  meetings?: number
  messages?: number
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
  account: AccountUuid | null
}

export interface RoomInfo extends Doc {
  persons: Ref<Person>[]
  room: Ref<Room>
  isOffice: boolean
}

export interface Meeting extends Event {
  room: Ref<Room>
}

export interface MeetingSchedule extends Schedule {
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

export enum MeetingStatus {
  Active,
  Finished
}

export interface MeetingMinutes extends AttachedDoc {
  title: string
  description: MarkupBlobRef | null

  status: MeetingStatus
  meetingEnd?: Timestamp

  transcription?: number
  messages?: number
  attachments?: number
}
