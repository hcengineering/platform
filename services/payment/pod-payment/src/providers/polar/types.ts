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
 * Polar.sh integration types
 * Uses @polar-sh/sdk for API interactions
 * Documentation: https://docs.polar.sh/api-reference
 */
/**
 * Webhook event wrapper
 */
export interface PolarWebhookEvent {
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
 * Note: API uses 'products' parameter (array of product IDs)
 */
export interface CreateCheckoutParams {
  productIds: string[]
  successUrl: string
  returnUrl?: string
  externalCustomerId: string
  metadata: CreateCheckoutMetadata
  customerEmail?: string
  customerName?: string
  customerMetadata?: Record<string, string | number | boolean>
}

export interface CheckoutResult {
  checkoutId: string
  url: string
}
