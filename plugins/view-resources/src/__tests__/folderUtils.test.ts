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
import { type Doc } from '@hcengineering/core'

import { FoldersManager, emptyFoldersState, type FoldersState } from '../components/folders/store/folderUtils'

describe('foldersManager', () => {
  test('folders tree', () => {
    const docs: Doc[] = [
      {
        name: 'Child 1',
        description: '',
        parent: '673ef344595d5369f68ced98',
        _class: 'testManagement:class:TestSuite',
        modifiedBy: '67286f072788ebca822ea1b2',
        modifiedOn: 1732178763949,
        createdBy: '67286f072788ebca822ea1b2',
        createdOn: 1732178763949,
        docUpdateMessages: 1,
        _id: '673ef34b595d5369f68ceda2',
        space: '673434ed74993781b4195e02'
      },
      {
        name: 'Child 2',
        description: '',
        parent: '673ef344595d5369f68ced98',
        _class: 'testManagement:class:TestSuite',
        modifiedBy: '67286f072788ebca822ea1b2',
        modifiedOn: 1732178770252,
        createdBy: '67286f072788ebca822ea1b2',
        createdOn: 1732178770252,
        docUpdateMessages: 1,
        _id: '673ef352595d5369f68cedac',
        space: '673434ed74993781b4195e02'
      },
      {
        _id: '673434f674993781b4195e1b',
        name: 'New suite',
        description: '',
        parent: 'testManagement:ids:NoParent',
        _class: 'testManagement:class:TestSuite',
        modifiedBy: '67286f072788ebca822ea1b2',
        modifiedOn: 1731495620083,
        createdBy: '67286f072788ebca822ea1b2',
        createdOn: 1731474678014,
        docUpdateMessages: 2,
        testCases: 1,
        space: '673434ed74993781b4195e02'
      },
      {
        name: 'Parent',
        description: '',
        parent: 'testManagement:ids:NoParent',
        _class: 'testManagement:class:TestSuite',
        modifiedBy: '67286f072788ebca822ea1b2',
        modifiedOn: 1732178756247,
        createdBy: '67286f072788ebca822ea1b2',
        createdOn: 1732178756247,
        docUpdateMessages: 1,
        _id: '673ef344595d5369f68ced98',
        space: '673434ed74993781b4195e02'
      },
      {
        _id: '6734863403ae9eca5b01e4fd',
        name: 'test',
        description: '',
        parent: 'testManagement:ids:NoParent',
        _class: 'testManagement:class:TestSuite',
        modifiedBy: '67286f072788ebca822ea1b2',
        modifiedOn: 1731495529218,
        createdBy: '67286f072788ebca822ea1b2',
        createdOn: 1731495476678,
        docUpdateMessages: 4,
        testCases: 3,
        space: '673434ed74993781b4195e02'
      }
    ] as any
    const foldersManager = new FoldersManager('name', 'parent', 'testManagement:ids:NoParent' as any, false, () => {})
    const foldersState = foldersManager.getNestedStructure(docs)

    expect(foldersState.folders.length).toBe(3)
    expect(foldersState.folderById.size).toBe(5)
    expect(foldersState.descendants.get('673ef344595d5369f68ced98' as any)?.length).toBe(2)
  })

  test('plain list', () => {
    const docs: Doc[] = [
      {
        _id: '6739541d04aed0096599e03a',
        name: '3 items',
        description: '6739541704aed0096599e032%description:HEAD:0',
        _class: 'testManagement:class:TestRun',
        modifiedBy: '67286f072788ebca822ea1b2',
        modifiedOn: 1731810333365,
        createdBy: '67286f072788ebca822ea1b2',
        createdOn: 1731810333307,
        docUpdateMessages: 4,
        testCases: 3,
        space: '673434ed74993781b4195e02'
      },
      {
        name: 'Test run 1',
        description: '673ef510595d5369f68cee0a%description:HEAD:0',
        _class: 'testManagement:class:TestRun',
        modifiedBy: '67286f072788ebca822ea1b2',
        modifiedOn: 1732179220778,
        createdBy: '67286f072788ebca822ea1b2',
        createdOn: 1732179220778,
        testCases: 2,
        docUpdateMessages: 3,
        _id: '673ef514595d5369f68cee12',
        space: '673434ed74993781b4195e02'
      },
      {
        name: 'Test run 2',
        description: '673ef516595d5369f68cee18%description:HEAD:0',
        _class: 'testManagement:class:TestRun',
        modifiedBy: '67286f072788ebca822ea1b2',
        modifiedOn: 1732179227645,
        createdBy: '67286f072788ebca822ea1b2',
        createdOn: 1732179227611,
        testCases: 2,
        docUpdateMessages: 3,
        _id: '673ef51b595d5369f68cee20',
        space: '673434ed74993781b4195e02'
      }
    ] as any
    const foldersManager = new FoldersManager('name', 'parent', 'noParent' as any, true, () => {})
    const foldersState = foldersManager.getPlainList(docs)

    expect(foldersState.folders.length).toBe(3)
    expect(foldersState.folderById.size).toBe(3)
    expect(foldersState.descendants.size).toBe(0)
  })

  test('test state update', () => {
    const docs: Doc[] = [
      {
        _id: '673434f674993781b4195e1b',
        name: 'New suite',
        description: '',
        parent: 'testManagement:ids:NoParent',
        _class: 'testManagement:class:TestSuite',
        modifiedBy: '67286f072788ebca822ea1b2',
        modifiedOn: 1731495620083,
        createdBy: '67286f072788ebca822ea1b2',
        createdOn: 1731474678014,
        docUpdateMessages: 2,
        testCases: 1,
        space: '673434ed74993781b4195e02'
      }
    ] as any
    let folderState = emptyFoldersState()

    expect(folderState.folders.length).toBe(0)
    expect(folderState.descendants.size).toBe(0)
    expect(folderState.folderById.size).toBe(0)

    const foldersManager = new FoldersManager(
      'name',
      'parent',
      'testManagement:ids:NoParent' as any,
      false,
      (state: FoldersState) => {
        folderState = state
      }
    )
    foldersManager.setFolders(docs)

    expect(folderState.folders.length).toBe(1)
    expect(folderState.folderById.size).toBe(1)
  })
})
