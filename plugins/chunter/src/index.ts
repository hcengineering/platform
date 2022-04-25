//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { Attachment } from '@anticrm/attachment'
import type { Account, AttachedDoc, Class, Doc, Ref, Space, Timestamp } from '@anticrm/core'
import type { Employee } from '@anticrm/contact'
import type { Asset, Plugin } from '@anticrm/platform'
import { IntlString, plugin } from '@anticrm/platform'
import type { Preference } from '@anticrm/preference'
import { AnyComponent } from '@anticrm/ui'

/**
 * @public
 */
export interface ChunterSpace extends Space {
  lastMessage?: Timestamp
  pinned?: Ref<ChunterMessage>[]
}

/**
 * @public
 */
export interface Channel extends ChunterSpace {
  topic?: string
}

/**
 * @public
 */
export interface DirectMessage extends ChunterSpace {}

/**
 * @public
 */
export interface ChunterMessage extends AttachedDoc {
  content: string
  attachments?: number
  createBy: Ref<Account>
  createOn: Timestamp
  editedOn?: Timestamp
}

/**
 * @public
 */
export interface ThreadMessage extends ChunterMessage {
  attachedTo: Ref<Message>
  attachedToClass: Ref<Class<Message>>
}

/**
 * @public
 */
export interface Message extends ChunterMessage {
  attachedTo: Ref<Space>
  attachedToClass: Ref<Class<Space>>
  replies?: Ref<Employee>[]
  lastReply?: Timestamp
}

/**
 * @public
 */
export interface Comment extends AttachedDoc {
  message: string
  attachments?: number
}

/**
 * @public
 */
export interface Backlink extends Comment {
  // A target document
  // attachedTo <- target document we point to
  // A target document class
  // attachedToClass

  // Source document we have reference from, it should be parent document for Comment/Message.
  backlinkId: Ref<Doc>
  // Source document class
  backlinkClass: Ref<Class<Doc>>
  // Reference to comment documentId
  attachedDocId?: Ref<Doc>
}

/**
 * @public
 */
export interface SavedMessages extends Preference {
  attachedTo: Ref<ChunterMessage>
}

/**
 * @public
 */
export interface SavedAttachments extends Preference {
  attachedTo: Ref<Attachment>
}

/**
 * @public
 */
export const chunterId = 'chunter' as Plugin

export default plugin(chunterId, {
  icon: {
    Chunter: '' as Asset,
    Hashtag: '' as Asset,
    Thread: '' as Asset,
    Lock: '' as Asset,
    Bookmark: '' as Asset
  },
  component: {
    CommentInput: '' as AnyComponent,
    CommentsPresenter: '' as AnyComponent
  },
  class: {
    Message: '' as Ref<Class<Message>>,
    ChunterMessage: '' as Ref<Class<ChunterMessage>>,
    ThreadMessage: '' as Ref<Class<ThreadMessage>>,
    Backlink: '' as Ref<Class<Backlink>>,
    Comment: '' as Ref<Class<Comment>>,
    ChunterSpace: '' as Ref<Class<ChunterSpace>>,
    Channel: '' as Ref<Class<Channel>>,
    SavedMessages: '' as Ref<Class<SavedMessages>>,
    SavedAttachments: '' as Ref<Class<SavedAttachments>>,
    DirectMessage: '' as Ref<Class<DirectMessage>>
  },
  space: {
    Backlinks: '' as Ref<Space>
  },
  string: {
    EditUpdate: '' as IntlString,
    EditCancel: '' as IntlString,
    Comments: '' as IntlString,
    Settings: '' as IntlString,
    ArchiveChannel: '' as IntlString,
    UnarchiveChannel: '' as IntlString,
    ArchiveConfirm: '' as IntlString,
    UnarchiveConfirm: '' as IntlString
  },
  app: {
    Chunter: '' as Ref<Doc>
  }
})
