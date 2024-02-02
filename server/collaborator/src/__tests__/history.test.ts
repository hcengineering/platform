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

import { generateId } from '@hcengineering/core'
import { Doc as YDoc, encodeStateAsUpdate } from 'yjs'

import { appendItem, deleteItem, getItem } from '../history'

describe('history', () => {
  let ydoc: YDoc

  beforeEach(() => {
    ydoc = new YDoc()
  })

  it('should append a history item', async () => {
    const id = generateId()
    const update = encodeStateAsUpdate(ydoc)

    appendItem(ydoc, id, update)

    const history = ydoc.getArray('_history')
    const updates = ydoc.getMap('_updates')

    expect(history.length).toEqual(1)
    expect(updates.size).toEqual(1)

    expect(history.get(0)).toEqual(id)
    expect(updates.get(id)).toEqual(update)
  })

  it('should raise an error when a history item already exists', async () => {
    const id = generateId()
    const update = encodeStateAsUpdate(ydoc)

    appendItem(ydoc, id, update)
    expect(() => { appendItem(ydoc, id, update) }).toThrowError()

    const history = ydoc.getArray('_history')
    const updates = ydoc.getMap('_updates')

    expect(history.length).toEqual(1)
    expect(updates.size).toEqual(1)

    expect(history.get(0)).toEqual(id)
    expect(updates.get(id)).toEqual(update)
  })

  it('should get existing history item', async () => {
    const id = generateId()
    const update = encodeStateAsUpdate(ydoc)

    appendItem(ydoc, id, update)
    appendItem(ydoc, generateId(), encodeStateAsUpdate(ydoc))
    appendItem(ydoc, generateId(), encodeStateAsUpdate(ydoc))

    const history = ydoc.getArray('_history')
    const updates = ydoc.getMap('_updates')

    expect(history.length).toEqual(3)
    expect(updates.size).toEqual(3)

    expect(getItem(ydoc, id)).toEqual(update)
  })

  it('should not get unknown history item', async () => {
    const id = generateId()
    appendItem(ydoc, id, encodeStateAsUpdate(ydoc))

    expect(getItem(ydoc, generateId())).toBeUndefined()
  })

  it('should delete existing history item', async () => {
    const id = generateId()
    appendItem(ydoc, id, encodeStateAsUpdate(ydoc))

    deleteItem(ydoc, id)

    const history = ydoc.getArray('_history')
    const updates = ydoc.getMap('_updates')

    expect(history.length).toEqual(0)
    expect(updates.size).toEqual(0)

    expect(getItem(ydoc, id)).toEqual(undefined)
  })
})
