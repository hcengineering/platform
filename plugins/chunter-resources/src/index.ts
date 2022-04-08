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

import chunter, { Comment, Message, ThreadMessage } from '@anticrm/chunter'
import { NotificationClientImpl } from '@anticrm/notification-resources'
import { Resources } from '@anticrm/platform'
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
import ThreadView from './components/ThreadView.svelte'

export { CommentsPresenter }

async function MarkUnread (object: Message): Promise<void> {
  const client = NotificationClientImpl.getClient()
  await client.updateLastView(object.space, chunter.class.Channel, object.createOn - 1, true)
}

async function MarkCommentUnread (object: ThreadMessage): Promise<void> {
  const client = NotificationClientImpl.getClient()
  const value = object.modifiedOn - 1
  await client.updateLastView(object.attachedTo, object.attachedToClass, value, true)
}

async function SubscribeMessage (object: Message): Promise<void> {
  const client = NotificationClientImpl.getClient()
  await client.updateLastView(object._id, object._class, undefined, true)
}

async function SubscribeComment (object: ThreadMessage): Promise<void> {
  const client = NotificationClientImpl.getClient()
  await client.updateLastView(object.attachedTo, object.attachedToClass, undefined, true)
}

async function UnsubscribeMessage (object: Message): Promise<void> {
  const client = NotificationClientImpl.getClient()
  await client.unsubscribe(object._id)
}

async function UnsubscribeComment (object: ThreadMessage): Promise<void> {
  const client = NotificationClientImpl.getClient()
  await client.unsubscribe(object.attachedTo)
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
    ThreadView
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
    SubscribeComment,
    UnsubscribeMessage,
    UnsubscribeComment
  }
})
