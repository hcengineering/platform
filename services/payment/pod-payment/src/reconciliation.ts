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

import { MeasureContext } from '@hcengineering/core'
import type { PaymentProvider } from './providers'

/**
 * Active subscription reconciliation timer management
 *
 * Delegates the reconciliation logic to the payment provider.
 * This ensures all provider-specific logic stays within the providers folder.
 */

/**
 * Start periodic active subscription reconciliation
 * Delegates to provider's reconcileActiveSubscriptions method
 */
export function startActiveSubscriptionReconciliation (
  ctx: MeasureContext,
  accountsUrl: string,
  serviceToken: string,
  provider: PaymentProvider,
  intervalMinutes: number
): () => void {
  // Run reconciliation immediately on start
  void provider.reconcileActiveSubscriptions(ctx, accountsUrl, serviceToken).catch((err: any) => {
    ctx.error('Initial subscription reconciliation failed', { provider: provider.providerName, err })
  })

  // Then run periodically
  const intervalMs = intervalMinutes * 60 * 1000
  const timer = setInterval(() => {
    void provider.reconcileActiveSubscriptions(ctx, accountsUrl, serviceToken).catch((err: any) => {
      ctx.error('Periodic subscription reconciliation failed', { provider: provider.providerName, err })
    })
  }, intervalMs)

  ctx.info('Active subscription reconciliation started', { provider: provider.providerName, intervalMinutes })

  return () => {
    clearInterval(timer)
  }
}
