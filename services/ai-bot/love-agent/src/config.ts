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

import { SttProvider } from './type.'

interface Config {
  DeepgramApiKey: string
  PlatformUrl: string
  PlatformToken: string
  OpenaiApiKey: string
  OpenaiBaseUrl: string
  SttProvider: SttProvider
}

const config: Config = (() => {
  const params: Partial<Config> = {
    DeepgramApiKey: process.env.DEEPGRAM_API_KEY,
    PlatformUrl: process.env.PLATFORM_URL,
    PlatformToken: process.env.PLATFORM_TOKEN,
    OpenaiApiKey: process.env.OPENAI_API_KEY,
    OpenaiBaseUrl: process.env.OPENAI_BASE_URL ?? '',
    SttProvider: (process.env.STT_PROVIDER as SttProvider) ?? 'deepgram'
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
