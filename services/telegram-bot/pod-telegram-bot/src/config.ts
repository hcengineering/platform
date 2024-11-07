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
  BotToken: string
  MongoURL: string
  MongoDB: string
  ServiceId: string
  Secret: string
  Domain: string
  BotPort: number
  App: string
  OtpTimeToLiveSec: number
  OtpRetryDelaySec: number
  AccountsUrl: string
  SentryDSN: string
  AccountsURL: string
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseNumber(process.env.PORT) ?? 4020,
    BotToken: process.env.BOT_TOKEN,
    MongoURL: process.env.MONGO_URL,
    MongoDB: process.env.MONGO_DB,
    AccountsUrl: process.env.ACCOUNTS_URL,
    ServiceId: process.env.SERVICE_ID,
    Secret: process.env.SECRET,
    Domain: process.env.DOMAIN ?? '',
    BotPort: parseNumber(process.env.BOT_PORT) ?? 8443,
    // TODO: later we should get this title from branding map
    App: process.env.APP ?? 'Huly',
    OtpTimeToLiveSec: parseNumber(process.env.OTP_TIME_TO_LIVE_SEC) ?? 5 * 60,
    OtpRetryDelaySec: parseNumber(process.env.OTP_RETRY_DELAY_SEC) ?? 60,
    SentryDSN: process.env.SENTRY_DSN ?? '',
    AccountsURL: process.env.ACCOUNTS_URL
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
