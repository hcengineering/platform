//
// Copyright © 2022 Hardcore Engineering Inc.
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

/**
 * @public
 */
export interface Config {
  ServiceID: string
  Secret: string

  Interval: number

  Port: number

  AccountsUrl: string
  TransactorUrl: string
  MongoUrl: string
  UploadUrl: string

  MinioEndpoint: string
  MinioAccessKey: string
  MinioSecretKey: string
}

const envMap: { [key in keyof Config]: string } = {
  ServiceID: 'SERVICE_ID',
  Secret: 'SECRET',
  Interval: 'INTERVAL',
  Port: 'COLLABORATOR_PORT',
  AccountsUrl: 'ACCOUNTS_URL',
  TransactorUrl: 'TRANSACTOR_URL',
  MongoUrl: 'MONGO_URL',
  UploadUrl: 'UPLOAD_URL',
  MinioEndpoint: 'MINIO_ENDPOINT',
  MinioAccessKey: 'MINIO_ACCESS_KEY',
  MinioSecretKey: 'MINIO_SECRET_KEY'
}

const required: Array<keyof Config> = [
  'Secret',
  'ServiceID',
  'Port',
  'AccountsUrl',
  'TransactorUrl',
  'MongoUrl',
  'MinioEndpoint',
  'MinioAccessKey',
  'MinioSecretKey'
]

const config: Config = (() => {
  const params: Partial<Config> = {
    Secret: process.env[envMap.Secret],
    ServiceID: process.env[envMap.ServiceID] ?? 'collaborator-service',
    Interval: parseInt(process.env[envMap.Interval] ?? '30000'),
    Port: parseInt(process.env[envMap.Port] ?? '3078'),
    AccountsUrl: process.env[envMap.AccountsUrl],
    TransactorUrl: process.env[envMap.TransactorUrl],
    MongoUrl: process.env[envMap.MongoUrl],
    UploadUrl: process.env[envMap.UploadUrl] ?? '/files',
    MinioEndpoint: process.env[envMap.MinioEndpoint],
    MinioAccessKey: process.env[envMap.MinioAccessKey],
    MinioSecretKey: process.env[envMap.MinioSecretKey]
  }

  const missingEnv = required.filter((key) => params[key] === undefined).map((key) => envMap[key])

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }

  return params as Config
})()

export default config
