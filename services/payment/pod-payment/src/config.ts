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

export interface Config {
  Port: number
  Secret: string
  AccountsUrl: string
  FrontUrl: string

  // Polar.sh configuration
  PolarAccessToken?: string
  PolarWebhookSecret?: string
  PolarOrganizationId?: string
  PolarSubscriptionPlans?: string
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseNumber(process.env.PORT) ?? 4040,
    Secret: process.env.SECRET,
    AccountsUrl: process.env.ACCOUNTS_URL,
    FrontUrl: process.env.FRONT_URL,
    PolarAccessToken: process.env.POLAR_ACCESS_TOKEN,
    PolarWebhookSecret: process.env.POLAR_WEBHOOK_SECRET,
    PolarOrganizationId: process.env.POLAR_ORGANIZATION_ID,
    PolarSubscriptionPlans: process.env.POLAR_SUBSCRIPTION_PLANS
  }

  const requiredKeys: Array<keyof Config> = ['Port', 'Secret', 'AccountsUrl', 'FrontUrl']
  const missingEnv = requiredKeys.filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
