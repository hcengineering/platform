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
  DbAdapter,
  EventResult,
  RequestEvent,
  ResponseEvent,
  ResponseEventType,
  SessionData
} from '@hcengineering/communication-sdk-types'
import type {
  CardID,
  Collaborator,
  FindCollaboratorsParams,
  FindLabelsParams,
  FindMessagesGroupsParams,
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Label,
  Message,
  MessagesGroup,
  Notification,
  NotificationContext,
  WorkspaceID
} from '@hcengineering/communication-types'

export interface Metadata {
  msg2fileUrl: string
  accountsUrl: string
  filesUrl: string
  secret?: string
}

export type QueryId = string | number

export interface Middleware {
  findMessages: (session: SessionData, params: FindMessagesParams, queryId?: QueryId) => Promise<Message[]>
  findMessagesGroups: (
    session: SessionData,
    params: FindMessagesGroupsParams,
    queryId?: QueryId
  ) => Promise<MessagesGroup[]>

  findNotificationContexts: (
    session: SessionData,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ) => Promise<NotificationContext[]>
  findNotifications: (
    session: SessionData,
    params: FindNotificationsParams,
    queryId?: QueryId
  ) => Promise<Notification[]>

  findLabels: (session: SessionData, params: FindLabelsParams, queryId?: QueryId) => Promise<Label[]>
  findCollaborators: (session: SessionData, params: FindCollaboratorsParams) => Promise<Collaborator[]>

  event: (session: SessionData, event: RequestEvent, derived: boolean) => Promise<EventResult>

  unsubscribeQuery: (session: SessionData, queryId: number) => void

  response: (session: SessionData, event: ResponseEvent, derived: boolean) => Promise<void>

  closeSession: (sessionId: string) => void
  close: () => void
}

export interface MiddlewareContext {
  ctx: MeasureContext
  workspace: WorkspaceID
  metadata: Metadata
  registeredCards: Set<CardID>

  derived?: Middleware
  head?: Middleware
}

export type MiddlewareCreateFn = (context: MiddlewareContext, next?: Middleware) => Promise<Middleware>

export type BroadcastSessionsFunc = (ctx: MeasureContext, sessionIds: string[], result: any) => void

export interface TriggerCtx {
  ctx: MeasureContext
  metadata: Metadata
  db: DbAdapter
  workspace: WorkspaceID
  account: Account
  registeredCards: Set<CardID>
  derived: boolean
  execute: (event: RequestEvent) => Promise<EventResult>
}

export type TriggerFn = (ctx: TriggerCtx, event: ResponseEvent) => Promise<RequestEvent[]>
export type Triggers = [string, ResponseEventType, TriggerFn][]
