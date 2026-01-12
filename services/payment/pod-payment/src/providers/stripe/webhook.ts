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
import Stripe from 'stripe'
import { type MeasureContext } from '@hcengineering/core'

import { getAccountClient } from '../../utils'
import { transformStripeSubscriptionToData } from './utils'

/**
 * Handle Stripe webhook events
 * Uses Stripe SDK for webhook validation
 * Webhooks are sent for checkout and subscription lifecycle events
 * Documentation: https://stripe.com/docs/webhooks
 */
export async function handleStripeWebhook (
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
    const sig = req.headers['stripe-signature'] as string

    if (!(rawBody instanceof Buffer) || rawBody.length === 0) {
      ctx.error('Invalid webhook body')
      res.status(400).json({ error: 'Invalid body' })
      return
    }

    if (sig === undefined) {
      ctx.error('Missing Stripe signature header')
      res.status(400).json({ error: 'Missing signature' })
      return
    }

    // Create Stripe instance for webhook verification
    const stripe = new Stripe('', { apiVersion: '2025-02-24.acacia' })

    // Verify webhook signature and parse event
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err: any) {
      ctx.error('Invalid Stripe webhook signature', { err })
      res.status(403).json({ error: 'Invalid signature' })
      return
    }

    // Route to appropriate handler based on event type
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        void handleSubscriptionUpdated(ctx, accountsUrl, serviceToken, event).catch((err) => {
          ctx.error('Failed to process Stripe webhook event', { event, err })
        })
        break
      default:
        ctx.info('Unhandled Stripe webhook event type', { type: event.type })
    }

    res.status(200).json({ received: true })
  } catch (err) {
    ctx.error('Failed to process Stripe webhook', { err })
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Handle subscription.created/updated/deleted
 */
async function handleSubscriptionUpdated (
  ctx: MeasureContext,
  accountsUrl: string,
  serviceToken: string,
  event: Stripe.Event
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription
  if (subscription == null) {
    ctx.error('Missing subscription data', { event })
    throw new Error('Missing subscription data')
  }

  const subscriptionData = transformStripeSubscriptionToData(subscription)

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
