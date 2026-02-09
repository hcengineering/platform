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

import type { AttributeModel } from '@hcengineering/view'
import type { Class, Client, Doc, Hierarchy, Ref } from '@hcengineering/core'
import { rebuildRelationshipTableViewModel } from '../data/relationshipBuilder'

jest.mock('@hcengineering/view-resources', () => ({
  buildConfigAssociation: jest.fn(() => []),
  buildConfigLookup: jest.fn(() => ({}))
}))

function doc (id: string, overrides: Partial<Doc> & { $associations?: Record<string, Doc[] | Doc> } = {}): Doc {
  return {
    _id: id as Ref<Doc>,
    _class: 'test:class:Doc' as Ref<Class<Doc>>,
    space: 'test:space' as any,
    modifiedOn: 0,
    modifiedBy: '' as any,
    createdOn: 0,
    createdBy: '' as any,
    ...overrides
  } as any
}

function attr (key: string, label = key): AttributeModel {
  return { key, label, _class: '' as Ref<Class<Doc>>, sortingKey: '', collectionAttr: false, isLookup: false }
}

describe('relationshipBuilder', () => {
  const hierarchy: Hierarchy = {} as any
  const client: Client = {} as any
  const cardClass = 'test:class:Card' as Ref<Class<Doc>>

  describe('rebuildRelationshipTableViewModel', () => {
    it('returns one row when doc has no associations (single expanded row with undefined children)', async () => {
      const root = doc('root-1')
      const model: AttributeModel[] = [
        attr(''),
        attr('$associations.assoc1_b', 'Level1'),
        attr('$associations.assoc1_b.$associations.assoc2_b', 'Level2')
      ]
      const viewModel = await rebuildRelationshipTableViewModel([root], model, cardClass, hierarchy, client)
      expect(viewModel).toHaveLength(1)
      expect(viewModel[0].cells).toHaveLength(3)
      expect(viewModel[0].cells[0].object).toBe(root)
      expect(viewModel[0].cells[0].rowSpan).toBe(1)
      expect(viewModel[0].cells[1].object).toBeUndefined()
      expect(viewModel[0].cells[1].parentObject).toBe(root)
      expect(viewModel[0].cells[2].object).toBeUndefined()
      expect(viewModel[0].cells[2].parentObject).toBeUndefined()
    })

    it('builds one row per first-level child for single-level association', async () => {
      const b1 = doc('b1', { title: 'B1' })
      const b2 = doc('b2', { title: 'B2' })
      const root = doc('root-1', {
        $associations: { assoc1_b: [b1, b2] }
      })
      const model: AttributeModel[] = [attr(''), attr('$associations.assoc1_b', 'Level1')]
      const viewModel = await rebuildRelationshipTableViewModel([root], model, cardClass, hierarchy, client)
      expect(viewModel).toHaveLength(2)
      expect(viewModel[0].cells[0].object).toBe(root)
      expect(viewModel[0].cells[0].rowSpan).toBe(2)
      expect(viewModel[0].cells[1].object).toBe(b1)
      expect(viewModel[0].cells[1].parentObject).toBe(root)
      expect(viewModel[0].cells[1].rowSpan).toBe(1)
      expect(viewModel[1].cells[0].rowSpan).toBe(0)
      expect(viewModel[1].cells[0].object).toBeUndefined()
      expect(viewModel[1].cells[1].object).toBe(b2)
      expect(viewModel[1].cells[1].parentObject).toBe(root)
    })

    it('builds rows with correct nested objects for two-level association (A -> B -> C)', async () => {
      const c1 = doc('c1', { title: 'C1' })
      const c2 = doc('c2', { title: 'C2' })
      const c3 = doc('c3', { title: 'C3' })
      const b1 = doc('b1', { title: 'B1', $associations: { assoc2_b: [c1, c2] } })
      const b2 = doc('b2', { title: 'B2', $associations: { assoc2_b: [c3] } })
      const root = doc('root-1', {
        $associations: { assoc1_b: [b1, b2] }
      })
      const model: AttributeModel[] = [
        attr(''),
        attr('$associations.assoc1_b', 'Level1'),
        attr('$associations.assoc1_b.$associations.assoc2_b', 'Level2')
      ]
      const viewModel = await rebuildRelationshipTableViewModel([root], model, cardClass, hierarchy, client)
      expect(viewModel).toHaveLength(3)
      expect(viewModel[0].cells[0].object).toBe(root)
      expect(viewModel[0].cells[0].rowSpan).toBe(3)
      expect(viewModel[0].cells[1].object).toBe(b1)
      expect(viewModel[0].cells[1].parentObject).toBe(root)
      expect(viewModel[0].cells[1].rowSpan).toBe(2)
      expect(viewModel[0].cells[2].object).toBe(c1)
      expect(viewModel[0].cells[2].parentObject).toBe(b1)
      expect(viewModel[0].cells[2].rowSpan).toBe(1)
      expect(viewModel[1].cells[2].object).toBe(c2)
      expect(viewModel[1].cells[2].parentObject).toBe(b1)
      expect(viewModel[2].cells[1].object).toBe(b2)
      expect(viewModel[2].cells[1].parentObject).toBe(root)
      expect(viewModel[2].cells[1].rowSpan).toBe(1)
      expect(viewModel[2].cells[2].object).toBe(c3)
      expect(viewModel[2].cells[2].parentObject).toBe(b2)
    })

    it('emits one row when first-level child has no nested children', async () => {
      const b1 = doc('b1', { title: 'B1' })
      const root = doc('root-1', { $associations: { assoc1_b: [b1] } })
      const model: AttributeModel[] = [
        attr(''),
        attr('$associations.assoc1_b', 'Level1'),
        attr('$associations.assoc1_b.$associations.assoc2_b', 'Level2')
      ]
      const viewModel = await rebuildRelationshipTableViewModel([root], model, cardClass, hierarchy, client)
      expect(viewModel).toHaveLength(1)
      expect(viewModel[0].cells[0].object).toBe(root)
      expect(viewModel[0].cells[1].object).toBe(b1)
      expect(viewModel[0].cells[1].parentObject).toBe(root)
      expect(viewModel[0].cells[2].object).toBeUndefined()
      expect(viewModel[0].cells[2].parentObject).toBe(b1)
    })

    it('handles multiple root docs each with their own expanded rows', async () => {
      const b1 = doc('b1')
      const b2 = doc('b2')
      const root1 = doc('root-1', { $associations: { assoc1_b: [b1] } })
      const root2 = doc('root-2', { $associations: { assoc1_b: [b2] } })
      const model: AttributeModel[] = [attr(''), attr('$associations.assoc1_b', 'Level1')]
      const viewModel = await rebuildRelationshipTableViewModel([root1, root2], model, cardClass, hierarchy, client)
      expect(viewModel).toHaveLength(2)
      expect(viewModel[0].cells[0].object).toBe(root1)
      expect(viewModel[0].cells[0].rowSpan).toBe(1)
      expect(viewModel[0].cells[1].object).toBe(b1)
      expect(viewModel[1].cells[0].object).toBe(root2)
      expect(viewModel[1].cells[1].object).toBe(b2)
    })

    it('preserves model order for non-association attributes', async () => {
      const b1 = doc('b1')
      const root = doc('root-1', { $associations: { assoc1_b: [b1] } })
      const model: AttributeModel[] = [attr(''), attr('$associations.assoc1_b', 'Assoc'), attr('title', 'Title')]
      const viewModel = await rebuildRelationshipTableViewModel([root], model, cardClass, hierarchy, client)
      expect(viewModel).toHaveLength(1)
      expect(viewModel[0].cells).toHaveLength(3)
      expect(viewModel[0].cells[2].attribute.key).toBe('title')
      expect(viewModel[0].cells[2].object).toBe(root)
      expect(viewModel[0].cells[2].rowSpan).toBe(1)
    })
  })
})
