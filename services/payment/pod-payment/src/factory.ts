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

import type { PaymentProvider } from './providers'
import { PolarProvider } from './providers/polar/provider'

/**
 * Static singleton factory for creating payment providers
 * Can support multiple payment providers (Polar, Stripe, etc.)
 */
export class PaymentProviderFactory {
  private static instance: PaymentProviderFactory

  private constructor () {}

  static getInstance (): PaymentProviderFactory {
    if (this.instance === undefined) {
      this.instance = new PaymentProviderFactory()
    }
    return this.instance
  }

  /**
   * Create and cache a payment provider
   * Only one provider can be initialized per instance
   * Returns the cached provider if already initialized
   */
  create (type: string, config: Record<string, any>): PaymentProvider | undefined {
    switch (type) {
      case 'polar':
        return this.createPolarProvider(config)
      default:
        return undefined
    }
  }

  private createPolarProvider (config: Record<string, any>): PaymentProvider {
    if (config.accessToken === undefined) {
      throw new Error('Polar provider requires accessToken in config')
    }
    if (config.webhookSecret === undefined) {
      throw new Error('Polar provider requires webhookSecret in config')
    }
    if (config.subscriptionPlans === undefined) {
      throw new Error('Polar provider requires subscriptionPlans in config')
    }

    return new PolarProvider(config.accessToken, config.webhookSecret, config.subscriptionPlans, config.frontUrl)
  }
}
