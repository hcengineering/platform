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

import {
  type EventResult,
  type RequestEvent,
  type ResponseEvent,
  type SessionData
} from '@hcengineering/communication-sdk-types'
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

import type { Enriched, Middleware, MiddlewareContext, QueryId } from '../types'

export class BaseMiddleware implements Middleware {
  constructor (
    readonly context: MiddlewareContext,
    protected readonly next?: Middleware
  ) {}

  async findMessages (session: SessionData, params: FindMessagesParams, queryId?: QueryId): Promise<Message[]> {
    return await this.provideFindMessages(session, params, queryId)
  }

  async findMessagesGroups (
    session: SessionData,
    params: FindMessagesGroupsParams,
    queryId?: QueryId
  ): Promise<MessagesGroup[]> {
    return await this.provideFindMessagesGroups(session, params, queryId)
  }

  async findNotificationContexts (
    session: SessionData,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ): Promise<NotificationContext[]> {
    return await this.provideFindNotificationContexts(session, params, queryId)
  }

  async findNotifications (
    session: SessionData,
    params: FindNotificationsParams,
    queryId?: QueryId
  ): Promise<Notification[]> {
    return await this.provideFindNotifications(session, params, queryId)
  }

  async findLabels (session: SessionData, params: FindLabelsParams, queryId?: QueryId): Promise<Label[]> {
    return await this.provideFindLabels(session, params, queryId)
  }

  async findCollaborators (session: SessionData, params: FindCollaboratorsParams): Promise<Collaborator[]> {
    return await this.provideFindCollaborators(session, params)
  }

  async event (session: SessionData, event: Enriched<RequestEvent>, derived: boolean): Promise<EventResult> {
    return await this.provideEvent(session, event, derived)
  }

  async response (session: SessionData, event: ResponseEvent, derived: boolean): Promise<void> {
    await this.provideResponse(session, event, derived)
  }

  unsubscribeQuery (session: SessionData, queryId: number): void {
    if (this.next !== undefined) {
      this.next.unsubscribeQuery(session, queryId)
    }
  }

  close (): void {}
  closeSession (sessionId: string): void {}

  protected async provideEvent (
    session: SessionData,
    event: Enriched<RequestEvent>,
    derived: boolean
  ): Promise<EventResult> {
    if (this.next !== undefined) {
      return await this.next.event(session, event, derived)
    }
    return {}
  }

  protected async provideFindMessages (
    session: SessionData,
    params: FindMessagesParams,
    queryId?: QueryId
  ): Promise<Message[]> {
    if (this.next !== undefined) {
      return await this.next.findMessages(session, params, queryId)
    }
    return []
  }

  protected async provideFindMessagesGroups (
    session: SessionData,
    params: FindMessagesGroupsParams,
    queryId?: QueryId
  ): Promise<MessagesGroup[]> {
    if (this.next !== undefined) {
      return await this.next.findMessagesGroups(session, params, queryId)
    }
    return []
  }

  protected async provideFindNotificationContexts (
    session: SessionData,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ): Promise<NotificationContext[]> {
    if (this.next !== undefined) {
      return await this.next.findNotificationContexts(session, params, queryId)
    }
    return []
  }

  protected async provideFindNotifications (
    session: SessionData,
    params: FindNotificationsParams,
    queryId?: QueryId
  ): Promise<Notification[]> {
    if (this.next !== undefined) {
      return await this.next.findNotifications(session, params, queryId)
    }
    return []
  }

  protected async provideFindLabels (
    session: SessionData,
    params: FindLabelsParams,
    queryId?: QueryId
  ): Promise<Label[]> {
    if (this.next !== undefined) {
      return await this.next.findLabels(session, params, queryId)
    }
    return []
  }

  protected async provideFindCollaborators (
    session: SessionData,
    params: FindCollaboratorsParams
  ): Promise<Collaborator[]> {
    if (this.next !== undefined) {
      return await this.next.findCollaborators(session, params)
    }
    return []
  }

  protected async provideResponse (session: SessionData, event: ResponseEvent, derived: boolean): Promise<void> {
    if (this.next !== undefined) {
      await this.next.response(session, event, derived)
    }
  }
}
