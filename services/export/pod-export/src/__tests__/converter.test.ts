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

import {
  type Class,
  type Client,
  type Doc,
  type Hierarchy,
  type MarkupBlobRef,
  type MeasureContext,
  type Ref,
  type WorkspaceIds
} from '@hcengineering/core'
import { type StorageAdapter } from '@hcengineering/server-core'
import { Buffer } from 'buffer'
import { UnifiedConverter } from '../converter'

// isId requires a 24-character hex string
const refA = '6763a1b2c3d4e5f601234567' as Ref<Doc>
const refB = '6763a1b2c3d4e5f601234568' as Ref<Doc>
const targetClass = 'test:class:Target' as Ref<Class<Doc>>
const abstractClass = 'core:class:Doc' as Ref<Class<Doc>>

function createMockMeasureContext (): MeasureContext {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    newChild: jest.fn(),
    with: jest.fn(),
    withSync: jest.fn(),
    measure: jest.fn(),
    end: jest.fn()
  } as unknown as MeasureContext
}

function createMockHierarchy (): Hierarchy {
  return {
    getAllAttributes: jest.fn(() => new Map()),
    isMixin: jest.fn(() => false),
    hasMixin: jest.fn(() => false),
    isDerived: jest.fn(() => true),
    getBaseClass: jest.fn((c: any) => c),
    findDomain: jest.fn(() => 'test-domain'),
    getClass: jest.fn(),
    findAttribute: jest.fn()
  } as unknown as Hierarchy
}

function createMockClient (hierarchy: Hierarchy): Client {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    getHierarchy: jest.fn(() => hierarchy)
  } as unknown as Client
}

function createMockStorageAdapter (): StorageAdapter {
  return {
    read: jest.fn(),
    stat: jest.fn(),
    put: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn()
  } as unknown as StorageAdapter
}

describe('UnifiedConverter', () => {
  let context: MeasureContext
  let hierarchy: Hierarchy
  let client: Client
  let storage: StorageAdapter
  let wsIds: WorkspaceIds
  let converter: UnifiedConverter

  beforeEach(() => {
    jest.clearAllMocks()
    context = createMockMeasureContext()
    hierarchy = createMockHierarchy()
    client = createMockClient(hierarchy)
    storage = createMockStorageAdapter()
    wsIds = { uuid: 'test-ws' as any, url: 'ws://test' }
    converter = new UnifiedConverter(context, client, storage, wsIds)
  })

  describe('resolveReference', () => {
    it('should return raw ref for abstract classes without domain instead of querying', async () => {
      ;(hierarchy.findDomain as jest.Mock).mockReturnValue(undefined)

      const result = await (converter as any).resolveReference(refA, abstractClass)

      expect(result).toBe(refA)
      // Must not attempt findAll: abstract classes have no domain and the query would fail
      expect(client.findAll).not.toHaveBeenCalled()
      expect(context.error).not.toHaveBeenCalled()
      expect(context.warn).not.toHaveBeenCalled()
    })

    it('should resolve a reference to a meaningful identifier', async () => {
      const doc = { _id: refA, _class: targetClass, identifier: 'TSK-1' }
      ;(client.findAll as jest.Mock)
        .mockResolvedValueOnce([{ _id: refA }]) // ids query
        .mockResolvedValueOnce([doc]) // batch query

      const result = await (converter as any).resolveReference(refA, targetClass)

      expect(result).toBe('TSK-1')
    })

    it('should warn only once per missing reference', async () => {
      ;(client.findAll as jest.Mock).mockResolvedValue([])

      const first = await (converter as any).resolveReference(refA, targetClass)
      const second = await (converter as any).resolveReference(refA, targetClass)

      expect(first).toBe(refA)
      expect(second).toBe(refA)
      const warns = (context.warn as jest.Mock).mock.calls.filter((c) => String(c[0]).includes(refA))
      expect(warns).toHaveLength(1)
    })

    it('should not retry cache loading after a failure and should log the failure once', async () => {
      ;(client.findAll as jest.Mock).mockRejectedValue(new Error('domain not found: core:class:Doc '))

      const first = await (converter as any).resolveReference(refA, targetClass)
      const second = await (converter as any).resolveReference(refB, targetClass)

      // References are kept as-is, export continues
      expect(first).toBe(refA)
      expect(second).toBe(refB)

      // The failed query must not be retried for every reference
      expect(client.findAll).toHaveBeenCalledTimes(1)

      // Cache load failure is logged once
      const cacheErrors = (context.error as jest.Mock).mock.calls.filter((c) =>
        String(c[0]).includes('Failed to load document cache')
      )
      expect(cacheErrors).toHaveLength(1)

      // No 'Failed to resolve reference' spam per each reference
      const refErrors = (context.error as jest.Mock).mock.calls.filter((c) =>
        String(c[0]).includes('Failed to resolve reference')
      )
      expect(refErrors).toHaveLength(0)
    })

    it('should return non-id values as-is', async () => {
      const result = await (converter as any).resolveReference('not-an-id', targetClass)

      expect(result).toBe('not-an-id')
      expect(client.findAll).not.toHaveBeenCalled()
    })
  })

  describe('resolveMarkdown', () => {
    const blobRef = 'blob-description-1' as MarkupBlobRef

    it('should return markup content when blob exists', async () => {
      ;(storage.stat as jest.Mock).mockResolvedValue({ size: 4, contentType: 'application/json' })
      ;(storage.read as jest.Mock).mockResolvedValue([Buffer.from('test')])

      const result = await (converter as any).resolveMarkdown(blobRef)

      expect(result).toBe('test')
      expect(context.warn).not.toHaveBeenCalled()
      expect(context.error).not.toHaveBeenCalled()
    })

    it('should warn and return empty string when blob does not exist (stat undefined)', async () => {
      ;(storage.stat as jest.Mock).mockResolvedValue(undefined)

      const result = await (converter as any).resolveMarkdown(blobRef)

      expect(result).toBe('')
      expect(storage.read).not.toHaveBeenCalled()
      expect(context.warn).toHaveBeenCalledWith(expect.stringContaining(`Blob not found: ${blobRef}`))
      expect(context.error).not.toHaveBeenCalled()
    })

    it('should treat "missing" read errors as warnings, not export errors', async () => {
      ;(storage.stat as jest.Mock).mockResolvedValue({ size: 4, contentType: 'application/json' })
      ;(storage.read as jest.Mock).mockRejectedValue(new Error(`uuid=x dataId=y missing ${blobRef}`))

      const result = await (converter as any).resolveMarkdown(blobRef)

      expect(result).toBe('')
      expect(context.warn).toHaveBeenCalledWith(expect.stringContaining(`Blob content not found: ${blobRef}`))
      expect(context.error).not.toHaveBeenCalled()
    })

    it('should warn only once per missing blob', async () => {
      ;(storage.stat as jest.Mock).mockResolvedValue(undefined)

      await (converter as any).resolveMarkdown(blobRef)
      await (converter as any).resolveMarkdown(blobRef)

      const warns = (context.warn as jest.Mock).mock.calls.filter((c) => String(c[0]).includes(blobRef))
      expect(warns).toHaveLength(1)
    })

    it('should log unexpected read errors as errors and return empty string', async () => {
      ;(storage.stat as jest.Mock).mockResolvedValue({ size: 4, contentType: 'application/json' })
      ;(storage.read as jest.Mock).mockRejectedValue(new Error('connection refused'))

      const result = await (converter as any).resolveMarkdown(blobRef)

      expect(result).toBe('')
      expect(context.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to resolve markup content: ${blobRef}`),
        expect.objectContaining({ error: 'connection refused' })
      )
    })
  })

  describe('resolveAttachments', () => {
    const docId = refA
    const docClass = 'test:class:Issue' as Ref<Class<Doc>>

    function mockAttachmentCache (): void {
      const att = {
        _id: refB,
        _class: 'attachment:class:Attachment' as Ref<Class<Doc>>,
        attachedTo: docId,
        attachedToClass: docClass,
        collection: 'attachments',
        name: 'file.txt',
        size: 4,
        type: 'text/plain',
        file: 'blob-file-1'
      }
      ;(client.findAll as jest.Mock)
        .mockResolvedValueOnce([{ _id: att._id }]) // ids query
        .mockResolvedValueOnce([att]) // batch query
    }

    it('should return empty buffer and warn when attachment read fails', async () => {
      mockAttachmentCache()
      ;(storage.read as jest.Mock).mockRejectedValue(new Error('missing blob-file-1'))

      const attachments = await (converter as any).resolveAttachments(docId, docClass)

      expect(attachments).toHaveLength(1)
      const data = await attachments[0].getData()

      expect(data).toEqual(Buffer.from([]))
      expect(context.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to read attachment: ${refB}`),
        expect.objectContaining({ error: 'missing blob-file-1' })
      )
    })

    it('should return attachment data when read succeeds', async () => {
      mockAttachmentCache()
      ;(storage.read as jest.Mock).mockResolvedValue([Buffer.from('test')])

      const attachments = await (converter as any).resolveAttachments(docId, docClass)
      const data = await attachments[0].getData()

      expect(data).toEqual(Buffer.from('test'))
      expect(context.warn).not.toHaveBeenCalled()
    })
  })
})
