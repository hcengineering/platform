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

dotenvConfig()

export interface Config {
  AccountsUrl: string
  Secret: string
  ServiceID: string
  Partitions: number
}

const config: Config = (() => {
  const params: Partial<Config> = {
    AccountsUrl: process.env.ACCOUNTS_URL,
    Secret: process.env.SECRET,
    ServiceID: process.env.SERVICE_ID ?? 'media',
    Partitions: parseNumber(process.env.PARTITIONS) ?? 1
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing config for attributes: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

function parseNumber (str: string | undefined): number | undefined {
  if (str !== undefined) {
    const intValue = Number.parseInt(str)
    if (Number.isInteger(intValue)) {
      return intValue
    }
  }
}

export default config
