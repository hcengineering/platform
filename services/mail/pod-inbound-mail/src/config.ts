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

interface Config {
  port: number
  secret: string
  accountsUrl: string
  workspaceUrl: string
  ignoredAddresses: string[]
  hookToken?: string
}

const config: Config = {
  port: parseInt(process.env.PORT ?? '4050'),
  secret: process.env.SECRET ?? 'secret',
  accountsUrl: process.env.ACCOUNTS_URL ?? 'http://localhost:3000',
  workspaceUrl: (() => {
    if (process.env.WORKSPACE_URL !== undefined) {
      return process.env.WORKSPACE_URL
    }
    throw Error('WORKSPACE_URL env var is not set')
  })(),
  ignoredAddresses: process.env.IGNORED_ADDRESSES?.split(',') ?? [],
  hookToken: process.env.HOOK_TOKEN
}

export default config
