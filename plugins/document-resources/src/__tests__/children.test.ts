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

import { type Ref, type TxOperations } from '@hcengineering/core'
import { type Document, documentId } from '@hcengineering/document'
import { findChildren } from '../children'

describe('findChildren', () => {
  it('should find all children recursively', async () => {
    const mockDocuments = [
      { _id: 'doc1' as Ref<Document>, parent: 'root' as Ref<Document> },
      { _id: 'doc2' as Ref<Document>, parent: 'root' as Ref<Document> },
      { _id: 'doc3' as Ref<Document>, parent: 'doc1' as Ref<Document> },
      { _id: 'doc4' as Ref<Document>, parent: 'doc2' as Ref<Document> },
      { _id: 'doc5' as Ref<Document>, parent: 'doc3' as Ref<Document> }
    ]

    const mockFindAll = jest.fn().mockResolvedValue(mockDocuments)
    const mockClient = {
      findAll: mockFindAll
    } as unknown as TxOperations

    const rootDoc = {
      _id: 'root' as Ref<Document>,
      space: 'space1'
    } satisfies Partial<Document> as Document

    const noParentId = 'no-parent' as Ref<Document>
    const result = await findChildren(mockClient, rootDoc, noParentId)

    expect(result).toHaveLength(5)
    expect(result).toContain('doc1' as Ref<Document>)
    expect(result).toContain('doc2' as Ref<Document>)
    expect(result).toContain('doc3' as Ref<Document>)
    expect(result).toContain('doc4' as Ref<Document>)
    expect(result).toContain('doc5' as Ref<Document>)

    expect(mockFindAll).toHaveBeenCalledWith(
      documentId,
      { space: 'space1', parent: { $ne: noParentId } },
      { projection: { _id: 1, parent: 1 } }
    )
  })

  it('should handle empty children', async () => {
    const mockClient = {
      findAll: jest.fn().mockResolvedValue([])
    } as unknown as TxOperations

    const rootDoc = {
      _id: 'root' as Ref<Document>,
      space: 'space1'
    } satisfies Partial<Document> as Document

    const noParentId = 'no-parent' as Ref<Document>
    const result = await findChildren(mockClient, rootDoc, noParentId)

    expect(result).toHaveLength(0)
  })

  it('should handle circular references without infinite loop', async () => {
    // This reproduces the "Maximum call stack size exceeded" bug
    const mockDocuments = [
      { _id: 'doc1' as Ref<Document>, parent: 'root' as Ref<Document> },
      { _id: 'doc2' as Ref<Document>, parent: 'doc1' as Ref<Document> },
      { _id: 'doc3' as Ref<Document>, parent: 'doc2' as Ref<Document> },
      // Circular reference: doc1 -> doc2 -> doc3 -> doc1
      { _id: 'doc1' as Ref<Document>, parent: 'doc3' as Ref<Document> }
    ]

    const mockClient = {
      findAll: jest.fn().mockResolvedValue(mockDocuments)
    } as unknown as TxOperations

    const rootDoc = {
      _id: 'root' as Ref<Document>,
      space: 'space1'
    } satisfies Partial<Document> as Document

    // This should not throw "Maximum call stack size exceeded"
    const noParentId = 'no-parent' as Ref<Document>
    const result = await findChildren(mockClient, rootDoc, noParentId)

    // Should find doc1, doc2, doc3 but stop when detecting the cycle
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(3)
  })

  it('should handle self-referencing parent', async () => {
    // Document that is its own parent - another circular case
    const mockDocuments = [
      { _id: 'doc1' as Ref<Document>, parent: 'root' as Ref<Document> },
      { _id: 'doc2' as Ref<Document>, parent: 'doc2' as Ref<Document> } // Self-reference
    ]

    const mockClient = {
      findAll: jest.fn().mockResolvedValue(mockDocuments)
    } as unknown as TxOperations

    const rootDoc = {
      _id: 'root' as Ref<Document>,
      space: 'space1'
    } satisfies Partial<Document> as Document

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

    const noParentId = 'no-parent' as Ref<Document>
    const result = await findChildren(mockClient, rootDoc, noParentId)

    // Should find doc1 and possibly doc2, but not enter infinite loop
    expect(result.length).toBeGreaterThanOrEqual(1)

    consoleWarnSpy.mockRestore()
  })

  it('should handle deep nested hierarchy', async () => {
    // Create a deep hierarchy: root -> doc1 -> doc2 -> ... -> doc10
    const mockDocuments = Array.from({ length: 10 }, (_, i) => ({
      _id: `doc${i + 1}` as Ref<Document>,
      parent: (i === 0 ? 'root' : `doc${i}`) as Ref<Document>
    }))

    const mockClient = {
      findAll: jest.fn().mockResolvedValue(mockDocuments)
    } as unknown as TxOperations

    const rootDoc = {
      _id: 'root' as Ref<Document>,
      space: 'space1'
    } satisfies Partial<Document> as Document

    const noParentId = 'no-parent' as Ref<Document>
    const result = await findChildren(mockClient, rootDoc, noParentId)

    expect(result).toHaveLength(10)
    expect(result).toContain('doc1' as Ref<Document>)
    expect(result).toContain('doc10' as Ref<Document>)
  })

  it('should handle multiple branches', async () => {
    // Tree structure:
    //       root
    //      /    \
    //    doc1   doc2
    //    /  \      \
    // doc3 doc4   doc5
    const mockDocuments = [
      { _id: 'doc1' as Ref<Document>, parent: 'root' as Ref<Document> },
      { _id: 'doc2' as Ref<Document>, parent: 'root' as Ref<Document> },
      { _id: 'doc3' as Ref<Document>, parent: 'doc1' as Ref<Document> },
      { _id: 'doc4' as Ref<Document>, parent: 'doc1' as Ref<Document> },
      { _id: 'doc5' as Ref<Document>, parent: 'doc2' as Ref<Document> }
    ]

    const mockClient = {
      findAll: jest.fn().mockResolvedValue(mockDocuments)
    } as unknown as TxOperations

    const rootDoc = {
      _id: 'root' as Ref<Document>,
      space: 'space1'
    } satisfies Partial<Document> as Document

    const result = await findChildren(mockClient, rootDoc)

    expect(result).toHaveLength(5)
    // All documents should be found
    mockDocuments.forEach((doc) => {
      expect(result).toContain(doc._id)
    })
  })
})
