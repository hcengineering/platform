//
// Copyright © 2024 Hardcore Engineering Inc.
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
  ServiceID: string
  AccountsUrl: string
  PostHogHost: string
  PostHogAPI: string
  SentryDSN?: string
  MaxPayloadSize?: string
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseNumber(process.env.PORT) ?? 4007,
    Secret: process.env.SECRET,
    ServiceID: process.env.SERVICE_ID ?? 'analytics-collector-service',
    AccountsUrl: process.env.ACCOUNTS_URL,
    PostHogHost: process.env.POSTHOG_HOST,
    PostHogAPI: process.env.POSTHOG_API_KEY,
    SentryDSN: process.env.SENTRY_DSN ?? '',
    MaxPayloadSize: process.env.MAX_PAYLOAD_SIZE ?? '10mb'
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
