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

import { IntlString, plugin } from '@anticrm/platform'
import type { Asset, Plugin } from '@anticrm/platform'
import type { Space, Doc, Ref, Class, AttachedDoc } from '@anticrm/core'

/**
 * @public
 */
export interface Channel extends Space {}

/**
 * @public
 */
export interface Message extends Doc {
  content: string
}

/**
 * @public
 */
export interface Comment extends AttachedDoc {
  message: string
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
export const chunterId = 'chunter' as Plugin

export default plugin(chunterId, {
  icon: {
    Chunter: '' as Asset,
    Hashtag: '' as Asset,
    Lock: '' as Asset
  },
  class: {
    Message: '' as Ref<Class<Message>>,
    Backlink: '' as Ref<Class<Backlink>>,
    Comment: '' as Ref<Class<Comment>>
  },
  space: {
    Backlinks: '' as Ref<Space>
  },
  string: {
    EditUpdate: '' as IntlString,
    EditCancel: '' as IntlString,
    Comments: '' as IntlString
  }
})
