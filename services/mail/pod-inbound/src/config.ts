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
  port: number
  accountsUrl: string
  workspaceId: string
}

const envMap = {
  Port: 'PORT',
  AccountsUrl: 'ACCOUNTS_URL',
  WorkspaceId: 'WORKSPACE_ID'
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const port = parseNumber(process.env[envMap.Port])
  if (port === undefined) {
    throw Error('Missing env variable: PORT')
  }
  const accountsUrl = process.env[envMap.AccountsUrl]
  if (accountsUrl === undefined) {
    throw Error('Missing env variable: ACCOUNTS_URL')
  }
  const workspaceId = process.env[envMap.WorkspaceId]
  if (workspaceId === undefined) {
    throw Error('Missing env variable: WORKSPACE_ID')
  }
  const params: Config = {
    port,
    accountsUrl,
    workspaceId
  }

  return params
})()

export default config
