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

import OpenAI from 'openai'

interface Config {
  AccountsURL: string
  ConfigurationDB: string
  MongoURL: string
  ServerSecret: string
  ServiceID: string
  FirstName: string
  LastName: string
  AvatarPath: string
  AvatarName: string
  AvatarContentType: string
  Password: string
  OpenAIKey: string
  OpenAIModel: OpenAI.ChatModel
  OpenAIBaseUrl: string
  OpenAITranslateModel: OpenAI.ChatModel
  OpenAISummaryModel: OpenAI.ChatModel
  MaxContentTokens: number
  MaxHistoryRecords: number
  Port: number
  LoveEndpoint: string
  DataLabApiKey: string
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const params: Partial<Config> = {
    AccountsURL: process.env.ACCOUNTS_URL,
    ConfigurationDB: process.env.CONFIGURATION_DB ?? '%ai-bot',
    MongoURL: process.env.MONGO_URL,
    ServerSecret: process.env.SERVER_SECRET,
    ServiceID: process.env.SERVICE_ID ?? 'ai-bot-service',
    FirstName: process.env.FIRST_NAME,
    LastName: process.env.LAST_NAME,
    AvatarPath: process.env.AVATAR_PATH ?? './assets/avatar.png',
    AvatarName: process.env.AVATAR_NAME ?? 'huly_ai_bot_avatar',
    AvatarContentType: process.env.AVATAR_CONTENT_TYPE ?? 'image/png',
    Password: process.env.PASSWORD ?? 'password',
    OpenAIKey: process.env.OPENAI_API_KEY ?? '',
    OpenAIModel: (process.env.OPENAI_MODEL ?? 'gpt-4o-mini') as OpenAI.ChatModel,
    OpenAITranslateModel: (process.env.OPENAI_TRANSLATE_MODEL ?? 'gpt-4o-mini') as OpenAI.ChatModel,
    OpenAISummaryModel: (process.env.OPENAI_SUMMARY_MODEL ?? 'gpt-4o-mini') as OpenAI.ChatModel,
    OpenAIBaseUrl: process.env.OPENAI_BASE_URL ?? '',
    MaxContentTokens: parseNumber(process.env.MAX_CONTENT_TOKENS) ?? 128 * 100,
    MaxHistoryRecords: parseNumber(process.env.MAX_HISTORY_RECORDS) ?? 500,
    Port: parseNumber(process.env.PORT) ?? 4010,
    LoveEndpoint: process.env.LOVE_ENDPOINT ?? '',
    DataLabApiKey: process.env.DATALAB_API_KEY ?? ''
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
