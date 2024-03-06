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

import { getReferencesData } from '../references'

describe('extractBacklinks', () => {
  it('should return no references for empty document', () => {
    const content = '<p></p>'
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
    const content =
      '<p>hello <span class="reference" data-type="reference" data-id="id" data-objectclass="contact:class:Person" data-label="Appleseed John">@Appleseed John</span> </p>'

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
          'hello <span data-type="reference" data-id="id" data-objectclass="contact:class:Person" data-label="Appleseed John" class="reference">@Appleseed John</span>',
        attachedDocId: 'attachedDocId',
        attachedDocClass: 'attachedDocClass'
      }
    ])
  })

  it('should parse single backlink for multiple references', () => {
    const content =
      '<p><span class="reference" data-type="reference" data-id="id" data-label="Appleseed John" data-objectclass="contact:class:Person">@Appleseed John</span> <span data-type="reference" class="reference" data-id="id" data-label="Appleseed John" data-objectclass="contact:class:Person">@Appleseed John</span> </p>'

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
