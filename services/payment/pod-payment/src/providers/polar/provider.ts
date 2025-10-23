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

import type { PaymentProvider, SubscribeRequest, CreateSubscriptionResponse } from '../index'
import { PolarClient } from './client'
import { handlePolarWebhook } from './webhook'
import { getPlanKey } from '../../utils'

/**
 * Polar.sh implementation of PaymentProvider
 */
export class PolarProvider implements PaymentProvider {
  private readonly client: PolarClient
  private readonly webhookSecret: string
  // Map: plan@type (Huly) -> productIds (Polar)
  private readonly subscriptionPlans: Record<string, string[]>
  private readonly frontUrl: string

  constructor (
    accessToken: string,
    webhookSecret: string,
    subscriptionPlans: string,
    frontUrl: string,
    useSandbox = false
  ) {
    this.client = new PolarClient(accessToken, useSandbox)
    this.webhookSecret = webhookSecret
    // TODO: support branding
    this.frontUrl = frontUrl
    this.subscriptionPlans = {}
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
  ): Promise<CreateSubscriptionResponse> {
    ctx.info('Creating Polar subscription', { type: request.type, plan: request.plan })

    const planKey = getPlanKey(request.type, request.plan)
    const productIds = this.subscriptionPlans[planKey]
    if (productIds === undefined) {
      throw new Error(`Missing productIds for plan: ${planKey}`)
    }
    const successUrl = `${this.frontUrl}/workbench/${workspaceUrl}/setting/setting/billing/subscriptions?payment=success&checkout_id={CHECKOUT_ID}`
    const response = await this.client.createCheckout(ctx, {
      productIds,
      successUrl,
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

  async getSubscription (ctx: MeasureContext, subscriptionId: string): Promise<any> {
    ctx.info('Getting Polar subscription', { subscriptionId })
    return await this.client.getSubscription(ctx, subscriptionId)
  }

  async cancelSubscription (ctx: MeasureContext, subscriptionId: string): Promise<void> {
    ctx.info('Canceling Polar subscription', { subscriptionId })
    const subscription = await this.client.getSubscription(ctx, subscriptionId)
    if (subscription === undefined) {
      throw new Error(`Subscription ${subscriptionId} not found`)
    }

    await this.client.cancelSubscription(ctx, subscriptionId)
  }

  registerWebhookEndpoints (app: Express, ctx: MeasureContext, accountsUrl: string, serviceToken: string): void {
    ctx.info('Registering Polar webhook endpoints')

    // Register Polar-specific webhook endpoint (body parsing handled by server middleware)
    app.post('/api/v1/webhooks/polar', (req: Request, res: Response) => {
      void handlePolarWebhook(ctx, accountsUrl, serviceToken, this.webhookSecret, req, res)
    })
  }
}
