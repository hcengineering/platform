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
import Stripe from 'stripe'
import type { CheckoutResult, CreateCheckoutParams } from './types'

/**
 * Documentation: https://stripe.com/docs/api
 */
export class StripeClient {
  private readonly stripe: Stripe

  constructor (apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-02-24.acacia'
    })
  }

  /**
   * Create a checkout session for a subscription
   */
  async createCheckout (ctx: MeasureContext, params: CreateCheckoutParams): Promise<CheckoutResult> {
    return await ctx.with('stripe-create-checkout', {}, async () => {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [
          {
            price: params.priceId,
            quantity: 1
          }
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl ?? params.successUrl,
        metadata: {
          workspaceUuid: params.metadata.workspaceUuid,
          subscriptionType: params.metadata.subscriptionType,
          subscriptionPlan: params.metadata.subscriptionPlan
        }
      }

      if (params.customerId !== undefined) {
        sessionParams.customer = params.customerId
      } else if (params.customerEmail !== undefined) {
        sessionParams.customer_email = params.customerEmail
      }

      if (params.subscriptionId !== undefined) {
        sessionParams.subscription_data = {
          metadata: {
            workspaceUuid: params.metadata.workspaceUuid,
            subscriptionType: params.metadata.subscriptionType,
            subscriptionPlan: params.metadata.subscriptionPlan
          }
        }
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams)

      return {
        checkoutId: session.id,
        url: session.url ?? ''
      }
    })
  }

  /**
   * Get checkout session by ID
   */
  async getCheckout (ctx: MeasureContext, checkoutId: string): Promise<Stripe.Checkout.Session> {
    return await ctx.with('stripe-get-checkout', {}, async () => {
      return await this.stripe.checkout.sessions.retrieve(checkoutId, {
        expand: ['subscription']
      })
    })
  }

  /**
   * Get subscription by ID
   */
  async getSubscription (ctx: MeasureContext, subscriptionId: string): Promise<Stripe.Subscription> {
    return await ctx.with('stripe-get-subscription', {}, async () => {
      return await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['customer']
      })
    })
  }

  /**
   * Get all active subscriptions
   * Filters subscriptions by status='active' or status='trialing'
   * Filters by customer if provided
   * This is used internally by the provider for reconciliation
   */
  async getActiveSubscriptions (ctx: MeasureContext, customerId?: string): Promise<Stripe.Subscription[]> {
    return await ctx.with('stripe-get-active-subscriptions', {}, async () => {
      const subscriptions: Stripe.Subscription[] = []
      const params: Stripe.SubscriptionListParams = {
        limit: 100,
        status: 'all'
      }

      if (customerId !== undefined) {
        params.customer = customerId
      }

      let hasMore = true
      let startingAfter: string | undefined

      while (hasMore) {
        if (startingAfter !== undefined) {
          params.starting_after = startingAfter
        }

        const response = await this.stripe.subscriptions.list(params)
        subscriptions.push(
          ...response.data.filter((sub: Stripe.Subscription) => sub.status === 'active' || sub.status === 'trialing')
        )
        hasMore = response.has_more
        if (hasMore && response.data.length > 0) {
          startingAfter = response.data[response.data.length - 1].id
        }
      }

      return subscriptions
    })
  }

  /**
   * Cancel a subscription
   * Stripe subscriptions are canceled via cancel endpoint
   * Documentation: https://stripe.com/docs/api/subscriptions/cancel
   */
  async cancelSubscription (ctx: MeasureContext, subscriptionId: string): Promise<Stripe.Subscription> {
    return await ctx.with('stripe-cancel-subscription', {}, async () => {
      return await this.stripe.subscriptions.cancel(subscriptionId)
    })
  }

  /**
   * Uncancel a subscription (reactivate a previously canceled subscription)
   * Stripe subscriptions are uncanceled by removing cancel_at_period_end flag
   * Documentation: https://stripe.com/docs/api/subscriptions/update
   */
  async uncancelSubscription (ctx: MeasureContext, subscriptionId: string): Promise<Stripe.Subscription> {
    return await ctx.with('stripe-uncancel-subscription', {}, async () => {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      })
    })
  }

  /**
   * Update a subscription to a different price
   * Changes the subscription to use a new price with immediate effective date and proration
   * Documentation: https://stripe.com/docs/api/subscriptions/update
   */
  async updateSubscription (ctx: MeasureContext, subscriptionId: string, priceId: string): Promise<Stripe.Subscription> {
    return await ctx.with('stripe-update-subscription', {}, async () => {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
      return await this.stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId
          }
        ],
        proration_behavior: 'create_prorations'
      })
    })
  }
}
