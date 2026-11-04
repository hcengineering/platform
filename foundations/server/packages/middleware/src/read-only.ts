//
// Copyright © 2026 TraceX SAS.
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

import type { DomainParams, DomainResult, MeasureContext, OperationDomain, SessionData, Tx } from '@hcengineering/core'
import platform, { PlatformError, Severity, Status } from '@hcengineering/platform'
import {
  BaseMiddleware,
  type Middleware,
  type PipelineContext,
  type TxMiddlewareResult
} from '@hcengineering/server-core'

/** Reject mutations from read-only sessions before other middleware can process them. */
export class ReadOnlyMiddleware extends BaseMiddleware implements Middleware {
  static async create (
    _ctx: MeasureContext,
    context: PipelineContext,
    next: Middleware | undefined
  ): Promise<ReadOnlyMiddleware> {
    return new ReadOnlyMiddleware(context, next)
  }

  private assertWritable (ctx: MeasureContext<SessionData>): void {
    if (ctx.contextData.readonly === true) {
      throw new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
    }
  }

  async tx (ctx: MeasureContext<SessionData>, txes: Tx[]): Promise<TxMiddlewareResult> {
    this.assertWritable(ctx)
    return await this.provideTx(ctx, txes)
  }

  async domainRequest (
    ctx: MeasureContext<SessionData>,
    domain: OperationDomain,
    params: DomainParams
  ): Promise<DomainResult> {
    this.assertWritable(ctx)
    return await this.provideDomainRequest(ctx, domain, params)
  }
}
