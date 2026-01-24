//
// Copyright © 2026 Hardcore Engineering Inc.
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
import { config as dotenv } from 'dotenv'

dotenv()

export interface Config {
  Port: number
  Secret: string
  ServiceID: string
  UserAgent: string
  DescriptionMaxSentences: number
  DescriptionMaxLength: number
  TimeoutMs?: number
  MaxImageBytes?: number
}

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseInt(process.env.PORT ?? '4041'),
    Secret: process.env.SECRET,
    ServiceID: process.env.SERVICE_ID ?? 'link-preview',
    UserAgent: process.env.USER_AGENT ?? 'Huly Link Preview Service/1.0',
    DescriptionMaxSentences: parseInt(process.env.DESCRIPTION_MAX_SENTENCES ?? '3'),
    DescriptionMaxLength: parseInt(process.env.DESCRIPTION_MAX_LENGTH ?? '200'),
    TimeoutMs: parseInt(process.env.TIMEOUT ?? '5') * 1000
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
