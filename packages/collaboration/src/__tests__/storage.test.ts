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

import core, {
  type Blob,
  type CollaborativeDoc,
  type MeasureContext,
  type Ref,
  type WorkspaceIds,
  makeCollabJsonId,
  makeCollabYdocId
} from '@hcengineering/core'
import { getDataId, type StorageAdapter } from '@hcengineering/server-core'
import { Readable } from 'stream'
import { Doc as YDoc } from 'yjs'
import { loadCollabYdoc, saveCollabYdoc, removeCollabYdoc, loadCollabJson, saveCollabJson } from '../storage'
import { yDocToBuffer } from '../ydoc'

// Mock StorageAdapter (simplified version based on MemStorageAdapter)
class MockStorageAdapter implements StorageAdapter {
  private readonly files = new Map<string, Blob & { content: Buffer }>()

  async initialize (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {}

  async close (): Promise<void> {}

  async exists (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<boolean> {
    return true
  }

  async make (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {}

  async delete (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<void> {}

  async listBuckets (ctx: MeasureContext): Promise<any[]> {
    return []
  }

  async remove (ctx: MeasureContext, wsIds: WorkspaceIds, objectNames: string[]): Promise<void> {
    for (const k of objectNames) {
      this.files.delete(getDataId(wsIds) + '/' + k)
    }
  }

  async listStream (ctx: MeasureContext, wsIds: WorkspaceIds): Promise<any> {
    return {
      next: async () => [],
      close: async () => {}
    }
  }

  async stat (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Blob | undefined> {
    return this.files.get(getDataId(wsIds) + '/' + objectName)
  }

  async get (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Readable> {
    const readable = new Readable()
    readable._read = () => {}
    const content = this.files.get(getDataId(wsIds) + '/' + objectName)?.content
    readable.push(content)
    readable.push(null)
    return readable
  }

  async put (
    ctx: MeasureContext,
    wsIds: WorkspaceIds,
    objectName: string,
    stream: string | Readable | Buffer,
    contentType: string,
    size?: number
  ): Promise<any> {
    const buffer: Buffer[] = []
    if (stream instanceof Buffer) {
      buffer.push(stream)
    } else if (typeof stream === 'string') {
      buffer.push(Buffer.from(stream))
    } else if (stream instanceof Readable) {
      await new Promise<void>((resolve, reject) => {
        stream.on('end', () => {
          resolve()
        })
        stream.on('error', (error) => {
          reject(error)
        })
        stream.on('data', (data) => {
          buffer.push(data)
        })
      })
    }
    const data = Buffer.concat(buffer)
    const dataId = getDataId(wsIds)
    const dta = {
      _class: core.class.Blob,
      _id: objectName as any,
      contentType,
      size: data.length,
      content: data,
      etag: objectName,
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      provider: '_test',
      space: '' as any,
      version: null
    }
    this.files.set(dataId + '/' + objectName, dta)
    return {
      etag: objectName,
      versionId: null
    }
  }

  async read (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<Buffer[]> {
    const content = this.files.get(getDataId(wsIds) + '/' + objectName)?.content
    if (content === undefined) {
      throw new Error('NoSuchKey')
    }
    return [content]
  }

  async partial (
    ctx: MeasureContext,
    wsIds: WorkspaceIds,
    objectName: string,
    offset: number,
    length?: number
  ): Promise<Readable> {
    throw new Error('NoSuchKey')
  }

  async getUrl (ctx: MeasureContext, wsIds: WorkspaceIds, objectName: string): Promise<string> {
    return '/files/' + objectName
  }
}

// Mock MeasureContext
const mockContext: MeasureContext = {
  id: 'test-context',
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  with: jest.fn().mockImplementation((name, params, fn) => fn()),
  withSync: jest.fn().mockImplementation((name, params, fn) => fn()),
  measure: jest.fn(),
  newChild: jest.fn().mockReturnThis(),
  end: jest.fn(),
  logger: {} as any,
  metrics: {} as any,
  parent: undefined,
  contextData: {},
  extractMeta: jest.fn(),
  getParams: jest.fn().mockReturnValue({})
}

const mockWorkspaceIds: WorkspaceIds = {
  uuid: 'test-workspace' as any,
  dataId: 'test-workspace' as any,
  url: 'test-workspace'
}

const createMockCollaborativeDoc = (id: string): CollaborativeDoc => ({
  objectId: `object:${id}` as any,
  objectClass: 'class:test' as any,
  objectAttr: 'attr:test'
})

describe('storage', () => {
  let storageAdapter: MockStorageAdapter
  let ctx: MeasureContext

  beforeEach(() => {
    storageAdapter = new MockStorageAdapter()
    ctx = mockContext
  })

  describe('loadCollabYdoc', () => {
    it('should load existing YDoc from storage', async () => {
      const doc = createMockCollaborativeDoc('test-doc-1')
      const ydoc = new YDoc()
      ydoc.getMap('test').set('key', 'value')

      const buffer = yDocToBuffer(ydoc)
      const blobId = makeCollabYdocId(doc)
      await storageAdapter.put(ctx, mockWorkspaceIds, blobId, buffer, 'application/ydoc', buffer.length)

      const loadedDoc = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc)

      expect(loadedDoc).toBeDefined()
      expect(loadedDoc?.getMap('test').get('key')).toBe('value')
    })

    it('should return undefined for non-existent document', async () => {
      const doc = createMockCollaborativeDoc('non-existent')
      const loadedDoc = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc)

      expect(loadedDoc).toBeUndefined()
    })

    it('should warn on invalid content type', async () => {
      const doc = createMockCollaborativeDoc('test-doc-2')
      const ydoc = new YDoc()
      const buffer = yDocToBuffer(ydoc)
      const blobId = makeCollabYdocId(doc)

      await storageAdapter.put(ctx, mockWorkspaceIds, blobId, buffer, 'text/plain', buffer.length)

      const loadedDoc = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc)

      expect(loadedDoc).toBeDefined()
      expect(ctx.warn).toHaveBeenCalledWith('invalid content type', { contentType: 'text/plain' })
    })

    it('should load YDoc from blob reference', async () => {
      const blobId = 'blob:test-123' as Ref<Blob>
      const ydoc = new YDoc()
      ydoc.getMap('data').set('test', 42)

      const buffer = yDocToBuffer(ydoc)
      await storageAdapter.put(ctx, mockWorkspaceIds, blobId, buffer, 'application/ydoc', buffer.length)

      const loadedDoc = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, blobId)

      expect(loadedDoc).toBeDefined()
      expect(loadedDoc?.getMap('data').get('test')).toBe(42)
    })

    it('should preserve complex YDoc structures', async () => {
      const doc = createMockCollaborativeDoc('complex-doc')
      const ydoc = new YDoc()

      const ymap = ydoc.getMap('map')
      ymap.set('string', 'text')
      ymap.set('number', 123)
      ymap.set('boolean', true)

      const yarray = ydoc.getArray('array')
      yarray.push(['item1', 'item2', 'item3'])

      const ytext = ydoc.getText('text')
      ytext.insert(0, 'Hello World')

      const buffer = yDocToBuffer(ydoc)
      const blobId = makeCollabYdocId(doc)
      await storageAdapter.put(ctx, mockWorkspaceIds, blobId, buffer, 'application/ydoc', buffer.length)

      const loadedDoc = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc)

      expect(loadedDoc).toBeDefined()
      expect(loadedDoc?.getMap('map').get('string')).toBe('text')
      expect(loadedDoc?.getMap('map').get('number')).toBe(123)
      expect(loadedDoc?.getMap('map').get('boolean')).toBe(true)
      expect(loadedDoc?.getArray('array').toArray()).toEqual(['item1', 'item2', 'item3'])
      expect(String(loadedDoc?.getText('text'))).toBe('Hello World')
    })
  })

  describe('saveCollabYdoc', () => {
    it('should save YDoc to storage', async () => {
      const doc = createMockCollaborativeDoc('save-test')
      const ydoc = new YDoc()
      ydoc.getMap('data').set('saved', true)

      await saveCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc, ydoc)
      const loadedDoc = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc)

      expect(loadedDoc?.getMap('data').get('saved')).toBe(true)
    })

    it('should save YDoc with blob reference', async () => {
      const blobId = 'blob:custom-id' as Ref<Blob>
      const ydoc = new YDoc()
      ydoc.getMap('test').set('value', 'custom')

      const returnedId = await saveCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, blobId, ydoc)

      expect(returnedId).toBe(blobId)

      const loadedDoc = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, blobId)
      expect(loadedDoc?.getMap('test').get('value')).toBe('custom')
    })

    it('should overwrite existing document', async () => {
      const doc = createMockCollaborativeDoc('overwrite-test')

      const ydoc1 = new YDoc()
      ydoc1.getMap('data').set('version', 1)
      await saveCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc, ydoc1)

      const ydoc2 = new YDoc()
      ydoc2.getMap('data').set('version', 2)
      await saveCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc, ydoc2)

      const loadedDoc = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc)
      expect(loadedDoc?.getMap('data').get('version')).toBe(2)
    })

    it('should save empty YDoc', async () => {
      const doc = createMockCollaborativeDoc('empty-doc')
      const ydoc = new YDoc()

      await saveCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc, ydoc)
      const loadedDoc = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc)
      expect(loadedDoc).toBeDefined()
    })
  })

  describe('removeCollabYdoc', () => {
    it('should remove single document', async () => {
      const doc = createMockCollaborativeDoc('remove-test')
      const ydoc = new YDoc()
      await saveCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc, ydoc)

      const loadedBefore = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc)
      expect(loadedBefore).toBeDefined()

      await removeCollabYdoc(storageAdapter, mockWorkspaceIds, [doc], ctx)

      const loadedAfter = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc)
      expect(loadedAfter).toBeUndefined()
    })

    it('should remove multiple documents', async () => {
      const doc1 = createMockCollaborativeDoc('remove-test-1')
      const doc2 = createMockCollaborativeDoc('remove-test-2')
      const doc3 = createMockCollaborativeDoc('remove-test-3')

      const ydoc = new YDoc()
      await saveCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc1, ydoc)
      await saveCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc2, ydoc)
      await saveCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc3, ydoc)

      await removeCollabYdoc(storageAdapter, mockWorkspaceIds, [doc1, doc2, doc3], ctx)

      expect(await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc1)).toBeUndefined()
      expect(await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc2)).toBeUndefined()
      expect(await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc3)).toBeUndefined()
    })

    it('should handle empty array', async () => {
      await expect(removeCollabYdoc(storageAdapter, mockWorkspaceIds, [], ctx)).resolves.not.toThrow()
    })

    it('should not error on non-existent documents', async () => {
      const doc = createMockCollaborativeDoc('non-existent-doc')

      await expect(removeCollabYdoc(storageAdapter, mockWorkspaceIds, [doc], ctx)).resolves.not.toThrow()
    })
  })

  describe('loadCollabJson', () => {
    it('should load JSON markup from storage', async () => {
      const blobId = 'blob:json-test' as Ref<Blob>
      const markup = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}'
      const buffer = Buffer.from(markup)

      await storageAdapter.put(ctx, mockWorkspaceIds, blobId, buffer, 'application/json', buffer.length)

      const loadedMarkup = await loadCollabJson(ctx, storageAdapter, mockWorkspaceIds, blobId)

      expect(loadedMarkup).toBe(markup)
    })

    it('should return undefined for non-existent blob', async () => {
      const blobId = 'blob:non-existent' as Ref<Blob>
      const loadedMarkup = await loadCollabJson(ctx, storageAdapter, mockWorkspaceIds, blobId)

      expect(loadedMarkup).toBeUndefined()
    })

    it('should warn on invalid content type', async () => {
      const blobId = 'blob:invalid-type' as Ref<Blob>
      const markup = '{"type":"doc"}'
      const buffer = Buffer.from(markup)

      await storageAdapter.put(ctx, mockWorkspaceIds, blobId, buffer, 'text/plain', buffer.length)

      const loadedMarkup = await loadCollabJson(ctx, storageAdapter, mockWorkspaceIds, blobId)

      expect(loadedMarkup).toBe(markup)
      expect(ctx.warn).toHaveBeenCalledWith('invalid content type', { contentType: 'text/plain' })
    })

    it('should handle empty JSON', async () => {
      const blobId = 'blob:empty-json' as Ref<Blob>
      const markup = ''
      const buffer = Buffer.from(markup)

      await storageAdapter.put(ctx, mockWorkspaceIds, blobId, buffer, 'application/json', buffer.length)

      const loadedMarkup = await loadCollabJson(ctx, storageAdapter, mockWorkspaceIds, blobId)

      expect(loadedMarkup).toBe('')
    })
  })

  describe('saveCollabJson', () => {
    it('should save markup string to storage', async () => {
      const doc = createMockCollaborativeDoc('json-save-test')
      const markup = '{"type":"doc","content":[]}'

      const blobId = await saveCollabJson(ctx, storageAdapter, mockWorkspaceIds, doc, markup)
      const loadedMarkup = await loadCollabJson(ctx, storageAdapter, mockWorkspaceIds, blobId)

      expect(loadedMarkup).toBe(markup)
    })

    it('should save YDoc as markup to storage', async () => {
      const doc = createMockCollaborativeDoc('ydoc-to-json-test')
      const ydoc = new YDoc()

      // Note: yDocToMarkup is mocked, so we're testing the flow not the actual conversion
      const blobId = await saveCollabJson(ctx, storageAdapter, mockWorkspaceIds, doc, ydoc)

      // Verify the blobId has the expected format
      expect(blobId).toContain('object:ydoc-to-json-test')
      expect(blobId).toContain('attr:test')

      const loadedMarkup = await loadCollabJson(ctx, storageAdapter, mockWorkspaceIds, blobId)
      expect(loadedMarkup).toBeDefined()
    })

    it('should overwrite existing JSON', async () => {
      const doc = createMockCollaborativeDoc('json-overwrite-test')

      const markup1 = '{"version":1}'
      await saveCollabJson(ctx, storageAdapter, mockWorkspaceIds, doc, markup1)

      const markup2 = '{"version":2}'
      await saveCollabJson(ctx, storageAdapter, mockWorkspaceIds, doc, markup2)

      const loadedMarkup = await loadCollabJson(ctx, storageAdapter, mockWorkspaceIds, makeCollabJsonId(doc))
      expect(loadedMarkup).toBe(markup2)
    })

    it('should handle empty markup', async () => {
      const doc = createMockCollaborativeDoc('empty-markup-test')
      const markup = ''

      const blobId = await saveCollabJson(ctx, storageAdapter, mockWorkspaceIds, doc, markup)

      const loadedMarkup = await loadCollabJson(ctx, storageAdapter, mockWorkspaceIds, blobId)
      expect(loadedMarkup).toBe('')
    })

    it('should handle complex JSON structures', async () => {
      const doc = createMockCollaborativeDoc('complex-json-test')
      const markup = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is ' },
              { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
              { type: 'text', text: ' text.' }
            ]
          }
        ]
      })

      const blobId = await saveCollabJson(ctx, storageAdapter, mockWorkspaceIds, doc, markup)

      const loadedMarkup = await loadCollabJson(ctx, storageAdapter, mockWorkspaceIds, blobId)
      expect(loadedMarkup).toBe(markup)
      expect(JSON.parse(loadedMarkup ?? '')).toEqual(JSON.parse(markup))
    })
  })

  describe('integration tests', () => {
    it('should handle round-trip save and load of YDoc', async () => {
      const doc = createMockCollaborativeDoc('round-trip-test')

      const originalYdoc = new YDoc()
      originalYdoc.getMap('meta').set('title', 'Test Document')
      originalYdoc.getArray('items').push(['a', 'b', 'c'])

      await saveCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc, originalYdoc)
      const loadedYdoc = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc)

      expect(loadedYdoc?.getMap('meta').get('title')).toBe('Test Document')
      expect(loadedYdoc?.getArray('items').toArray()).toEqual(['a', 'b', 'c'])
    })

    it('should handle independent YDoc and JSON storage', async () => {
      const doc = createMockCollaborativeDoc('independent-test')

      const ydoc = new YDoc()
      ydoc.getMap('data').set('type', 'ydoc')
      await saveCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc, ydoc)

      const markup = '{"type":"json"}'
      const jsonBlobId = await saveCollabJson(ctx, storageAdapter, mockWorkspaceIds, doc, markup)

      const loadedYdoc = await loadCollabYdoc(ctx, storageAdapter, mockWorkspaceIds, doc)
      const loadedMarkup = await loadCollabJson(ctx, storageAdapter, mockWorkspaceIds, jsonBlobId)

      expect(loadedYdoc?.getMap('data').get('type')).toBe('ydoc')
      expect(loadedMarkup).toBe(markup)
    })
  })
})
