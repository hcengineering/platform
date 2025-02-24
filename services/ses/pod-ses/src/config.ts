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
  Source: string
  AccessKey: string
  SecretKey: string
  Region: string
  AuthToken?: string
  PushSubject?: string
  PushPublicKey?: string
  PushPrivateKey?: string
}

const envMap: { [key in keyof Required<Config>]: string } = {
  Port: 'PORT',
  Source: 'SOURCE',
  AccessKey: 'ACCESS_KEY',
  SecretKey: 'SECRET_KEY',
  Region: 'REGION',
  AuthToken: 'AUTH_TOKEN',
  PushPublicKey: 'PUSH_PUBLIC_KEY',
  PushPrivateKey: 'PUSH_PRIVATE_KEY',
  PushSubject: 'PUSH_SUBJECT'
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const params: Partial<Config> = {
    Port: parseNumber(process.env[envMap.Port]) ?? 8091,
    Source: process.env[envMap.Source],
    AccessKey: process.env[envMap.AccessKey],
    SecretKey: process.env[envMap.SecretKey],
    Region: process.env[envMap.Region] ?? 'us-east-1',
    AuthToken: process.env[envMap.AuthToken],
    PushPublicKey: process.env[envMap.PushPublicKey],
    PushPrivateKey: process.env[envMap.PushPrivateKey],
    PushSubject: process.env[envMap.PushSubject]
  }

  const required: Array<keyof Config> = ['Port', 'Source', 'AccessKey', 'SecretKey', 'Region']

  const missingEnv = required.filter((key) => params[key] === undefined).map((key) => envMap[key])

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
