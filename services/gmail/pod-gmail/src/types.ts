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

import type { AccountUuid, Doc, SocialId, WorkspaceUuid } from '@hcengineering/core'
import type { NextFunction, Request, Response } from 'express'
import type { Credentials } from 'google-auth-library'
import type { Channel as PlatformChannel } from '@hcengineering/contact'

export type Token = User & Credentials

export type History = User & {
  historyId: string
}

export interface User {
  userId: AccountUuid
  email?: string
  socialId: SocialId
  workspace: WorkspaceUuid
  token: string
}

export type State = User & {
  redirectURL: string
}

export type Channel = Pick<PlatformChannel, 'value' | keyof Doc>

export type RequestType = 'get' | 'post'

export type RequestHandler = (req: Request, res: Response, next?: NextFunction) => Promise<void>

export interface Endpoint {
  endpoint: string
  type: RequestType
  handler: RequestHandler
}

export interface ProjectCredentials {
  web: ProjectCredentialsData
}

export interface ProjectCredentialsData {
  client_id: string
  project_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_secret: string
  redirect_uris: string[]
}

export enum SecretType {
  TOKEN = 'token'
}

export enum IntegrationVersion {
  V1 = 'v1', // Save messages in legacy format using gmail.class.Message
  V2 = 'v2' // Save messages as thread cards and communication messages
}

export interface WorkspaceStateInfo {
  needSync: boolean
  needRecheck: boolean
  archived?: boolean
  inactive?: boolean
}

export interface SyncState {
  status: string
  email: string
  totalMessages: number | null | undefined
  lastSynchronization?: Date | null
  error?: string
  isConfigured?: boolean
  syncInfo?: {
    type: 'full' | 'partial' | null
    processedMessages: number
    startTime: Date | null
    isActive: boolean
  }
}

export const GmailMessageType = 'gmail-message'
