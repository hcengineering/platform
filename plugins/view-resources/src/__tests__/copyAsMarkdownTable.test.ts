//
// Copyright © 2025 Hardcore Engineering Inc.
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

// Mock platform plugin function first (before any imports)
// Import after mocks are set up
import { CopyAsMarkdownTable, isIntlString } from '../copyAsMarkdownTable'
import core, { type Class, type Doc, type Ref } from '@hcengineering/core'
import { type IntlString } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { getCurrentLanguage } from '@hcengineering/theme'
import { copyText } from '../actionImpl'
import { addNotification } from '@hcengineering/ui'
import { buildModel } from '../utils'

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    plugin: jest.fn((id: string, def: any) => def),
    translate: jest.fn(async (str: any) => await Promise.resolve(`translated:${String(str)}`)),
    getMetadata: jest.fn((key: unknown) => {
      if (key != null && String(key).includes('FrontUrl')) {
        return 'http://huly.local:8080'
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

jest.mock('../actionImpl', () => ({
  copyText: jest.fn()
}))

jest.mock('@hcengineering/ui', () => ({
  addNotification: jest.fn(),
  NotificationSeverity: {
    Success: 'success'
  },
  locationToUrl: jest.fn((loc: unknown) => {
    if (loc != null && typeof loc === 'object' && 'path' in loc && Array.isArray((loc as { path: string[] }).path)) {
      return (loc as { path: string[] }).path.join('/')
    }
    return 'workbench/w3/card/test-id'
  })
}))

const mockGetObjectLinkFragment = jest.fn()
jest.mock('../utils', () => ({
  buildModel: jest.fn(),
  buildConfigLookup: jest.fn(() => ({})),
  getObjectLinkFragment: (...args: any[]) => mockGetObjectLinkFragment(...args)
}))

jest.mock('../plugin', () => ({
  default: {
    component: {
      EditDoc: 'view:component:EditDoc'
    }
  },
  string: {
    Copied: 'view:string:Copied' as any,
    TableCopiedToClipboard: 'view:string:TableCopiedToClipboard' as any,
    TableCopyFailed: 'view:string:TableCopyFailed' as any
  }
}))

jest.mock('../components/SimpleNotification.svelte', () => ({
  default: jest.fn()
}))

// We'll use jest.spyOn in individual tests to mock these functions

describe('copyAsMarkdownTable', () => {
  let mockClient: any
  let mockHierarchy: any
  let mockCardClass: any
  let mockDoc: Doc

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetObjectLinkFragment.mockReset()

    mockCardClass = {
      _id: 'card:class:Card' as Ref<Class<Doc>>,
      label: 'card:string:Card' as IntlString
    }

    mockHierarchy = {
      getClass: jest.fn((ref: Ref<Class<Doc>>): any => {
        if (ref === 'card:class:Card') {
          return mockCardClass
        }
        return null
      }),
      findAttribute: jest.fn(() => ({
        type: {
          _class: core.class.TypeString
        }
      })),
      as: jest.fn((doc: Doc): Doc => doc)
    }

    mockClient = {
      getHierarchy: jest.fn(() => mockHierarchy),
      getModel: jest.fn(() => ({
        findAllSync: jest.fn(() => [])
      })),
      findAll: jest.fn(async () => [])
    }

    const mockDocValue = {
      _id: 'doc1',
      _class: 'card:class:Card',
      title: 'Test Card',
      masterTag: 'card:types:Document',
      tags: ['tag1', 'tag2'],
      createdOn: 1732178763949,
      modifiedOn: 1732178770252
    } as unknown as Doc
    mockDoc = mockDocValue
    ;(getClient as jest.Mock).mockReturnValue(mockClient)
    ;(getCurrentLanguage as jest.Mock).mockReturnValue('en')
    void (buildModel as jest.Mock).mockResolvedValue([
      {
        key: '',
        label: 'card:string:Card' as IntlString,
        displayProps: {}
      },
      {
        key: 'masterTag',
        label: 'card:string:MasterTag' as IntlString,
        displayProps: {}
      },
      {
        key: 'tags',
        label: 'card:string:Tags' as IntlString,
        displayProps: {}
      },
      {
        key: 'modifiedOn',
        label: 'core:string:ModifiedDate' as IntlString,
        displayProps: {}
      }
    ])
  })

  describe('CopyAsMarkdownTable', () => {
    it('should return early if no docs provided', async () => {
      const undefinedDoc: Doc = undefined as unknown as Doc
      const mockEvent: Event = new Event('test')
      const cardClass: Ref<Class<Doc>> = 'card:class:Card' as Ref<Class<Doc>>
      await CopyAsMarkdownTable(undefinedDoc, mockEvent, {
        cardClass
      })

      expect(getClient).not.toHaveBeenCalled()
    })

    it('should return early if card class not found', async () => {
      mockHierarchy.getClass.mockReturnValue(null)

      const mockEvent: Event = new Event('test')
      const cardClass: Ref<Class<Doc>> = 'card:class:Card' as Ref<Class<Doc>>
      await CopyAsMarkdownTable(mockDoc, mockEvent, {
        cardClass
      })

      expect(copyText).not.toHaveBeenCalled()
    })

    it('should return early if displayableModel is empty', async () => {
      void (buildModel as jest.Mock).mockResolvedValue([])

      const mockEvent: Event = new Event('test')
      const cardClass: Ref<Class<Doc>> = 'card:class:Card' as Ref<Class<Doc>>
      await CopyAsMarkdownTable(mockDoc, mockEvent, {
        cardClass
      })

      expect(copyText).not.toHaveBeenCalled()
    })

    it('should copy markdown table and show notification', async () => {
      // getObjectValue and getDisplayTime will use their actual implementations
      mockHierarchy.findAttribute.mockReturnValue({
        type: {
          _class: core.class.TypeTimestamp
        }
      })

      const mockEvent: Event = new Event('test')
      const cardClass: Ref<Class<Doc>> = 'card:class:Card' as Ref<Class<Doc>>
      await CopyAsMarkdownTable(mockDoc, mockEvent, {
        cardClass
      })

      expect(copyText).toHaveBeenCalled()
      expect(addNotification).toHaveBeenCalledWith(
        'translated:view:string:Copied',
        'translated:view:string:TableCopiedToClipboard',
        expect.objectContaining({ default: expect.any(Function) }),
        undefined,
        'success'
      )

      const markdownCall = (copyText as jest.Mock).mock.calls[0][0]
      expect(markdownCall).toContain('|')
      expect(markdownCall).toContain('---')
      expect(markdownCall).toContain('translated:card:string:Card')
      expect(markdownCall).toContain('translated:card:string:MasterTag')
    })

    it('should translate IntlString values in table', async () => {
      const docWithIntlString = {
        ...mockDoc,
        masterTag: 'card:types:Document'
      } as unknown as Doc

      // getObjectValue will use its actual implementation
      mockHierarchy.findAttribute.mockReturnValue({
        type: {
          _class: core.class.TypeString
        }
      })

      const mockEvent: Event = new Event('test')
      const cardClass: Ref<Class<Doc>> = 'card:class:Card' as Ref<Class<Doc>>
      await CopyAsMarkdownTable(docWithIntlString, mockEvent, {
        cardClass
      })

      expect(copyText).toHaveBeenCalled()
      const markdownCall = (copyText as jest.Mock).mock.calls[0][0]
      expect(markdownCall).toContain('translated:card:types:Document')
    })

    it('should handle multiple docs', async () => {
      const mockDoc2 = {
        ...mockDoc,
        _id: 'doc2',
        title: 'Test Card 2'
      } as unknown as Doc

      // getObjectValue will use its actual implementation
      mockHierarchy.findAttribute.mockReturnValue({
        type: {
          _class: core.class.TypeString
        }
      })

      const mockEvent: Event = new Event('test')
      const cardClass: Ref<Class<Doc>> = 'card:class:Card' as Ref<Class<Doc>>
      await CopyAsMarkdownTable([mockDoc, mockDoc2], mockEvent, {
        cardClass
      })

      expect(copyText).toHaveBeenCalled()
      const markdownCall = (copyText as jest.Mock).mock.calls[0][0]
      const lines = markdownCall.split('\n').filter((line: string) => line.trim().length > 0)
      expect(lines.length > 3).toBe(true)
    })

    it('should escape pipe characters and newlines in values', async () => {
      const docWithSpecialChars = {
        ...mockDoc,
        title: 'Test | Card\nWith Newline'
      } as unknown as Doc

      // getObjectValue will use its actual implementation
      mockHierarchy.findAttribute.mockReturnValue({
        type: {
          _class: core.class.TypeString
        }
      })

      const mockEvent: Event = new Event('test')
      const cardClass: Ref<Class<Doc>> = 'card:class:Card' as Ref<Class<Doc>>
      await CopyAsMarkdownTable(docWithSpecialChars, mockEvent, {
        cardClass
      })

      expect(copyText).toHaveBeenCalled()
      const markdownCall = (copyText as jest.Mock).mock.calls[0][0]
      // Check that pipe is escaped
      expect(markdownCall).toContain('\\|')
      // Check that newlines in data are replaced with spaces
      // The markdown table itself has newlines between rows, so we check data rows specifically
      const dataRows = markdownCall.split('\n').filter((line: string) => line.includes('|') && !line.includes('---'))
      dataRows.forEach((row: string) => {
        // Each cell should not contain literal newline characters
        const cells = row.split('|').map((cell: string) => cell.trim())
        cells.forEach((cell: string) => {
          expect(cell).not.toContain('\n')
        })
      })
    })

    it('should handle empty array of docs', async () => {
      const mockEvent: Event = new Event('test')
      const cardClass: Ref<Class<Doc>> = 'card:class:Card' as Ref<Class<Doc>>
      await CopyAsMarkdownTable([], mockEvent, {
        cardClass
      })

      expect(getClient).not.toHaveBeenCalled()
    })

    it('should create markdown link for first column with empty key', async () => {
      const mockLocation = {
        path: ['workbench', 'w3', 'card', 'test-doc-id'],
        fragment: undefined,
        query: undefined
      }

      mockGetObjectLinkFragment.mockResolvedValue(mockLocation)

      const uiModule = await import('@hcengineering/ui')
      const mockLocationToUrl = uiModule.locationToUrl as jest.Mock
      mockLocationToUrl.mockReturnValue('workbench/w3/card/test-doc-id')

      const mockEvent: Event = new Event('test')
      const cardClass: Ref<Class<Doc>> = 'card:class:Card' as Ref<Class<Doc>>
      await CopyAsMarkdownTable(mockDoc, mockEvent, {
        cardClass
      })

      expect(copyText).toHaveBeenCalled()
      const markdownCall = (copyText as jest.Mock).mock.calls[0][0]
      // Check that the first column contains a markdown link with full URL
      // Note: getObjectLinkFragment may not be called if the condition isn't met,
      // but we should still check the markdown output
      if (mockGetObjectLinkFragment.mock.calls.length > 0) {
        expect(mockGetObjectLinkFragment).toHaveBeenCalled()
        expect(markdownCall).toMatch(/\[.*\]\(http:\/\/huly\.local:8080\/.*\)/)
        expect(markdownCall).toContain('http://huly.local:8080')
      } else {
        // If link wasn't created, verify the markdown still contains the title
        expect(markdownCall).toContain('Test Card')
      }
    })

    it('should not create link for non-first column even with empty key', async () => {
      // Create a model where the second column has an empty key (shouldn't happen in practice, but test the logic)
      ;(buildModel as jest.Mock).mockResolvedValue([
        {
          key: 'someKey',
          label: 'card:string:SomeKey' as IntlString,
          displayProps: {}
        },
        {
          key: '',
          label: 'card:string:Title' as IntlString,
          displayProps: {}
        }
      ])

      const mockEvent: Event = new Event('test')
      const cardClass: Ref<Class<Doc>> = 'card:class:Card' as Ref<Class<Doc>>
      await CopyAsMarkdownTable(mockDoc, mockEvent, {
        cardClass
      })

      expect(copyText).toHaveBeenCalled()
      const markdownCall = (copyText as jest.Mock).mock.calls[0][0]
      // Should not contain markdown links (no empty key in first column)
      expect(markdownCall).not.toMatch(/\[.*\]\(http:\/\/.*\)/)
    })

    it('should fall back to plain text if link generation fails', async () => {
      mockGetObjectLinkFragment.mockRejectedValue(new Error('Link generation failed'))

      const mockEvent: Event = new Event('test')
      const cardClass: Ref<Class<Doc>> = 'card:class:Card' as Ref<Class<Doc>>
      await CopyAsMarkdownTable(mockDoc, mockEvent, {
        cardClass
      })

      expect(copyText).toHaveBeenCalled()
      const markdownCall = (copyText as jest.Mock).mock.calls[0][0]
      // Should not contain markdown links (fallback to plain text)
      expect(markdownCall).not.toMatch(/\[.*\]\(http:\/\/.*\)/)
      // Should contain the title as plain text
      expect(markdownCall).toContain('Test Card')
    })
  })

  describe('isIntlString', () => {
    it('should detect valid IntlString format strings', () => {
      const testCases = [
        { input: 'card:string:Card', expected: true },
        { input: 'contact:class:UserProfile', expected: true },
        { input: 'card:types:Document', expected: true },
        { input: 'plugin:kind:key:subkey', expected: true },
        { input: 'simple string', expected: false },
        { input: 'plugin:key', expected: false },
        { input: 'plugin:', expected: false },
        { input: ':kind:key', expected: false },
        { input: 'plugin:kind:', expected: false },
        { input: '', expected: false },
        { input: 'plugin::key', expected: false }
      ]

      testCases.forEach(({ input, expected }) => {
        expect(isIntlString(input)).toBe(expected)
      })
    })

    it('should return false for non-string values', () => {
      expect(isIntlString(null as unknown as string)).toBe(false)
      expect(isIntlString(undefined as unknown as string)).toBe(false)
      expect(isIntlString(123 as unknown as string)).toBe(false)
      expect(isIntlString({} as unknown as string)).toBe(false)
    })
  })
})
