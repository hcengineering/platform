//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import contact, { type Employee, type Person } from '@hcengineering/contact'
import {
  AccountRole,
  type CollaborativeDoc,
  type CollectionSize,
  DateRangeMode,
  type Doc,
  type Domain,
  DOMAIN_TRANSIENT,
  IndexKind,
  type Ref,
  type Timestamp
} from '@hcengineering/core'
import {
  type DevicesPreference,
  type Floor,
  type Invite,
  type JoinRequest,
  loveId,
  type Meeting,
  type MeetingMinutes,
  type MeetingStatus,
  type Office,
  type ParticipantInfo,
  type RequestStatus,
  type Room,
  type RoomAccess,
  type RoomInfo,
  type RoomLanguage,
  type RoomType
} from '@hcengineering/love'
import {
  type Builder,
  Collection,
  Collection as PropCollection,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeAny,
  TypeCollaborativeDoc,
  TypeDate,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import calendar, { TEvent } from '@hcengineering/model-calendar'
import core, { TAttachedDoc, TDoc } from '@hcengineering/model-core'
import preference, { TPreference } from '@hcengineering/model-preference'
import presentation from '@hcengineering/model-presentation'
import view, { createAction, createAttributePresenter } from '@hcengineering/model-view'
import notification from '@hcengineering/notification'
import { getEmbeddedLabel } from '@hcengineering/platform'
import setting from '@hcengineering/setting'
import workbench, { WidgetType } from '@hcengineering/workbench'
import activity from '@hcengineering/activity'
import chunter from '@hcengineering/chunter'
import attachment from '@hcengineering/attachment'
import time, { type ToDo, type Todoable } from '@hcengineering/time'

import love from './plugin'

export { loveId } from '@hcengineering/love'
export * from './migration'
export const DOMAIN_LOVE = 'love' as Domain
export const DOMAIN_MEETING_MINUTES = 'meeting-minutes' as Domain

@Model(love.class.Room, core.class.Doc, DOMAIN_LOVE)
@UX(love.string.Room, love.icon.Love)
export class TRoom extends TDoc implements Room {
  @Prop(TypeString(), core.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeCollaborativeDoc(), core.string.Description)
  @Index(IndexKind.FullText)
    description!: CollaborativeDoc

  type!: RoomType

  access!: RoomAccess

  @Prop(TypeRef(love.class.Floor), love.string.Floor)
  @ReadOnly()
  // @Index(IndexKind.Indexed)
    floor!: Ref<Floor>

  width!: number
  height!: number
  x!: number
  y!: number

  language!: RoomLanguage
  startWithTranscription!: boolean
  startWithRecording!: boolean

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(PropCollection(love.class.MeetingMinutes), love.string.MeetingMinutes)
    meetings?: number

  @Prop(PropCollection(chunter.class.ChatMessage), activity.string.Messages)
    messages?: number
}

@Model(love.class.Office, love.class.Room)
@UX(love.string.Office, love.icon.Love)
export class TOffice extends TRoom implements Office {
  @Prop(TypeRef(contact.mixin.Employee), contact.string.Employee)
  @Index(IndexKind.Indexed)
  @ReadOnly()
    person!: Ref<Employee> | null
}

@Model(love.class.Floor, core.class.Doc, DOMAIN_LOVE)
export class TFloor extends TDoc implements Floor {
  name!: string
}

@Model(love.class.ParticipantInfo, core.class.Doc, DOMAIN_TRANSIENT)
export class TParticipantInfo extends TDoc implements ParticipantInfo {
  name!: string
  @Prop(TypeRef(contact.class.Person), getEmbeddedLabel('Person'))
    person!: Ref<Person>

  @Prop(TypeRef(love.class.Room), love.string.Room)
    room!: Ref<Room>

  x!: number
  y!: number

  sessionId!: string | null
}

@Model(love.class.JoinRequest, core.class.Doc, DOMAIN_TRANSIENT)
export class TJoinRequest extends TDoc implements JoinRequest {
  @Prop(TypeRef(contact.class.Person), getEmbeddedLabel('From'))
    person!: Ref<Person>

  @Prop(TypeRef(love.class.Room), love.string.Room)
    room!: Ref<Room>

  status!: RequestStatus
}

@Model(love.class.Invite, core.class.Doc, DOMAIN_TRANSIENT)
export class TInvite extends TDoc implements Invite {
  @Prop(TypeRef(contact.class.Person), getEmbeddedLabel('From'))
    from!: Ref<Person>

  @Prop(TypeRef(contact.class.Person), getEmbeddedLabel('Target'))
    target!: Ref<Person>

  @Prop(TypeRef(love.class.Room), love.string.Room)
    room!: Ref<Room>

  status!: RequestStatus
}

@Model(love.class.DevicesPreference, preference.class.Preference)
export class TDevicesPreference extends TPreference implements DevicesPreference {
  blurRadius!: number
  noiseCancellation!: boolean
  micEnabled!: boolean
  camEnabled!: boolean
}

@Model(love.class.RoomInfo, core.class.Doc, DOMAIN_TRANSIENT)
export class TRoomInfo extends TDoc implements RoomInfo {
  persons!: Ref<Person>[]
  room!: Ref<Room>
  isOffice!: boolean
}

@Mixin(love.mixin.Meeting, calendar.class.Event)
export class TMeeting extends TEvent implements Meeting {
  room!: Ref<Room>
}

@Model(love.class.MeetingMinutes, core.class.Doc, DOMAIN_MEETING_MINUTES)
@UX(love.string.MeetingMinutes, love.icon.Cam, undefined, 'createdOn', undefined, love.string.MeetingsMinutes)
export class TMeetingMinutes extends TAttachedDoc implements MeetingMinutes, Todoable {
  @Prop(TypeRef(core.class.Doc), love.string.Room, { editor: love.component.MeetingMinutesDocEditor })
  @Index(IndexKind.Indexed)
  @ReadOnly()
  declare attachedTo: Ref<Doc>

  @Prop(TypeString(), view.string.Title)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeCollaborativeDoc(), core.string.Description)
  @Index(IndexKind.FullText)
    description!: CollaborativeDoc

  @Prop(TypeAny(love.component.MeetingMinutesStatusPresenter, love.string.Status), love.string.Status, {
    editor: love.component.MeetingMinutesStatusPresenter
  })
  @ReadOnly()
    status!: MeetingStatus

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(PropCollection(chunter.class.ChatMessage), love.string.Transcription)
    transcription?: number

  @Prop(PropCollection(chunter.class.ChatMessage), activity.string.Messages)
    messages?: number

  @Prop(TypeDate(DateRangeMode.DATETIME), love.string.MeetingStart, { editor: view.component.DateTimePresenter })
  @ReadOnly()
  @Index(IndexKind.IndexedDsc)
  declare createdOn: Timestamp

  @Prop(TypeDate(DateRangeMode.DATETIME), love.string.MeetingEnd, { editor: view.component.DateTimePresenter })
  @ReadOnly()
    meetingEnd?: Timestamp

  @Prop(Collection(time.class.ToDo), getEmbeddedLabel('Action Items'))
    todos?: CollectionSize<ToDo>
}

export default love

export function createModel (builder: Builder): void {
  builder.createModel(
    TRoom,
    TFloor,
    TOffice,
    TParticipantInfo,
    TJoinRequest,
    TDevicesPreference,
    TRoomInfo,
    TInvite,
    TMeeting,
    TMeetingMinutes
  )

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: love.string.Office,
      icon: love.icon.Love,
      alias: loveId,
      hidden: false,
      position: 'top',
      component: love.component.Main
    },
    love.app.Love
  )

  builder.createDoc(
    workbench.class.Widget,
    core.space.Model,
    {
      label: love.string.Office,
      type: WidgetType.Fixed,
      icon: love.icon.Love,
      component: love.component.LoveWidget,
      headerLabel: love.string.Office
    },
    love.ids.LoveWidget
  )

  builder.createDoc(
    workbench.class.Widget,
    core.space.Model,
    {
      label: love.string.Meeting,
      type: WidgetType.Flexible,
      icon: love.icon.Cam,
      component: love.component.MeetingWidget
    },
    love.ids.MeetingWidget
  )

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: workbench.extensions.WorkbenchExtensions,
    component: love.component.WorkbenchExtension
  })

  builder.createDoc(presentation.class.DocCreateExtension, core.space.Model, {
    ofClass: calendar.class.Event,
    apply: love.function.CreateMeeting,
    components: {
      body: love.component.MeetingData
    }
  })

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: calendar.extensions.EditEventExtensions,
    component: love.component.EditMeetingData
  })

  builder.createDoc(
    setting.class.SettingsCategory,
    core.space.Model,
    {
      name: loveId,
      label: love.string.Office,
      icon: love.icon.Love,
      component: love.component.Settings,
      group: 'settings-account',
      role: AccountRole.Guest,
      order: 1600
    },
    love.ids.Settings
  )

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: love.string.Office,
      icon: love.icon.Love
    },
    love.ids.LoveNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: love.string.InivitingLabel,
      group: love.ids.LoveNotificationGroup,
      txClasses: [core.class.TxCreateDoc],
      objectClass: love.class.Invite,
      defaultEnabled: true
    },
    love.ids.InviteNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: love.string.KnockingLabel,
      group: love.ids.LoveNotificationGroup,
      txClasses: [],
      objectClass: love.class.JoinRequest,
      defaultEnabled: true
    },
    love.ids.KnockNotification
  )

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.SoundNotificationProvider,
    excludeIgnore: [love.ids.KnockNotification],
    ignoredTypes: [],
    enabledTypes: []
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_LOVE,
    disabled: [{ space: 1 }, { modifiedOn: 1 }, { modifiedBy: 1 }, { createdBy: 1 }, { createdOn: -1 }]
  })

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    { label: love.string.Office, visible: true },
    love.category.Office
  )

  createAction(
    builder,
    {
      action: love.actionImpl.ToggleMic,
      label: love.string.Microphone,
      icon: love.icon.Mic,
      keyBinding: ['Meta + keyD'],
      category: love.category.Office,
      allowedForEditableContent: true,
      input: 'none',
      target: core.class.Doc,
      context: {
        mode: ['workbench', 'browser', 'panel', 'editor', 'input']
      }
    },
    love.action.ToggleMic
  )

  createAction(
    builder,
    {
      action: love.actionImpl.ToggleVideo,
      label: love.string.Camera,
      icon: love.icon.Cam,
      allowedForEditableContent: true,
      keyBinding: ['Meta + keyE'],
      category: love.category.Office,
      input: 'none',
      target: core.class.Doc,
      context: {
        mode: ['workbench', 'browser', 'panel', 'editor', 'input']
      }
    },
    love.action.ToggleVideo
  )

  createAction(builder, {
    action: love.actionImpl.CopyGuestLink,
    label: love.string.CopyGuestLink,
    icon: view.icon.Copy,
    category: love.category.Office,
    input: 'focus',
    target: love.class.Room,
    visibilityTester: love.function.CanCopyGuestLink,
    context: {
      mode: 'context'
    }
  })

  createAction(builder, {
    action: love.actionImpl.ShowRoomSettings,
    label: love.string.Settings,
    icon: view.icon.Setting,
    category: love.category.Office,
    input: 'focus',
    target: love.class.Room,
    visibilityTester: love.function.CanShowRoomSettings,
    context: {
      mode: 'context'
    }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: love.class.Room,
    components: { input: { component: chunter.component.ChatMessageInput, props: { collection: 'messages' } } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: love.class.Office,
    components: { input: { component: chunter.component.ChatMessageInput, props: { collection: 'messages' } } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: love.class.MeetingMinutes,
    components: { input: { component: chunter.component.ChatMessageInput, props: { collection: 'messages' } } }
  })

  builder.mixin(love.class.MeetingMinutes, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(love.class.Room, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(love.class.MeetingMinutes, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: love.component.MeetingMinutesPresenter
  })

  builder.mixin(love.class.Room, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: love.component.RoomPresenter
  })

  builder.mixin(love.class.MeetingMinutes, core.class.Class, view.mixin.CollectionEditor, {
    editor: love.component.MeetingMinutesSection
  })

  builder.mixin(love.class.MeetingMinutes, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: love.function.MeetingMinutesTitleProvider
  })

  builder.mixin(love.class.Room, core.class.Class, view.mixin.ObjectEditor, {
    editor: love.component.EditRoom
  })

  builder.mixin(love.class.MeetingMinutes, core.class.Class, view.mixin.ObjectEditor, {
    editor: love.component.EditMeetingMinutes
  })

  builder.mixin(love.class.Floor, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: love.component.FloorAttributePresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: love.class.MeetingMinutes,
      descriptor: view.viewlet.Table,
      config: [
        '',
        { key: 'status', presenter: love.component.MeetingMinutesStatusPresenter, label: love.string.Status },
        { key: 'messages', displayProps: { key: 'messages', suffix: true } },
        { key: 'transcription', displayProps: { key: 'transcription', suffix: true } },
        'createdOn',
        'meetingEnd'
      ],
      configOptions: {
        hiddenKeys: ['description'],
        sortable: true
      },
      options: {}
    },
    love.viewlet.TableMeetingMinutes
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: love.class.MeetingMinutes,
      descriptor: view.viewlet.Table,
      config: [
        '',
        { key: 'status', presenter: love.component.MeetingMinutesStatusPresenter, label: love.string.Status },
        { key: 'messages', displayProps: { key: 'messages', suffix: true } },
        { key: 'transcription', displayProps: { key: 'transcription', suffix: true } },
        'createdOn',
        'meetingEnd'
      ],
      configOptions: {
        hiddenKeys: ['description'],
        sortable: true
      },
      variant: 'embedded'
    },
    love.viewlet.TableMeetingMinutesEmbedded
  )

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: love.string.Floor,
      icon: love.icon.Love,
      component: love.component.FloorView
    },
    love.viewlet.FloorDescriptor
  )

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: love.string.MeetingMinutes,
      icon: view.icon.Table,
      component: love.component.MeetingMinutesTable
    },
    love.viewlet.MeetingMinutesDescriptor
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: love.class.Floor,
      descriptor: love.viewlet.FloorDescriptor,
      config: []
    },
    love.viewlet.Floor
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: love.class.Floor,
      descriptor: love.viewlet.MeetingMinutesDescriptor,
      config: []
    },
    love.viewlet.FloorMeetingMinutes
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      label: chunter.string.Chat,
      generated: false,
      hidden: false,
      txClasses: [core.class.TxCreateDoc],
      objectClass: chunter.class.ChatMessage,
      attachedToClass: love.class.MeetingMinutes,
      txMatch: {
        'attributes.collection': 'messages'
      },
      defaultEnabled: false,
      group: love.ids.LoveNotificationGroup
    },
    love.ids.MeetingMinutesChatNotification
  )

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.InboxNotificationProvider,
    ignoredTypes: [],
    enabledTypes: [love.ids.MeetingMinutesChatNotification]
  })

  builder.createDoc(notification.class.NotificationProviderDefaults, core.space.Model, {
    provider: notification.providers.PushNotificationProvider,
    ignoredTypes: [],
    enabledTypes: [love.ids.MeetingMinutesChatNotification]
  })

  builder.mixin(love.class.MeetingMinutes, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy']
  })

  builder.mixin(love.class.Room, core.class.Class, core.mixin.IndexConfiguration, {
    indexes: [],
    searchDisabled: true
  })

  builder.mixin(love.class.Office, core.class.Class, core.mixin.IndexConfiguration, {
    indexes: [],
    searchDisabled: true
  })

  builder.mixin(love.class.Floor, core.class.Class, core.mixin.IndexConfiguration, {
    indexes: [],
    searchDisabled: true
  })

  builder.mixin(love.class.MeetingMinutes, core.class.Class, view.mixin.ObjectPanelFooter, {
    editor: love.component.PanelControlBar
  })

  createAttributePresenter(
    builder,
    view.component.DateTimePresenter,
    love.class.MeetingMinutes,
    'createdOn',
    'attribute'
  )
  createAttributePresenter(
    builder,
    view.component.DateTimePresenter,
    love.class.MeetingMinutes,
    'meetingEnd',
    'attribute'
  )
}
