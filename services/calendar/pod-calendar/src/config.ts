//
// Copyright © 2023 Hardcore Engineering Inc.
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
  Port: number

  AccountsURL: string
  ServiceID: string
  Secret: string
  KvsUrl: string
  Credentials: string
  WATCH_URL: string
  InitLimit: number
  WorkspaceInactivityInterval: number // Interval in days to stop workspace synchronization if not visited
}

const envMap: { [key in keyof Config]: string } = {
  Port: 'PORT',

  AccountsURL: 'ACCOUNTS_URL',
  ServiceID: 'SERVICE_ID',
  Secret: 'SECRET',
  Credentials: 'Credentials',
  WATCH_URL: 'WATCH_URL',
  InitLimit: 'INIT_LIMIT',
  KvsUrl: 'KVS_URL',
  WorkspaceInactivityInterval: 'WORKSPACE_INACTIVITY_INTERVAL'
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseNumber(process.env[envMap.Port]) ?? 8095,
    AccountsURL: process.env[envMap.AccountsURL],
    ServiceID: process.env[envMap.ServiceID] ?? 'calendar-service',
    Secret: process.env[envMap.Secret],
    Credentials: process.env[envMap.Credentials],
    InitLimit: parseNumber(process.env[envMap.InitLimit]) ?? 50,
    WATCH_URL: process.env[envMap.WATCH_URL],
    KvsUrl: process.env[envMap.KvsUrl],
    WorkspaceInactivityInterval: parseNumber(process.env[envMap.WorkspaceInactivityInterval] ?? '3') // In days
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>)
    .filter((key) => params[key] === undefined)
    .map((key) => envMap[key])

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
