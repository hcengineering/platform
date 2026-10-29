//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { MarkupNodeType, nodeDoc, nodeParagraph } from '@hcengineering/text-core'
import { ServerKit } from '../../kits/server-kit'
import { jsonToHTML } from '../../markup/utils'

const doc = nodeDoc(
  nodeParagraph({
    type: MarkupNodeType.image,
    attrs: { 'file-id': 'blob-1', src: 'platform://platform/files/workspace/?file=blob-1' }
  })
)

describe('ImageNode renderHTML', () => {
  it('renders a platform placeholder src without a file url resolver', () => {
    expect(jsonToHTML(doc)).toContain('src="platform://platform/files/workspace/?file=blob-1"')
  })

  it('renders the resolved file url when a resolver is configured', () => {
    const html = jsonToHTML(doc, [
      ServerKit.configure({
        image: { getFileUrl: (fileId) => `https://front.example/files/ws?file=${fileId}` }
      })
    ])
    expect(html).toContain('src="https://front.example/files/ws?file=blob-1"')
    expect(html).not.toContain('platform://')
  })
})
