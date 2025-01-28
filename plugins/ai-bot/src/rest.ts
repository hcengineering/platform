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

import { Class, Doc, Markup, PersonId, Ref, Space, Timestamp, type WorkspaceUuid } from '@hcengineering/core'
import { ChatMessage } from '@hcengineering/chunter'
import { Room, RoomLanguage } from '@hcengineering/love'
import { Person } from '@hcengineering/contact'

export enum AIEventType {
  Message = 'message',
  Transfer = 'transfer'
}

export interface AIEventRequest {
  type: AIEventType
  collection: string
  messageClass: Ref<Class<ChatMessage>>
  messageId: Ref<ChatMessage>
  message: string
  createdOn: Timestamp
}

export interface AIMessageEventRequest extends AIEventRequest {
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
  objectSpace: Ref<Space>
  user: PersonId
  email: string
}

export interface AITransferEventRequest extends AIEventRequest {
  toPersonId: PersonId
  toWorkspace: WorkspaceUuid
  fromWorkspace: WorkspaceUuid
  fromWorkspaceName: string
  fromWorkspaceUrl: string
  parentMessageId?: Ref<ChatMessage>
}

export interface TranslateRequest {
  text: Markup
  lang: string
}

export interface TranslateResponse {
  text: Markup
  lang: string
}

export interface ConnectMeetingRequest {
  roomId: Ref<Room>
  language: RoomLanguage
  transcription: boolean
}

export interface DisconnectMeetingRequest {
  roomId: Ref<Room>
}

export interface PostTranscriptRequest {
  transcript: string
  participant: Ref<Person>
  roomName: string
}

export interface IdentityResponse {
  identity: Ref<Person>
  name: string
}
