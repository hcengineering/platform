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

import { type Event, EventResult, type SessionData } from '@hcengineering/communication-sdk-types'
import type {
  FindNotificationContextParams,
  FindNotificationsParams,
  NotificationContext,
  Notification,
  FindLabelsParams,
  Label,
  FindCollaboratorsParams,
  Collaborator,
  FindPeersParams,
  Peer,
  CardID,
  FindMessagesMetaParams,
  MessageMeta,
  FindMessagesGroupParams,
  MessagesGroup
} from '@hcengineering/communication-types'

import type { Enriched, Middleware, MiddlewareContext, Subscription } from '../types'

export class BaseMiddleware implements Middleware {
  constructor (
    readonly context: MiddlewareContext,
    protected readonly next?: Middleware
  ) {}

  async findMessagesMeta (session: SessionData, params: FindMessagesMetaParams): Promise<MessageMeta[]> {
    return await this.provideFindMessagesMeta(session, params)
  }

  async findMessagesGroups (session: SessionData, params: FindMessagesGroupParams): Promise<MessagesGroup[]> {
    return await this.provideFindMessagesGroups(session, params)
  }

  async findNotificationContexts (
    session: SessionData,
    params: FindNotificationContextParams,
    subscription?: Subscription
  ): Promise<NotificationContext[]> {
    return await this.provideFindNotificationContexts(session, params, subscription)
  }

  async findNotifications (
    session: SessionData,
    params: FindNotificationsParams,
    subscription?: Subscription
  ): Promise<Notification[]> {
    return await this.provideFindNotifications(session, params, subscription)
  }

  async findLabels (session: SessionData, params: FindLabelsParams, subscription?: Subscription): Promise<Label[]> {
    return await this.provideFindLabels(session, params, subscription)
  }

  async findCollaborators (session: SessionData, params: FindCollaboratorsParams): Promise<Collaborator[]> {
    return await this.provideFindCollaborators(session, params)
  }

  async findPeers (session: SessionData, params: FindPeersParams): Promise<Peer[]> {
    return await this.provideFindPeers(session, params)
  }

  async event (session: SessionData, event: Enriched<Event>, derived: boolean): Promise<EventResult> {
    return await this.provideEvent(session, event, derived)
  }

  handleBroadcast (session: SessionData, events: Enriched<Event>[]): void {
    this.provideHandleBroadcast(session, events)
  }

  subscribeCard (session: SessionData, cardId: CardID, subscription: Subscription): void {
    if (this.next !== undefined) {
      this.next.subscribeCard(session, cardId, subscription)
    }
  }

  unsubscribeCard (session: SessionData, cardId: CardID, subscription: Subscription): void {
    if (this.next !== undefined) {
      this.next.unsubscribeCard(session, cardId, subscription)
    }
  }

  close (): void {}
  closeSession (sessionId: string): void {}

  protected async provideEvent (session: SessionData, event: Enriched<Event>, derived: boolean): Promise<EventResult> {
    if (this.next !== undefined) {
      return await this.next.event(session, event, derived)
    }
    return {}
  }

  protected async provideFindMessagesGroups (
    session: SessionData,
    params: FindMessagesGroupParams
  ): Promise<MessagesGroup[]> {
    if (this.next !== undefined) {
      return await this.next.findMessagesGroups(session, params)
    }
    return []
  }

  protected async provideFindMessagesMeta (
    session: SessionData,
    params: FindMessagesMetaParams
  ): Promise<MessageMeta[]> {
    if (this.next !== undefined) {
      return await this.next.findMessagesMeta(session, params)
    }
    return []
  }

  protected async provideFindNotificationContexts (
    session: SessionData,
    params: FindNotificationContextParams,
    subscription?: Subscription
  ): Promise<NotificationContext[]> {
    if (this.next !== undefined) {
      return await this.next.findNotificationContexts(session, params, subscription)
    }
    return []
  }

  protected async provideFindNotifications (
    session: SessionData,
    params: FindNotificationsParams,
    subscription?: Subscription
  ): Promise<Notification[]> {
    if (this.next !== undefined) {
      return await this.next.findNotifications(session, params, subscription)
    }
    return []
  }

  protected async provideFindLabels (
    session: SessionData,
    params: FindLabelsParams,
    subscription?: Subscription
  ): Promise<Label[]> {
    if (this.next !== undefined) {
      return await this.next.findLabels(session, params, subscription)
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

  protected async provideFindPeers (session: SessionData, params: FindPeersParams): Promise<Peer[]> {
    if (this.next !== undefined) {
      return await this.next.findPeers(session, params)
    }
    return []
  }

  protected provideHandleBroadcast (session: SessionData, events: Enriched<Event>[]): void {
    if (this.next !== undefined) {
      this.next.handleBroadcast(session, events)
    }
  }
}
