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

import type { CardID, CardType, Markdown, SocialID } from './core'
import type { Message, MessageID, MessageType, MessageExtra, LinkPreview, Reaction, AttachedBlob } from './message'

export interface FileMetadata {
  cardId: CardID
  title: string
  fromDate: Date
  toDate: Date
}

export interface FileMessage {
  id: MessageID
  type: MessageType
  content: Markdown
  extra?: MessageExtra

  creator: SocialID
  created: Date

  removed: boolean
  edited?: Date

  reactions: Reaction[]
  blobs: AttachedBlob[]
  linkPreviews: LinkPreview[]
  thread?: FileThread
}

export interface FileThread {
  threadId: CardID
  threadType: CardType
  repliesCount: number
  lastReply: Date
}

export interface ParsedFile {
  cardId: CardID
  title: string
  fromDate: Date
  toDate: Date
  messages: Message[]
}
