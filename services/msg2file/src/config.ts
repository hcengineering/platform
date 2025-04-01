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

interface Config {
  AccountsURL: string
  DbUrl: string
  MaxSyncAttempts: number
  MessagesPerFile: number
  Port: number
  Secret: string
  ServiceID: string
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const params: Partial<Config> = {
    AccountsURL: process.env.ACCOUNTS_URL,
    DbUrl: process.env.DB_URL,
    MaxSyncAttempts: parseNumber(process.env.MAX_SYNC_ATTEMPTS) ?? 3,
    MessagesPerFile: parseNumber(process.env.MESSAGES_PER_FILE) ?? 500,
    Port: parseNumber(process.env.PORT),
    Secret: process.env.SECRET ?? 'secret',
    ServiceID: process.env.SERVICE_ID ?? 'msg2file-service'
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>).filter((key) => params[key] === undefined)

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
