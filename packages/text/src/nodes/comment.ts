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

import { Node } from '@tiptap/core'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'

/**
 * @public
 */
export interface Comment {
  parentNode: ProseMirrorNode | null
}

/**
 * @public
 */
export const CommentNode = Node.create({
  name: 'comment',
  group: 'inline',
  inline: true,
  content: 'text*',
  marks: '_',

  parseHTML () {
    return [
      {
        tag: 'comment'
      }
    ]
  },

  renderText () {
    return ''
  }
})
