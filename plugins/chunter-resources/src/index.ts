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

import chunter, {
  Backlink,
  Channel,
  ChunterMessage,
  ChunterSpace,
  DirectMessage,
  Message,
  ThreadMessage
} from '@hcengineering/chunter'
import core, { Data, Doc, DocumentQuery, Ref, RelatedDocument, Space } from '@hcengineering/core'
import { NotificationClientImpl } from '@hcengineering/notification-resources'
import { IntlString, Resources, translate } from '@hcengineering/platform'
import preference from '@hcengineering/preference'
import { getClient, MessageBox } from '@hcengineering/presentation'
import { location, navigate, showPopup } from '@hcengineering/ui'
import TxBacklinkCreate from './components/activity/TxBacklinkCreate.svelte'
import TxBacklinkReference from './components/activity/TxBacklinkReference.svelte'
import TxCommentCreate from './components/activity/TxCommentCreate.svelte'
import TxMessageCreate from './components/activity/TxMessageCreate.svelte'
import ChannelHeader from './components/ChannelHeader.svelte'
import ChannelPresenter from './components/ChannelPresenter.svelte'
import ChannelView from './components/ChannelView.svelte'
import ChunterBrowser from './components/ChunterBrowser.svelte'
import CommentInput from './components/CommentInput.svelte'
import CommentPopup from './components/CommentPopup.svelte'
import CommentPresenter from './components/CommentPresenter.svelte'
import CommentsPresenter from './components/CommentsPresenter.svelte'
import ConvertDmToPrivateChannelModal from './components/ConvertDmToPrivateChannel.svelte'
import CreateChannel from './components/CreateChannel.svelte'
import CreateDirectMessage from './components/CreateDirectMessage.svelte'
import DmHeader from './components/DmHeader.svelte'
import DmPresenter from './components/DmPresenter.svelte'
import EditChannel from './components/EditChannel.svelte'
import MessagePresenter from './components/MessagePresenter.svelte'
import SavedMessages from './components/SavedMessages.svelte'
import Threads from './components/Threads.svelte'
import ThreadView from './components/ThreadView.svelte'

import { get, writable } from 'svelte/store'
import { DisplayTx } from '../../activity/lib'
import { updateBacklinksList } from './backlinks'
import { getDmName, getTitle, getLink, resolveLocation } from './utils'

export { default as Header } from './components/Header.svelte'
export { classIcon } from './utils'
export { CommentPopup, CommentsPresenter }

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

type PinnedChunterSpace = ChunterSpace

async function PinMessage (message: ChunterMessage): Promise<void> {
  const client = getClient()

  await client.updateDoc<PinnedChunterSpace>(
    chunter.class.ChunterSpace,
    core.space.Space,
    message.space as Ref<PinnedChunterSpace>,
    {
      $push: { pinned: message._id }
    }
  )
}

export async function UnpinMessage (message: ChunterMessage): Promise<void> {
  const client = getClient()

  await client.updateDoc<PinnedChunterSpace>(
    chunter.class.ChunterSpace,
    core.space.Space,
    message.space as Ref<PinnedChunterSpace>,
    {
      $pull: { pinned: message._id }
    }
  )
}

export async function ArchiveChannel (channel: Channel, evt: any, afterArchive?: () => void): Promise<void> {
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

        const loc = get(location)
        if (loc.path[3] === channel._id) {
          loc.path.length = 3
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

export const userSearch = writable('')

export async function chunterBrowserVisible (spaces: Space[]): Promise<boolean> {
  return false
}

async function update (source: Doc, key: string, target: RelatedDocument[], msg: IntlString): Promise<void> {
  const message = await translate(msg, {})
  const backlinks: Array<Data<Backlink>> = target.map((it) => ({
    backlinkId: source._id,
    backlinkClass: source._class,
    attachedTo: it._id,
    attachedToClass: it._class,
    message,
    collection: key
  }))

  const q: DocumentQuery<Backlink> = { backlinkId: source._id, backlinkClass: source._class, collection: key }

  await updateBacklinksList(getClient(), q, backlinks)
}

export function commentsFilter (tx: DisplayTx, _class?: Ref<Doc>): boolean {
  return tx.tx.objectClass === chunter.class.Comment
}

export function backlinksFilter (tx: DisplayTx, _class?: Ref<Doc>): boolean {
  return tx.tx.objectClass === chunter.class.Backlink
}

export default async (): Promise<Resources> => ({
  filter: {
    CommentsFilter: commentsFilter,
    BacklinksFilter: backlinksFilter
  },
  component: {
    CommentInput,
    CreateChannel,
    CreateDirectMessage,
    ChannelHeader,
    ChannelView,
    CommentPresenter,
    CommentsPresenter,
    ChannelPresenter,
    MessagePresenter,
    ChunterBrowser,
    DmHeader,
    DmPresenter,
    EditChannel,
    Threads,
    ThreadView,
    SavedMessages
  },
  function: {
    GetDmName: getDmName,
    ChunterBrowserVisible: chunterBrowserVisible,
    GetFragment: getTitle,
    GetLink: getLink
  },
  activity: {
    TxCommentCreate,
    TxBacklinkCreate,
    TxBacklinkReference,
    TxMessageCreate
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
  },
  backreference: {
    Update: update
  },
  resolver: {
    Location: resolveLocation
  }
})
