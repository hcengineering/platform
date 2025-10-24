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

import type { Request, Response } from 'express'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'
import { type MeasureContext } from '@hcengineering/core'

import { getAccountClient } from '../../utils'
import { transformPolarSubscriptionToData } from './utils'

/**
 * Handle Polar.sh webhook events
 * Uses @polar-sh/sdk for webhook validation
 * Webhooks are sent for checkout and subscription lifecycle events
 * Documentation: https://polar.sh/docs/integrate/webhooks/delivery
 */
export async function handlePolarWebhook (
  ctx: MeasureContext,
  accountsUrl: string,
  serviceToken: string,
  webhookSecret: string,
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Body is a Buffer from express.raw() middleware
    const rawBody = req.body as Buffer

    if (!(rawBody instanceof Buffer) || rawBody.length === 0) {
      ctx.error('Invalid webhook body')
      res.status(400).json({ error: 'Invalid body' })
      return
    }

    // Validate webhook signature and parse event
    const event = validateEvent(rawBody, req.headers as Record<string, string>, webhookSecret)

    // Route to appropriate handler based on event type
    switch (event.type) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active':
      case 'subscription.canceled':
      case 'subscription.revoked':
        void handleSubscriptionUpdated(ctx, accountsUrl, serviceToken, event).catch((err) => {
          ctx.error('Failed to process Polar webhook event', { event, err })
        })
        break
      default:
    }

    res.status(202).json({ received: true })
  } catch (err) {
    // Check if it's a validation error by class name
    const isValidationError = err instanceof WebhookVerificationError

    if (isValidationError) {
      ctx.error('Invalid Polar webhook signature', { err })
      res.status(403).json({ error: 'Invalid signature' })
      return
    }

    ctx.error('Failed to process Polar webhook', { err })
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Handle subscription.created/updated/active
 */
async function handleSubscriptionUpdated (
  ctx: MeasureContext,
  accountsUrl: string,
  serviceToken: string,
  event: any
): Promise<void> {
  const subscription = event.data ?? event
  if (subscription == null) {
    ctx.error('Missing subscription data', { event })
    throw new Error('Missing subscription data')
  }

  const subscriptionData = transformPolarSubscriptionToData(subscription)

  if (subscriptionData === null) {
    ctx.info('Ignoring subscription in irrelevant state', {
      subscriptionId: subscription.id,
      status: subscription.status
    })
    return
  }

  const accountClient = getAccountClient(accountsUrl, serviceToken)
  await accountClient.upsertSubscription(subscriptionData)

  ctx.info('Subscription upserted', { subscriptionId: subscription.id, status: subscriptionData.status })
}
