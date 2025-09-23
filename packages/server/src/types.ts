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

import type { Account, MeasureContext } from '@hcengineering/core'
import type {
  EventResult,
  Event,
  SessionData, EventType
} from '@hcengineering/communication-sdk-types'
import type {
  CardID,
  Collaborator,
  FindCollaboratorsParams,
  FindLabelsParams, FindMessagesGroupParams, FindMessagesMetaParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  FindPeersParams,
  Label, MessageMeta, MessagesGroup,
  Notification,
  NotificationContext,
  Peer,
  WorkspaceUuid
} from '@hcengineering/communication-types'

import { LowLevelClient } from './client'

export interface Metadata {
  accountsUrl: string
  hulylakeUrl: string
  secret: string
  messagesPerBlob: number
}

export type Subscription = string | number

export interface Middleware {
  findMessagesMeta: (session: SessionData, params: FindMessagesMetaParams) => Promise<MessageMeta[]>
  findMessagesGroups: (session: SessionData, params: FindMessagesGroupParams) => Promise<MessagesGroup[]>
  findNotificationContexts: (
    session: SessionData,
    params: FindNotificationContextParams,
    subscription?: Subscription
  ) => Promise<NotificationContext[]>
  findNotifications: (
    session: SessionData,
    params: FindNotificationsParams,
    subscription?: Subscription
  ) => Promise<Notification[]>

  findLabels: (session: SessionData, params: FindLabelsParams, subscription?: Subscription) => Promise<Label[]>
  findCollaborators: (session: SessionData, params: FindCollaboratorsParams) => Promise<Collaborator[]>
  findPeers: (session: SessionData, params: FindPeersParams) => Promise<Peer[]>

  event: (session: SessionData, event: Enriched<Event>, derived: boolean) => Promise<EventResult>

  subscribeCard: (session: SessionData, cardId: CardID, subscription: Subscription) => void
  unsubscribeCard: (session: SessionData, cardId: CardID, subscription: Subscription) => void

  handleBroadcast: (session: SessionData, events: Enriched<Event>[]) => void

  closeSession: (sessionId: string) => void
  close: () => void
}

export interface MiddlewareContext {
  ctx: MeasureContext
  workspace: WorkspaceUuid
  metadata: Metadata
  client: LowLevelClient

  cadsWithPeers: Set<CardID>

  derived?: Middleware
  head?: Middleware
}

export type MiddlewareCreateFn = (context: MiddlewareContext, next?: Middleware) => Promise<Middleware>

export interface CommunicationCallbacks {
  registerAsyncRequest: (ctx: MeasureContext, promise: (ctx: MeasureContext) => Promise<void>) => void
  broadcast: (ctx: MeasureContext, result: Record<string, Enriched<Event>[]>) => void
  enqueue: (ctx: MeasureContext, result: Enriched<Event>[]) => void
}

export interface TriggerCtx {
  ctx: MeasureContext
  metadata: Metadata
  client: LowLevelClient
  workspace: WorkspaceUuid
  account: Account
  derived: boolean
  processedPeersEvents: Set<string>
  execute: (event: Event) => Promise<EventResult>
}

export type TriggerFn = (ctx: TriggerCtx, event: Enriched<Event>) => Promise<Event[]>
export type Triggers = [string, EventType, TriggerFn][]

export type Enriched<T> = T & {
  _id: string
  _eventExtra: Record<string, any>

  skipPropagate?: boolean
  date: Date
}
