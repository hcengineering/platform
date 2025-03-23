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

import { type MeasureContext, type SessionData, type Tx } from '@hcengineering/core'
import {
  BaseMiddleware,
  type Middleware,
  type MiddlewareCreator,
  type PipelineContext,
  type PlatformQueue,
  type PlatformQueueProducer,
  QueueTopic
} from '@hcengineering/server-core'

export class QueueMiddleware extends BaseMiddleware {
  txProducer: PlatformQueueProducer<Tx>
  connected: Promise<void> | undefined
  constructor (
    ctx: MeasureContext,
    readonly context: PipelineContext,
    protected readonly next: Middleware | undefined,
    readonly queue: PlatformQueue
  ) {
    super(context, next)
    this.txProducer = queue.createProducer<Tx>(ctx, QueueTopic.Tx)
  }

  static create (queue: PlatformQueue): MiddlewareCreator {
    return async (ctx, context, next) => {
      return new QueueMiddleware(ctx, context, next, queue)
    }
  }

  async handleBroadcast (ctx: MeasureContext<SessionData>): Promise<void> {
    if (this.connected !== undefined) {
      await this.connected
      this.connected = undefined
    }
    await Promise.all([
      this.provideBroadcast(ctx),
      this.txProducer.send(this.context.workspace.uuid, ctx.contextData.broadcast.txes)
    ])
  }
}
