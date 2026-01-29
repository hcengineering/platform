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

import { buildMarkdownTableFromDocs, copyAsMarkdownTable, isIntlString } from '../index'
import type { Doc, Class, Ref } from '@hcengineering/core'
import type { CopyAsMarkdownTableProps } from '../types'
import { getClient } from '@hcengineering/presentation'
import { getCurrentLanguage } from '@hcengineering/theme'
import { copyMarkdown, buildModel, getObjectLinkFragment } from '@hcengineering/view-resources'
import core from '@hcengineering/core'
import { type IntlString } from '@hcengineering/platform'

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    translate: jest.fn(async (str: unknown) => `translated:${String(str)}`),
    getMetadata: jest.fn((key: unknown) => {
      if (key != null && String(key).includes('FrontUrl')) {
        return 'http://test.local:8080'
      }
      return undefined
    })
  }
})

jest.mock('@hcengineering/presentation', () => ({
  getClient: jest.fn()
}))

jest.mock('@hcengineering/theme', () => ({
  getCurrentLanguage: jest.fn(() => 'en')
}))

jest.mock('@hcengineering/view-resources', () => ({
  copyMarkdown: jest.fn(),
  buildModel: jest.fn(),
  buildConfigLookup: jest.fn(() => ({})),
  getObjectLinkFragment: jest.fn()
}))

jest.mock('@hcengineering/ui', () => ({
  addNotification: jest.fn(),
  NotificationSeverity: { Success: 'success', Error: 'error' },
  locationToUrl: jest.fn((loc: unknown) => {
    if (loc != null && typeof loc === 'object' && 'path' in loc && Array.isArray((loc as { path: string[] }).path)) {
      return (loc as { path: string[] }).path.join('/')
    }
    return 'workbench/w3/card/test-id'
  }),
  getCurrentResolvedLocation: jest.fn(() => ({ path: ['workbench', 'w3', 'card', 'test-id'] }))
}))

jest.mock('@hcengineering/view', () => {
  const viewMock = {
    string: {
      Copied: 'view:string:Copied',
      TableCopiedToClipboard: 'view:string:TableCopiedToClipboard',
      TableCopyFailed: 'view:string:TableCopyFailed'
    },
    class: { Viewlet: 'view:class:Viewlet', ViewletPreference: 'view:class:ViewletPreference' },
    viewlet: { Table: 'view:viewlet:Table' }
  }
  return { __esModule: true, default: viewMock }
})

const mockGetObjectLinkFragment = getObjectLinkFragment as jest.Mock

describe('converter-resources', () => {
  describe('isIntlString', () => {
    it('returns true for plugin:resource:key', () => {
      expect(isIntlString('card:string:Card')).toBe(true)
    })

    it('returns false for plain string', () => {
      expect(isIntlString('Hello')).toBe(false)
    })
  })

  describe('buildMarkdownTableFromDocs', () => {
    let mockClient: any
    let mockHierarchy: any
    let mockDoc: Doc

    beforeEach(() => {
      jest.clearAllMocks()
      mockGetObjectLinkFragment.mockResolvedValue({ path: ['workbench', 'w3', 'card', 'doc1'] })

      mockHierarchy = {
        getClass: jest.fn((ref: Ref<Class<Doc>>) => (ref === 'card:class:Card' ? { _id: ref } : null)),
        findAttribute: jest.fn(() => ({ type: { _class: core.class.TypeString } })),
        as: jest.fn((doc: Doc) => doc),
        classHierarchyMixin: jest.fn(() => undefined)
      }

      mockClient = {
        getHierarchy: () => mockHierarchy,
        findAll: jest.fn(async () => []),
        findOne: jest.fn(async () => null)
      }

      mockDoc = {
        _id: 'doc1',
        _class: 'card:class:Card',
        title: 'Test Card',
        createdOn: 1732178763949,
        modifiedOn: 1732178770252
      } as unknown as Doc
      ;(getClient as jest.Mock).mockReturnValue(mockClient)
      ;(getCurrentLanguage as jest.Mock).mockReturnValue('en')
      ;(buildModel as jest.Mock).mockResolvedValue([
        { key: '', label: 'card:string:Card' as IntlString, displayProps: {}, attribute: undefined },
        { key: 'createdOn', label: 'Created', displayProps: {}, attribute: undefined }
      ])
    })

    it('returns empty string for empty docs', async () => {
      const result = await buildMarkdownTableFromDocs(
        [],
        { cardClass: 'card:class:Card' as Ref<Class<Doc>> },
        mockClient
      )
      expect(result).toBe('')
    })

    it('builds markdown table from docs with viewlet config', async () => {
      mockClient.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([{ config: ['', 'createdOn'] }])

      const result = await buildMarkdownTableFromDocs(
        [mockDoc],
        { cardClass: 'card:class:Card' as Ref<Class<Doc>> },
        mockClient
      )

      expect(result).toContain('| ')
      expect(result).toContain(' |\n')
      expect(result).toContain('---')
      expect(result).toContain('Test Card')
      expect(mockGetObjectLinkFragment).toHaveBeenCalled()
    })

    it('uses escaped text for non-title columns', async () => {
      mockClient.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([{ config: ['', 'createdOn'] }])

      const result = await buildMarkdownTableFromDocs(
        [mockDoc],
        { cardClass: 'card:class:Card' as Ref<Class<Doc>> },
        mockClient
      )

      expect(result.split('\n').length).toBeGreaterThanOrEqual(2)
      expect(result).toMatch(/\|.*\|/)
    })
  })

  describe('copyAsMarkdownTable', () => {
    let mockClient: any
    let mockHierarchy: any
    let mockDoc: Doc

    beforeEach(() => {
      jest.clearAllMocks()
      mockGetObjectLinkFragment.mockResolvedValue({ path: ['workbench', 'w3', 'card', 'doc1'] })

      mockHierarchy = {
        getClass: jest.fn(() => ({ _id: 'card:class:Card' })),
        findAttribute: jest.fn(() => ({ type: { _class: core.class.TypeString } })),
        as: jest.fn((doc: Doc) => doc),
        classHierarchyMixin: jest.fn(() => undefined)
      }

      mockClient = {
        getHierarchy: () => mockHierarchy,
        findAll: jest.fn(async () => []),
        findOne: jest.fn(async () => null)
      }

      mockDoc = {
        _id: 'doc1',
        _class: 'card:class:Card',
        title: 'Test Card',
        createdOn: 1732178763949,
        modifiedOn: 1732178770252
      } as unknown as Doc
      ;(getClient as jest.Mock).mockReturnValue(mockClient)
      ;(getCurrentLanguage as jest.Mock).mockReturnValue('en')
      ;(buildModel as jest.Mock).mockResolvedValue([
        { key: '', label: 'card:string:Card', displayProps: {}, attribute: undefined },
        { key: 'createdOn', label: 'Created', displayProps: {}, attribute: undefined }
      ])
    })

    it('does nothing when docs is empty', async () => {
      const evt: Event = {} as any
      const props: CopyAsMarkdownTableProps = { cardClass: 'card:class:Card' as Ref<Class<Doc>> }
      await copyAsMarkdownTable([], evt, props)
      expect(copyMarkdown).not.toHaveBeenCalled()
    })

    it('calls copyMarkdown and addNotification on success', async () => {
      const evt: Event = {} as any
      const props: CopyAsMarkdownTableProps = { cardClass: 'card:class:Card' as Ref<Class<Doc>> }
      await copyAsMarkdownTable([mockDoc], evt, props)
      expect(copyMarkdown).toHaveBeenCalled()
      const { addNotification } = await import('@hcengineering/ui')
      expect(addNotification).toHaveBeenCalled()
    })
  })
})
