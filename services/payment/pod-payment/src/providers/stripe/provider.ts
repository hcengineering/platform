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

import type { MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import type { Express, Request, Response } from 'express'
import type Stripe from 'stripe'

import {
  AccountClient,
  SubscriptionType,
  type Subscription,
  type SubscriptionData
} from '@hcengineering/account-client'
import type { PaymentProvider, SubscribeRequest, CheckoutResponse } from '../index'
import { StripeClient } from './client'
import { handleStripeWebhook } from './webhook'
import { transformStripeSubscriptionToData } from './utils'
import { getPlanKey } from '../../utils'

/**
 * Check if a subscription has changed by comparing modifiedAt timestamps
 * Returns true if the provider's version is newer than what we have stored
 */
function hasSubscriptionChanged (ourSub: SubscriptionData, newData: SubscriptionData): boolean {
  const ourModifiedAt = ourSub.providerData?.modifiedAt
  const newModifiedAt = newData.providerData?.modifiedAt

  if (newModifiedAt === undefined) {
    return false
  }

  if (ourModifiedAt === undefined) {
    return true
  }

  return newModifiedAt > ourModifiedAt
}

/**
 * Stripe implementation of PaymentProvider
 */
export class StripeProvider implements PaymentProvider {
  readonly providerName = 'stripe'
  private readonly stripe: StripeClient
  private readonly webhookSecret: string
  // Map: plan@type (Huly) -> priceId (Stripe)
  private readonly subscriptionPlans: Record<string, string>
  private readonly frontUrl: string
  private readonly accountClient: AccountClient

  constructor (
    apiKey: string,
    webhookSecret: string,
    subscriptionPlans: string,
    frontUrl: string,
    accountClient: AccountClient
  ) {
    this.stripe = new StripeClient(apiKey)
    this.webhookSecret = webhookSecret
    // TODO: support branding
    this.frontUrl = frontUrl
    this.subscriptionPlans = {}
    this.accountClient = accountClient
    const plans = subscriptionPlans.split(';')
    for (const plan of plans) {
      const [type, priceId] = plan.split(':')
      this.subscriptionPlans[type] = priceId
    }
    // TODO: verify all plans are present in the config - take them from model?
    // hardcoded check for now
    const mustHave = ['common@tier', 'rare@tier', 'epic@tier', 'legendary@tier']
    for (const plan of mustHave) {
      if (this.subscriptionPlans[plan] === undefined) {
        throw new Error(`Missing plan in config: ${plan}`)
      }
    }
  }

  async createSubscription (
    ctx: MeasureContext,
    request: SubscribeRequest,
    workspaceUuid: WorkspaceUuid,
    workspaceUrl: string,
    accountUuid: string
  ): Promise<CheckoutResponse> {
    ctx.info('Creating Stripe subscription', { type: request.type, plan: request.plan })

    const planKey = getPlanKey(request.type, request.plan)
    const priceId = this.subscriptionPlans[planKey]
    if (priceId === undefined) {
      throw new Error(`Missing priceId for plan: ${planKey}`)
    }
    const successUrl = `${this.frontUrl}/workbench/${workspaceUrl}/setting/setting/billing/subscriptions?payment=success&checkout_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${this.frontUrl}/workbench/${workspaceUrl}/setting/setting/billing/subscriptions?payment=canceled`
    const response = await this.stripe.createCheckout(ctx, {
      priceId,
      successUrl,
      cancelUrl,
      customerEmail: request.customerEmail,
      customerName: request.customerName,
      metadata: {
        workspaceUuid,
        subscriptionType: request.type,
        subscriptionPlan: request.plan
      }
    })

    return {
      checkoutId: response.checkoutId,
      checkoutUrl: response.url
    }
  }

  async getSubscription (ctx: MeasureContext, subscriptionId: string): Promise<SubscriptionData | null> {
    const stripeSubscription = await this.stripe.getSubscription(ctx, subscriptionId)
    const subscriptionData = transformStripeSubscriptionToData(stripeSubscription)

    if (subscriptionData === null) {
      return null
    }

    return subscriptionData
  }

  async getSubscriptionByCheckout (ctx: MeasureContext, checkoutId: string): Promise<SubscriptionData | null> {
    try {
      const checkout = await this.stripe.getCheckout(ctx, checkoutId)

      // If checkout is not complete, no subscription yet
      if (checkout.status !== 'complete') {
        return null
      }

      // If checkout has a subscription ID, fetch it directly
      if (checkout.subscription != null) {
        const subscriptionId =
          typeof checkout.subscription === 'string' ? checkout.subscription : checkout.subscription.id
        const subscription = await this.stripe.getSubscription(ctx, subscriptionId)
        const subscriptionData = transformStripeSubscriptionToData(subscription)

        if (subscriptionData !== null) {
          return subscriptionData
        }
      }

      // If we have a customer ID, try to find the subscription
      const customerId = typeof checkout.customer === 'string' ? checkout.customer : checkout.customer?.id
      if (customerId === undefined || customerId === null) {
        ctx.error('Cannot search subscriptions: no customer ID in checkout', { checkoutId })
        return null
      }

      const activeSubscriptions = await this.stripe.getActiveSubscriptions(ctx, customerId)

      // Find the most recent subscription for this customer (likely created from this checkout)
      if (activeSubscriptions.length > 0) {
        // Sort by created date, most recent first
        activeSubscriptions.sort((a, b) => b.created - a.created)
        const subscriptionData = transformStripeSubscriptionToData(activeSubscriptions[0])

        if (subscriptionData !== null) {
          return subscriptionData
        }
      }

      return null
    } catch (err) {
      ctx.error('Failed to get subscription by checkout', { checkoutId, err })
      return null
    }
  }

  async reconcileActiveSubscriptions (ctx: MeasureContext, accountsUrl: string, serviceToken: string): Promise<void> {
    try {
      ctx.info('Starting Stripe active subscription reconciliation')

      const stripeActiveSubscriptions = await this.stripe.getActiveSubscriptions(ctx)
      const ourActiveSubscriptions = await this.accountClient.getSubscriptions()

      const ourSubsByProviderId = new Map(
        ourActiveSubscriptions.map((sub: Subscription) => [sub.providerSubscriptionId, sub])
      )

      const stripeActiveIds = new Set(stripeActiveSubscriptions.map((sub: Stripe.Subscription) => sub.id))

      // Step 1: Update subscriptions that exist in Stripe and have changed
      let upsertCount = 0
      for (const stripeSub of stripeActiveSubscriptions) {
        try {
          const subscriptionData = transformStripeSubscriptionToData(stripeSub)
          if (subscriptionData === null) {
            continue
          }

          const ourSub = ourSubsByProviderId.get(stripeSub.id)

          // Only upsert if subscription doesn't exist locally or if key fields have changed
          if (ourSub === undefined || hasSubscriptionChanged(ourSub, subscriptionData)) {
            await this.accountClient.upsertSubscription(subscriptionData)
            upsertCount++
          }
        } catch (err) {
          ctx.error('Failed to upsert active subscription', {
            providerSubId: stripeSub.id,
            err
          })
        }
      }

      // Step 2: Check for subscriptions we think are active but Stripe says aren't
      let staleCount = 0
      for (const ourSub of ourActiveSubscriptions) {
        const stripeSubId = ourSub.providerSubscriptionId
        if (!stripeActiveIds.has(stripeSubId)) {
          try {
            // Fetch the current state from Stripe directly
            const currentState = await this.stripe.getSubscription(ctx, stripeSubId)
            const subscriptionData = transformStripeSubscriptionToData(currentState)

            // Update our database with current state (may have changed to canceled/ended)
            if (subscriptionData !== null) {
              await this.accountClient.upsertSubscription(subscriptionData)
              staleCount++
            }
          } catch (err) {
            ctx.error('Failed to reconcile subscription status', {
              subscriptionId: stripeSubId,
              err
            })
          }
        }
      }

      ctx.info('Stripe subscription reconciliation completed', {
        stripeActiveCount: stripeActiveSubscriptions.length,
        ourActiveCount: ourActiveSubscriptions.length,
        upsertedCount: upsertCount,
        staleUpdatedCount: staleCount
      })
    } catch (err) {
      ctx.error('Stripe subscription reconciliation failed', { err })
      throw err
    }
  }

  async cancelSubscription (ctx: MeasureContext, providerSubscriptionId: string): Promise<SubscriptionData> {
    const stripeSubscription = await this.stripe.cancelSubscription(ctx, providerSubscriptionId)
    const subscriptionData = transformStripeSubscriptionToData(stripeSubscription)

    if (subscriptionData == null) {
      throw new Error(`Failed to cancel subscription ${providerSubscriptionId}`)
    }

    return subscriptionData
  }

  async uncancelSubscription (ctx: MeasureContext, providerSubscriptionId: string): Promise<SubscriptionData> {
    const stripeSubscription = await this.stripe.uncancelSubscription(ctx, providerSubscriptionId)
    const subscriptionData = transformStripeSubscriptionToData(stripeSubscription)
    if (subscriptionData == null) {
      throw new Error(`Failed to uncancel subscription ${providerSubscriptionId}`)
    }

    return subscriptionData
  }

  async updateSubscriptionPlan (
    ctx: MeasureContext,
    subscriptionId: string,
    newPlan: string,
    workspaceUrl: string
  ): Promise<SubscriptionData | CheckoutResponse | null> {
    // Get the current subscription to check if it's free
    const currentSub = await this.stripe.getSubscription(ctx, subscriptionId)

    // Check if subscription is free by checking if the price amount is 0
    const price = currentSub.items.data[0]?.price
    const isFreeSubscription = price?.unit_amount === 0 || price === undefined

    // Get the Stripe price ID for the new plan (subscriptions updates are tier type)
    const planKey = getPlanKey(SubscriptionType.Tier, newPlan)
    const priceId = this.subscriptionPlans[planKey]
    if (priceId === undefined) {
      throw new Error(`No price configured for plan: ${planKey}`)
    }

    // If subscription is free, create a checkout instead of updating directly
    if (isFreeSubscription) {
      const successUrl = `${this.frontUrl}/workbench/${workspaceUrl}/setting/setting/billing/subscriptions?payment=success&checkout_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${this.frontUrl}/workbench/${workspaceUrl}/setting/setting/billing/subscriptions?payment=canceled`

      const customerId = typeof currentSub.customer === 'string' ? currentSub.customer : currentSub.customer?.id
      const metadata = currentSub.metadata ?? {}

      const response = await this.stripe.createCheckout(ctx, {
        priceId,
        successUrl,
        cancelUrl,
        customerId,
        subscriptionId: currentSub.id,
        metadata: {
          workspaceUuid: metadata.workspaceUuid,
          subscriptionType: SubscriptionType.Tier,
          subscriptionPlan: newPlan
        }
      })

      return {
        checkoutId: response.checkoutId,
        checkoutUrl: response.url
      }
    }

    // Update the subscription to the new price
    const updatedSub = await this.stripe.updateSubscription(ctx, subscriptionId, priceId)

    // Transform and return the updated subscription data
    const subscriptionData = transformStripeSubscriptionToData(updatedSub)
    return subscriptionData
  }

  registerWebhookEndpoints (app: Express, ctx: MeasureContext, accountsUrl: string, serviceToken: string): void {
    ctx.info('Registering Stripe webhook endpoints')

    // Register Stripe-specific webhook endpoint (body parsing handled by server middleware)
    app.post('/api/v1/webhooks/stripe', (req: Request, res: Response) => {
      void handleStripeWebhook(ctx, accountsUrl, serviceToken, this.webhookSecret, req, res)
    })
  }
}
