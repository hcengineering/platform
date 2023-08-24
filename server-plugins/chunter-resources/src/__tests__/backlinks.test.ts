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
import { getBacklinks } from '../backlinks'

describe('extractBacklinks', () => {
  it('should return no backlinks for empty document', () => {
    const content = '<p></p>'

    const backlinks = getBacklinks(
      'backlinkId' as Ref<Doc>,
      'backlinkClass' as Ref<Class<Doc>>,
      'attachedDocId' as Ref<Doc>,
      content
    )

    expect(backlinks).toEqual([])
  })

  it('should parse single backlink', () => {
    const content =
      '<p>hello <span class="reference" data-type="reference" data-id="id" data-objectclass="contact:class:Person" data-label="Appleseed John">@Appleseed John</span> </p>'

    const backlinks = getBacklinks(
      'backlinkId' as Ref<Doc>,
      'backlinkClass' as Ref<Class<Doc>>,
      'attachedDocId' as Ref<Doc>,
      content
    )

    expect(backlinks.length).toBe(1)
    expect(backlinks).toEqual([
      {
        attachedTo: 'id',
        attachedToClass: 'contact:class:Person',
        collection: 'backlinks',
        backlinkId: 'backlinkId',
        backlinkClass: 'backlinkClass',
        message:
          'hello <span data-type="reference" data-id="id" data-objectclass="contact:class:Person" data-label="Appleseed John" class="reference">@Appleseed John</span>',
        attachedDocId: 'attachedDocId'
      }
    ])
  })

  it('should parse single backlink for multiple references', () => {
    const content =
      '<p><span class="reference" data-type="reference" data-id="id" data-label="Appleseed John" data-objectclass="contact:class:Person">@Appleseed John</span> <span data-type="reference" class="reference" data-id="id" data-label="Appleseed John" data-objectclass="contact:class:Person">@Appleseed John</span> </p>'

    const backlinks = getBacklinks(
      'backlinkId' as Ref<Doc>,
      'backlinkClass' as Ref<Class<Doc>>,
      'attachedDocId' as Ref<Doc>,
      content
    )

    expect(backlinks.length).toBe(1)
  })
})
