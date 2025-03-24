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

import type { BlobID, CardID, RichText, SocialID } from './core'
import type { Message, MessageID, MessageType, MessageData } from './message'

export interface FileMetadata {
  card: CardID
  title: string
  fromDate: Date
  toDate: Date
}

export interface FileMessage {
  id: MessageID
  type: MessageType
  content: RichText
  creator: SocialID
  data?: MessageData
  created: Date
  edited?: Date
  reactions: FileReaction[]
  files: FileBlob[]
  thread?: FileThread
}

export interface FileBlob {
  blobId: BlobID
  type: string
  filename: string
  size: number
  creator: SocialID
  created: Date
}

export interface FileReaction {
  reaction: string
  creator: SocialID
  created: Date
}

export interface FileThread {
  thread: CardID
  repliesCount: number
  lastReply: Date
}

export interface ParsedFile {
  metadata: FileMetadata
  messages: Message[]
}
