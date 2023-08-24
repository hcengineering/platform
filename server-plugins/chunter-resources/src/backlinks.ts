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

import { Backlink } from '@hcengineering/chunter'
import { Class, Data, Doc, Ref } from '@hcengineering/core'
import { defaultExtensions, getHTML, parseHTML, ReferenceNode } from '@hcengineering/text'

const extensions = [...defaultExtensions, ReferenceNode]

export function getBacklinks (
  backlinkId: Ref<Doc>,
  backlinkClass: Ref<Class<Doc>>,
  attachedDocId: Ref<Doc> | undefined,
  content: string
): Array<Data<Backlink>> {
  const doc = parseHTML(content, extensions)

  const result: Array<Data<Backlink>> = []

  doc.descendants((node, _pos, parent): boolean => {
    if (node.type.name === ReferenceNode.name) {
      const ato = node.attrs.id as Ref<Doc>
      const atoClass = node.attrs.objectClass as Ref<Class<Doc>>
      const e = result.find((e) => e.attachedTo === ato && e.attachedToClass === atoClass)
      if (e === undefined && ato !== attachedDocId && ato !== backlinkId) {
        result.push({
          attachedTo: ato,
          attachedToClass: atoClass,
          collection: 'backlinks',
          backlinkId,
          backlinkClass,
          message: parent !== null ? getHTML(parent, extensions) : '',
          attachedDocId
        })
      }
    }

    return true
  })

  return result
}
