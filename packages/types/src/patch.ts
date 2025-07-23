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

import type { CardID, CardType, Markdown, SocialID } from './core'
import { AttachmentData, AttachmentID, MessageExtra, MessageID, MessageType, AttachmentUpdateData } from './message'

export type Patch = UpdatePatch | RemovePatch | ReactionPatch | ThreadPatch | AttachmentPatch

export enum PatchType {
  update = 'update',
  remove = 'remove',
  reaction = 'reaction',
  attachment = 'attachment',
  thread = 'thread'
}

interface BasePatch {
  messageId: MessageID
  type: PatchType
  creator: SocialID
  created: Date

  data: Record<string, any>
}

export interface UpdatePatch extends BasePatch {
  type: PatchType.update
  data: UpdatePatchData
}

export interface UpdatePatchData {
  type?: MessageType
  content?: Markdown
  extra?: MessageExtra
}

export interface RemovePatch extends BasePatch {
  type: PatchType.remove
  data: RemovePatchData
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RemovePatchData {}

export interface ReactionPatch extends BasePatch {
  type: PatchType.reaction
  data: AddReactionPatchData | RemoveReactionPatchData
}

export interface AddReactionPatchData {
  operation: 'add'
  reaction: string
}

export interface RemoveReactionPatchData {
  operation: 'remove'
  reaction: string
}

export interface AttachmentPatch extends BasePatch {
  type: PatchType.attachment
  data: AddAttachmentsPatchData | RemoveAttachmentsPatchData | SetAttachmentsPatchData | UpdateAttachmentsPatchData
}

export interface AddAttachmentsPatchData {
  operation: 'add'
  attachments: AttachmentData[]
}

export interface RemoveAttachmentsPatchData {
  operation: 'remove'
  ids: AttachmentID[]
}

export interface SetAttachmentsPatchData {
  operation: 'set'
  attachments: AttachmentData[]
}

export interface UpdateAttachmentsPatchData {
  operation: 'update'
  attachments: AttachmentUpdateData[]
}

export interface ThreadPatch extends BasePatch {
  type: PatchType.thread
  data: AttachThreadPatchData | UpdateThreadPatchData
}

export interface AttachThreadPatchData {
  operation: 'attach'
  threadId: CardID
  threadType: CardType
}

export interface UpdateThreadPatchData {
  operation: 'update'
  threadId: CardID
  threadType?: CardType
  repliesCountOp?: 'increment' | 'decrement'
  lastReply?: Date
}
