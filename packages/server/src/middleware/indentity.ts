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

import { type SessionData } from '@hcengineering/communication-sdk-types'
import { systemAccountUuid } from '@hcengineering/core'
import type {
  AccountID,
  FindLabelsParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Label,
  Notification,
  NotificationContext
} from '@hcengineering/communication-types'

import type { Middleware, MiddlewareContext, QueryId } from '../types'
import { BaseMiddleware } from './base'

export class IdentityMiddleware extends BaseMiddleware implements Middleware {
  constructor (
    readonly context: MiddlewareContext,
    next?: Middleware
  ) {
    super(context, next)
  }

  async findNotificationContexts (
    session: SessionData,
    params: FindNotificationContextParams,
    queryId?: QueryId
  ): Promise<NotificationContext[]> {
    const paramsWithAccount = this.enrichParamsWithAccount(session, params)
    return await this.provideFindNotificationContexts(session, paramsWithAccount, queryId)
  }

  async findNotifications (
    session: SessionData,
    params: FindNotificationsParams,
    queryId?: QueryId
  ): Promise<Notification[]> {
    const paramsWithAccount = this.enrichParamsWithAccount(session, params)
    return await this.provideFindNotifications(session, paramsWithAccount, queryId)
  }

  async findLabels (session: SessionData, params: FindLabelsParams, queryId?: QueryId): Promise<Label[]> {
    const paramsWithAccount = this.enrichParamsWithAccount(session, params)
    return await this.provideFindLabels(session, paramsWithAccount, queryId)
  }

  private enrichParamsWithAccount<T extends { account?: AccountID | AccountID[] }>(session: SessionData, params: T): T {
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
