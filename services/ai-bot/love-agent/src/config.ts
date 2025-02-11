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

import { SttProvider } from './type.js'

interface Config {
  DeepgramApiKey: string
  DeepgramModel: string
  OpenAiModel: string
  OpenaiApiKey: string
  OpenaiBaseUrl: string
  PlatformToken: string
  PlatformUrl: string
  SttProvider: SttProvider
}

const config: Config = (() => {
  const params: Partial<Config> = {
    DeepgramApiKey: process.env.DEEPGRAM_API_KEY ?? '',
    DeepgramModel: process.env.DEEPGRAM_MODEL ?? 'nova-3-general',
    OpenAiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-realtime-preview-2024-12-17',
    OpenaiApiKey: process.env.OPENAI_API_KEY ?? '',
    OpenaiBaseUrl: process.env.OPENAI_BASE_URL ?? '',
    PlatformToken: process.env.PLATFORM_TOKEN,
    PlatformUrl: process.env.PLATFORM_URL,
    SttProvider: (process.env.STT_PROVIDER as SttProvider) ?? 'deepgram'
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
