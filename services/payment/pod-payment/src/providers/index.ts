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
import type { MeasureContext } from '@hcengineering/core'
import { type SubscriptionType } from '@hcengineering/account-client'

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
 * Subscription response after successful creation
 */
export interface CreateSubscriptionResponse {
  checkoutId: string
  checkoutUrl: string
}

/**
 * Generic webhook event from payment provider
 */
export interface WebhookEvent {
  type: string
  data: any
}

/**
 * Payment provider abstraction
 * Core interface that all payment providers must implement
 * Includes both subscription operations and webhook handling
 */
export interface PaymentProvider {
  createSubscription: (
    ctx: MeasureContext,
    request: SubscribeRequest,
    workspaceUuid: string,
    accountUuid: string
  ) => Promise<CreateSubscriptionResponse>

  /**
   * Get subscription details
   */
  getSubscription: (ctx: MeasureContext, subscriptionId: string) => Promise<any>

  /**
   * Cancel a subscription
   */
  cancelSubscription: (ctx: MeasureContext, subscriptionId: string) => Promise<void>

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
