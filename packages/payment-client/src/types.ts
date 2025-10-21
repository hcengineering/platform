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
 * Subscription request parameters
 * Used when creating a new subscription
 */
export interface SubscribeRequest {
  type: 'tier' | 'support' // Subscription type
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
