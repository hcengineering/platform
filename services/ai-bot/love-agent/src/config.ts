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

import dotenv from 'dotenv'

interface Config {
  ServerSecret: string
  PlatformUrl: string

  LiveKitApiUrl: string
  LiveKitApiKey: string
  LiveKitApiSecret: string

  Debug: boolean // Keep files after sending to ai-bot
}

const config: Config = (() => {
  dotenv.config()

  const params: Partial<Config> = {
    ServerSecret: process.env.SERVER_SECRET,
    PlatformUrl: process.env.PLATFORM_URL,

    LiveKitApiKey: process.env.LIVEKIT_API_KEY,
    LiveKitApiSecret: process.env.LIVEKIT_API_SECRET,
    LiveKitApiUrl: process.env.LIVEKIT_URL,

    Debug: process.env.DEBUG === 'true'
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
