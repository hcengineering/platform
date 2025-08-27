// Copyright © 2025 Hardcore Engineering Inc.
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

import { ArrOf, type Builder, Model, TypeAny, TypeNumber, TypeRef } from '@hcengineering/model'
import core, { TAttachedDoc, TConfiguration, TDoc } from '@hcengineering/model-core'
import { type Class, type Domain, DOMAIN_MODEL, type Ref } from '@hcengineering/core'
import { type Asset, type IntlString } from '@hcengineering/platform'
import {
  type Applet,
  type MessageAction,
  type MessageActionFunctionResource,
  type MessageActionVisibilityTesterResource,
  type AppletCreateFnResource,
  type PollAnswer,
  type Poll,
  type CustomActivityPresenter,
  type GuestCommunicationSettings,
  type AppletGetTitleFnResource,
  MessagesNavigationAnchors
} from '@hcengineering/communication'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'
import { type AppletType } from '@hcengineering/communication-types'
import card, { createSystemType } from '@hcengineering/model-card'
import type { AnyComponent } from '@hcengineering/ui'
import contact, { type PersonSpace } from '@hcengineering/contact'
import { type Card, type MasterTag } from '@hcengineering/card'
import { DOMAIN_SETTING } from '@hcengineering/setting'
import view from '@hcengineering/model-view'

import communication from './plugin'

export const DOMAIN_POLL = 'poll' as Domain

@Model(communication.class.MessageAction, core.class.Doc, DOMAIN_MODEL)
class TMessageAction extends TDoc implements MessageAction {
  label!: IntlString
  icon!: Asset
  action!: MessageActionFunctionResource
  order!: number

  visibilityTester?: MessageActionVisibilityTesterResource
  menu?: boolean
}

@Model(communication.class.Applet, core.class.Doc, DOMAIN_MODEL)
class TApplet extends TDoc implements Applet {
  type!: AppletType
  icon!: Asset
  label!: IntlString
  component!: AnyComponent
  createLabel!: IntlString
  createComponent!: AnyComponent
  previewComponent!: AnyComponent
  getTitleFn!: AppletGetTitleFnResource
  createFn?: AppletCreateFnResource
}

@Model(communication.class.PollAnswer, core.class.Doc, DOMAIN_POLL)
class TPollAnswer extends TAttachedDoc implements PollAnswer {
  options!: string[]
  declare attachedTo: Ref<Poll>
  declare attachedToClass: Ref<Class<Poll>>
  declare space: Ref<PersonSpace>
}

@Model(communication.class.CustomActivityPresenter, core.class.Doc, DOMAIN_MODEL)
class TCustomActivityPresenter extends TDoc implements CustomActivityPresenter {
  attribute!: string
  component!: AnyComponent
  type!: Ref<MasterTag>
}

@Model(communication.class.GuestCommunicationSettings, core.class.Configuration, DOMAIN_SETTING)
export class TGuestCommunicationSettings extends TConfiguration implements GuestCommunicationSettings {
  allowedCards!: Ref<Card>[]
}

export function buildTypes (builder: Builder): void {
  builder.createModel(TMessageAction, TApplet, TPollAnswer, TCustomActivityPresenter, TGuestCommunicationSettings)

  defineDirect(builder)
  definePoll(builder)
}

function defineDirect (builder: Builder): void {
  createSystemType(
    builder,
    communication.type.Direct,
    contact.icon.Contacts,
    communication.string.Direct,
    communication.string.Directs,
    {
      defaultSection: communication.ids.CardMessagesSection,
      defaultNavigation: MessagesNavigationAnchors.LatestMessages
    },
    PaletteColorIndexes.Lavander
  )

  builder.createDoc(core.class.Attribute, core.space.Model, {
    name: 'members',
    readonly: true, // TODO: remove
    attributeOf: communication.type.Direct,
    type: ArrOf(TypeRef(contact.class.Person)),
    label: communication.string.Members
  })

  builder.mixin(communication.type.Direct, core.class.Class, view.mixin.ObjectIcon, {
    component: communication.component.DirectIcon
  })
  builder.mixin(communication.type.Direct, core.class.Class, card.mixin.CreateCardExtension, {
    component: communication.component.CreateDirect,
    canCreate: communication.function.CanCreateDirect,
    disableTitle: true,
    hideSpace: true
  })

  builder.mixin(communication.type.Direct, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete, card.action.PublicLink]
  })
}

function definePoll (builder: Builder): void {
  createSystemType(
    builder,
    communication.type.Poll,
    communication.icon.Poll,
    communication.string.Poll,
    communication.string.Polls,
    undefined,
    PaletteColorIndexes.Cerulean
  )

  builder.createDoc(core.class.Attribute, core.space.Model, {
    name: 'totalVotes',
    attributeOf: communication.type.Poll,
    type: TypeNumber(),
    label: communication.string.TotalVotes,
    readonly: true
  })

  builder.createDoc(
    core.class.Attribute,
    core.space.Model,
    {
      name: 'userVotes',
      attributeOf: communication.type.Poll,
      type: TypeAny(
        communication.poll.UserVotesPresenter,
        communication.string.Voted,
        communication.poll.UserVotesPresenter
      ),
      label: communication.string.Voted,
      readonly: true
    },
    communication.ids.UserVotesAttribute
  )

  builder.createDoc(communication.class.CustomActivityPresenter, core.space.Model, {
    attribute: 'userVotes',
    type: communication.type.Poll,
    component: communication.poll.UserVoteActivityPresenter
  })
}
