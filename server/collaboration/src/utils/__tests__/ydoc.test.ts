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

import { Doc as YDoc, XmlElement as YXmlElement, XmlText as YXmlText, encodeStateVector, encodeStateAsUpdate, applyUpdate } from 'yjs'

import { log } from 'console'

import { yDocCopyXmlField, yDocFromBuffer, yDocToBuffer } from '../ydoc'

describe('ydoc', () => {
  it('yDocFromBuffer converts ydoc to a buffer', async () => {
    const ydoc = new YDoc()
    const buffer = yDocToBuffer(ydoc)

    expect(buffer).toBeDefined()
  })

  it('yDocFromBuffer converts buffer to a ydoc', async () => {
    const source = new YDoc()
    source.getArray('data').insert(0, [1, 2])

    const buffer = yDocToBuffer(source)

    const target = yDocFromBuffer(buffer, new YDoc())
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

  function stringify (update: Uint8Array): string {
    return Array.from(update).map((byte) => byte.toString(16).padStart(2, '0')).join(' ')
  }

  describe('YDoc append', () => {
    it('single document', async () => {
      const ydoc = new YDoc({ gc: false })
      log('U', stringify(encodeStateAsUpdate(ydoc)))

      ydoc.getMap('map').set('a', 1)
      log('U', stringify(encodeStateAsUpdate(ydoc)))

      ydoc.getMap('map').set('b', 2)
      log('U', stringify(encodeStateAsUpdate(ydoc)))

      ydoc.getMap('map').delete('a')
      ydoc.getMap('map').delete('b')
      log('U', stringify(encodeStateAsUpdate(ydoc)))

      ydoc.getMap('map').set('c', 3)
      log('U', stringify(encodeStateAsUpdate(ydoc)))

      ydoc.getArray('array').push([1, 2, 3, 4, 5])
      log('U', stringify(encodeStateAsUpdate(ydoc)))

      ydoc.getArray('array').delete(0, 3)
      log('U', stringify(encodeStateAsUpdate(ydoc)))

      const ydoc1 = new YDoc({ gc: false })
      applyUpdate(ydoc1, encodeStateAsUpdate(ydoc))
      log('U', stringify(encodeStateAsUpdate(ydoc1)))

      // const state0 = encodeStateVector(ydoc)
      // const update0 = encodeStateAsUpdate(ydoc)

      // log('Y0', ydoc.getMap('data').toJSON())
      // log('S0', stringify(state0))
      // log('U0', stringify(update0))

      // ydoc.getMap('data').set('a', 1)
      // ydoc.getMap('data').set('b', 2)

      // const state1 = encodeStateVector(ydoc)
      // const update1 = encodeStateAsUpdate(ydoc)
      // log('Y1', ydoc.getMap('data').toJSON())
      // log('S1', stringify(state1))
      // log('U1', stringify(update1))
      // log('D1', stringify(diffUpdate(update1, state0)))

      // const ydoc1 = new YDoc({ gc: false })
      // applyUpdate(ydoc1, concat(update0, diffUpdate(update1, state0)))
      // log('Y2', ydoc1.getMap('data').toJSON())

      // ydoc.getMap('data').set('c', 3)
      // ydoc.getMap('data').delete('a')
      // ydoc.getMap('data').delete('b')

      // const state2 = encodeStateVector(ydoc)
      // const update2 = encodeStateAsUpdate(ydoc)
      // log('Y2', ydoc.getMap('data').toJSON())
      // log('S2', stringify(state2))
      // log('U2', stringify(update2))
      // log('D2', stringify(diffUpdate(update2, state1)))

      // const state2 = encodeStateVector(ydoc)
      // const update2 = encodeStateAsUpdate(ydoc)
      // log('Y2', ydoc.get('data').toJSON())
      // log('S2', stringify(state2))
      // log('U2', stringify(update2))
      // log('D2', stringify(encodeStateAsUpdate(ydoc, state1)))
      // log('D2', stringify(diffUpdate(update2, state1)))
    })

    // it('multiple documents', async () => {
    //   const ydoc1 = new YDoc({ gc: false })
    //   log('ydoc1 orig', encodeStateVector(ydoc1))
    //   ydoc1.getMap('data').set('a', 1)
    //   log('ydoc1 upd', encodeStateVector(ydoc1))

    //   const state1 = encodeStateVector(ydoc1)
    //   const update1 = encodeStateAsUpdate(ydoc1)
    //   log('state1', state1)
    //   log('update1', update1)

    //   const ydoc2 = new YDoc({ gc: false })
    //   applyUpdate(ydoc2, update1)
    //   log('ydoc2 orig', encodeStateVector(ydoc2))
    //   ydoc2.getMap('data').set('b', 2)
    //   log('ydoc2 upd', encodeStateVector(ydoc2))

    //   const state2 = encodeStateVector(ydoc2)
    //   const update2 = encodeStateAsUpdate(ydoc2)
    //   log('state2', state2)
    //   log('update2', update2)
    //   log('update2to1', encodeStateAsUpdate(ydoc2, encodeStateVector(ydoc1)))

    //   // const ydoc3 = new YDoc({ gc: false })
    //   // applyUpdate(ydoc3, update2)
    //   // logBuffer('ydoc3 orig', encodeStateVector(ydoc3))
    //   // ydoc3.getMap('data').set('c', 3)
    //   // ydoc3.getMap('data').delete('a')
    //   // ydoc3.getMap('data').delete('b')
    //   // logBuffer('ydoc3 upd', encodeStateVector(ydoc3))

    //   // const update3 = encodeStateAsUpdate(ydoc3)
    //   // logBuffer('update3', update3)
    //   // logBuffer('update3to2', encodeStateAsUpdate(ydoc3, encodeStateVector(ydoc2)))
    //   // logBuffer('update3to1', encodeStateAsUpdate(ydoc3, encodeStateVector(ydoc1)))
    // })
  })
})

function concat (update1: Uint8Array, update2: Uint8Array): Uint8Array {
  const update = new Uint8Array(update1.length + update2.length)
  update.set(update1)
  update.set(update2, update1.length)
  return update
}
