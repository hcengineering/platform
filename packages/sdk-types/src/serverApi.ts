//
// Copyright © 2025 Hardcore Engineering Inc.
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

import type {
  FindMessagesGroupsParams,
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Message,
  MessagesGroup,
  NotificationContext,
  Notification
} from '@hcengineering/communication-types'
import type { Account } from '@hcengineering/core'

import type { EventResult, RequestEvent } from './requestEvent.ts'

export interface ConnectionInfo {
  sessionId?: string
  account: Account
}

export interface ServerApi {
  findMessages(info: ConnectionInfo, params: FindMessagesParams, queryId?: number | string): Promise<Message[]>
  findMessagesGroups(info: ConnectionInfo, params: FindMessagesGroupsParams): Promise<MessagesGroup[]>
  findNotificationContexts(
    info: ConnectionInfo,
    params: FindNotificationContextParams,
    queryId?: number | string
  ): Promise<NotificationContext[]>
  findNotifications(
    info: ConnectionInfo,
    params: FindNotificationsParams,
    queryId?: number | string
  ): Promise<Notification[]>

  event(info: ConnectionInfo, event: RequestEvent): Promise<EventResult>

  unsubscribeQuery(info: ConnectionInfo, id: number): Promise<void>

  closeSession(sessionId: string): Promise<void>
  close(): Promise<void>
}
