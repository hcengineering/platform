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
import { config as dotenvConfig } from 'dotenv'
import OpenAI from 'openai'

dotenvConfig()

export interface Config {
  AccountsUrl: string
  OpenAIBaseUrl: string
  OpenAIKey: string
  OpenAIModel: OpenAI.ChatModel
  QueueConfig: string
  QueueRegion: string
  Secret: string
  ServiceId: string
  HulylakeUrl: string
}

const config: Config = (() => {
  const params: Partial<Config> = {
    Secret: process.env.SECRET ?? 'secret',
    QueueConfig: process.env.QUEUE_CONFIG ?? '',
    QueueRegion: process.env.QUEUE_REGION ?? '',
    AccountsUrl: process.env.ACCOUNTS_URL ?? '',
    HulylakeUrl: process.env.HULYLAKE_URL ?? '',
    ServiceId: process.env.SERVICE_ID ?? 'translate',
    OpenAIKey: process.env.OPENAI_API_KEY,
    OpenAIModel: (process.env.OPENAI_MODEL ?? 'gpt-4o-mini') as OpenAI.ChatModel,
    OpenAIBaseUrl: process.env.OPENAI_BASE_URL ?? ''
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
