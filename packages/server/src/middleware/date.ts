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

import { EventResult, type Event, type SessionData } from '@hcengineering/communication-sdk-types'
import { systemAccountUuid } from '@hcengineering/core'

import type { Middleware, MiddlewareContext, Enriched } from '../types'
import { BaseMiddleware } from './base'

export class DateMiddleware extends BaseMiddleware implements Middleware {
  constructor (
    readonly context: MiddlewareContext,
    next?: Middleware
  ) {
    super(context, next)
  }

  async event (session: SessionData, event: Enriched<Event>, derived: boolean): Promise<EventResult> {
    const canSetDate = derived || this.isSystem(session)

    if (!canSetDate || event.date == null) {
      event.date = new Date()
    }

    event._eventExtra = {}

    return await this.provideEvent(session, event, derived)
  }

  private isSystem (session: SessionData): boolean {
    const account = session.account
    return systemAccountUuid === account.uuid
  }
}
