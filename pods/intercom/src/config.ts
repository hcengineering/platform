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

import { systemAccountEmail } from '@hcengineering/core'

interface Config {
  TransactorURL: string
  ServerSecret: string
  SystemEmail: string
  ProductID: string

  IntercomAppID: string | undefined
  IntercomApiURL: string | undefined
  IntercomAuthToken: string
  Port: number
}

const envMap: { [key in keyof Config]: string } = {
  TransactorURL: 'TRANSACTOR_URL',
  ServerSecret: 'SERVER_SECRET',
  SystemEmail: 'SYSTEM_EMAIL',
  ProductID: 'PRODUCT_ID',

  IntercomAppID: 'INTERCOM_APP_ID',
  IntercomApiURL: 'INTERCOM_API_URL',
  IntercomAuthToken: 'INTERCOM_AUTH_TOKEN',
  Port: 'PORT'
}

const required: Array<keyof Config> = ['TransactorURL', 'ServerSecret', 'IntercomAuthToken']

const config: Config = (() => {
  const params = {
    TransactorURL: process.env[envMap.TransactorURL],
    ServerSecret: process.env[envMap.ServerSecret],
    SystemEmail: process.env[envMap.SystemEmail] ?? systemAccountEmail,
    ProductID: process.env[envMap.ProductID] ?? '',

    IntercomAppID: process.env[envMap.IntercomAppID],
    IntercomApiURL: process.env[envMap.IntercomApiURL],
    IntercomAuthToken: process.env[envMap.IntercomAuthToken],

    Port: parseInt(process.env[envMap.Port] ?? '3600')
  }

  const missingEnv = required.filter((key) => params[key] === undefined).map((key) => envMap[key])

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
