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

import { Doc as YDoc, XmlElement as YXmlElement, XmlText as YXmlText, encodeStateVector } from 'yjs'

import { clone, yDocCopyXmlField, yDocFromBuffer, yDocToBuffer } from '../ydoc'
import { generateId } from '@hcengineering/core'

describe('ydoc', () => {
  it('yDocFromBuffer converts ydoc to a buffer', async () => {
    const ydoc = new YDoc({ guid: generateId() })
    const buffer = yDocToBuffer(ydoc)

    expect(buffer).toBeDefined()
  })

  it('yDocFromBuffer converts buffer to a ydoc', async () => {
    const source = new YDoc({ guid: generateId() })
    source.getArray('data').insert(0, [1, 2])

    const buffer = yDocToBuffer(source)

    const target = yDocFromBuffer(buffer, new YDoc({ guid: generateId() }))
    expect(target).toBeDefined()
    expect(encodeStateVector(target)).toEqual(encodeStateVector(source))
  })

  describe('yDocCopyXmlField', () => {
    it('copies into new field', async () => {
      const ydoc = new YDoc()

      const source = ydoc.getXmlFragment('source')
      source.insertAfter(null, [new YXmlElement('p'), new YXmlText('foo'), new YXmlElement('p')])

      yDocCopyXmlField(ydoc, 'source', 'target')
      const target = ydoc.getXmlFragment('target')

      expect(target.toJSON()).toEqual(source.toJSON())
    })

    it('copies into existing field', async () => {
      const ydoc = new YDoc()

      const source = ydoc.getXmlFragment('source')
      const target = ydoc.getXmlFragment('target')

      source.insertAfter(null, [new YXmlElement('p'), new YXmlText('foo'), new YXmlElement('p')])
      target.insertAfter(null, [new YXmlText('bar')])
      expect(target.toJSON()).not.toEqual(source.toJSON())

      yDocCopyXmlField(ydoc, 'source', 'target')
      expect(target.toJSON()).toEqual(source.toJSON())
    })
  })

  it('clones YXmlElement', () => {
    const ydoc = new YDoc()
    const source = ydoc.getXmlElement('source')
    const target = ydoc.getXmlFragment('target')

    const src = new YXmlElement('paragraph')
    src.setAttribute('class', 'text')
    src.setAttribute('size', 1024 as any)
    src.insert(0, [new YXmlText('foo')])
    source.insert(0, [src])

    const dst = clone(src)
    target.insert(0, [dst])

    expect(src.toJSON()).toEqual(dst.toJSON())
  })
})
