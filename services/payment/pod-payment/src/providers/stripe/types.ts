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

/**
 * Stripe integration types
 * Uses stripe SDK for API interactions
 * Documentation: https://stripe.com/docs/api
 */
/**
 * Webhook event wrapper
 */
export interface StripeWebhookEvent {
  type: string
  data: any
}

export interface CreateCheckoutMetadata {
  workspaceUuid: string
  subscriptionType: string
  subscriptionPlan: string
  [key: string]: string | number | boolean
}

/**
 * Internal types for checkout creation
 * Note: Stripe uses 'price' parameter (price ID)
 */
export interface CreateCheckoutParams {
  priceId: string
  successUrl: string
  cancelUrl?: string
  customerId?: string
  customerEmail?: string
  customerName?: string
  metadata: CreateCheckoutMetadata
  subscriptionId?: string
}

export interface CheckoutResult {
  checkoutId: string
  url: string
}
