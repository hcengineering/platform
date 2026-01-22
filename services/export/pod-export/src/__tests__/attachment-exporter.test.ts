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

import {
  type Blob,
  type Class,
  type Doc,
  type Hierarchy,
  type MeasureContext,
  type Mixin,
  type Ref,
  type TxOperations,
  type WorkspaceIds,
  generateId
} from '@hcengineering/core'
import core from '@hcengineering/model-core'
import { type StorageAdapter } from '@hcengineering/server-core'
import { Buffer } from 'buffer'
import { AttachmentExporter } from '../workspace/attachment-exporter'

function createMockMeasureContext (): MeasureContext {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    contextData: {},
    newChild: jest.fn(),
    with: jest.fn(),
    withSync: jest.fn(),
    extractMeta: jest.fn(),
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      logOperation: jest.fn(),
      childLogger: jest.fn(),
      close: jest.fn()
    },
    measure: jest.fn(),
    end: jest.fn(),
    getParams: jest.fn()
  } as unknown as MeasureContext
}

function createMockStorageAdapter (): StorageAdapter {
  return {
    read: jest.fn(),
    stat: jest.fn(),
    put: jest.fn(),
    remove: jest.fn(),
    list: jest.fn(),
    exists: jest.fn()
  } as unknown as StorageAdapter
}

function createMockHierarchy (): Hierarchy {
  return {
    getAllAttributes: jest.fn(() => new Map()),
    isMixin: jest.fn(() => false),
    hasMixin: jest.fn(() => undefined),
    findDomain: jest.fn(),
    isDerived: jest.fn(),
    getClass: jest.fn(),
    findAttribute: jest.fn()
  } as unknown as Hierarchy
}

function createMockTxOperations (): TxOperations {
  return {
    findAll: jest.fn(),
    findOne: jest.fn(),
    getHierarchy: jest.fn(() => createMockHierarchy()),
    createDoc: jest.fn(),
    addCollection: jest.fn(),
    updateDoc: jest.fn()
  } as unknown as TxOperations
}

describe('AttachmentExporter - exportCollaborativeContent', () => {
  let mockContext: MeasureContext
  let mockStorage: StorageAdapter
  let mockClient: TxOperations
  let mockHierarchy: Hierarchy
  let sourceWorkspace: WorkspaceIds
  let targetWorkspace: WorkspaceIds
  let exporter: AttachmentExporter

  beforeEach(() => {
    mockContext = createMockMeasureContext()
    mockStorage = createMockStorageAdapter()
    mockClient = createMockTxOperations()
    mockHierarchy = createMockHierarchy()
    sourceWorkspace = { workspace: 'source-ws' as any, workspaceUrl: 'ws://source' }
    targetWorkspace = { workspace: 'target-ws' as any, workspaceUrl: 'ws://target' }
    exporter = new AttachmentExporter(mockContext, mockClient, mockStorage, sourceWorkspace, targetWorkspace)
    jest.clearAllMocks()
  })

  describe('Success cases', () => {
    it('should export collaborative content blob for a document with collaborative field', async () => {
      const blobRef = 'blob-123' as Ref<Blob>
      const blobData = Buffer.from('test content')
      const blobSize = blobData.length
      const contentType = 'application/json'

      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        content: blobRef
      } as any

      const attributes = new Map([
        [
          'content',
          {
            _id: 'test:attr:content' as any,
            label: 'Content',
            type: { _class: core.class.TypeCollaborativeDoc }
          }
        ]
      ])

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(attributes)
      ;(mockStorage.read as jest.Mock).mockResolvedValue([blobData])
      ;(mockStorage.stat as jest.Mock).mockResolvedValue({
        size: blobSize,
        contentType
      })
      ;(mockStorage.put as jest.Mock).mockResolvedValue(undefined)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockStorage.read).toHaveBeenCalledWith(mockContext, sourceWorkspace, blobRef)
      expect(mockStorage.stat).toHaveBeenCalledWith(mockContext, sourceWorkspace, blobRef)
      expect(mockStorage.put).toHaveBeenCalledWith(
        mockContext,
        targetWorkspace,
        blobRef,
        blobData,
        contentType,
        blobSize
      )
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringContaining(`Copied collaborative content blob ${blobRef}`)
      )
    })

    it('should handle multiple collaborative content fields', async () => {
      const blobRef1 = 'blob-1' as Ref<Blob>
      const blobRef2 = 'blob-2' as Ref<Blob>
      const blobData1 = Buffer.from('content 1')
      const blobData2 = Buffer.from('content 2')

      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        content: blobRef1,
        description: blobRef2
      } as any

      const attributes = new Map([
        [
          'content',
          {
            _id: 'test:attr:content' as any,
            label: 'Content',
            type: { _class: core.class.TypeCollaborativeDoc }
          }
        ],
        [
          'description',
          {
            _id: 'test:attr:description' as any,
            label: 'Description',
            type: { _class: core.class.TypeCollaborativeDoc }
          }
        ]
      ])

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(attributes)
      ;(mockStorage.read as jest.Mock).mockResolvedValueOnce([blobData1]).mockResolvedValueOnce([blobData2])
      ;(mockStorage.stat as jest.Mock)
        .mockResolvedValueOnce({ size: blobData1.length, contentType: 'application/json' })
        .mockResolvedValueOnce({ size: blobData2.length, contentType: 'application/json' })
      ;(mockStorage.put as jest.Mock).mockResolvedValue(undefined)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockStorage.put).toHaveBeenCalledTimes(2)
      expect(mockContext.info).toHaveBeenCalledTimes(2)
    })

    it('should skip non-collaborative fields', async () => {
      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        title: 'Test Title'
      } as any

      const attributes = new Map([
        [
          'title',
          {
            _id: 'test:attr:title' as any,
            label: 'Title',
            type: { _class: 'core:class:TypeString' as Ref<Class<Doc>> }
          }
        ]
      ])

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(attributes)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockStorage.read).not.toHaveBeenCalled()
      expect(mockStorage.put).not.toHaveBeenCalled()
    })

    it('should skip null or undefined blob references', async () => {
      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        content: null
      } as any

      const attributes = new Map([
        [
          'content',
          {
            _id: 'test:attr:content' as any,
            label: 'Content',
            type: { _class: core.class.TypeCollaborativeDoc }
          }
        ]
      ])

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(attributes)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockStorage.read).not.toHaveBeenCalled()
      expect(mockStorage.put).not.toHaveBeenCalled()
    })

    it('should handle mixin attributes with collaborative content', async () => {
      const blobRef = 'blob-mixin' as Ref<Blob>
      const blobData = Buffer.from('mixin content')
      const mixinName = 'test:mixin:CustomMixin' as Ref<Mixin<Doc>>

      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        [mixinName]: {
          customContent: blobRef
        }
      } as any

      const attributes = new Map()
      const mixinAttrs = new Map([
        [
          'customContent',
          {
            _id: 'test:attr:customContent' as any,
            label: 'Custom Content',
            type: { _class: core.class.TypeCollaborativeDoc }
          }
        ]
      ])

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(attributes)
      ;(mockHierarchy.isMixin as jest.Mock).mockImplementation((key: string) => key === mixinName)
      ;(mockHierarchy.hasMixin as jest.Mock).mockReturnValue(true)
      ;(mockHierarchy.getAllAttributes as jest.Mock).mockImplementation((classRef: any) => {
        if (classRef === mixinName) {
          return mixinAttrs
        }
        return attributes
      })
      ;(mockStorage.read as jest.Mock).mockResolvedValue([blobData])
      ;(mockStorage.stat as jest.Mock).mockResolvedValue({
        size: blobData.length,
        contentType: 'application/json'
      })
      ;(mockStorage.put as jest.Mock).mockResolvedValue(undefined)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockStorage.read).toHaveBeenCalledWith(mockContext, sourceWorkspace, blobRef)
      expect(mockStorage.put).toHaveBeenCalled()
      expect(mockContext.info).toHaveBeenCalledWith(
        expect.stringContaining(`Copied collaborative content blob ${blobRef}`)
      )
    })
  })

  describe('Error handling', () => {
    it('should handle storage read errors gracefully', async () => {
      const blobRef = 'blob-error' as Ref<Blob>
      const readError = new Error('Storage read failed')

      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        content: blobRef
      } as any

      const attributes = new Map([
        [
          'content',
          {
            _id: 'test:attr:content' as any,
            label: 'Content',
            type: { _class: core.class.TypeCollaborativeDoc }
          }
        ]
      ])

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(attributes)
      ;(mockStorage.read as jest.Mock).mockRejectedValue(readError)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockContext.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to copy collaborative content blob ${blobRef}`),
        expect.objectContaining({
          error: readError.message,
          blobRef,
          field: 'content'
        })
      )
    })

    it('should handle missing blob data gracefully', async () => {
      const blobRef = 'blob-missing' as Ref<Blob>

      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        content: blobRef
      } as any

      const attributes = new Map([
        [
          'content',
          {
            _id: 'test:attr:content' as any,
            label: 'Content',
            type: { _class: core.class.TypeCollaborativeDoc }
          }
        ]
      ])

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(attributes)
      ;(mockStorage.read as jest.Mock).mockResolvedValue(undefined)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockContext.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Blob ${blobRef} (field content) not found in source workspace`)
      )
      expect(mockStorage.put).not.toHaveBeenCalled()
    })

    it('should handle missing blob metadata gracefully', async () => {
      const blobRef = 'blob-no-metadata' as Ref<Blob>
      const blobData = Buffer.from('test')

      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        content: blobRef
      } as any

      const attributes = new Map([
        [
          'content',
          {
            _id: 'test:attr:content' as any,
            label: 'Content',
            type: { _class: core.class.TypeCollaborativeDoc }
          }
        ]
      ])

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(attributes)
      ;(mockStorage.read as jest.Mock).mockResolvedValue([blobData])
      ;(mockStorage.stat as jest.Mock).mockResolvedValue(undefined)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockContext.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Blob metadata not found for ${blobRef} (field content)`)
      )
      expect(mockStorage.put).not.toHaveBeenCalled()
    })

    it('should handle storage put errors gracefully', async () => {
      const blobRef = 'blob-put-error' as Ref<Blob>
      const blobData = Buffer.from('test')
      const putError = new Error('Storage put failed')

      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        content: blobRef
      } as any

      const attributes = new Map([
        [
          'content',
          {
            _id: 'test:attr:content' as any,
            label: 'Content',
            type: { _class: core.class.TypeCollaborativeDoc }
          }
        ]
      ])

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(attributes)
      ;(mockStorage.read as jest.Mock).mockResolvedValue([blobData])
      ;(mockStorage.stat as jest.Mock).mockResolvedValue({
        size: blobData.length,
        contentType: 'application/json'
      })
      ;(mockStorage.put as jest.Mock).mockRejectedValue(putError)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockContext.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to copy collaborative content blob ${blobRef}`),
        expect.objectContaining({
          error: putError.message,
          blobRef,
          field: 'content'
        })
      )
    })

    it('should handle errors in getAllAttributes and re-throw', async () => {
      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId()
      } as any

      const hierarchyError = new Error('Hierarchy error')
      ;(mockHierarchy.getAllAttributes as jest.Mock).mockImplementation(() => {
        throw hierarchyError
      })

      await expect(exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)).rejects.toThrow(hierarchyError)

      expect(mockContext.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to export collaborative content for document ${sourceDoc._id}`),
        expect.objectContaining({
          error: hierarchyError.message,
          docId: sourceDoc._id,
          docClass: sourceDoc._class
        })
      )
    })

    it('should handle multiple buffers correctly', async () => {
      const blobRef = 'blob-multi' as Ref<Blob>
      const buffer1 = Buffer.from('chunk1')
      const buffer2 = Buffer.from('chunk2')
      const buffer3 = Buffer.from('chunk3')
      const totalSize = buffer1.length + buffer2.length + buffer3.length
      const combinedBuffer = Buffer.concat([buffer1, buffer2, buffer3])

      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        content: blobRef
      } as any

      const attributes = new Map([
        [
          'content',
          {
            _id: 'test:attr:content' as any,
            label: 'Content',
            type: { _class: core.class.TypeCollaborativeDoc }
          }
        ]
      ])

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(attributes)
      ;(mockStorage.read as jest.Mock).mockResolvedValue([buffer1, buffer2, buffer3])
      ;(mockStorage.stat as jest.Mock).mockResolvedValue({
        size: totalSize,
        contentType: 'application/json'
      })
      ;(mockStorage.put as jest.Mock).mockResolvedValue(undefined)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockStorage.put).toHaveBeenCalledWith(
        mockContext,
        targetWorkspace,
        blobRef,
        combinedBuffer,
        'application/json',
        totalSize
      )
    })

    it('should use default contentType when not provided', async () => {
      const blobRef = 'blob-default-ct' as Ref<Blob>
      const blobData = Buffer.from('test')

      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        content: blobRef
      } as any

      const attributes = new Map([
        [
          'content',
          {
            _id: 'test:attr:content' as any,
            label: 'Content',
            type: { _class: core.class.TypeCollaborativeDoc }
          }
        ]
      ])

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(attributes)
      ;(mockStorage.read as jest.Mock).mockResolvedValue([blobData])
      ;(mockStorage.stat as jest.Mock).mockResolvedValue({
        size: blobData.length,
        contentType: null
      })
      ;(mockStorage.put as jest.Mock).mockResolvedValue(undefined)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockStorage.put).toHaveBeenCalledWith(
        mockContext,
        targetWorkspace,
        blobRef,
        blobData,
        'application/json',
        blobData.length
      )
    })
  })

  describe('Edge cases', () => {
    it('should handle empty document with no attributes', async () => {
      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId()
      } as any

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(new Map())

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockStorage.read).not.toHaveBeenCalled()
      expect(mockStorage.put).not.toHaveBeenCalled()
    })

    it('should skip mixin keys that are not actual mixins', async () => {
      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        regularField: 'not a mixin'
      } as any

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(new Map())
      ;(mockHierarchy.isMixin as jest.Mock).mockReturnValue(false)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockStorage.read).not.toHaveBeenCalled()
    })

    it('should skip mixin data that is not an object', async () => {
      const mixinName = 'test:mixin:CustomMixin' as Ref<Mixin<Doc>>

      const sourceDoc: Doc = {
        _id: generateId(),
        _class: 'test:class:Document' as Ref<Class<Doc>>,
        space: generateId(),
        modifiedOn: Date.now(),
        modifiedBy: generateId(),
        [mixinName]: 'not an object'
      } as any

      ;(mockHierarchy.getAllAttributes as jest.Mock).mockReturnValue(new Map())
      ;(mockHierarchy.isMixin as jest.Mock).mockImplementation((key: string) => key === mixinName)
      ;(mockHierarchy.hasMixin as jest.Mock).mockReturnValue(true)

      await exporter.exportCollaborativeContent(sourceDoc, mockHierarchy)

      expect(mockStorage.read).not.toHaveBeenCalled()
    })
  })
})
