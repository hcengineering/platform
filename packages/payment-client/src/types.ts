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

import type { AccountUuid, WorkspaceUuid } from '@hcengineering/core'

export enum SubscriptionType {
  Tier = 'tier', // Main workspace tier (free, starter, pro, enterprise)
  Support = 'support' // Voluntary support/donation subscription
}

export enum SubscriptionStatus {
  Active = 'active', // Subscription is active and paid
  Trialing = 'trialing', // In trial period (free usage)
  PastDue = 'past_due', // Payment failed but subscription not yet canceled
  Canceled = 'canceled', // Subscription was canceled by user or admin
  Paused = 'paused', // Subscription is temporarily paused (some providers support this)
  Expired = 'expired' // Subscription or trial has expired
}

/**
 * Subscription request parameters
 * Used when creating a new subscription
 */
export interface SubscribeRequest {
  type: SubscriptionType
  plan: string // Plan identifier
  customerEmail?: string // Optional customer email
  customerName?: string // Optional customer name
}

/**
 * Subscription creation response
 * Contains checkout details for payment
 */
export interface CreateSubscriptionResponse {
  checkoutId: string // Checkout session ID
  checkoutUrl: string // URL to redirect user to for payment
}

/**
 * Subscription data for checkout status
 * Matches @hcengineering/account-client Subscription type
 * @see @hcengineering/account-client
 */
export interface SubscriptionData {
  id: string // Internal unique subscription ID
  workspaceUuid: WorkspaceUuid
  accountUuid: AccountUuid
  provider: string
  providerSubscriptionId: string
  providerCheckoutId?: string
  type: SubscriptionType
  status: SubscriptionStatus
  plan: string
  amount?: number
  periodStart?: number
  periodEnd?: number
  trialEnd?: number
  canceledAt?: number
  providerData?: Record<string, any>
}

/**
 * Checkout status response
 * Contains information about the checkout and subscription status
 */
export interface CheckoutStatus {
  checkoutId: string // Checkout session ID
  subscriptionId: string | null // Subscription ID if completed
  status: 'pending' | 'completed' // Checkout status
  subscription: SubscriptionData | null // Full subscription data if available
}
