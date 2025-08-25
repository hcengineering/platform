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
  mailSizeLimit?: string
  storageConfig?: string
  kvsUrl: string
  queueConfig: string
  queueRegion: string
  communicationTopic: string
  serviceId: string
  mailUrl: string
  mailAuth: string
  footerMessage: string
  outgoingSyncStartDate: Date // ISO date string - messages from mail channel before this date will not attempt to be sent to Gmail
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
  hookToken: process.env.HOOK_TOKEN,
  mailSizeLimit: process.env.MAIL_SIZE_LIMIT ?? '50mb',
  storageConfig: process.env.STORAGE_CONFIG,
  kvsUrl: (() => {
    if (process.env.KVS_URL !== undefined) {
      return process.env.KVS_URL
    }
    throw Error('KVS_URL env var is not set')
  })(),
  queueConfig: (() => {
    if (process.env.QUEUE_CONFIG !== undefined) {
      return process.env.QUEUE_CONFIG
    }
    throw Error('QUEUE_CONFIG env var is not set')
  })(),
  queueRegion: process.env.QUEUE_REGION ?? '',
  communicationTopic: process.env.COMMUNICATION_TOPIC ?? 'hulygun',
  serviceId: process.env.SERVICE_ID ?? 'huly-mail',
  mailUrl: (() => {
    if (process.env.MAIL_URL !== undefined) {
      return process.env.MAIL_URL
    }
    throw Error('MAIL_URL env var is not set')
  })(),
  mailAuth: process.env.MAIL_AUTH ?? '',
  footerMessage: process.env.FOOTER_MESSAGE ?? '<br><br><p>Sent via <a href="https://huly.io">Huly</a></p>',
  outgoingSyncStartDate: new Date(process.env.OUTGOING_SYNC_START_DATE ?? '2025-08-20T00:00:00.000Z')
}

export default config
