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
import { Doc as YDoc } from 'yjs'

import { YDocVersion } from '../history'
import { createYdocSnapshot, restoreYdocSnapshot } from '../snapshot'

const HISTORY = 'history'
const UPDATES = 'updates'

describe('snapshot', () => {
  let yContent: YDoc
  let yHistory: YDoc

  beforeEach(() => {
    yContent = new YDoc({ guid: generateId(), gc: false })
    yHistory = new YDoc({ guid: generateId() })
  })

  it('createYdocSnapshot appends new version', async () => {
    const versionId = generateId()
    const version = yDocVersion(versionId)

    createYdocSnapshot(yContent, yHistory, version)

    const history = yHistory.getArray(HISTORY)
    const updates = yHistory.getMap(UPDATES)

    expect(history.length).toEqual(1)
    expect(updates.size).toEqual(1)

    expect(history.get(0)).toEqual(version)
    expect(updates.get(versionId)).toBeDefined()
  })

  it('restoreYdocSnapshot restores existing version', async () => {
    const versionId = generateId()
    const version = yDocVersion(versionId)

    const data = yContent.getArray('data')
    data.insert(0, [1, 2, 3])
    expect(data.toArray()).toEqual(expect.arrayContaining([1, 2, 3]))

    createYdocSnapshot(yContent, yHistory, version)

    data.delete(1, 1)
    expect(data.toArray()).toEqual(expect.arrayContaining([1, 3]))

    const yRestore = restoreYdocSnapshot(yContent, yHistory, versionId)

    // assert the restored doc has not been changed
    expect(yRestore).toBeDefined()
    expect(yRestore?.getArray('data').toArray()).toEqual(expect.arrayContaining([1, 2, 3]))

    // assert the original doc has not been changed
    expect(yContent.getArray('data').toArray()).toEqual(expect.arrayContaining([1, 3]))
  })

  it('restoreYdocSnapshot throws an error when gc is enabled', async () => {
    const versionId = generateId()
    const version = yDocVersion(versionId)

    yContent = new YDoc({ guid: generateId(), gc: true })
    createYdocSnapshot(yContent, yHistory, version)
    expect(() => restoreYdocSnapshot(yContent, yHistory, versionId)).toThrow()
  })

  it('restoreYdocSnapshot does not restore version that does not exist', async () => {
    const versionId = generateId()

    const yRestore = restoreYdocSnapshot(yContent, yHistory, versionId)
    expect(yRestore).toBeUndefined()
  })

  it('restoreYdocSnapshot restored document has gc enabled', async () => {
    const versionId = generateId()
    const version = yDocVersion(versionId)

    createYdocSnapshot(yContent, yHistory, version)
    const yRestore = restoreYdocSnapshot(yContent, yHistory, versionId)

    // so far we don't care whether gc is enabled or not in the restore
    // but we need to ensure we understand that it is enabled
    expect(yRestore?.gc).toEqual(true)
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
