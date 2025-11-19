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
  CardID,
  Collaborator, FindCollaboratorsParams,
  FindLabelsParams,
  FindMessagesMetaParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Label, MessageMeta,
  Notification,
  NotificationContext, WithTotal
} from '@hcengineering/communication-types'

import type { EventResult, Event } from './events/event'

export interface FindClient {
  onEvent: (event: Event) => void
  onRequest: (event: Event, promise: Promise<EventResult>) => void

  findMessagesMeta: (params: FindMessagesMetaParams) => Promise<MessageMeta[]>

  findNotificationContexts: (params: FindNotificationContextParams, queryId?: number) => Promise<NotificationContext[]>
  findNotifications: (params: FindNotificationsParams, queryId?: number) => Promise<WithTotal<Notification>>
  findLabels: (params: FindLabelsParams, queryId?: number) => Promise<Label[]>
  findCollaborators: (params: FindCollaboratorsParams, queryId?: number) => Promise<Collaborator[]>

  subscribeCard: (cardId: CardID, subscription: string | number) => Promise<void>
  unsubscribeCard: (cardId: CardID, subscription: string | number) => Promise<void>
}
