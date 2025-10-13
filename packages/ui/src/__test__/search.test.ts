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

import { type IntlString, translate } from '@hcengineering/platform'
import { LocalizedSearch } from '../search'
import type { DropdownIntlItem } from '../types'

// Mock dependencies
jest.mock('@hcengineering/platform', () => ({
  translate: jest.fn()
}))

jest.mock('@hcengineering/theme', () => ({
  themeStore: {
    language: 'en'
  }
}))

jest.mock('svelte/store', () => ({
  get: jest.fn((store) => store)
}))

// Get the mocked translate function
const translateMock = translate as jest.MockedFunction<typeof translate>

describe('LocalizedSearch', () => {
  let localizedSearch: LocalizedSearch
  let mockItems: Array<[DropdownIntlItem, DropdownIntlItem[]]>

  beforeEach(() => {
    localizedSearch = new LocalizedSearch()
    jest.clearAllMocks()

    // Setup mock items
    mockItems = [
      [
        { id: 'parent1', label: 'label.parent1' as IntlString },
        [
          { id: 'child1', label: 'label.child1' as IntlString },
          { id: 'child2', label: 'label.child2' as IntlString }
        ]
      ],
      [
        { id: 'parent2', label: 'label.parent2' as IntlString },
        [{ id: 'child3', label: 'label.child3' as IntlString }]
      ],
      [{ id: 'parent3', label: 'label.parent3' as IntlString }, []]
    ]

    // Setup default translate mock
    translateMock.mockImplementation(async (label: IntlString) => {
      const translations: Record<string, string> = {
        'label.parent1': 'Task Management',
        'label.parent2': 'Document Processing',
        'label.parent3': 'User Settings',
        'label.child1': 'Create Task',
        'label.child2': 'Edit Task',
        'label.child3': 'Export Document'
      }
      return await Promise.resolve(translations[label] ?? label)
    })
  })

  describe('filter', () => {
    it('should return all items when search term is empty', async () => {
      const result = await localizedSearch.filter(mockItems, '')
      expect(result).toEqual(mockItems)
    })

    it('should return all items when search term is only whitespace', async () => {
      const result = await localizedSearch.filter(mockItems, '   ')
      expect(result).toEqual(mockItems)
    })

    it('should filter by parent label', async () => {
      const result = await localizedSearch.filter(mockItems, 'task')

      expect(result).toHaveLength(1)
      expect(result[0][0].id).toBe('parent1')
      expect(result[0][1]).toHaveLength(2) // Should include all children when parent matches
    })

    it('should filter by child label', async () => {
      const result = await localizedSearch.filter(mockItems, 'export')

      expect(result).toHaveLength(1)
      expect(result[0][0].id).toBe('parent2')
      expect(result[0][1]).toHaveLength(1) // Should include only matching child
      expect(result[0][1][0].id).toBe('child3')
    })

    it('should filter by partial match', async () => {
      const result = await localizedSearch.filter(mockItems, 'doc')

      expect(result).toHaveLength(1)
      expect(result[0][0].id).toBe('parent2')
    })

    it('should be case insensitive', async () => {
      const result = await localizedSearch.filter(mockItems, 'TASK')

      expect(result).toHaveLength(1)
      expect(result[0][0].id).toBe('parent1')
    })

    it('should handle multiple matches', async () => {
      translateMock.mockImplementation(async (label: IntlString) => {
        const translations: Record<string, string> = {
          'label.parent1': 'Task Management',
          'label.parent2': 'Task Processing',
          'label.parent3': 'User Settings',
          'label.child1': 'Create Task',
          'label.child2': 'Edit Task',
          'label.child3': 'Task Export'
        }
        return await Promise.resolve(translations[label] ?? label)
      })

      const result = await localizedSearch.filter(mockItems, 'task')

      expect(result).toHaveLength(2) // parent1 and parent2 should match
      expect(result[0][0].id).toBe('parent1')
      expect(result[1][0].id).toBe('parent2')
    })

    it('should return empty array when no matches found', async () => {
      const result = await localizedSearch.filter(mockItems, 'nonexistent')

      expect(result).toHaveLength(0)
    })

    it('should handle items with null labels', async () => {
      const itemsWithNullLabels: Array<[DropdownIntlItem, DropdownIntlItem[]]> = [
        [{ id: 'parent1', label: null as any }, [{ id: 'child1', label: 'label.child1' as IntlString }]]
      ]

      const result = await localizedSearch.filter(itemsWithNullLabels, 'create')

      expect(result).toHaveLength(1)
      expect(result[0][1]).toHaveLength(1)
      expect(result[0][1][0].id).toBe('child1')
    })

    it('should cache translations for performance', async () => {
      // First call
      await localizedSearch.filter(mockItems, 'task')

      // Second call with same items
      await localizedSearch.filter(mockItems, 'document')

      // translate should have been called only once per unique label
      const uniqueLabels = new Set([
        'label.parent1',
        'label.parent2',
        'label.parent3',
        'label.child1',
        'label.child2',
        'label.child3'
      ])

      expect(translate).toHaveBeenCalledTimes(uniqueLabels.size)
    })

    it('should handle translation errors gracefully', async () => {
      translateMock.mockImplementation(async (label: IntlString) => {
        if (label === 'label.parent1') {
          return await Promise.reject(new Error('Translation failed'))
        }
        return await Promise.resolve(label) // Fallback to label itself
      })

      const result = await localizedSearch.filter(mockItems, 'parent1')

      // Should still work with fallback
      expect(result).toHaveLength(1)
      expect(result[0][0].id).toBe('parent1')
    })
  })

  describe('edge cases', () => {
    it('should handle empty items array', async () => {
      const result = await localizedSearch.filter([], 'search')
      expect(result).toEqual([])
    })

    it('should handle items with empty children arrays', async () => {
      const itemsWithEmptyChildren: Array<[DropdownIntlItem, DropdownIntlItem[]]> = [
        [{ id: 'parent1', label: 'label.parent1' as IntlString }, []]
      ]

      const result = await localizedSearch.filter(itemsWithEmptyChildren, 'task')

      expect(result).toHaveLength(1)
      expect(result[0][1]).toHaveLength(0)
    })

    it('should handle very long search terms', async () => {
      const longSearchTerm = 'a'.repeat(1000)
      const result = await localizedSearch.filter(mockItems, longSearchTerm)

      expect(result).toHaveLength(0)
    })

    it('should handle special characters in search term', async () => {
      translateMock.mockImplementation(async (label: IntlString) => {
        if (label === 'label.parent1') {
          return await Promise.resolve('Task (Management)')
        }
        return await Promise.resolve(label)
      })

      const result = await localizedSearch.filter(mockItems, '(management)')

      expect(result).toHaveLength(1)
      expect(result[0][0].id).toBe('parent1')
    })
  })
})
