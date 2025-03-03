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

import type {
  FindMessagesGroupsParams,
  FindMessagesParams,
  Message,
  MessagesGroup,
  SocialID,
  WorkspaceID
} from '@hcengineering/communication-types'

import type { EventResult, RequestEvent } from './requestEvent.ts'

export interface ConnectionInfo {
  sessionId: string
  personalWorkspace: WorkspaceID
  socialIds: SocialID[]
  //TODO: AccountUUID
  account: string
}

export interface ServerApi {
  findMessages(info: ConnectionInfo, params: FindMessagesParams, queryId?: number): Promise<Message[]>
  findMessagesGroups(info: ConnectionInfo, params: FindMessagesGroupsParams): Promise<MessagesGroup[]>

  event(info: ConnectionInfo, event: RequestEvent): Promise<EventResult>

  unsubscribeQuery(info: ConnectionInfo, id: number): Promise<void>

  closeSession(sessionId: string): Promise<void>
  close(): Promise<void>
}
