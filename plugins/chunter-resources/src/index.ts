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

import core, { Space } from '@anticrm/core'
import chunter, { ChunterSpace, Channel, ChunterMessage, Message, ThreadMessage, DirectMessage } from '@anticrm/chunter'
import { NotificationClientImpl } from '@anticrm/notification-resources'
import { Resources } from '@anticrm/platform'
import preference from '@anticrm/preference'
import { getClient, MessageBox } from '@anticrm/presentation'
import { getCurrentLocation, navigate, showPopup } from '@anticrm/ui'
import TxBacklinkCreate from './components/activity/TxBacklinkCreate.svelte'
import TxBacklinkReference from './components/activity/TxBacklinkReference.svelte'
import TxCommentCreate from './components/activity/TxCommentCreate.svelte'
import ChannelPresenter from './components/ChannelPresenter.svelte'
import DmPresenter from './components/DmPresenter.svelte'
import ChannelView from './components/ChannelView.svelte'
import ChannelHeader from './components/ChannelHeader.svelte'
import DmHeader from './components/DmHeader.svelte'
import CommentInput from './components/CommentInput.svelte'
import CommentPresenter from './components/CommentPresenter.svelte'
import CommentsPresenter from './components/CommentsPresenter.svelte'
import CreateChannel from './components/CreateChannel.svelte'
import CreateDirectMessage from './components/CreateDirectMessage.svelte'
import EditChannel from './components/EditChannel.svelte'
import MessagesBrowser from './components/MessagesBrowser.svelte'
import ThreadView from './components/ThreadView.svelte'
import Threads from './components/Threads.svelte'
import SavedMessages from './components/SavedMessages.svelte'
import ConvertDmToPrivateChannelModal from './components/ConvertDmToPrivateChannel.svelte'

import { getDmName } from './utils'

export { default as Header } from './components/Header.svelte'
export { classIcon } from './utils'
export { CommentsPresenter }

async function MarkUnread (object: Message): Promise<void> {
  const client = NotificationClientImpl.getClient()
  await client.updateLastView(object.space, chunter.class.ChunterSpace, object.createOn - 1, true)
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

  await client.updateDoc<ChunterSpace>(chunter.class.ChunterSpace, core.space.Space, message.space, {
    $push: { pinned: message._id }
  })
}

export async function UnpinMessage (message: ChunterMessage): Promise<void> {
  const client = getClient()

  await client.updateDoc<ChunterSpace>(chunter.class.ChunterSpace, core.space.Space, message.space, {
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

async function ConvertDmToPrivateChannel (dm: DirectMessage): Promise<void> {
  showPopup(ConvertDmToPrivateChannelModal, {
    label: chunter.string.ConvertToPrivate,
    dm
  })
}

export async function AddMessageToSaved (message: ChunterMessage): Promise<void> {
  const client = getClient()

  await client.createDoc(chunter.class.SavedMessages, preference.space.Preference, {
    attachedTo: message._id
  })
}

export async function DeleteMessageFromSaved (message: ChunterMessage): Promise<void> {
  const client = getClient()

  const current = await client.findOne(chunter.class.SavedMessages, { attachedTo: message._id })
  if (current !== undefined) {
    await client.remove(current)
  }
}

export let userSearch: string = ''

export function updateUserSearch (userSearch_: string): void {
  userSearch = userSearch_
}

export function messageBrowserVisible (spaces: Space[]): boolean {
  return false
}

export default async (): Promise<Resources> => ({
  component: {
    CommentInput,
    CreateChannel,
    CreateDirectMessage,
    ChannelHeader,
    DmHeader,
    ChannelView,
    CommentPresenter,
    CommentsPresenter,
    ChannelPresenter,
    DmPresenter,
    EditChannel,
    MessagesBrowser,
    Threads,
    ThreadView,
    SavedMessages
  },
  function: {
    GetDmName: getDmName,
    MessageBrowserVisible: messageBrowserVisible
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
    UnarchiveChannel,
    ConvertDmToPrivateChannel
  }
})
