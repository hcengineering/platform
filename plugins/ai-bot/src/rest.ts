//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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

import { Class, Doc, Markup, PersonId, Ref, Space, Timestamp } from '@hcengineering/core'
import { Room, RoomLanguage } from '@hcengineering/love'
import { Contact, Person } from '@hcengineering/contact'
import { ChatMessage } from '@hcengineering/chunter'

export interface AIEventRequest {
  message: string
  messageClass: Ref<Class<ChatMessage>>
  messageId: Ref<ChatMessage>
  objectClass: Ref<Class<Doc>>
  objectId: Ref<Doc>
  objectSpace: Ref<Space>
  user: PersonId
  collection: string
  createdOn: Timestamp
}

export interface TranslateRequest {
  text: Markup
  lang: string
}

export interface PersonMessage {
  personRef: Ref<Contact>
  personName: string

  time: Timestamp
  text: string
}

export interface SummarizeMessagesRequest {
  lang: string

  target: Ref<Doc>
  targetClass: Ref<Class<Doc>>
}

export interface SummarizeMessagesResponse {
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
