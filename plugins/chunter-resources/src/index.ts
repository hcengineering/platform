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

import { writable } from 'svelte/store'
import chunter, { type Channel, type ChatMessage, type DirectMessage } from '@hcengineering/chunter'
import { type Resources } from '@hcengineering/platform'
import { MessageBox, getClient } from '@hcengineering/presentation'
import { getLocation, navigate, showPopup } from '@hcengineering/ui'
import { type ActivityMessage } from '@hcengineering/activity'

import ChannelPresenter from './components/ChannelPresenter.svelte'
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
import ThreadMessagePreview from './components/threads/ThreadMessagePreview.svelte'
import ChatMessagePreview from './components/chat-message/ChatMessagePreview.svelte'

import {
  ChannelTitleProvider,
  DirectTitleProvider,
  canDeleteMessage,
  dmIdentifierProvider,
  getDmName,
  getTitle,
  getUnreadThreadsCount,
  canCopyMessageLink,
  leaveChannelAction,
  removeChannelAction,
  canReplyToThread
} from './utils'
import {
  chunterSpaceLinkFragmentProvider,
  getThreadLink,
  getMessageLink,
  replyToThread,
  getMessageLocation
} from './navigation'

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

export const userSearch = writable('')

export async function chunterBrowserVisible (): Promise<boolean> {
  return false
}

export function chatMessagesFilter (message: ActivityMessage): boolean {
  return message._class === chunter.class.ChatMessage
}

export async function deleteChatMessage (message: ChatMessage): Promise<void> {
  const client = getClient()

  await client.remove(message)
}

export { replyToThread } from './navigation'

export default async (): Promise<Resources> => ({
  filter: {
    ChatMessagesFilter: chatMessagesFilter
  },
  component: {
    CreateChannel,
    CreateDirectChat,
    ThreadParentPresenter,
    ThreadViewPanel,
    ChannelHeader,
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
    ThreadMessagePreview,
    ChatMessagePreview
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
    GetThreadLink: getThreadLink,
    ReplyToThread: replyToThread,
    CanReplyToThread: canReplyToThread,
    GetMessageLink: getMessageLocation
  },
  actionImpl: {
    ArchiveChannel,
    UnarchiveChannel,
    ConvertDmToPrivateChannel,
    DeleteChatMessage: deleteChatMessage,
    LeaveChannel: leaveChannelAction,
    RemoveChannel: removeChannelAction,
    ReplyToThread: replyToThread
  }
})
