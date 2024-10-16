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

import { Account, Ref, generateId } from '@hcengineering/core'
import { Doc as YDoc, encodeStateAsUpdate } from 'yjs'

import { YDocVersion, addVersion, deleteVersion, getVersion, getVersionData, listVersions } from '../history'

const HISTORY = 'history'
const UPDATES = 'updates'

describe('history', () => {
  let ydoc: YDoc

  beforeEach(() => {
    ydoc = new YDoc({ guid: generateId() })
  })

  it('addVersion should append new version', async () => {
    const versionId = generateId()
    const version = yDocVersion(versionId)
    const update = encodeStateAsUpdate(ydoc)

    addVersion(ydoc, version, update)

    const history = ydoc.getArray(HISTORY)
    const updates = ydoc.getMap(UPDATES)

    expect(history.length).toEqual(1)
    expect(updates.size).toEqual(1)

    expect(history.get(0)).toEqual(version)
    expect(updates.get(versionId)).toBeDefined()
  })

  it('addVersion should raise an error when a version already exists', async () => {
    const versionId = generateId()
    const version = yDocVersion(versionId)
    const update = encodeStateAsUpdate(ydoc)

    addVersion(ydoc, version, update)
    expect(() => {
      addVersion(ydoc, version, update)
    }).toThrow()

    const history = ydoc.getArray(HISTORY)
    const updates = ydoc.getMap(UPDATES)

    expect(history.length).toEqual(1)
    expect(updates.size).toEqual(1)

    expect(history.get(0)).toEqual(version)
    expect(updates.get(versionId)).toBeDefined()
  })

  it('getVersion should get existing version data', async () => {
    const versionId = generateId()
    const version = yDocVersion(versionId)
    const update = encodeStateAsUpdate(ydoc)

    addVersion(ydoc, yDocVersion(generateId()), encodeStateAsUpdate(ydoc))
    addVersion(ydoc, yDocVersion(generateId()), encodeStateAsUpdate(ydoc))
    addVersion(ydoc, version, update)

    const history = ydoc.getArray(HISTORY)
    const updates = ydoc.getMap(UPDATES)

    expect(history.length).toEqual(3)
    expect(updates.size).toEqual(3)

    expect(getVersion(ydoc, versionId)).toEqual(version)
  })

  it('getVersion should return undefined for unknown version', async () => {
    const versionId = generateId()
    const version = yDocVersion(versionId)
    addVersion(ydoc, version, encodeStateAsUpdate(ydoc))

    expect(getVersion(ydoc, generateId())).toBeUndefined()
  })

  it('listVersions should return existing versions', async () => {
    const version1 = yDocVersion(generateId())
    const version2 = yDocVersion(generateId())

    addVersion(ydoc, version1, encodeStateAsUpdate(ydoc))
    addVersion(ydoc, version2, encodeStateAsUpdate(ydoc))

    expect(listVersions(ydoc)).toEqual(expect.arrayContaining([version1, version2]))
  })

  it('listVersions should return empty list when no versions', async () => {
    expect(listVersions(ydoc)).toEqual([])
  })

  it('getVersionData should get existing version data', async () => {
    const versionId = generateId()
    const version = yDocVersion(versionId)
    const update = encodeStateAsUpdate(ydoc)

    addVersion(ydoc, version, update)
    addVersion(ydoc, yDocVersion(generateId()), encodeStateAsUpdate(ydoc))
    addVersion(ydoc, yDocVersion(generateId()), encodeStateAsUpdate(ydoc))

    const history = ydoc.getArray(HISTORY)
    const updates = ydoc.getMap(UPDATES)

    expect(history.length).toEqual(3)
    expect(updates.size).toEqual(3)

    expect(getVersionData(ydoc, versionId)).toEqual(update)
  })

  it('getVersionData should return undefined for unknown version', async () => {
    const versionId = generateId()
    const version = yDocVersion(versionId)
    addVersion(ydoc, version, encodeStateAsUpdate(ydoc))

    expect(getVersionData(ydoc, generateId())).toBeUndefined()
  })

  it('deleteVersion should delete existing version', async () => {
    const versionId = generateId()
    const version = yDocVersion(versionId)
    addVersion(ydoc, version, encodeStateAsUpdate(ydoc))

    deleteVersion(ydoc, versionId)

    const history = ydoc.getArray(HISTORY)
    const updates = ydoc.getMap(UPDATES)

    expect(history.length).toEqual(0)
    expect(updates.size).toEqual(0)

    expect(getVersion(ydoc, versionId)).toEqual(undefined)
    expect(getVersionData(ydoc, versionId)).toEqual(undefined)
  })
})

function yDocVersion (versionId: string): YDocVersion {
  return {
    versionId,
    name: versionId,
    createdBy: 'unit test' as Ref<Account>,
    createdOn: Date.now()
  }
}
