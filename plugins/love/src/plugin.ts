import { Class, Mixin, Ref } from '@hcengineering/core'
import { Drive } from '@hcengineering/drive'
import { NotificationType } from '@hcengineering/notification'
import { Asset, IntlString, Metadata, Plugin, plugin } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui/src/types'
import { Action, Viewlet, ViewletDescriptor } from '@hcengineering/view'
import { Widget } from '@hcengineering/workbench'
import {
  DevicesPreference,
  Floor,
  Invite,
  JoinRequest,
  Meeting,
  MeetingMinutes,
  MeetingSchedule,
  Office,
  ParticipantInfo,
  Room,
  RoomAccess,
  RoomInfo
} from './types'

export const loveId = 'love' as Plugin

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
    Meeting: '' as Ref<Mixin<Meeting>>,
    MeetingSchedule: '' as Ref<Mixin<MeetingSchedule>>
  },
  action: {
    ToggleMic: '' as Ref<Action>,
    ToggleVideo: '' as Ref<Action>
  },
  string: {
    Office: '' as IntlString,
    MyOffice: '' as IntlString,
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
    MeetingMinutes: '' as IntlString,
    MeetingsMinutes: '' as IntlString,
    StartMeeting: '' as IntlString,
    Video: '' as IntlString,
    NoMeetingMinutes: '' as IntlString,
    JoinMeeting: '' as IntlString,
    MeetingStart: '' as IntlString,
    MeetingEnd: '' as IntlString,
    Status: '' as IntlString,
    Active: '' as IntlString,
    Finished: '' as IntlString,
    StartWithRecording: '' as IntlString,
    Kick: '' as IntlString,
    EndMeeting: '' as IntlString,
    SearchMeetingMinutes: '' as IntlString
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
    Invite: '' as Asset,
    Kick: '' as Asset,
    MeetingMinutes: '' as Asset
  },
  sound: {
    Knock: '' as Asset,
    MeetingEndNotification: '' as Asset
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
  },
  viewlet: {
    TableMeetingMinutes: '' as Ref<Viewlet>,
    TableMeetingMinutesEmbedded: '' as Ref<Viewlet>,
    MeetingMinutesDescriptor: '' as Ref<ViewletDescriptor>,
    FloorDescriptor: '' as Ref<ViewletDescriptor>,
    Floor: '' as Ref<Viewlet>,
    FloorMeetingMinutes: '' as Ref<Viewlet>
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
