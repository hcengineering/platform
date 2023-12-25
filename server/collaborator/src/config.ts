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

  TransactorUrl: string
  MongoUrl: string

  MinioEndpoint: string
  MinioAccessKey: string
  MinioSecretKey: string
}

const envMap: { [key in keyof Config]: string } = {
  ServiceID: 'SERVICE_ID',
  Secret: 'SECRET',
  Interval: 'INTERVAL',
  Port: 'COLLABORATOR_PORT',
  TransactorUrl: 'TRANSACTOR_URL',
  MongoUrl: 'MONGO_URL',
  MinioEndpoint: 'MINIO_ENDPOINT',
  MinioAccessKey: 'MINIO_ACCESS_KEY',
  MinioSecretKey: 'MINIO_SECRET_KEY'
}

const required: Array<keyof Config> = [
  'Secret',
  'ServiceID',
  'Port',
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
    TransactorUrl: process.env[envMap.TransactorUrl],
    MongoUrl: process.env[envMap.MongoUrl],
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
