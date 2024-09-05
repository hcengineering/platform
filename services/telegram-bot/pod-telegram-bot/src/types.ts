//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { Class, Ref, Timestamp } from '@hcengineering/core'
import { InboxNotification } from '@hcengineering/notification'
import { ChunterSpace } from '@hcengineering/chunter'
import { ActivityMessage } from '@hcengineering/activity'

export interface UserRecord {
  telegramId: number
  telegramUsername?: string
  email: string
  workspaces: string[]
}

export interface MessageRecord {
  notificationId?: Ref<InboxNotification>
  messageId?: Ref<ActivityMessage>
  workspace: string
  email: string
  telegramId: number
}

export interface ChannelRecord {
  workspace: string
  channelId: Ref<ChunterSpace>
  channelClass: Ref<Class<ChunterSpace>>
  name: string
  email: string
}

export interface ReplyRecord {
  notificationId?: Ref<InboxNotification>
  messageId?: Ref<ActivityMessage>
  telegramId: number
  replyId: number
}

export interface OtpRecord {
  telegramId: number
  telegramUsername?: string
  code: string
  expires: Timestamp
  createdOn: Timestamp
}

export interface PlatformFileInfo {
  filename: string
  type: string
  buffer: Buffer
}

export interface TelegramFileInfo {
  type: string
  url: string
  width: number
  height: number
  name?: string
  size?: number
}

export interface WorkspaceInfo {
  name: string
  url: string
  id: string
}
