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
import { type AccountUuid, type WorkspaceUuid } from '@hcengineering/core'
import type { SubscriptionData } from '@hcengineering/account-client'
import { SubscriptionStatus, SubscriptionType } from '@hcengineering/account-client'
import type Stripe from 'stripe'

/**
 * Map Stripe subscription status to our SubscriptionStatus
 */
function mapStripeStatus (stripeStatus: Stripe.Subscription.Status): SubscriptionStatus | null {
  switch (stripeStatus) {
    case 'active':
      return 'active' as SubscriptionStatus
    case 'trialing':
      return 'trialing' as SubscriptionStatus
    case 'past_due':
      return 'past_due' as SubscriptionStatus
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return null
  }
}

/**
 * Transform a Stripe subscription to our SubscriptionData format
 * Extracts metadata and maps status
 * Returns null if subscription is in an irrelevant state
 */
export function transformStripeSubscriptionToData (subscription: Stripe.Subscription): SubscriptionData | null {
  const metadata = subscription.metadata ?? {}
  const workspaceUuid = metadata.workspaceUuid as WorkspaceUuid | undefined
  let accountUuid: AccountUuid | undefined
  const subscriptionType = metadata.subscriptionType as SubscriptionType | undefined
  const subscriptionPlan = metadata.subscriptionPlan as string | undefined

  // For Stripe, customer can be a string ID or expanded Customer object
  let customerId: string | undefined
  if (typeof subscription.customer === 'string') {
    customerId = subscription.customer
  } else if (subscription.customer !== null && subscription.customer.deleted !== true) {
    // subscription.customer is Customer (not DeletedCustomer)
    customerId = subscription.customer.id
    accountUuid = subscription.customer.id as AccountUuid
    // Try to get accountUuid from customer metadata if not in subscription metadata
    if (subscription.customer.metadata?.accountUuid !== undefined) {
      accountUuid = subscription.customer.metadata.accountUuid as AccountUuid
    }
  }

  if (
    accountUuid === undefined ||
    workspaceUuid === undefined ||
    subscriptionType === undefined ||
    subscriptionPlan === undefined
  ) {
    return null
  }

  // Get the price amount from the subscription
  const price = subscription.items.data[0]?.price
  const amount = price?.unit_amount ?? undefined

  // Map Stripe status to our SubscriptionStatus
  const status = mapStripeStatus(subscription.status)

  if (status === null) {
    // Ignore updates for subscriptions in irrelevant states
    return null
  }

  // Handle optional periodEnd field
  let periodEnd: number | undefined
  if (subscription.current_period_end != null) {
    periodEnd = subscription.current_period_end * 1000 // Convert from Unix timestamp to milliseconds
  }

  let trialEnd: number | undefined
  if (subscription.trial_end != null) {
    trialEnd = subscription.trial_end * 1000 // Convert from Unix timestamp to milliseconds
  }

  let canceledAt: number | undefined
  if (subscription.canceled_at != null) {
    canceledAt = subscription.canceled_at * 1000 // Convert from Unix timestamp to milliseconds
  }

  const subscriptionData: SubscriptionData = {
    id: `stripe_${subscription.id}`, // Composite ID with provider prefix to avoid conflicts
    workspaceUuid,
    accountUuid,
    provider: 'stripe',
    providerSubscriptionId: subscription.id,
    providerCheckoutId: subscription.latest_invoice as string | undefined,
    type: subscriptionType,
    status,
    plan: subscriptionPlan,
    amount, // Amount paid in cents (e.g. 9999 for $99.99)
    periodStart: subscription.current_period_start * 1000, // Convert from Unix timestamp to milliseconds
    periodEnd,
    trialEnd,
    canceledAt,
    providerData: {
      modifiedAt: subscription.created * 1000, // Convert from Unix timestamp to milliseconds (using created as updated doesn't exist)
      customerId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      endedAt: subscription.ended_at != null ? subscription.ended_at * 1000 : undefined,
      cancelReason: subscription.cancellation_details?.reason ?? undefined,
      cancelComment: subscription.cancellation_details?.comment ?? undefined
    }
  }

  return subscriptionData
}
