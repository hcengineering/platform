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

import { addVersion, deleteVersion, getVersion } from '../history'

const HISTORY = 'history'
const UPDATES = 'updates'

describe('history', () => {
  let ydoc: YDoc

  beforeEach(() => {
    ydoc = new YDoc()
  })

  it('addVersion should append new version', async () => {
    const id = generateId()
    const update = encodeStateAsUpdate(ydoc)

    addVersion(ydoc, id, update)

    const history = ydoc.getArray(HISTORY)
    const updates = ydoc.getMap(UPDATES)

    expect(history.length).toEqual(1)
    expect(updates.size).toEqual(1)

    expect(history.get(0)).toEqual(id)
    expect(updates.get(id)).toEqual(update)
  })

  it('addVersion should raise an error when a version already exists', async () => {
    const id = generateId()
    const update = encodeStateAsUpdate(ydoc)

    addVersion(ydoc, id, update)
    expect(() => { addVersion(ydoc, id, update) }).toThrowError()

    const history = ydoc.getArray(HISTORY)
    const updates = ydoc.getMap(UPDATES)

    expect(history.length).toEqual(1)
    expect(updates.size).toEqual(1)

    expect(history.get(0)).toEqual(id)
    expect(updates.get(id)).toEqual(update)
  })

  it('getVersion should get existing version', async () => {
    const id = generateId()
    const update = encodeStateAsUpdate(ydoc)

    addVersion(ydoc, id, update)
    addVersion(ydoc, generateId(), encodeStateAsUpdate(ydoc))
    addVersion(ydoc, generateId(), encodeStateAsUpdate(ydoc))

    const history = ydoc.getArray(HISTORY)
    const updates = ydoc.getMap(UPDATES)

    expect(history.length).toEqual(3)
    expect(updates.size).toEqual(3)

    expect(getVersion(ydoc, id)).toEqual(update)
  })

  it('getVersion should return undefined for unknown version', async () => {
    const id = generateId()
    addVersion(ydoc, id, encodeStateAsUpdate(ydoc))

    expect(getVersion(ydoc, generateId())).toBeUndefined()
  })

  it('deleteVersion should delete existing version', async () => {
    const id = generateId()
    addVersion(ydoc, id, encodeStateAsUpdate(ydoc))

    deleteVersion(ydoc, id)

    const history = ydoc.getArray(HISTORY)
    const updates = ydoc.getMap(UPDATES)

    expect(history.length).toEqual(0)
    expect(updates.size).toEqual(0)

    expect(getVersion(ydoc, id)).toEqual(undefined)
  })
})
