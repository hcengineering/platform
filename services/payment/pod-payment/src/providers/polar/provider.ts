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

import {
  AccountClient,
  SubscriptionType,
  type Subscription,
  type SubscriptionData
} from '@hcengineering/account-client'
import type { PaymentProvider, SubscribeRequest, CheckoutResponse } from '../index'
import { PolarClient } from './client'
import { handlePolarWebhook } from './webhook'
import { transformPolarSubscriptionToData } from './utils'
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
 * Polar.sh implementation of PaymentProvider
 */
export class PolarProvider implements PaymentProvider {
  readonly providerName = 'polar'
  private readonly polar: PolarClient
  private readonly webhookSecret: string
  // Map: plan@type (Huly) -> productIds (Polar)
  private readonly subscriptionPlans: Record<string, string[]>
  private readonly frontUrl: string
  private readonly accountClient: AccountClient

  constructor (
    accessToken: string,
    webhookSecret: string,
    subscriptionPlans: string,
    frontUrl: string,
    accountClient: AccountClient,
    useSandbox = false
  ) {
    this.polar = new PolarClient(accessToken, useSandbox)
    this.webhookSecret = webhookSecret
    // TODO: support branding
    this.frontUrl = frontUrl
    this.subscriptionPlans = {}
    this.accountClient = accountClient
    const plans = subscriptionPlans.split(';')
    for (const plan of plans) {
      const [type, rawProductIds] = plan.split(':')
      const productIds = rawProductIds.split(',')
      this.subscriptionPlans[type] = productIds
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
    ctx.info('Creating Polar subscription', { type: request.type, plan: request.plan })

    const planKey = getPlanKey(request.type, request.plan)
    const productIds = this.subscriptionPlans[planKey]
    if (productIds === undefined) {
      throw new Error(`Missing productIds for plan: ${planKey}`)
    }
    const successUrl = `${this.frontUrl}/workbench/${workspaceUrl}/setting/setting/billing/subscriptions?payment=success&checkout_id={CHECKOUT_ID}`
    const returnUrl = `${this.frontUrl}/workbench/${workspaceUrl}/setting/setting/billing/subscriptions?payment=canceled`
    const response = await this.polar.createCheckout(ctx, {
      productIds,
      successUrl,
      returnUrl,
      externalCustomerId: accountUuid,
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
    const polarSubscription = await this.polar.getSubscription(ctx, subscriptionId)
    const subscriptionData = transformPolarSubscriptionToData(polarSubscription)

    if (subscriptionData === null) {
      return null
    }

    return subscriptionData
  }

  async getSubscriptionByCheckout (ctx: MeasureContext, checkoutId: string): Promise<SubscriptionData | null> {
    try {
      const checkout = await this.polar.getCheckout(ctx, checkoutId)

      // If checkout is not succeeded, no subscription yet
      if (checkout.status !== 'succeeded') {
        return null
      }

      // If checkout has a subscription ID, fetch it directly
      if (checkout.subscriptionId != null) {
        const subscription = await this.polar.getSubscription(ctx, checkout.subscriptionId)
        const subscriptionData = transformPolarSubscriptionToData(subscription)

        if (subscriptionData !== null) {
          return subscriptionData
        }
      }

      const customerId = checkout.externalCustomerId
      if (customerId === undefined || customerId === null) {
        ctx.error('Cannot search subscriptions: no customer ID in checkout', { checkoutId })
        return null
      }

      const activeSubscriptions = await this.polar.getActiveSubscriptions(ctx, customerId)

      for (const polarSub of activeSubscriptions) {
        // Check if this subscription was created from this checkout
        if (polarSub.checkoutId === checkoutId) {
          const subscriptionData = transformPolarSubscriptionToData(polarSub)

          if (subscriptionData !== null) {
            return subscriptionData
          }
        }
      }

      return null
    } catch (err) {
      ctx.error('Failed to get subscription by checkout', { checkoutId, err })
      return null
    }
  }

  async reconcileActiveSubscriptions (ctx: MeasureContext): Promise<void> {
    try {
      ctx.info('Starting Polar active subscription reconciliation')

      const polarActiveSubscriptions = await this.polar.getActiveSubscriptions(ctx)
      const ourActiveSubscriptions = await this.accountClient.getSubscriptions()

      const ourSubsByProviderId = new Map(
        ourActiveSubscriptions.map((sub: Subscription) => [sub.providerSubscriptionId, sub])
      )

      const polarActiveIds = new Set(polarActiveSubscriptions.map((sub: Record<string, any>) => sub.id))

      // Step 1: Update subscriptions that exist in Polar and have changed
      let upsertCount = 0
      for (const polarSub of polarActiveSubscriptions) {
        try {
          const subscriptionData = transformPolarSubscriptionToData(polarSub)
          if (subscriptionData === null) {
            continue
          }

          const ourSub = ourSubsByProviderId.get(polarSub.id)

          // Only upsert if subscription doesn't exist locally or if key fields have changed
          if (ourSub === undefined || hasSubscriptionChanged(ourSub, subscriptionData)) {
            await this.accountClient.upsertSubscription(subscriptionData)
            upsertCount++
          }
        } catch (err) {
          ctx.error('Failed to upsert active subscription', {
            providerSubId: polarSub.id,
            err
          })
        }
      }

      // Step 2: Check for subscriptions we think are active but Polar says aren't
      let staleCount = 0
      for (const ourSub of ourActiveSubscriptions) {
        const polarSubId = ourSub.providerSubscriptionId
        if (!polarActiveIds.has(polarSubId)) {
          try {
            // Fetch the current state from Polar directly
            const currentState = await this.polar.getSubscription(ctx, polarSubId)
            const subscriptionData = transformPolarSubscriptionToData(currentState)

            // Update our database with current state (may have changed to canceled/ended)
            if (subscriptionData !== null) {
              await this.accountClient.upsertSubscription(subscriptionData)
              staleCount++
            }
          } catch (err) {
            ctx.error('Failed to reconcile subscription status', {
              subscriptionId: polarSubId,
              err
            })
          }
        }
      }

      ctx.info('Polar subscription reconciliation completed', {
        polarActiveCount: polarActiveSubscriptions.length,
        ourActiveCount: ourActiveSubscriptions.length,
        upsertedCount: upsertCount,
        staleUpdatedCount: staleCount
      })
    } catch (err) {
      ctx.error('Polar subscription reconciliation failed', { err })
      throw err
    }
  }

  async cancelSubscription (ctx: MeasureContext, providerSubscriptionId: string): Promise<SubscriptionData> {
    const polarSubscription = await this.polar.cancelSubscription(ctx, providerSubscriptionId)
    const subscriptionData = transformPolarSubscriptionToData(polarSubscription)

    if (subscriptionData == null) {
      throw new Error(`Failed to cancel subscription ${providerSubscriptionId}`)
    }

    return subscriptionData
  }

  async uncancelSubscription (ctx: MeasureContext, providerSubscriptionId: string): Promise<SubscriptionData> {
    const polarSubscription = await this.polar.uncancelSubscription(ctx, providerSubscriptionId)
    const subscriptionData = transformPolarSubscriptionToData(polarSubscription)
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
    const currentSub = await this.polar.getSubscription(ctx, subscriptionId)

    // Check if subscription is free by checking if it has a price with amountType === 'free'
    const isFreeSubscription = currentSub.prices?.[0]?.amountType === 'free'

    // Get the Polar product ID for the new plan (subscriptions updates are tier type)
    const planKey = getPlanKey(SubscriptionType.Tier, newPlan)
    const productIds = this.subscriptionPlans[planKey]
    if (productIds === undefined || productIds.length === 0) {
      throw new Error(`No products configured for plan: ${planKey}`)
    }

    // Use first product ID from the list (it should be the default fixed amount subscription plan)
    const newProductId = productIds[0]

    // If subscription is free, create a checkout instead of updating directly
    if (isFreeSubscription) {
      const successUrl = `${this.frontUrl}/workbench/${workspaceUrl}/setting/setting/billing/subscriptions?payment=success&checkout_id={CHECKOUT_ID}`
      const returnUrl = `${this.frontUrl}/workbench/${workspaceUrl}/setting/setting/billing/subscriptions?payment=canceled`

      const response = await this.polar.createCheckout(ctx, {
        productIds: [newProductId],
        successUrl,
        returnUrl,
        subscriptionId: currentSub.id,
        externalCustomerId: currentSub.customerId,
        customerEmail: currentSub.customer?.email ?? undefined,
        customerName: currentSub.customer?.name ?? undefined,
        metadata: {
          workspaceUuid: (currentSub.metadata?.workspaceUuid as string) ?? '',
          subscriptionType: SubscriptionType.Tier,
          subscriptionPlan: newPlan
        }
      })

      return {
        checkoutId: response.checkoutId,
        checkoutUrl: response.url
      }
    }

    // Update the subscription to the new product
    const updatedSub = await this.polar.updateSubscription(ctx, subscriptionId, newProductId)

    // Transform and return the updated subscription data
    const subscriptionData = transformPolarSubscriptionToData(updatedSub)
    return subscriptionData
  }

  registerWebhookEndpoints (app: Express, ctx: MeasureContext, accountsUrl: string, serviceToken: string): void {
    ctx.info('Registering Polar webhook endpoints')

    // Register Polar-specific webhook endpoint (body parsing handled by server middleware)
    app.post('/api/v1/webhooks/polar', (req: Request, res: Response) => {
      void handlePolarWebhook(ctx, accountsUrl, serviceToken, this.webhookSecret, req, res)
    })
  }
}
