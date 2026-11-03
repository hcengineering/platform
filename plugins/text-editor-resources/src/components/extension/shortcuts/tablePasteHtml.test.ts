/**
 * @jest-environment jsdom
 */
//
// Copyright © 2026 TraceX SAS.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { TABLE_METADATA_HTML_ATTRIBUTE } from '@hcengineering/view'
import { extractMetadataFromHtmlAttribute } from './tablePaste'

const metadata = {
  version: '2.0',
  cardClass: 'test:class:Doc',
  documentIds: ['a'],
  config: ['name'],
  timestamp: 1,
  source: { kind: 'table', mode: 'fixed' }
}

function html (value: string): string {
  return `<meta charset="utf-8"><pre ${TABLE_METADATA_HTML_ATTRIBUTE}="${value}">| Name |</pre>`
}

describe('table metadata in the text/html flavour', () => {
  it('is read from the attribute, with quotes and markup in values', () => {
    const tricky = { ...metadata, query: { title: '"a" <b> & -->' } }
    const escaped = JSON.stringify(tricky).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
    expect(extractMetadataFromHtmlAttribute(html(escaped))).toMatchObject({ query: { title: '"a" <b> & -->' } })
  })

  it('ignores html without the attribute and damaged values', () => {
    expect(extractMetadataFromHtmlAttribute('<p>| Name |</p>')).toBeNull()
    expect(extractMetadataFromHtmlAttribute(html('{not json'))).toBeNull()
    expect(extractMetadataFromHtmlAttribute(html('&quot;text&quot;'))).toBeNull()
  })
})
