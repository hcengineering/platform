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
import notification from '@hcengineering/notification'
import { SortingOrder, type WithLookup } from '@hcengineering/core'
import { createQuery, getClient } from '@hcengineering/presentation'
import { writable } from 'svelte/store'
import view from '@hcengineering/view'
import workbench, { type SpecialNavModel } from '@hcengineering/workbench'
import attachment, { type SavedAttachments } from '@hcengineering/attachment'
import activity from '@hcengineering/activity'

import { type ChatNavGroupModel } from './types'
import chunter from '../../plugin'

export const savedAttachmentsStore = writable<Array<WithLookup<SavedAttachments>>>([])

export const chatSpecials: SpecialNavModel[] = [
  {
    id: 'threads',
    label: chunter.string.Threads,
    icon: chunter.icon.Thread,
    component: chunter.component.Threads,
    position: 'top',
    notificationsCountProvider: chunter.function.GetUnreadThreadsCount
  },
  {
    id: 'saved',
    label: chunter.string.Saved,
    icon: activity.icon.Bookmark,
    position: 'top',
    component: chunter.component.SavedMessages
  },
  {
    id: 'chunterBrowser',
    label: chunter.string.ChunterBrowser,
    icon: view.icon.Database,
    component: chunter.component.ChunterBrowser,
    position: 'top'
  },
  {
    id: 'archive',
    component: workbench.component.Archive,
    icon: view.icon.Archive,
    label: workbench.string.Archive,
    position: 'top',
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
  }
]

export const chatNavGroupsModel: ChatNavGroupModel[] = [
  {
    id: 'channels',
    tabLabel: chunter.string.Channels,
    label: chunter.string.AllChannels,
    query: {
      attachedToClass: { $in: [chunter.class.Channel] }
    }
  },
  {
    id: 'direct',
    tabLabel: chunter.string.Direct,
    label: chunter.string.AllContacts,
    query: {
      attachedToClass: { $in: [chunter.class.DirectMessage] }
    }
  },
  {
    id: 'activity',
    tabLabel: activity.string.Activity,
    label: activity.string.Activity,
    query: {
      attachedToClass: {
        $nin: [chunter.class.DirectMessage, chunter.class.Channel, chunter.class.Backlink]
      }
    }
  }
]

export function loadSavedAttachments (): void {
  const client = getClient()

  if (client !== undefined) {
    const savedAttachmentsQuery = createQuery(true)

    savedAttachmentsQuery.query(
      attachment.class.SavedAttachments,
      {},
      (res) => {
        savedAttachmentsStore.set(res.filter(({ $lookup }) => $lookup?.attachedTo !== undefined))
      },
      { lookup: { attachedTo: attachment.class.Attachment }, sort: { modifiedOn: SortingOrder.Descending } }
    )
  } else {
    setTimeout(() => {
      loadSavedAttachments()
    }, 50)
  }
}
