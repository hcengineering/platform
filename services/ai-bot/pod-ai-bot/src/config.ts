//
// Copyright © 2024 Hardcore Engineering Inc.
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
  ConfigurationDB: string
  MongoURL: string
  ProductID: string
  ServerSecret: string
  ServiceID: string
  SupportWorkspace: string
  FirstName: string
  LastName: string
  AvatarPath: string
  AvatarName: string
  AvatarContentType: string
  Password: string
}

const envMap: { [key in keyof Config]: string } = {
  AccountsURL: 'ACCOUNTS_URL',
  ConfigurationDB: 'CONFIGURATION_DB',
  MongoURL: 'MONGO_URL',
  ProductID: 'PRODUCT_ID',
  ServerSecret: 'SERVER_SECRET',
  ServiceID: 'SERVICE_ID',
  SupportWorkspace: 'SUPPORT_WORKSPACE',
  FirstName: 'FIRST_NAME',
  LastName: 'LAST_NAME',
  AvatarPath: 'AVATAR_PATH',
  AvatarName: 'AVATAR_NAME',
  AvatarContentType: 'AVATAR_CONTENT_TYPE',
  Password: 'PASSWORD'
}

const config: Config = (() => {
  const params: Partial<Config> = {
    AccountsURL: process.env[envMap.AccountsURL],
    ConfigurationDB: process.env[envMap.ConfigurationDB] ?? '%ai-bot',
    MongoURL: process.env[envMap.MongoURL],
    ProductID: process.env[envMap.ProductID] ?? '',
    ServerSecret: process.env[envMap.ServerSecret],
    ServiceID: process.env[envMap.ServiceID] ?? 'ai-bot-service',
    SupportWorkspace: process.env[envMap.SupportWorkspace],
    FirstName: process.env[envMap.FirstName],
    LastName: process.env[envMap.LastName],
    AvatarPath: process.env[envMap.AvatarPath] ?? './assets/avatar.png',
    AvatarName: process.env[envMap.AvatarName] ?? 'huly_ai_bot_avatar',
    AvatarContentType: process.env[envMap.AvatarContentType] ?? '.png',
    Password: process.env[envMap.Password] ?? 'password'
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
