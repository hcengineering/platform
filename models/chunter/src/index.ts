//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import activity, { type ActivityMessageControl } from '@hcengineering/activity'
import { chunterId, type ChunterSpace } from '@hcengineering/chunter'
import presentation from '@hcengineering/model-presentation'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import view from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { WidgetType } from '@hcengineering/workbench'

import chunter from './plugin'
import { defineActions } from './actions'
import { defineNotifications } from './notifications'
import {
  DOMAIN_CHUNTER,
  TChannel,
  TChatMessage,
  TChatMessageViewlet,
  TChatSyncInfo,
  TChunterSpace,
  TDirectMessage,
  TInlineButton,
  TObjectChatPanel,
  TThreadMessage,
  TTypingInfo,
  TChunterExtension
} from './types'

export { chunterId } from '@hcengineering/chunter'
export { chunterOperation } from './migration'
export * from './types'

export function createModel (builder: Builder): void {
  builder.createModel(
    TChunterSpace,
    TChannel,
    TDirectMessage,
    TChatMessage,
    TThreadMessage,
    TChatMessageViewlet,
    TObjectChatPanel,
    TChatSyncInfo,
    TInlineButton,
    TTypingInfo,
    TChunterExtension
  )

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: chunter.string.ApplicationLabelChunter,
      locationDataResolver: chunter.function.LocationDataResolver,
      icon: chunter.icon.Chunter,
      alias: chunterId,
      hidden: false,
      component: chunter.component.Chat
    },
    chunter.app.Chunter
  )

  builder.createDoc(
    workbench.class.Widget,
    core.space.Model,
    {
      label: chunter.string.Chat,
      type: WidgetType.Flexible,
      icon: chunter.icon.Chunter,
      closeIfNoTabs: true,
      onTabClose: chunter.function.CloseChatWidgetTab,
      component: chunter.component.ChatWidget,
      tabComponent: chunter.component.ChatWidgetTab
    },
    chunter.ids.ChatWidget
  )

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: workbench.extensions.WorkbenchTabExtensions,
    component: chunter.component.WorkbenchTabExtension
  })

  const spaceClasses = [chunter.class.Channel, chunter.class.DirectMessage]

  spaceClasses.forEach((spaceClass) => {
    builder.mixin(spaceClass, core.class.Class, activity.mixin.ActivityDoc, {})

    builder.mixin(spaceClass, core.class.Class, view.mixin.LinkProvider, {
      encode: chunter.function.GetChunterSpaceLinkFragment
    })

    builder.mixin(spaceClass, core.class.Class, view.mixin.ObjectEditor, {
      editor: chunter.component.EditChannel
    })

    builder.mixin(spaceClass, core.class.Class, view.mixin.ObjectPanel, {
      component: chunter.component.ChannelPanel
    })
  })

  // Presenters
  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.ObjectIcon, {
    component: chunter.component.DirectIcon
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ObjectIcon, {
    component: chunter.component.ChannelIcon
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: chunter.function.DirectTitleProvider
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: chunter.function.ChannelTitleProvider
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.DmPresenter
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.ChannelPresenter
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.SpaceHeader, {
    header: chunter.component.DmHeader
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.SpaceHeader, {
    header: chunter.component.ChannelHeader
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: chunter.function.DmIdentifierProvider
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: chunter.component.ChatMessagesPresenter
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.ChatMessagePresenter
  })

  builder.mixin(chunter.class.ThreadMessage, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.ThreadMessagePresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: chunter.class.Channel,
      descriptor: view.viewlet.Table,
      configOptions: {
        strict: true
      },
      config: ['', 'topic', 'private', 'archived', 'members'],
      props: { enableChecking: false }
    },
    chunter.viewlet.Channels
  )

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ThreadMessage,
      objectClass: chunter.class.ChatMessage,
      label: chunter.string.RepliedToThread
    },
    chunter.ids.ThreadMessageViewlet
  )

  builder.mixin(chunter.class.Channel, core.class.Class, chunter.mixin.ObjectChatPanel, {
    ignoreKeys: ['archived', 'collaborators', 'lastMessage', 'pinned', 'topic', 'description', 'members', 'owners']
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, chunter.mixin.ObjectChatPanel, {
    ignoreKeys: ['archived', 'collaborators', 'lastMessage', 'pinned', 'topic', 'description', 'members', 'owners']
  })

  builder.createDoc(activity.class.ReplyProvider, core.space.Model, {
    function: chunter.function.ReplyToThread
  })

  builder.mixin(chunter.class.Channel, core.class.Class, view.mixin.ClassFilters, {
    filters: ['name', 'topic', 'private', 'archived', 'members'],
    strict: true
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, presentation.mixin.InstantTransactions, {
    txClasses: [core.class.TxCreateDoc]
  })

  // Activity
  builder.createDoc<ActivityMessageControl<ChunterSpace>>(activity.class.ActivityMessageControl, core.space.Model, {
    objectClass: chunter.class.Channel,
    skip: [
      { _class: core.class.TxMixin },
      { _class: core.class.TxCreateDoc, objectClass: { $ne: chunter.class.Channel } },
      { _class: core.class.TxRemoveDoc }
    ],
    allowedFields: ['members']
  })

  builder.createDoc<ActivityMessageControl<ChunterSpace>>(activity.class.ActivityMessageControl, core.space.Model, {
    objectClass: chunter.class.DirectMessage,
    skip: [{ _class: core.class.TxMixin }, { _class: core.class.TxCreateDoc }, { _class: core.class.TxRemoveDoc }],
    allowedFields: ['members']
  })

  builder.createDoc(activity.class.DocUpdateMessageViewlet, core.space.Model, {
    objectClass: chunter.class.Channel,
    action: 'create',
    component: chunter.activity.ChannelCreatedMessage
  })

  builder.createDoc(activity.class.DocUpdateMessageViewlet, core.space.Model, {
    objectClass: chunter.class.Channel,
    action: 'update',
    config: {
      members: {
        presenter: chunter.activity.MembersChangedMessage
      }
    }
  })

  builder.createDoc(activity.class.DocUpdateMessageViewlet, core.space.Model, {
    objectClass: chunter.class.DirectMessage,
    action: 'update',
    config: {
      members: {
        presenter: chunter.activity.MembersChangedMessage
      }
    }
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, activity.mixin.ActivityMessagePreview, {
    presenter: chunter.component.ChatMessagePreview
  })

  builder.mixin(chunter.class.ThreadMessage, core.class.Class, activity.mixin.ActivityMessagePreview, {
    presenter: chunter.component.ThreadMessagePreview
  })

  builder.mixin(activity.class.ActivityMessage, core.class.Class, view.mixin.LinkProvider, {
    encode: chunter.function.GetMessageLink
  })

  builder.mixin(chunter.class.ThreadMessage, core.class.Class, view.mixin.LinkProvider, {
    encode: chunter.function.GetThreadLink
  })

  builder.createDoc(activity.class.ActivityMessagesFilter, core.space.Model, {
    label: chunter.string.Comments,
    position: 60,
    filter: chunter.filter.ChatMessagesFilter
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: chunter.class.Channel,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: chunter.class.DirectMessage,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: activity.class.DocUpdateMessage,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: chunter.class.ChatMessage,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: activity.class.ActivityReference,
    components: { input: chunter.component.ChatMessageInput }
  })

  // Indexing
  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_CHUNTER,
    disabled: [{ _class: 1 }, { space: 1 }, { modifiedBy: 1 }, { createdBy: 1 }, { createdOn: -1 }]
  })

  defineActions(builder)
  defineNotifications(builder)
}

export default chunter
