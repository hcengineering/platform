//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License. You may
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
  CardRequestEventType,
  type CreatePatchEvent,
  type DbAdapter,
  type EventResult,
  LabelRequestEventType,
  MessageRequestEventType,
  NotificationRequestEventType,
  type RequestEvent,
  type SessionData
} from '@hcengineering/communication-sdk-types'
import { systemAccountUuid } from '@hcengineering/core'
import type {
  AccountID,
  FindLabelsParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Label,
  Notification,
  NotificationContext,
  SocialID
} from '@hcengineering/communication-types'

import { ApiError } from '../error'
import type { Middleware, MiddlewareContext, QueryId } from '../types'
import { BaseMiddleware } from './base'
import { findMessage } from '../triggers/utils.ts'

export class PermissionsMiddleware extends BaseMiddleware implements Middleware {
  constructor(
    readonly db: DbAdapter,
    readonly context: MiddlewareContext,
    next?: Middleware
  ) {
    super(context, next)
  }

  async event(session: SessionData, event: RequestEvent, derived: boolean): Promise<EventResult> {
    if (derived) return await this.provideEvent(session, event, derived)
    switch (event.type) {
      case MessageRequestEventType.CreatePatch: {
        this.checkSocialId(session, event.creator)
        await this.checkPatch(session, event)
        break
      }
      case CardRequestEventType.UpdateCardType:
      case NotificationRequestEventType.AddCollaborators:
      case NotificationRequestEventType.RemoveCollaborators:
      case MessageRequestEventType.CreateMessage:
      case MessageRequestEventType.CreateReaction:
      case MessageRequestEventType.RemoveReaction:
      case MessageRequestEventType.RemoveFile:
      case MessageRequestEventType.CreateLinkPreview:
      case MessageRequestEventType.RemoveLinkPreview:
      case MessageRequestEventType.CreateFile: {
        this.checkSocialId(session, event.creator)
        break
      }
      case LabelRequestEventType.CreateLabel:
      case LabelRequestEventType.RemoveLabel:
      case NotificationRequestEventType.RemoveNotifications:
      case NotificationRequestEventType.CreateNotificationContext:
      case NotificationRequestEventType.UpdateNotificationContext:
      case NotificationRequestEventType.RemoveNotificationContext: {
        this.checkAccount(session, event.account)
        break
      }
      case NotificationRequestEventType.UpdateNotification:
        this.checkAccount(session, event.query.account)
        break
      case MessageRequestEventType.CreateMessagesGroup:
      case MessageRequestEventType.RemoveMessagesGroup: {
        this.onlySystemAccount(session)
        break
      }
      default:
        break
    }

    return this.provideEvent(session, event, derived)
  }

  async checkPatch(session: SessionData, event: CreatePatchEvent): Promise<void> {
    const account = session.account
    if (systemAccountUuid === account.uuid) return
    const socialIds = account.socialIds

    const message = await findMessage(
      this.db,
      this.context.metadata.filesUrl,
      this.context.workspace,
      event.card,
      event.message,
      event.messageCreated
    )
    if (message === undefined) {
      throw ApiError.notFound('Message of patch not found.')
    }

    if (!socialIds.includes(message.creator)) {
      throw ApiError.forbidden('Patch creator is not author of the message')
    }
  }

  async findNotificationContexts(
    session: SessionData,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ): Promise<NotificationContext[]> {
    const paramsWithAccount = this.expandParamsWithAccount(session, params)
    return await this.provideFindNotificationContexts(session, paramsWithAccount, queryId)
  }

  async findNotifications(
    session: SessionData,
    params: FindNotificationsParams,
    queryId?: QueryId
  ): Promise<Notification[]> {
    const paramsWithAccount = this.expandParamsWithAccount(session, params)
    return await this.provideFindNotifications(session, paramsWithAccount, queryId)
  }

  async findLabels(session: SessionData, params: FindLabelsParams, queryId?: QueryId): Promise<Label[]> {
    const paramsWithAccount = this.expandParamsWithAccount(session, params)
    return await this.provideFindLabels(session, paramsWithAccount, queryId)
  }

  private checkSocialId(session: SessionData, creator: SocialID): void {
    const account = session.account
    if (!account.socialIds.includes(creator) && systemAccountUuid !== account.uuid) {
      throw ApiError.forbidden('social ID is not allowed')
    }
  }

  private checkAccount(session: SessionData, creator: AccountID): void {
    const account = session.account
    if (account.uuid !== creator && systemAccountUuid !== account.uuid) {
      throw ApiError.forbidden('account is not allowed')
    }
  }

  private onlySystemAccount(session: SessionData): void {
    const account = session.account
    if (systemAccountUuid !== account.uuid) {
      throw ApiError.forbidden('only system account is allowed')
    }
  }

  private expandParamsWithAccount<T extends { account?: AccountID | AccountID[] }>(session: SessionData, params: T): T {
    const account = session.account
    const isSystem = account.uuid === systemAccountUuid

    if (isSystem) {
      return params
    }

    return {
      ...params,
      account: account.uuid
    }
  }
}
