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
import { modelToConfig } from '../model/tableModel'

jest.mock('@hcengineering/view-resources', () => ({
  buildModel: jest.fn(),
  buildConfigLookup: jest.fn()
}))

jest.mock('@hcengineering/view', () => ({
  default: {
    class: { Viewlet: 'view:class:Viewlet', ViewletPreference: 'view:class:ViewletPreference' },
    viewlet: { Table: 'view:viewlet:Table' }
  }
}))

describe('model/tableModel', () => {
  describe('modelToConfig', () => {
    it('returns key for model with non-empty key', () => {
      const model: AttributeModel[] = [{ key: 'title', label: 'Title', displayProps: {}, attribute: undefined } as any]
      expect(modelToConfig(model)).toEqual(['title'])
    })

    it('preserves custom attribute as object when key is empty and label starts with custom', () => {
      const model: AttributeModel[] = [
        {
          key: '',
          label: 'customAttr1',
          displayProps: {},
          props: {},
          sortingKey: undefined,
          attribute: undefined
        } as any
      ]
      expect(modelToConfig(model)).toEqual([
        {
          key: 'customAttr1',
          label: 'customAttr1',
          displayProps: {},
          props: {},
          sortingKey: undefined
        }
      ])
    })

    it('returns key string for model with castRequest when key is empty', () => {
      const model: AttributeModel[] = [
        {
          key: '',
          label: 'Label',
          displayProps: {},
          props: {},
          sortingKey: undefined,
          castRequest: 'ref',
          attribute: undefined
        } as any
      ]
      expect(modelToConfig(model)).toEqual([
        {
          key: '',
          label: 'Label',
          displayProps: {},
          props: {},
          sortingKey: undefined
        }
      ])
    })

    it('returns empty string for simple empty key without custom/castRequest', () => {
      const model: AttributeModel[] = [{ key: '', label: 'Title', displayProps: {}, attribute: undefined } as any]
      expect(modelToConfig(model)).toEqual([''])
    })

    it('handles mixed model', () => {
      const model: AttributeModel[] = [
        { key: '', label: 'card:string:Card', displayProps: {}, attribute: undefined } as any,
        { key: 'createdOn', label: 'Created', displayProps: {}, attribute: undefined } as any
      ]
      expect(modelToConfig(model)).toEqual(['', 'createdOn'])
    })
  })
})
