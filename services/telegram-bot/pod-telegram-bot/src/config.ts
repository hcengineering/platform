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
  AccountsURL: string
  AccountsUrl: string
  App: string
  BotPort: number
  BotToken: string
  DbUrl: string
  Domain: string
  MongoDB: string
  MongoURL: string
  OtpRetryDelaySec: number
  OtpTimeToLiveSec: number
  Port: number
  QueueConfig: string
  QueueRegion: string
  Secret: string
  SentryDSN: string
  ServiceId: string
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseNumber(process.env.PORT) ?? 4020,
    BotToken: process.env.BOT_TOKEN,
    // TODO: remove mongo
    MongoURL: process.env.MONGO_URL ?? '',
    MongoDB: process.env.MONGO_DB ?? '',
    AccountsUrl: process.env.ACCOUNTS_URL,
    ServiceId: process.env.SERVICE_ID ?? 'telegram-bot',
    Secret: process.env.SECRET,
    Domain: process.env.DOMAIN ?? '',
    BotPort: parseNumber(process.env.BOT_PORT) ?? 8443,
    // TODO: later we should get this title from branding map
    App: process.env.APP ?? 'Huly',
    OtpTimeToLiveSec: parseNumber(process.env.OTP_TIME_TO_LIVE_SEC) ?? 5 * 60,
    OtpRetryDelaySec: parseNumber(process.env.OTP_RETRY_DELAY_SEC) ?? 60,
    SentryDSN: process.env.SENTRY_DSN ?? '',
    AccountsURL: process.env.ACCOUNTS_URL,
    DbUrl: process.env.DB_URL,
    QueueRegion: process.env.QUEUE_REGION,
    QueueConfig: process.env.QUEUE_CONFIG
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
