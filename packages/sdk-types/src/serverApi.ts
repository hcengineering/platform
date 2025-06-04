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
  Notification,
  FindLabelsParams,
  Label,
  FindCollaboratorsParams,
  Collaborator
} from '@hcengineering/communication-types'
import type { Account } from '@hcengineering/core'

import type { EventResult, RequestEvent } from './event'

export interface SessionData {
  sessionId?: string
  account: Account
}

export interface ServerApi {
  findMessages: (session: SessionData, params: FindMessagesParams, queryId?: number | string) => Promise<Message[]>
  findMessagesGroups: (session: SessionData, params: FindMessagesGroupsParams) => Promise<MessagesGroup[]>
  findNotificationContexts: (
    session: SessionData,
    params: FindNotificationContextParams,
    queryId?: number | string
  ) => Promise<NotificationContext[]>
  findNotifications: (
    session: SessionData,
    params: FindNotificationsParams,
    queryId?: number | string
  ) => Promise<Notification[]>

  findLabels: (session: SessionData, params: FindLabelsParams) => Promise<Label[]>
  findCollaborators: (session: SessionData, params: FindCollaboratorsParams) => Promise<Collaborator[]>

  event: (session: SessionData, event: RequestEvent) => Promise<EventResult>

  unsubscribeQuery: (session: SessionData, id: number) => Promise<void>

  closeSession: (sessionId: string) => Promise<void>
  close: () => Promise<void>
}
