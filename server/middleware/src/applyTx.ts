//
// Copyright © 2024 Hardcore Engineering Inc.
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

import core, {
  type MeasureContext,
  type Tx,
  type TxApplyIf,
  type TxApplyResult,
  type TxResult
} from '@hcengineering/core'
import type { Middleware, PipelineContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { BaseMiddleware } from '@hcengineering/server-core'

/**
 * Will support apply tx
 * @public
 */
export class ApplyTxMiddleware extends BaseMiddleware implements Middleware {
  scopes = new Map<string, Promise<any>>()

  static async create (ctx: MeasureContext, context: PipelineContext, next?: Middleware): Promise<Middleware> {
    return new ApplyTxMiddleware(context, next)
  }

  async tx (ctx: MeasureContext, txes: Tx[]): Promise<TxMiddlewareResult> {
    const result: TxResult[] = []

    let part: Tx[] = []
    for (const tx of txes) {
      if (this.context.hierarchy.isDerived(tx._class, core.class.TxApplyIf)) {
        if (part.length > 0) {
          part = []
          result.push(await this.provideTx(ctx, part))
        }
        const applyIf = tx as TxApplyIf
        // Wait for scope promise if found
        const passed =
          applyIf.scope != null ? await this.verifyApplyIf(ctx, applyIf) : { passed: true, onEnd: () => {} }
        try {
          if (passed.passed) {
            const applyResult: TxApplyResult = {
              success: true,
              serverTime: 0
            }
            result.push(applyResult)

            const st = Date.now()
            const r = await this.provideTx(ctx, applyIf.txes)
            if (Object.keys(r).length > 0) {
              result.push(r)
            }
            applyResult.serverTime = Date.now() - st
          } else {
            result.push({
              success: false
            })
          }
        } finally {
          passed.onEnd()
        }
      } else {
        part.push(tx)
      }
    }
    if (part.length > 0) {
      result.push(await this.provideTx(ctx, part))
    }
    if (Array.isArray(result) && result.length === 1) {
      return result[0]
    }
    return result
  }

  /**
   * Verify if apply if is possible to apply.
   */
  async verifyApplyIf (
    ctx: MeasureContext,
    applyIf: TxApplyIf
  ): Promise<{
      onEnd: () => void
      passed: boolean
    }> {
    if (applyIf.scope == null) {
      return { passed: true, onEnd: () => {} }
    }
    // Wait for synchronized.
    const scopePromise = this.scopes.get(applyIf.scope)

    if (scopePromise != null) {
      await scopePromise
    }

    let onEnd = (): void => {}
    // Put sync code
    this.scopes.set(
      applyIf.scope,
      new Promise((resolve) => {
        onEnd = () => {
          this.scopes.delete(applyIf.scope as unknown as string)
          resolve(null)
        }
      })
    )
    let passed = true
    if (applyIf.match != null) {
      for (const { _class, query } of applyIf.match) {
        const res = await this.provideFindAll(ctx, _class, query, { limit: 1 })
        if (res.length === 0) {
          passed = false
          break
        }
      }
    }
    if (passed && applyIf.notMatch != null) {
      for (const { _class, query } of applyIf.notMatch) {
        const res = await this.provideFindAll(ctx, _class, query, { limit: 1 })
        if (res.length > 0) {
          passed = false
          break
        }
      }
    }
    return { passed, onEnd }
  }
}
