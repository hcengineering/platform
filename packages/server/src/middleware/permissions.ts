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
  type DbAdapter,
  type EventResult,
  MessageRequestEventType,
  NotificationRequestEventType,
  type RequestEvent,
  type SessionData
} from '@hcengineering/communication-sdk-types'
import { systemAccountUuid } from '@hcengineering/core'
import type { AccountID, SocialID } from '@hcengineering/communication-types'

import { ApiError } from '../error'
import type { Enriched, Middleware, MiddlewareContext } from '../types'
import { BaseMiddleware } from './base'

export class PermissionsMiddleware extends BaseMiddleware implements Middleware {
  constructor (
    readonly db: DbAdapter,
    readonly context: MiddlewareContext,
    next?: Middleware
  ) {
    super(context, next)
  }

  async event (session: SessionData, event: Enriched<RequestEvent>, derived: boolean): Promise<EventResult> {
    if (derived) return await this.provideEvent(session, event, derived)

    this.checkSocialId(session, event.socialId)

    switch (event.type) {
      case NotificationRequestEventType.RemoveNotifications:
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

    return await this.provideEvent(session, event, derived)
  }

  private checkSocialId (session: SessionData, creator: SocialID): void {
    const account = session.account
    if (!account.socialIds.includes(creator) && systemAccountUuid !== account.uuid) {
      throw ApiError.forbidden('social ID is not allowed')
    }
  }

  private checkAccount (session: SessionData, creator: AccountID): void {
    const account = session.account
    if (account.uuid !== creator && systemAccountUuid !== account.uuid) {
      throw ApiError.forbidden('account is not allowed')
    }
  }

  private onlySystemAccount (session: SessionData): void {
    const account = session.account
    if (systemAccountUuid !== account.uuid) {
      throw ApiError.forbidden('only system account is allowed')
    }
  }
}
