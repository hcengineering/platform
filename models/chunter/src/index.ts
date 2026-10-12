//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2026 TraceX SAS.
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
import contact from '@hcengineering/contact'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import view from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { WidgetType } from '@hcengineering/workbench'

import { defineActions } from './actions'
import { defineNotifications } from './notifications'
import chunter from './plugin'
import {
  DOMAIN_CHUNTER,
  TChannel,
  TChatMessage,
  TChatMessageViewlet,
  TChatSyncInfo,
  TChunterSpace,
  TDirectMessage,
  TObjectChatPanel,
  TDefaultDiscussion,
  TDiscussion,
  TThreadMessage
} from './types'
import { AccountRole, SortingOrder } from '@hcengineering/core'

export { chunterId } from '@hcengineering/chunter'
export { chunterOperation } from './migration'
export * from './types'

export function createModel (builder: Builder): void {
  builder.createModel(
    TChunterSpace,
    TChannel,
    TDiscussion,
    TDefaultDiscussion,
    TDirectMessage,
    TChatMessage,
    TThreadMessage,
    TChatMessageViewlet,
    TObjectChatPanel,
    TChatSyncInfo
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
      spaceClasses: [chunter.class.Channel],
      component: chunter.component.Chat,
      notificationProvider: chunter.function.GetChunterNotificationStore
    },
    chunter.app.Chunter
  )

  builder.createDoc(
    core.class.ModulePermissionGroup,
    core.space.Model,
    {
      application: chunter.app.Chunter,
      role: AccountRole.Guest,
      permissions: [],
      spaceClass: chunter.class.Channel,
      enabled: true
    },
    chunter.ids.ModulePermissionGroup
  )

  builder.createDoc(
    core.class.ModulePermissionGroup,
    core.space.Model,
    {
      application: chunter.app.Chunter,
      role: AccountRole.ReadOnlyGuest,
      permissions: [],
      spaceClass: chunter.class.Channel,
      enabled: true
    },
    chunter.ids.ModulePermissionGroupReadOnlyGuest
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

  builder.mixin(chunter.class.DirectMessage, core.class.Class, core.mixin.TxAccessLevel, {
    createAccessLevel: AccountRole.Guest
  })

  builder.mixin(chunter.class.ChatMessage, core.class.Class, core.mixin.TxAccessLevel, {
    createAccessLevel: AccountRole.Guest
  })

  builder.mixin(chunter.class.ThreadMessage, core.class.Class, core.mixin.TxAccessLevel, {
    createAccessLevel: AccountRole.Guest
  })

  builder.mixin(chunter.class.Discussion, core.class.Class, activity.mixin.ActivityDoc, {})

  // Object access (foundations/server/docs/object-access-control.md).
  builder.mixin(chunter.class.Discussion, core.class.Class, core.mixin.ClassAccessPolicy, {
    membersField: 'members',
    parent: { field: 'attachedTo', classField: 'attachedToClass' }
  })

  // A reply points to the object of the thread directly, so the parent message is never looked up.
  builder.mixin(chunter.class.ThreadMessage, core.class.Class, core.mixin.AccessParent, {
    parents: [{ field: 'objectId', classField: 'objectClass' }]
  })

  builder.mixin(chunter.class.Discussion, core.class.Class, core.mixin.TxAccessLevel, {
    createAccessLevel: AccountRole.User,
    updateAccessLevel: AccountRole.User,
    removeAccessLevel: AccountRole.User
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

  builder.mixin(chunter.class.Discussion, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: chunter.component.DiscussionPresenter
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

  // Inbox shows the owner object as the context label and the discussion name as its title.
  builder.mixin(chunter.class.Discussion, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: chunter.function.DiscussionTitleProvider
  })

  builder.mixin(chunter.class.Discussion, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: chunter.function.DiscussionIdentifierProvider
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
      attachTo: chunter.class.Discussion,
      descriptor: view.viewlet.List,
      variant: 'attached',
      options: {
        lookup: {
          _id: { collaborators: core.class.Collaborator }
        }
      },
      configOptions: { strict: true },
      config: [
        {
          key: 'resolved',
          presenter: chunter.component.DiscussionStatusPresenter,
          label: core.string.Status,
          displayProps: { fixed: 'left', key: 'status' }
        },
        { key: '' },
        { key: 'comments', displayProps: { suffix: true, key: 'comments' } },
        { key: '', displayProps: { grow: true } },
        {
          key: '',
          presenter: chunter.component.DiscussionParticipantsPresenter,
          label: chunter.string.Members,
          displayProps: { key: 'participants', dividerBefore: true }
        },
        {
          key: '',
          presenter: chunter.component.DiscussionVisibilityPresenter,
          label: chunter.string.Visibility,
          displayProps: { fixed: 'right', key: 'visibility' }
        },
        { key: 'modifiedOn', displayProps: { fixed: 'right', key: 'modifiedOn', dividerBefore: true } }
      ],
      viewOptions: {
        groupBy: [],
        orderBy: [['modifiedOn', SortingOrder.Descending]],
        other: []
      }
    },
    chunter.viewlet.DiscussionList
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: chunter.class.Channel,
      descriptor: view.viewlet.Table,
      configOptions: {
        hiddenKeys: ['name', 'description']
      },
      config: ['', 'topic', 'private', 'archived', 'members'],
      props: { enableChecking: false },
      viewOptions: {
        groupBy: [],
        orderBy: [],
        other: [
          {
            key: 'hideArchived',
            type: 'toggle',
            defaultValue: true,
            actionTarget: 'options',
            action: view.function.HideArchived,
            label: view.string.HideArchived
          }
        ]
      }
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
    ignoreKeys: ['archived', 'collaborators', 'lastMessage', 'pinned', 'description', 'members', 'owners']
  })

  builder.mixin(chunter.class.DirectMessage, core.class.Class, chunter.mixin.ObjectChatPanel, {
    ignoreKeys: [
      'archived',
      'collaborators',
      'lastMessage',
      'pinned',
      'topic',
      'description',
      'members',
      'owners',
      'autoJoin',
      'autoJoinForRoles'
    ]
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
    skip: [
      { _class: core.class.TxMixin },
      { _class: core.class.TxCreateDoc },
      { _class: core.class.TxRemoveDoc },
      { _class: core.class.TxUpdateDoc }
    ]
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
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: chunter.class.DirectMessage,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  // Discussions open inside their owner panel (inbox, links) instead of the generic EditDoc.
  builder.mixin(chunter.class.Discussion, core.class.Class, view.mixin.ObjectPanel, {
    component: chunter.component.DiscussionPanel
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: chunter.class.Discussion,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: activity.class.DocUpdateMessage,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: chunter.class.ChatMessage,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: activity.class.ActivityReference,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  // Indexing
  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_CHUNTER,
    disabled: [{ _class: 1 }, { space: 1 }, { modifiedBy: 1 }, { createdBy: 1 }, { createdOn: -1 }]
  })

  // Extensions
  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: contact.extension.EmployeePopupActions,
    component: chunter.component.DirectMessageButton
  })
  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: activity.extension.ActivityEmployeePresenter,
    component: chunter.component.EmployeePresenter
  })

  defineActions(builder)
  defineNotifications(builder)

  builder.mixin(chunter.class.ChatSyncInfo, core.class.Class, core.mixin.IndexConfiguration, {
    indexes: [],
    searchDisabled: true
  })
}

export default chunter
