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

import { Doc as YDoc, encodeStateAsUpdate, encodeStateVector } from 'yjs'

import { yDocBranch, yDocBranchWithGC } from '../branch'
import { generateId } from '@hcengineering/core'

describe('branch', () => {
  describe('yDocBranch', () => {
    it('branches document without gc', async () => {
      const source = new YDoc({ guid: generateId(), gc: false })

      applyGarbageCollectableChanges(source)

      const target = yDocBranch(source)

      expect(target.gc).toBeFalsy()

      // ensure target data
      const sourceData = source.getArray('data')
      const targetData = target.getArray('data')
      expect(targetData.toArray()).toEqual(expect.arrayContaining(sourceData.toArray()))

      // ensure target state
      const sourceState = encodeStateVector(source)
      const targetState = encodeStateVector(target)
      expect(targetState).toEqual(sourceState)

      // ensure target updates the same as source regardless of gc
      const sourceUpdate = encodeStateAsUpdate(source)
      const targetUpdate = encodeStateAsUpdate(target)
      expect(targetUpdate).toEqual(sourceUpdate)
    })

    it('branches document state with gc', async () => {
      const source = new YDoc({ guid: generateId(), gc: true })

      applyGarbageCollectableChanges(source)

      const target = yDocBranch(source)

      expect(target.gc).toBeTruthy()

      // ensure target data
      const sourceData = source.getArray('data')
      const targetData = target.getArray('data')
      expect(targetData.toArray()).toEqual(expect.arrayContaining(sourceData.toArray()))

      // ensure target state
      const sourceState = encodeStateVector(source)
      const targetState = encodeStateVector(target)
      expect(targetState).toEqual(sourceState)

      // ensure target updates the same as source regardless of gc
      const sourceUpdate = encodeStateAsUpdate(source)
      const targetUpdate = encodeStateAsUpdate(target)
      expect(targetUpdate).toEqual(sourceUpdate)
    })
  })

  describe('yDocBranchWithGC', () => {
    it('branches document state without gc', async () => {
      const source = new YDoc({ guid: generateId(), gc: false })

      applyGarbageCollectableChanges(source)

      const target = yDocBranchWithGC(source)

      expect(target.gc).toBeFalsy()

      // ensure target data
      const sourceData = source.getArray('data')
      const targetData = target.getArray('data')
      expect(targetData.toArray()).toEqual(expect.arrayContaining(sourceData.toArray()))

      // ensure target state
      const sourceState = encodeStateVector(source)
      const targetState = encodeStateVector(target)
      expect(targetState).toEqual(sourceState)

      // ensure target updates different because source is not gc-ed
      const sourceUpdate = encodeStateAsUpdate(source)
      const targetUpdate = encodeStateAsUpdate(target)
      expect(targetUpdate).not.toEqual(sourceUpdate)
    })

    it('branches document state with gc', async () => {
      const source = new YDoc({ guid: generateId(), gc: true })

      applyGarbageCollectableChanges(source)

      const target = yDocBranchWithGC(source)

      expect(target.gc).toBeTruthy()

      // ensure target data
      const sourceData = source.getArray('data')
      const targetData = target.getArray('data')
      expect(targetData.toArray()).toEqual(expect.arrayContaining(sourceData.toArray()))

      // ensure target state
      const sourceState = encodeStateVector(source)
      const targetState = encodeStateVector(target)
      expect(targetState).toEqual(sourceState)

      // ensure target updates the same because source is gc-ed
      const sourceUpdate = encodeStateAsUpdate(source)
      const targetUpdate = encodeStateAsUpdate(target)
      expect(targetUpdate).toEqual(sourceUpdate)
    })
  })

  function applyGarbageCollectableChanges (ydoc: YDoc): void {
    const sourceData = ydoc.getArray('data')
    sourceData.insert(0, ['a'])
    sourceData.insert(1, [1, 2])
    sourceData.delete(0, 1)
    sourceData.insert(2, [3])
  }
})
