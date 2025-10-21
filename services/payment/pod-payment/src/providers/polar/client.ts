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
import { Polar } from '@polar-sh/sdk'
import type { CheckoutResult, CreateCheckoutParams } from './types'

/**
 * Documentation: https://docs.polar.sh/api-reference
 */
export class PolarClient {
  private readonly polar: Polar

  constructor (accessToken: string) {
    this.polar = new Polar({
      accessToken
    })
  }

  /**
   * Create a checkout session for product(s)
   */
  async createCheckout (ctx: MeasureContext, params: CreateCheckoutParams): Promise<CheckoutResult> {
    return await ctx.with('polar-create-checkout', {}, async () => {
      const checkout = await this.polar.checkouts.create({
        products: params.productIds,
        successUrl: params.successUrl,
        externalCustomerId: params.externalCustomerId,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
        customerMetadata: params.customerMetadata
      })

      return {
        checkoutId: checkout.id,
        url: checkout.url
      }
    })
  }

  /**
   * Get checkout session by ID
   */
  async getCheckout (ctx: MeasureContext, checkoutId: string): Promise<any> {
    return await ctx.with('polar-get-checkout', {}, async () => {
      return await this.polar.checkouts.get({ id: checkoutId })
    })
  }

  /**
   * Get subscription by ID
   */
  async getSubscription (ctx: MeasureContext, subscriptionId: string): Promise<any> {
    return await ctx.with('polar-get-subscription', {}, async () => {
      return await this.polar.subscriptions.get({ id: subscriptionId })
    })
  }

  /**
   * Cancel a subscription
   * Polar subscriptions are canceled via update endpoint with cancelAtPeriodEnd flag
   * Documentation: https://polar.sh/docs/api-reference/subscriptions/update#subscriptioncancel
   */
  async cancelSubscription (ctx: MeasureContext, subscriptionId: string): Promise<any> {
    return await ctx.with('polar-cancel-subscription', {}, async () => {
      const update = {
        id: subscriptionId,
        subscriptionUpdate: {
          cancelAtPeriodEnd: true
        }
      }
      return await this.polar.subscriptions.update(update)
    })
  }
}
