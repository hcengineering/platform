//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
import { BaseConfig } from '@hcengineering/mail-common'
import { config as dotenvConfig } from 'dotenv'
import { IntegrationVersion } from './types'

dotenvConfig()

interface Config extends BaseConfig {
  Port: number
  ServiceID: string
  Secret: string
  Credentials: string
  WATCH_TOPIC_NAME: string
  FooterMessage: string
  OutgoingSyncStartDate: Date // ISO date string - messages from mail chanel before this date will not attempt to be sent to Gmail
  InitLimit: number
  Version: IntegrationVersion
  QueueConfig: string
  QueueRegion: string
  CommunicationTopic: string

  WorkspaceInactivityInterval: number // Interval in days to stop workspace synchronization if not visited
}

const envMap: { [key in keyof Config]: string } = {
  Port: 'PORT',
  AccountsURL: 'ACCOUNTS_URL',
  ServiceID: 'SERVICE_ID',
  Secret: 'SECRET',
  Credentials: 'Credentials',
  WATCH_TOPIC_NAME: 'WATCH_TOPIC_NAME',
  FooterMessage: 'FOOTER_MESSAGE',
  OutgoingSyncStartDate: 'OUTGOING_SYNC_START_DATE',
  InitLimit: 'INIT_LIMIT',
  KvsUrl: 'KVS_URL',
  StorageConfig: 'STORAGE_CONFIG',
  Version: 'VERSION',
  QueueConfig: 'QUEUE_CONFIG',
  QueueRegion: 'QUEUE_REGION',
  CommunicationTopic: 'COMMUNICATION_TOPIC',
  WorkspaceInactivityInterval: 'WORKSPACE_INACTIVITY_INTERVAL'
}

const parseNumber = (str: string | undefined): number | undefined => (str !== undefined ? Number(str) : undefined)

const config: Config = (() => {
  const versionStr = process.env[envMap.Version] ?? 'v1'
  let version: IntegrationVersion
  if (versionStr === IntegrationVersion.V1 || versionStr === IntegrationVersion.V2) {
    version = versionStr as IntegrationVersion
  } else {
    throw new Error(`Invalid version: ${versionStr}. Must be 'v1' or 'v2'.`)
  }
  const params: Partial<Config> = {
    Port: parseNumber(process.env[envMap.Port]) ?? 8087,
    AccountsURL: process.env[envMap.AccountsURL],
    ServiceID: process.env[envMap.ServiceID] ?? 'gmail-service',
    Secret: process.env[envMap.Secret],
    Credentials: process.env[envMap.Credentials],
    WATCH_TOPIC_NAME: process.env[envMap.WATCH_TOPIC_NAME],
    InitLimit: parseNumber(process.env[envMap.InitLimit]) ?? 50,
    FooterMessage: process.env[envMap.FooterMessage] ?? '<br><br><p>Sent via <a href="https://huly.io">Huly</a></p>',
    OutgoingSyncStartDate: new Date(process.env[envMap.OutgoingSyncStartDate] ?? '2025-08-20T00:00:00.000Z'),
    KvsUrl: process.env[envMap.KvsUrl],
    StorageConfig: process.env[envMap.StorageConfig],
    Version: version,
    QueueConfig: process.env[envMap.QueueConfig] ?? '',
    QueueRegion: process.env[envMap.QueueRegion] ?? '',
    CommunicationTopic: process.env[envMap.CommunicationTopic] ?? 'hulygun',
    WorkspaceInactivityInterval: parseNumber(process.env[envMap.WorkspaceInactivityInterval] ?? '3') // In days
  }

  const missingEnv = (Object.keys(params) as Array<keyof Config>)
    .filter((key) => params[key] === undefined)
    .map((key) => envMap[key])

  if (missingEnv.length > 0) {
    throw Error(`Missing env variables: ${missingEnv.join(', ')}`)
  }
  if (version === IntegrationVersion.V2) {
    if (params.QueueConfig === '') {
      throw Error('Missing env variable: QUEUE_CONFIG')
    }
    if (params.CommunicationTopic === '') {
      throw Error('Missing env variable: COMMUNICATION_TOPIC')
    }
  }

  return params as Config
})()

export default config
