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

import { systemAccountUuid, WorkspaceUuid } from '@hcengineering/core'
import { BaseConfig } from '@hcengineering/mail-common'
import { generateToken } from '@hcengineering/server-token'
import { getClient } from '@hcengineering/kvs-client'
import { AccountClient, getClient as getAccountClientRaw } from '@hcengineering/account-client'

import config from './config'

// TODO: Find account UUID from mailboxes and use personal workspace
export const mailServiceToken = generateToken(
  systemAccountUuid,
  undefined,
  { service: config.serviceId },
  config.secret
)
export const baseConfig: BaseConfig = {
  AccountsURL: config.accountsUrl,
  KvsUrl: config.kvsUrl,
  StorageConfig: config.storageConfig ?? '',
  QueueConfig: config.queueConfig ?? '',
  QueueRegion: config.queueRegion ?? '',
  CommunicationTopic: config.communicationTopic
}
export const kvsClient = getClient(config.serviceId, baseConfig.KvsUrl, mailServiceToken)

export function getAccountClient (workspaceUuid?: WorkspaceUuid): AccountClient {
  const token = generateToken(systemAccountUuid, workspaceUuid, { service: config.serviceId })
  return getAccountClientRaw(config.accountsUrl, token)
}
