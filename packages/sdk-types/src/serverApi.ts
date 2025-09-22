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
  FindNotificationContextParams,
  FindNotificationsParams,
  NotificationContext,
  Notification,
  FindLabelsParams,
  Label,
  FindCollaboratorsParams,
  Collaborator,
  FindPeersParams, Peer, CardID, FindMessagesMetaParams, MessageMeta
} from '@hcengineering/communication-types'
import type { Account, MeasureContext } from '@hcengineering/core'

import type { EventResult, Event } from './events/event'

export type ContextData = {
  asyncRequests?: ((ctx: MeasureContext) => Promise<void>)[]
} & Record<string, any>

export interface SessionData {
  sessionId?: string
  account: Account
  derived?: boolean
  isAsyncContext?: boolean
  contextData?: ContextData
  asyncData: Event[]
}

export interface ServerApi {
  findMessagesMeta: (session: SessionData, params: FindMessagesMetaParams) => Promise<MessageMeta[]>

  findNotificationContexts: (
    session: SessionData,
    params: FindNotificationContextParams,
    subscription?: number | string
  ) => Promise<NotificationContext[]>
  findNotifications: (
    session: SessionData,
    params: FindNotificationsParams,
    subscription?: number | string
  ) => Promise<Notification[]>

  findLabels: (session: SessionData, params: FindLabelsParams) => Promise<Label[]>
  findCollaborators: (session: SessionData, params: FindCollaboratorsParams) => Promise<Collaborator[]>
  findPeers: (session: SessionData, params: FindPeersParams) => Promise<Peer[]>

  event: (session: SessionData, event: Event) => Promise<EventResult>

  subscribeCard: (session: SessionData, cardId: CardID, subscription: number | string) => void
  unsubscribeCard: (session: SessionData, cardId: CardID, subscription: number | string) => void

  closeSession: (sessionId: string) => Promise<void>
  close: () => Promise<void>
}
