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

import { RecurringRule } from '@hcengineering/calendar'
import type { PersonId, Timestamp } from '@hcengineering/core'
import type { NextFunction, Request, Response } from 'express'
import type { Credentials } from 'google-auth-library'

export interface Watch {
  timer: NodeJS.Timeout
  channelId: string
  resourceId: string
}

export interface EventWatch {
  timer: NodeJS.Timeout
  calendarId: string
  channelId: string
  resourceId: string
}

export type Token = User & Credentials

export interface CalendarHistory {
  userId: PersonId
  workspace: string
  historyId: string
}

export interface EventHistory {
  calendarId: string
  userId: PersonId
  workspace: string
  historyId: string
}

export interface SyncHistory {
  workspace: string
  timestamp: number
}

export interface ReccuringData {
  rules: RecurringRule[]
  exdate: Timestamp[]
  rdate: Timestamp[]
}

export interface User {
  userId: PersonId
  workspace: string
  token: string
}

export type State = User & {
  redirectURL: string
}

export interface AttachedFile {
  size?: number
  file: string
  type?: string
  lastModified: number
  name: string
}

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
