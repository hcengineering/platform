//
// Copyright © 2023 Hardcore Engineering Inc.
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
import notification, { type DocNotifyContext } from '@hcengineering/notification'
import { type Doc, type Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'

import view from '@hcengineering/view'
import workbench, { type SpecialNavModel } from '@hcengineering/workbench'
import attachment from '@hcengineering/attachment'
import activity from '@hcengineering/activity'

import { type ChatNavGroupModel } from './types'
import chunter from '../../plugin'

export const chatSpecials: SpecialNavModel[] = [
  {
    id: 'channelBrowser',
    component: workbench.component.SpaceBrowser,
    icon: chunter.icon.ChannelBrowser,
    label: chunter.string.ChannelBrowser,
    position: 'top',
    componentProps: {
      _class: chunter.class.Channel,
      label: chunter.string.ChannelBrowser,
      createItemDialog: chunter.component.CreateChannel,
      createItemLabel: chunter.string.CreateChannel
    }
  },
  {
    id: 'fileBrowser',
    label: attachment.string.FileBrowser,
    icon: attachment.icon.FileBrowser,
    component: attachment.component.FileBrowser,
    position: 'top',
    componentProps: {
      requestedSpaceClasses: [chunter.class.Channel, chunter.class.DirectMessage]
    }
  },
  {
    id: 'threads',
    label: chunter.string.Threads,
    icon: chunter.icon.Thread,
    component: chunter.component.Threads,
    position: 'top'
  },
  {
    id: 'saved',
    label: chunter.string.SavedItems,
    icon: activity.icon.Bookmark,
    position: 'bottom',
    component: chunter.component.SavedMessages
  },
  {
    id: 'archive',
    component: workbench.component.Archive,
    icon: view.icon.Archive,
    label: workbench.string.Archive,
    position: 'bottom',
    componentProps: {
      _class: notification.class.DocNotifyContext,
      config: [
        { key: '', label: chunter.string.ChannelName },
        { key: 'attachedToClass', label: view.string.Type },
        'modifiedOn'
      ],
      baseMenuClass: notification.class.DocNotifyContext,
      query: {
        _class: notification.class.DocNotifyContext,
        hidden: true
      }
    },
    visibleIf: notification.function.HasHiddenDocNotifyContext
  },
  {
    id: 'chunterBrowser',
    label: chunter.string.ChunterBrowser,
    icon: workbench.icon.Search,
    component: chunter.component.ChunterBrowser,
    visibleIf: chunter.function.ChunterBrowserVisible
  }
]

export const chatNavGroups: ChatNavGroupModel[] = [
  {
    id: 'pinned',
    label: notification.string.Pinned,
    hideEmpty: true,
    query: {
      isPinned: true
    },
    actions: [
      {
        icon: view.icon.Delete,
        label: view.string.Delete,
        action: chunter.actionImpl.UnpinAllChannels
      }
    ]
  },
  {
    id: 'documents',
    label: chunter.string.Docs,
    query: {
      attachedToClass: {
        $nin: [
          chunter.class.DirectMessage,
          chunter.class.Channel,
          activity.class.DocUpdateMessage,
          chunter.class.ChatMessage,
          chunter.class.ThreadMessage,
          chunter.class.Backlink
        ]
      },
      isPinned: { $ne: true }
    }
  },
  {
    id: 'channels',
    label: chunter.string.Channels,
    query: {
      attachedToClass: { $in: [chunter.class.Channel] },
      isPinned: { $ne: true }
    },
    addLabel: chunter.string.CreateChannel,
    addComponent: chunter.component.CreateChannel
  },
  {
    id: 'direct',
    label: chunter.string.DirectMessages,
    query: {
      attachedToClass: { $in: [chunter.class.DirectMessage] },
      isPinned: { $ne: true }
    },
    addLabel: chunter.string.NewDirectMessage,
    addComponent: chunter.component.CreateDirectMessage
  }
]

export async function getDocByNotifyContext (
  docNotifyContexts: DocNotifyContext[]
): Promise<Map<Ref<DocNotifyContext>, Doc>> {
  const client = getClient()

  const docs = await Promise.all(
    docNotifyContexts.map(
      async ({ attachedTo, attachedToClass }) => await client.findOne(attachedToClass, { _id: attachedTo })
    )
  )

  const result: Map<Ref<DocNotifyContext>, Doc> = new Map<Ref<DocNotifyContext>, Doc>()

  for (const doc of docs) {
    if (doc === undefined) {
      continue
    }

    const context = docNotifyContexts.find(({ attachedTo }) => attachedTo === doc._id)

    if (context === undefined) {
      continue
    }

    result.set(context._id, doc)
  }

  return result
}
