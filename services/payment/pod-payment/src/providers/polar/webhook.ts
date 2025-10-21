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
import { type AccountUuid, type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import type { SubscriptionData } from '@hcengineering/account-client'
import { SubscriptionStatus, SubscriptionType } from '@hcengineering/account-client'

import { getAccountClient } from '../../utils'

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
    // Validate webhook signature and parse event
    const event = validateEvent(req.body, req.headers as Record<string, string>, webhookSecret)

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
  const metadata = subscription.metadata ?? {}
  const workspaceUuid = metadata.workspaceUuid as WorkspaceUuid | undefined
  const accountUuid = metadata.accountUuid as AccountUuid | undefined
  const subscriptionType = metadata.subscriptionType as SubscriptionType | undefined
  const subscriptionPlan = metadata.subscriptionPlan as string | undefined

  if (
    workspaceUuid === undefined ||
    accountUuid === undefined ||
    subscriptionType === undefined ||
    subscriptionPlan === undefined
  ) {
    ctx.error('Missing required metadata in subscription', { metadata })
    throw new Error('Missing workspaceUuid, accountUuid, subscriptionType or subscriptionPlan in subscription metadata')
  }

  // With supporter subscriptions of type pay-what-you-want the actual plan should be
  // determined by the amount paid as it's not possible to define maximum sum for these products.
  // E.g. one can pay 1000$ using common supporter product which will correspond to 'common' plan
  // in metadata but should be treated like 'legendary' plan in actual subscription.
  // Conditions are hardcoded for now.
  let actualPlan = subscriptionPlan
  const amount = metadata.amount as number | undefined
  if (amount !== undefined) {
    if (amount > 1999 && amount < 9999) {
      actualPlan = 'rare'
    } else if (amount > 9999 && amount < 39999) {
      actualPlan = 'epic'
    } else if (amount > 39999) {
      actualPlan = 'legendary'
    }
  }

  // Map Polar status to our SubscriptionStatus
  const status = mapPolarStatus(subscription.status)

  if (status === null) {
    // Ignore updates for subscriptions in irrelevant states
    return
  }

  // Handle optional periodEnd field - explicit null check
  let periodEnd: number | undefined
  if (subscription.current_period_end != null) {
    periodEnd = new Date(subscription.current_period_end).getTime()
  }

  const subscriptionData: SubscriptionData = {
    id: subscription.id, // Use Polar's subscription ID as our internal ID
    workspaceUuid,
    accountUuid,
    provider: 'polar',
    providerSubscriptionId: subscription.id,
    providerCheckoutId: subscription.checkout_id,
    type: subscriptionType,
    status,
    plan: actualPlan,
    amount, // Amount paid in cents (e.g. 9999 for $99.99) - used for pay-what-you-want tracking
    periodStart: new Date(subscription.current_period_start).getTime(),
    periodEnd,
    trialEnd: subscription.trial_end !== undefined ? new Date(subscription.trial_end).getTime() : undefined,
    canceledAt: subscription.canceled_at !== undefined ? new Date(subscription.canceled_at).getTime() : undefined,
    providerData: {
      customerId: subscription.customer_id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      endedAt: subscription.ended_at,
      cancelReason: subscription.customer_cancellation_reason,
      cancelComment: subscription.customer_cancellation_comment
    }
  }

  const accountClient = getAccountClient(accountsUrl, serviceToken)
  await accountClient.upsertSubscription(subscriptionData)

  ctx.info('Subscription upserted', { subscriptionId: subscription.id, status })
}

/**
 * Map Polar subscription status to our SubscriptionStatus
 */
function mapPolarStatus (polarStatus: string): SubscriptionStatus | null {
  switch (polarStatus) {
    case 'active':
      return 'active' as SubscriptionStatus
    case 'trialing':
      return 'trialing' as SubscriptionStatus
    case 'past_due':
      return 'past_due' as SubscriptionStatus
    case 'canceled':
      return 'canceled' as SubscriptionStatus
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
    default:
      return null
  }
}
