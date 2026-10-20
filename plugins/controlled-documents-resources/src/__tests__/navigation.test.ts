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

const findOne = jest.fn()
const setAccessDenied = jest.fn()

jest.mock('@hcengineering/controlled-documents', () => ({
  __esModule: true,
  default: {
    class: {
      ControlledDocument: 'documents:class:ControlledDocument',
      ProjectDocument: 'documents:class:ProjectDocument'
    },
    ids: { NoProject: 'documents:ids:NoProject' }
  },
  documentsId: 'documents'
}))
jest.mock('@hcengineering/presentation', () => ({ getClient: () => ({ findOne }) }))
jest.mock('@hcengineering/ui', () => ({ getCurrentResolvedLocation: jest.fn(), getPanelURI: jest.fn() }))
jest.mock('@hcengineering/view', () => ({ __esModule: true, default: { mixin: {}, component: {} } }))
jest.mock('@hcengineering/view-resources', () => ({ accessDeniedStore: { set: setAccessDenied } }))
jest.mock('slugify', () => jest.fn())

// eslint-disable-next-line import/first
import { resolveLocation } from '../navigation'

describe('resolveLocation', () => {
  beforeEach(() => {
    findOne.mockReset()
    setAccessDenied.mockReset()
  })

  it.each(['my-documents', 'library', 'templates', 'categories', 'space-browser'])(
    'does not resolve navigator special %s as a document',
    async (special) => {
      const result = await resolveLocation({ path: ['workbench', 'ws', 'documents', special] })

      expect(result).toBeUndefined()
      expect(findOne).not.toHaveBeenCalled()
      expect(setAccessDenied).not.toHaveBeenCalled()
    }
  )

  it('still looks up document short links', async () => {
    findOne.mockResolvedValue(undefined)
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await resolveLocation({ path: ['workbench', 'ws', 'documents', 'some-title---doc1'] })

    expect(result).toBeUndefined()
    expect(findOne).toHaveBeenCalledWith('documents:class:ControlledDocument', { _id: 'doc1' }, { showArchived: true })
    expect(setAccessDenied).toHaveBeenCalledWith(true)
  })
})
