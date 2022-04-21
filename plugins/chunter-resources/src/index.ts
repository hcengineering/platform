//
// Copyright © 2020 Anticrm Platform Contributors.
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

import core from '@anticrm/core'
import chunter, { Channel, ChunterMessage, Message, ThreadMessage } from '@anticrm/chunter'
import { NotificationClientImpl } from '@anticrm/notification-resources'
import { Resources } from '@anticrm/platform'
import { getClient, MessageBox } from '@anticrm/presentation'
import { getCurrentLocation, navigate, showPopup } from '@anticrm/ui'
import TxBacklinkCreate from './components/activity/TxBacklinkCreate.svelte'
import TxBacklinkReference from './components/activity/TxBacklinkReference.svelte'
import TxCommentCreate from './components/activity/TxCommentCreate.svelte'
import ChannelPresenter from './components/ChannelPresenter.svelte'
import ChannelView from './components/ChannelView.svelte'
import ChannelHeader from './components/ChannelHeader.svelte'
import CommentInput from './components/CommentInput.svelte'
import CommentPresenter from './components/CommentPresenter.svelte'
import CommentsPresenter from './components/CommentsPresenter.svelte'
import CreateChannel from './components/CreateChannel.svelte'
import EditChannel from './components/EditChannel.svelte'
import FileBrowser from './components/FileBrowser.svelte'
import ThreadView from './components/ThreadView.svelte'
import Threads from './components/Threads.svelte'
import SavedMessages from './components/SavedMessages.svelte'
import preference from '@anticrm/preference'

export { CommentsPresenter }

async function MarkUnread (object: Message): Promise<void> {
  const client = NotificationClientImpl.getClient()
  await client.updateLastView(object.space, chunter.class.Channel, object.createOn - 1, true)
}

async function MarkCommentUnread (object: ThreadMessage): Promise<void> {
  const client = NotificationClientImpl.getClient()
  await client.updateLastView(object.attachedTo, object.attachedToClass, object.createOn - 1, true)
}

async function SubscribeMessage (object: Message): Promise<void> {
  const client = getClient()
  const notificationClient = NotificationClientImpl.getClient()
  if (client.getHierarchy().isDerived(object._class, chunter.class.ThreadMessage)) {
    await notificationClient.updateLastView(object.attachedTo, object.attachedToClass, undefined, true)
  } else {
    await notificationClient.updateLastView(object._id, object._class, undefined, true)
  }
}

async function UnsubscribeMessage (object: Message): Promise<void> {
  const client = getClient()
  const notificationClient = NotificationClientImpl.getClient()
  if (client.getHierarchy().isDerived(object._class, chunter.class.ThreadMessage)) {
    await notificationClient.unsubscribe(object.attachedTo)
  } else {
    await notificationClient.unsubscribe(object._id)
  }
}

async function PinMessage (message: ChunterMessage): Promise<void> {
  const client = getClient()

  await client.updateDoc<Channel>(chunter.class.Channel, core.space.Space, message.space, {
    $push: { pinned: message._id }
  })
}

export async function UnpinMessage (message: ChunterMessage): Promise<void> {
  const client = getClient()

  await client.updateDoc<Channel>(chunter.class.Channel, core.space.Space, message.space, {
    $pull: { pinned: message._id }
  })
}

export async function ArchiveChannel (channel: Channel, afterArchive?: () => void): Promise<void> {
  showPopup(
    MessageBox,
    {
      label: chunter.string.ArchiveChannel,
      message: chunter.string.ArchiveConfirm
    },
    undefined,
    (result: boolean) => {
      if (result) {
        const client = getClient()

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        client.update(channel, { archived: true })
        if (afterArchive != null) afterArchive()

        const loc = getCurrentLocation()
        if (loc.path[2] === channel._id) {
          loc.path.length = 2
          navigate(loc)
        }
      }
    }
  )
}

async function UnarchiveChannel (channel: Channel): Promise<void> {
  showPopup(
    MessageBox,
    {
      label: chunter.string.UnarchiveChannel,
      message: chunter.string.UnarchiveConfirm
    },
    undefined,
    (result: boolean) => {
      if (result) {
        const client = getClient()

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        client.update(channel, { archived: false })
      }
    }
  )
}

export async function AddToSaved (message: ChunterMessage): Promise<void> {
  const client = getClient()

  await client.createDoc(chunter.class.SavedMessages, preference.space.Preference, {
    attachedTo: message._id
  })
}

export async function DeleteFromSaved (message: ChunterMessage): Promise<void> {
  const client = getClient()

  const current = await client.findOne(chunter.class.SavedMessages, { attachedTo: message._id })
  if (current !== undefined) {
    await client.remove(current)
  }
}

export default async (): Promise<Resources> => ({
  component: {
    CommentInput,
    CreateChannel,
    ChannelHeader,
    ChannelView,
    CommentPresenter,
    CommentsPresenter,
    ChannelPresenter,
    EditChannel,
    FileBrowser,
    Threads,
    ThreadView,
    SavedMessages
  },
  activity: {
    TxCommentCreate,
    TxBacklinkCreate,
    TxBacklinkReference
  },
  actionImpl: {
    MarkUnread,
    MarkCommentUnread,
    SubscribeMessage,
    UnsubscribeMessage,
    PinMessage,
    UnpinMessage,
    ArchiveChannel,
    UnarchiveChannel
  }
})
