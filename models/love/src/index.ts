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
import { AccountRole, type Domain, DOMAIN_TRANSIENT, IndexKind, type Ref } from '@hcengineering/core'
import {
  type DevicesPreference,
  type Floor,
  type Invite,
  type JoinRequest,
  loveId,
  type Meeting,
  type Office,
  type ParticipantInfo,
  type RequestStatus,
  type Room,
  type RoomAccess,
  type RoomInfo,
  type RoomType
} from '@hcengineering/love'
import { type Builder, Index, Mixin, Model, Prop, TypeRef } from '@hcengineering/model'
import calendar, { TEvent } from '@hcengineering/model-calendar'
import core, { TDoc } from '@hcengineering/model-core'
import preference, { TPreference } from '@hcengineering/model-preference'
import presentation from '@hcengineering/model-presentation'
import view, { createAction } from '@hcengineering/model-view'
import notification from '@hcengineering/notification'
import { getEmbeddedLabel } from '@hcengineering/platform'
import setting from '@hcengineering/setting'
import workbench, { WidgetType } from '@hcengineering/workbench'
import love from './plugin'

export { loveId } from '@hcengineering/love'
export * from './migration'
export const DOMAIN_LOVE = 'love' as Domain

@Model(love.class.Room, core.class.Doc, DOMAIN_LOVE)
export class TRoom extends TDoc implements Room {
  name!: string

  type!: RoomType

  access!: RoomAccess

  @Prop(TypeRef(love.class.Floor), getEmbeddedLabel('Floor'))
  // @Index(IndexKind.Indexed)
    floor!: Ref<Floor>

  width!: number
  height!: number
  x!: number
  y!: number
}

@Model(love.class.Office, love.class.Room)
export class TOffice extends TRoom implements Office {
  @Prop(TypeRef(contact.mixin.Employee), contact.string.Employee)
  @Index(IndexKind.Indexed)
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

  @Prop(TypeRef(love.class.Room), getEmbeddedLabel('Room'))
    room!: Ref<Room>

  x!: number
  y!: number

  sessionId!: string | null
}

@Model(love.class.JoinRequest, core.class.Doc, DOMAIN_TRANSIENT)
export class TJoinRequest extends TDoc implements JoinRequest {
  @Prop(TypeRef(contact.class.Person), getEmbeddedLabel('From'))
    person!: Ref<Person>

  @Prop(TypeRef(love.class.Room), getEmbeddedLabel('Room'))
    room!: Ref<Room>

  status!: RequestStatus
}

@Model(love.class.Invite, core.class.Doc, DOMAIN_TRANSIENT)
export class TInvite extends TDoc implements Invite {
  @Prop(TypeRef(contact.class.Person), getEmbeddedLabel('From'))
    from!: Ref<Person>

  @Prop(TypeRef(contact.class.Person), getEmbeddedLabel('Target'))
    target!: Ref<Person>

  @Prop(TypeRef(love.class.Room), getEmbeddedLabel('Room'))
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
    TMeeting
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
      label: love.string.MeetingRoom,
      type: WidgetType.Flexible,
      icon: love.icon.Cam,
      component: love.component.VideoWidget
    },
    love.ids.VideoWidget
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
}
