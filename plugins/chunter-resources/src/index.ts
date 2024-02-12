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

import { get, writable } from 'svelte/store'
import chunter, {
  type Backlink,
  type Channel,
  type ChatMessage,
  chunterId,
  type DirectMessage
} from '@hcengineering/chunter'
import {
  type Data,
  type Doc,
  type DocumentQuery,
  getCurrentAccount,
  type Ref,
  type RelatedDocument
} from '@hcengineering/core'
import { type IntlString, type Resources, translate } from '@hcengineering/platform'
import { MessageBox, getClient } from '@hcengineering/presentation'
import { closePanel, getCurrentLocation, getLocation, navigate, showPopup } from '@hcengineering/ui'
import activity, { type ActivityMessage, type DocUpdateMessage } from '@hcengineering/activity'
import notification, { type DocNotifyContext, inboxId } from '@hcengineering/notification'

import ChannelPresenter from './components/ChannelPresenter.svelte'
import ChannelView from './components/ChannelView.svelte'
import ChannelPanel from './components/ChannelPanel.svelte'
import ChunterBrowser from './components/chat/specials/ChunterBrowser.svelte'
import ConvertDmToPrivateChannelModal from './components/ConvertDmToPrivateChannel.svelte'
import CreateChannel from './components/chat/create/CreateChannel.svelte'
import CreateDirectChat from './components/chat/create/CreateDirectChat.svelte'
import DirectMessagePresenter from './components/DirectMessagePresenter.svelte'
import DmHeader from './components/DmHeader.svelte'
import DmPresenter from './components/DmPresenter.svelte'
import DirectMessageInput from './components/DirectMessageInput.svelte'
import EditChannel from './components/EditChannel.svelte'
import ChannelPreview from './components/ChannelPreview.svelte'
import ThreadView from './components/threads/ThreadView.svelte'
import ThreadViewPanel from './components/threads/ThreadViewPanel.svelte'
import BacklinkContent from './components/BacklinkContent.svelte'
import BacklinkReference from './components/BacklinkReference.svelte'
import BacklinkCreatedLabel from './components/activity/BacklinkCreatedLabel.svelte'
import ChatMessagePresenter from './components/chat-message/ChatMessagePresenter.svelte'
import ChatMessageInput from './components/chat-message/ChatMessageInput.svelte'
import ChatMessagesPresenter from './components/chat-message/ChatMessagesPresenter.svelte'
import Chat from './components/chat/Chat.svelte'
import ThreadMessagePresenter from './components/threads/ThreadMessagePresenter.svelte'
import ThreadParentPresenter from './components/threads/ThreadParentPresenter.svelte'
import ChannelHeader from './components/ChannelHeader.svelte'
import SavedMessages from './components/chat/specials/SavedMessages.svelte'
import Threads from './components/threads/Threads.svelte'
import DirectIcon from './components/DirectIcon.svelte'
import ChannelIcon from './components/ChannelIcon.svelte'
import ThreadNotificationPresenter from './components/notification/ThreadNotificationPresenter.svelte'
import ChatMessageNotificationLabel from './components/notification/ChatMessageNotificationLabel.svelte'
import ChatAside from './components/chat/ChatAside.svelte'
import Replies from './components/Replies.svelte'
import ReplyToThreadAction from './components/ReplyToThreadAction.svelte'

import { updateBacklinksList } from './backlinks'
import {
  ChannelTitleProvider,
  DirectTitleProvider,
  canDeleteMessage,
  chunterSpaceLinkFragmentProvider,
  dmIdentifierProvider,
  getDmName,
  getMessageLink,
  getTitle,
  getUnreadThreadsCount,
  canCopyMessageLink,
  buildThreadLink,
  getThreadLink
} from './utils'
import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
import { type Mode } from './components/chat/types'

export { default as ChatMessagesPresenter } from './components/chat-message/ChatMessagesPresenter.svelte'
export { default as ChatMessagePopup } from './components/chat-message/ChatMessagePopup.svelte'
export { default as ChatMessageInput } from './components/chat-message/ChatMessageInput.svelte'
export { default as Header } from './components/Header.svelte'
export { default as ThreadView } from './components/threads/ThreadView.svelte'

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

        const loc = getLocation()
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

async function OpenChannel (
  notifyContext?: DocNotifyContext,
  evt?: Event,
  props?: { mode?: Mode, _id: Ref<DocNotifyContext> }
): Promise<void> {
  evt?.preventDefault()

  closePanel()

  const loc = getCurrentLocation()
  const id = notifyContext?._id ?? props?._id

  if (id === undefined) {
    return
  }

  if (loc.path[3] === id) {
    return
  }

  loc.path[3] = id
  loc.path.length = 4
  loc.query = { mode: props?.mode ?? loc.query?.mode ?? null, message: null }

  loc.fragment = undefined

  navigate(loc)
}

async function UnpinAllChannels (contexts: DocNotifyContext[]): Promise<void> {
  const client = getClient()
  await Promise.all(contexts.map(async (context) => await client.update(context, { isPinned: false })))
}

export const userSearch = writable('')

export async function chunterBrowserVisible (): Promise<boolean> {
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

export function backlinksFilter (message: ActivityMessage, _class?: Ref<Doc>): boolean {
  if (message._class === activity.class.DocUpdateMessage) {
    return (message as DocUpdateMessage).objectClass === chunter.class.Backlink
  }
  return false
}

export function chatMessagesFilter (message: ActivityMessage): boolean {
  return message._class === chunter.class.ChatMessage
}

export async function deleteChatMessage (message: ChatMessage): Promise<void> {
  const client = getClient()

  await client.remove(message)
}

export async function replyToThread (message: ActivityMessage): Promise<void> {
  const loc = getCurrentLocation()
  const client = getClient()

  const inboxClient = InboxNotificationsClientImpl.getClient()

  let contextId: Ref<DocNotifyContext> | undefined = get(inboxClient.docNotifyContextByDoc).get(message.attachedTo)?._id

  if (contextId === undefined) {
    contextId = await client.createDoc(notification.class.DocNotifyContext, message.space, {
      attachedTo: message.attachedTo,
      attachedToClass: message.attachedToClass,
      user: getCurrentAccount()._id,
      hidden: false,
      lastViewedTimestamp: Date.now()
    })
  }

  if (contextId === undefined) {
    return
  }

  if (loc.path[2] !== inboxId) {
    loc.path[2] = chunterId
  }

  navigate(buildThreadLink(loc, contextId, message._id))
}

export default async (): Promise<Resources> => ({
  filter: {
    BacklinksFilter: backlinksFilter,
    ChatMessagesFilter: chatMessagesFilter
  },
  component: {
    CreateChannel,
    CreateDirectChat,
    ThreadParentPresenter,
    ThreadViewPanel,
    ChannelHeader,
    ChannelView,
    ChannelPanel,
    ChannelPresenter,
    DirectMessagePresenter,
    ChannelPreview,
    ChunterBrowser,
    DmHeader,
    DmPresenter,
    DirectMessageInput,
    EditChannel,
    ThreadView,
    SavedMessages,
    BacklinkContent,
    BacklinkReference,
    ChatMessagePresenter,
    ChatMessageInput,
    ChatMessagesPresenter,
    Chat,
    ThreadMessagePresenter,
    Threads,
    DirectIcon,
    ChannelIcon,
    ChatMessageNotificationLabel,
    ThreadNotificationPresenter,
    ChatAside,
    Replies,
    ReplyToThreadAction
  },
  function: {
    GetDmName: getDmName,
    ChunterBrowserVisible: chunterBrowserVisible,
    GetFragment: getTitle,
    GetLink: getMessageLink,
    DirectTitleProvider,
    ChannelTitleProvider,
    DmIdentifierProvider: dmIdentifierProvider,
    CanDeleteMessage: canDeleteMessage,
    CanCopyMessageLink: canCopyMessageLink,
    GetChunterSpaceLinkFragment: chunterSpaceLinkFragmentProvider,
    GetUnreadThreadsCount: getUnreadThreadsCount,
    GetThreadLink: getThreadLink
  },
  activity: {
    BacklinkCreatedLabel
  },
  actionImpl: {
    ArchiveChannel,
    UnarchiveChannel,
    ConvertDmToPrivateChannel,
    DeleteChatMessage: deleteChatMessage,
    OpenChannel,
    UnpinAllChannels
  },
  backreference: {
    Update: update
  }
})
