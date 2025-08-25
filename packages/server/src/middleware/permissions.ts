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
  type Event,
  EventResult,
  MessageEventType,
  NotificationEventType,
  PeerEventType,
  type SessionData
} from '@hcengineering/communication-sdk-types'
import { AccountRole, systemAccountUuid } from '@hcengineering/core'
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

  async event (session: SessionData, event: Enriched<Event>, derived: boolean): Promise<EventResult> {
    if (derived) return await this.provideEvent(session, event, derived)

    this.notAnonymousAccount(session)

    switch (event.type) {
      case MessageEventType.CreateMessage:
        this.checkSocialId(session, event.socialId)
        if (!this.isSystemAccount(session) && event?.options?.noNotify === true) {
          event.options.noNotify = false
        }
        break
      case MessageEventType.RemovePatch:
      case MessageEventType.UpdatePatch:
      case MessageEventType.BlobPatch:
      case MessageEventType.AttachmentPatch:
      case MessageEventType.ReactionPatch:
      case MessageEventType.ThreadPatch:
      case NotificationEventType.AddCollaborators:
      case NotificationEventType.RemoveCollaborators:
        this.checkSocialId(session, event.socialId)
        break
      case NotificationEventType.RemoveNotifications:
      case NotificationEventType.UpdateNotificationContext:
      case NotificationEventType.UpdateNotification:
      case NotificationEventType.RemoveNotificationContext: {
        this.checkAccount(session, event.account)
        break
      }
      case PeerEventType.CreatePeer:
      case PeerEventType.RemovePeer:
      case MessageEventType.CreateMessagesGroup:
      case MessageEventType.RemoveMessagesGroup: {
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
    if (!this.isSystemAccount(session)) {
      throw ApiError.forbidden('only system account is allowed')
    }
  }

  private notAnonymousAccount (session: SessionData): void {
    if (this.isAnonymousAccount(session)) {
      throw ApiError.forbidden('anonymous account is not allowed')
    }
  }

  private isSystemAccount (session: SessionData): boolean {
    const account = session.account
    return systemAccountUuid === account.uuid
  }

  private isAnonymousAccount (session: SessionData): boolean {
    const account = session.account
    return account.role === AccountRole.ReadOnlyGuest
  }
}
