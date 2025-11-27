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

import { Class, Doc, Ref } from '@hcengineering/core'
import { MarkupNode, MarkupNodeType, ReferenceMarkupNode } from '../markup/model'
import { traverseNode } from '../markup/traverse'

/**
 * @public
 */
export interface Reference {
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
  parentNode: MarkupNode | null
}

/**
 * @public
 */
export function extractReferences (content: MarkupNode): Array<Reference> {
  const result: Array<Reference> = []

  traverseNode(content, (node, parent) => {
    if (node.type === MarkupNodeType.reference) {
      const reference = node as ReferenceMarkupNode
      const objectId = reference.attrs.id as Ref<Doc>
      const objectClass = reference.attrs.objectclass as Ref<Class<Doc>>
      const e = result.find((e) => e.objectId === objectId && e.objectClass === objectClass)
      if (e === undefined) {
        result.push({ objectId, objectClass, parentNode: parent ?? node })
      }
    }
    return true
  })

  return result
}
