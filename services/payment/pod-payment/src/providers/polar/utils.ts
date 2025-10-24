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

/**
 * Transform a Polar subscription to our SubscriptionData format
 * Extracts metadata and maps status
 * Returns null if subscription is in an irrelevant state
 */
export function transformPolarSubscriptionToData (subscription: any): SubscriptionData | null {
  const metadata = subscription.metadata ?? {}
  const workspaceUuid = metadata.workspaceUuid as WorkspaceUuid | undefined
  const accountUuid = subscription.customer?.externalId as AccountUuid | undefined
  const subscriptionType = metadata.subscriptionType as SubscriptionType | undefined
  const subscriptionPlan = metadata.subscriptionPlan as string | undefined

  if (
    accountUuid === undefined ||
    workspaceUuid === undefined ||
    subscriptionType === undefined ||
    subscriptionPlan === undefined
  ) {
    return null
  }

  // With supporter subscriptions of type pay-what-you-want the actual plan should be
  // determined by the amount paid as it's not possible to define maximum sum for these products.
  // E.g. one can pay 1000$ using common supporter product which will correspond to 'common' plan
  // in metadata but should be treated like 'legendary' plan in actual subscription.
  // Conditions are hardcoded for now.
  // TODO: take from model
  let actualPlan = subscriptionPlan
  const amount = subscription.amount as number | undefined
  if (amount !== undefined) {
    if (amount >= 1999 && amount < 9999) {
      actualPlan = 'rare'
    } else if (amount >= 9999 && amount < 39999) {
      actualPlan = 'epic'
    } else if (amount >= 39999) {
      actualPlan = 'legendary'
    }
  }

  // Map Polar status to our SubscriptionStatus
  const status = mapPolarStatus(subscription.status)

  if (status === null) {
    // Ignore updates for subscriptions in irrelevant states
    return null
  }

  // Handle optional periodEnd field - explicit null check
  let periodEnd: number | undefined
  if (subscription.currentPeriodEnd != null) {
    periodEnd = new Date(subscription.currentPeriodEnd).getTime()
  }

  const subscriptionData: SubscriptionData = {
    id: `polar_${subscription.id}`, // Composite ID with provider prefix to avoid conflicts
    workspaceUuid,
    accountUuid,
    provider: 'polar',
    providerSubscriptionId: subscription.id,
    providerCheckoutId: subscription.checkoutId,
    type: subscriptionType,
    status,
    plan: actualPlan,
    amount, // Amount paid in cents (e.g. 9999 for $99.99) - used for pay-what-you-want tracking
    periodStart: new Date(subscription.currentPeriodStart).getTime(),
    periodEnd,
    trialEnd: subscription.trialEnd !== undefined ? new Date(subscription.trialEnd).getTime() : undefined,
    canceledAt: subscription.canceledAt !== undefined ? new Date(subscription.canceledAt).getTime() : undefined,
    providerData: {
      modifiedAt:
        subscription.modifiedAt !== null
          ? new Date(subscription.modifiedAt).getTime()
          : new Date(subscription.createdAt).getTime(),
      customerId: subscription.customerId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      endedAt: subscription.endedAt,
      cancelReason: subscription.customerCancellationReason,
      cancelComment: subscription.customerCancellationComment
    }
  }

  return subscriptionData
}
