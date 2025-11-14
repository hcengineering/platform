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

import type { Express } from 'express'
import type { MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import { type SubscriptionType, type SubscriptionData } from '@hcengineering/account-client'

/**
 * Payment subscription plan configuration
 * Defines what plans are available for a subscription type
 * TODO: take from billing from model
 */
export interface SubscriptionPlan {
  id: string // Plan identifier
  name: string // Display name
  description?: string
  price: number // Price in cents
  currency: string // e.g. 'usd'
}

/**
 * Subscription request from client
 * Used for subscribing to a plan
 */
export interface SubscribeRequest {
  type: SubscriptionType
  plan: string
  customerEmail?: string
  customerName?: string
}

/**
 * Checkout response when a new subscription or plan upgrade requires a checkout
 */
export interface CheckoutResponse {
  checkoutId: string
  checkoutUrl: string
}

/**
 * Payment provider abstraction
 * Core interface that all payment providers must implement
 * Includes both subscription operations and webhook handling
 */
export interface PaymentProvider {
  get providerName(): string

  createSubscription: (
    ctx: MeasureContext,
    request: SubscribeRequest,
    workspaceUuid: WorkspaceUuid,
    workspaceUrl: string,
    accountUuid: string
  ) => Promise<CheckoutResponse>

  /**
   * Get subscription details
   */
  getSubscription: (ctx: MeasureContext, subscriptionId: string) => Promise<SubscriptionData | null>

  /**
   * Get subscription by checkout ID
   * Used to poll for subscription creation after successful checkout
   * Returns the subscription data if found, null otherwise
   */
  getSubscriptionByCheckout: (ctx: MeasureContext, checkoutId: string) => Promise<SubscriptionData | null>

  /**
   * Cancel a subscription
   * Accepts provider subscription ID
   * Returns the canceled subscription data
   */
  cancelSubscription: (ctx: MeasureContext, providerSubscriptionId: string) => Promise<SubscriptionData>

  /**
   * Uncancel a subscription (reactivate a previously canceled subscription)
   * Accepts provider subscription ID
   * Returns the reactivated subscription data
   */
  uncancelSubscription: (ctx: MeasureContext, providerSubscriptionId: string) => Promise<SubscriptionData>

  /**
   * Update a subscription to a different plan
   * Used for upgrades and downgrades
   * For paid-to-paid upgrades: Returns SubscriptionData | null
   * For free-to-paid upgrades: Returns CheckoutResponse (requires checkout)
   * Handles immediate effective date with proration
   */
  updateSubscriptionPlan: (
    ctx: MeasureContext,
    subscriptionId: string,
    newPlan: string,
    workspaceUrl: string
  ) => Promise<SubscriptionData | CheckoutResponse | null>

  /**
   * Reconcile active subscriptions between provider and our database
   * This is provider-specific logic and should be delegated to the provider.
   * All data fetching, transformation, and database updates are handled internally.
   */
  reconcileActiveSubscriptions: (ctx: MeasureContext, accountsUrl: string, serviceToken: string) => Promise<void>

  /**
   * Register provider-specific webhook endpoints
   * Called during server initialization
   */
  registerWebhookEndpoints: (app: Express, ctx: MeasureContext, accountsUrl: string, serviceToken: string) => void
}

/**
 * Factory for creating payment providers
 */
export interface PaymentProviderFactory {
  /**
   * Create a payment provider instance
   */
  create: (type: string, config: Record<string, any>) => PaymentProvider | undefined
}
