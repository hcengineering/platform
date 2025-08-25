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
  type Event,
  EventResult,
  MessageEventType,
  PeerEventType,
  type SessionData
} from '@hcengineering/communication-sdk-types'

import type { Enriched, Middleware, MiddlewareContext } from '../types'
import { BaseMiddleware } from './base'

export class PeerMiddleware extends BaseMiddleware implements Middleware {
  constructor (
    readonly context: MiddlewareContext,
    next?: Middleware
  ) {
    super(context, next)
  }

  async event (session: SessionData, event: Enriched<Event>, derived: boolean): Promise<EventResult> {
    switch (event.type) {
      case PeerEventType.CreatePeer:
        this.context.cadsWithPeers.add(event.cardId)
        break
      case MessageEventType.CreateMessage:
      case MessageEventType.UpdatePatch:
      case MessageEventType.RemovePatch:
      case MessageEventType.AttachmentPatch:
      case MessageEventType.ReactionPatch:
      case MessageEventType.ThreadPatch:
      case MessageEventType.BlobPatch: {
        if (this.context.cadsWithPeers.has(event.cardId)) {
          event._eventExtra.peers =
            (await this.context.head?.findPeers(session, {
              workspaceId: this.context.workspace,
              cardId: event.cardId
            })) ?? []
        }
        break
      }
    }

    return await this.provideEvent(session, event, derived)
  }
}
