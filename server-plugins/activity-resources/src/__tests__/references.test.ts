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

import { type Class, type Doc, type Ref } from '@hcengineering/core'
import { EmptyMarkup, MarkupNodeType, jsonToMarkup } from '@hcengineering/text-core'

import { getReferencesData } from '../references'

describe('extractBacklinks', () => {
  it('should return no references for empty document', () => {
    const content = EmptyMarkup
    const references = getReferencesData(
      'srcDocId' as Ref<Doc>,
      'srcDocClass' as Ref<Class<Doc>>,
      'attachedDocId' as Ref<Doc>,
      'attachedDocClass' as Ref<Class<Doc>>,
      content
    )

    expect(references).toEqual([])
  })

  it('should parse single backlink', () => {
    const content = jsonToMarkup({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.reference,
              attrs: {
                id: 'id',
                objectclass: 'contact:class:Person',
                label: 'Appleseed John'
              }
            },
            {
              type: MarkupNodeType.text,
              text: ' hello'
            }
          ]
        }
      ]
    })

    const references = getReferencesData(
      'srcDocId' as Ref<Doc>,
      'srcDocClass' as Ref<Class<Doc>>,
      'attachedDocId' as Ref<Doc>,
      'attachedDocClass' as Ref<Class<Doc>>,
      content
    )

    expect(references.length).toBe(1)
    expect(references).toEqual([
      {
        attachedTo: 'id',
        attachedToClass: 'contact:class:Person',
        collection: 'references',
        srcDocId: 'srcDocId',
        srcDocClass: 'srcDocClass',
        message:
          '{"type":"paragraph","content":[{"type":"reference","attrs":{"id":"id","objectclass":"contact:class:Person","label":"Appleseed John"}},{"type":"text","text":" hello"}]}',
        attachedDocId: 'attachedDocId',
        attachedDocClass: 'attachedDocClass'
      }
    ])
  })

  it('should parse single backlink for multiple references', () => {
    const content = jsonToMarkup({
      type: MarkupNodeType.doc,
      content: [
        {
          type: MarkupNodeType.paragraph,
          content: [
            {
              type: MarkupNodeType.reference,
              attrs: {
                id: 'id',
                objectclass: 'contact:class:Person',
                label: 'Appleseed John'
              }
            },
            {
              type: MarkupNodeType.text,
              text: ' '
            },
            {
              type: MarkupNodeType.reference,
              attrs: {
                id: 'id',
                objectclass: 'contact:class:Person',
                label: 'Appleseed John'
              }
            }
          ]
        }
      ]
    })

    const references = getReferencesData(
      'srcDocId' as Ref<Doc>,
      'srcDocClass' as Ref<Class<Doc>>,
      'attachedDocId' as Ref<Doc>,
      'attachedDocClass' as Ref<Class<Doc>>,
      content
    )

    expect(references.length).toBe(1)
  })
})
