/* eslint-disable @typescript-eslint/unbound-method */
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
  type AttachedDoc,
  type Class,
  type Doc,
  type Hierarchy,
  type LowLevelStorage,
  type MeasureContext,
  type Ref,
  type Space,
  type TxOperations
} from '@hcengineering/core'
import productsPlugin, { ProductVersionState, type Product, type ProductVersion } from '@hcengineering/products'

import { createProductVersionHandler } from '../handlers/product-version-handler'
import { DocumentExporter } from '../workspace/document-exporter'
import { type CustomExportHandler, type CustomExportHandlerContext, type ExportState } from '../workspace/types'
import { type DataMapper } from '../workspace/data-mapper'
import { type RelationExporter } from '../workspace/relation-exporter'
import { type SpaceExporter } from '../workspace/space-exporter'
import { type AttachmentExporter } from '../workspace/attachment-exporter'

const sourceProductId = 'test:product:source-A' as Ref<Product>
const otherSourceProductId = 'test:product:source-B' as Ref<Product>
const targetProductIdA = 'test:product:target-A' as Ref<Product>
const targetProductIdB = 'test:product:target-B' as Ref<Product>

function makeContext (): MeasureContext {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  } as unknown as MeasureContext
}

function makeState (): ExportState {
  return {
    idMapping: new Map(),
    spaceMapping: new Map(),
    processingDocs: new Set(),
    uniqueFieldValues: new Map()
  }
}

function productVersion (id: string, space: Ref<Product>, extras: Partial<ProductVersion> = {}): ProductVersion {
  const base: ProductVersion = {
    _id: id as Ref<ProductVersion>,
    _class: productsPlugin.class.ProductVersion,
    space,
    name: '1.0.0',
    readonly: false,
    major: 1,
    minor: 0,
    patch: 0,
    description: '',
    state: ProductVersionState.Active,
    parent: productsPlugin.ids.NoParentVersion,
    modifiedOn: 0,
    modifiedBy: 'test:account:user' as any
  }
  return { ...base, ...extras }
}

/**
 * Tiny in-memory TxOperations stub. Only implements findOne/createDoc and
 * getHierarchy() — the handler does not call anything else.
 */
function makeTargetClient (existing: ProductVersion[] = []): {
  client: TxOperations
  created: ProductVersion[]
} {
  const docs: ProductVersion[] = [...existing]
  const created: ProductVersion[] = []

  const client = {
    findOne: jest.fn(async <T extends Doc>(classRef: Ref<Class<T>>, query: any): Promise<T | undefined> => {
      for (const d of docs) {
        if (d._class !== classRef) continue
        let ok = true
        for (const [k, v] of Object.entries(query)) {
          if ((d as any)[k] !== v) {
            ok = false
            break
          }
        }
        if (ok) return d as unknown as T
      }
      return undefined
    }),
    createDoc: jest.fn(
      async (
        classRef: Ref<Class<Doc>>,
        space: Ref<Space>,
        data: Record<string, any>,
        id: Ref<Doc>
      ): Promise<Ref<Doc>> => {
        const doc = { _id: id, _class: classRef, space, ...data } as unknown as ProductVersion
        docs.push(doc)
        created.push(doc)
        return id
      }
    ),
    addCollection: jest.fn(),
    updateDoc: jest.fn(),
    findAll: jest.fn(async () => []),
    getHierarchy: jest.fn(() => makeTargetHierarchy())
  } as unknown as TxOperations

  return { client, created }
}

function makeTargetHierarchy (): Hierarchy {
  return {
    isDerived: jest.fn((cls: Ref<Class<Doc>>, base: Ref<Class<Doc>>) => cls === base),
    findDomain: jest.fn(() => 'domain:products'),
    getAllAttributes: jest.fn(() => new Map()),
    isMixin: jest.fn(() => false),
    hasMixin: jest.fn(() => undefined),
    getClass: jest.fn(() => ({ label: 'ProductVersion' }))
  } as unknown as Hierarchy
}

/**
 * Build the ctx object the handler's resolve() receives. The spaceExporter
 * stub maps source Product ids onto preconfigured target Product ids so we
 * can assert dedup happens after space mapping.
 */
function makeHandlerCtx (
  targetClient: TxOperations,
  spaceMap: Record<string, Ref<Product>>
): {
    ctx: CustomExportHandlerContext
    spaceExporter: { getOrCreateTargetSpace: jest.Mock }
  } {
  const spaceExporter = {
    getOrCreateTargetSpace: jest.fn(async (sourceSpaceId: Ref<Space>) => {
      const target = spaceMap[sourceSpaceId as unknown as string]
      if (target === undefined) {
        throw new Error(`no target mapping for source space ${sourceSpaceId}`)
      }
      return target
    })
  }

  const ctx: CustomExportHandlerContext = {
    context: makeContext(),
    targetClient,
    state: makeState(),
    spaceExporter,
    sourceHierarchy: {} as unknown as Hierarchy,
    sourceLowLevel: {} as unknown as LowLevelStorage
  }
  return { ctx, spaceExporter }
}

describe('createProductVersionHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a new 1.0.0 ProductVersion when none exists in the target Product', async () => {
    const { client, created } = makeTargetClient()
    const { ctx, spaceExporter } = makeHandlerCtx(client, { [sourceProductId]: targetProductIdA })
    const handler = createProductVersionHandler()

    const sourceVersion = productVersion('test:version:s1', sourceProductId, {
      major: 3,
      minor: 7,
      patch: 2,
      state: ProductVersionState.Released
    })

    const targetId = await handler.resolve(sourceVersion, ctx)

    expect(targetId).toBeDefined()
    expect(spaceExporter.getOrCreateTargetSpace).toHaveBeenCalledWith(
      sourceProductId,
      ctx.sourceHierarchy,
      ctx.sourceLowLevel
    )
    expect(client.findOne).toHaveBeenCalledWith(productsPlugin.class.ProductVersion, {
      space: targetProductIdA,
      major: 1,
      minor: 0,
      patch: 0
    })
    expect(client.createDoc).toHaveBeenCalledTimes(1)
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({
      _class: productsPlugin.class.ProductVersion,
      space: targetProductIdA,
      name: '1.0.0',
      major: 1,
      minor: 0,
      patch: 0,
      state: ProductVersionState.Active,
      readonly: false,
      parent: productsPlugin.ids.NoParentVersion
    })
    expect(targetId).toEqual(created[0]._id)
  })

  it('reuses an existing 1.0.0 ProductVersion in the target Product without creating a new one', async () => {
    const existing = productVersion('test:version:existing', targetProductIdA)
    const { client, created } = makeTargetClient([existing])
    const { ctx } = makeHandlerCtx(client, { [sourceProductId]: targetProductIdA })
    const handler = createProductVersionHandler()

    const sourceVersion = productVersion('test:version:s1', sourceProductId, { major: 2, minor: 5, patch: 1 })

    const targetId = await handler.resolve(sourceVersion, ctx)

    expect(targetId).toEqual(existing._id)
    expect(client.createDoc).not.toHaveBeenCalled()
    expect(created).toHaveLength(0)
  })

  it('caches the target version across multiple source versions of the same Product', async () => {
    const { client, created } = makeTargetClient()
    const { ctx, spaceExporter } = makeHandlerCtx(client, { [sourceProductId]: targetProductIdA })
    const handler = createProductVersionHandler()

    const v1 = productVersion('test:version:s1', sourceProductId, { major: 1 })
    const v2 = productVersion('test:version:s2', sourceProductId, { major: 2 })
    const v3 = productVersion('test:version:s3', sourceProductId, { major: 3 })

    const t1 = await handler.resolve(v1, ctx)
    const t2 = await handler.resolve(v2, ctx)
    const t3 = await handler.resolve(v3, ctx)

    // All three source versions collapse onto the single target id.
    expect(t1).toEqual(t2)
    expect(t2).toEqual(t3)
    // findOne and createDoc happen exactly once across all source versions.
    expect(client.findOne).toHaveBeenCalledTimes(1)
    expect(client.createDoc).toHaveBeenCalledTimes(1)
    expect(created).toHaveLength(1)
    // The space exporter is still queried for each source version (it has its
    // own cache via state.spaceMapping in the real implementation).
    expect(spaceExporter.getOrCreateTargetSpace).toHaveBeenCalledTimes(3)
  })

  it('creates a separate 1.0.0 per distinct target Product', async () => {
    const { client, created } = makeTargetClient()
    const { ctx } = makeHandlerCtx(client, {
      [sourceProductId]: targetProductIdA,
      [otherSourceProductId]: targetProductIdB
    })
    const handler = createProductVersionHandler()

    const va = productVersion('test:version:a', sourceProductId)
    const vb = productVersion('test:version:b', otherSourceProductId)

    const ta = await handler.resolve(va, ctx)
    const tb = await handler.resolve(vb, ctx)

    expect(ta).not.toEqual(tb)
    expect(client.createDoc).toHaveBeenCalledTimes(2)
    expect(created).toHaveLength(2)
    expect(created[0].space).toEqual(targetProductIdA)
    expect(created[1].space).toEqual(targetProductIdB)
  })

  it('exposes ProductVersion as the matched class', () => {
    const handler = createProductVersionHandler()
    expect(handler.class).toEqual(productsPlugin.class.ProductVersion)
  })
})

describe('DocumentExporter custom handler dispatch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('short-circuits ProductVersion export through the registered handler and records idMapping', async () => {
    const state = makeState()
    const context = makeContext()

    const fakeTargetVersionId = 'test:version:target-fixed' as Ref<ProductVersion>

    // Hand-rolled handler so the test does not depend on real createDoc behavior.
    const handler: CustomExportHandler<ProductVersion> = {
      class: productsPlugin.class.ProductVersion,
      resolve: jest.fn(async () => fakeTargetVersionId)
    }

    const targetClient = {
      getHierarchy: () => ({
        isDerived: (cls: Ref<Class<Doc>>, base: Ref<Class<Doc>>) =>
          cls === base || (cls === productsPlugin.class.ProductVersion && base === productsPlugin.class.ProductVersion)
      })
    } as unknown as TxOperations

    const spaceExporter = {
      getOrCreateTargetSpace: jest.fn()
    } as unknown as SpaceExporter

    // These should never be invoked when the handler short-circuits.
    const dataMapper = { prepareDocumentData: jest.fn() } as unknown as DataMapper
    const attachmentExporter = {
      exportAttachments: jest.fn(),
      exportCollaborativeContent: jest.fn()
    } as unknown as AttachmentExporter
    const relationExporter = {
      exportForwardRelations: jest.fn(),
      exportInverseRelations: jest.fn(),
      exportAllRelations: jest.fn()
    } as unknown as RelationExporter

    const exporter = new DocumentExporter(context, targetClient, state, dataMapper, spaceExporter, attachmentExporter)
    exporter.setRelationExporter(relationExporter)
    exporter.setCustomHandlers([handler as unknown as CustomExportHandler])

    const sourceVersion = productVersion('test:version:source-from-doc-exporter', sourceProductId)

    const result = await exporter.exportDocument(
      sourceVersion,
      'duplicate',
      true,
      {} as unknown as Hierarchy,
      {} as unknown as LowLevelStorage,
      new Map(),
      []
    )

    expect(result).toBe(true)
    expect(handler.resolve).toHaveBeenCalledTimes(1)
    expect(state.idMapping.get(sourceVersion._id as Ref<Doc>)).toEqual(fakeTargetVersionId)
    // The default flow's createDoc/dataMapper/relations paths must not run.
    expect(dataMapper.prepareDocumentData).not.toHaveBeenCalled()
    expect(spaceExporter.getOrCreateTargetSpace).not.toHaveBeenCalled()
    expect(relationExporter.exportForwardRelations).not.toHaveBeenCalled()
    expect(relationExporter.exportInverseRelations).not.toHaveBeenCalled()
  })

  it('falls through to the default flow when no handler matches the doc class', async () => {
    const state = makeState()
    const context = makeContext()

    const handler: CustomExportHandler<ProductVersion> = {
      class: productsPlugin.class.ProductVersion,
      resolve: jest.fn(async () => 'should-not-be-used' as Ref<Doc>)
    }

    const targetClient = {
      getHierarchy: () => ({
        isDerived: (_cls: Ref<Class<Doc>>, _base: Ref<Class<Doc>>) => false
      })
    } as unknown as TxOperations

    const spaceExporter = {
      getOrCreateTargetSpace: jest.fn(async () => 'test:target:space' as Ref<Space>)
    } as unknown as SpaceExporter

    const dataMapper = { prepareDocumentData: jest.fn(async () => ({})) } as unknown as DataMapper
    const attachmentExporter = {
      exportAttachments: jest.fn(),
      exportCollaborativeContent: jest.fn()
    } as unknown as AttachmentExporter
    const relationExporter = {
      exportForwardRelations: jest.fn(),
      exportInverseRelations: jest.fn(),
      exportAllRelations: jest.fn()
    } as unknown as RelationExporter

    // Provide a target client with the createDoc stub the default flow uses.
    ;(targetClient as any).createDoc = jest.fn(async () => 'test:doc:created' as Ref<Doc>)
    ;(targetClient as any).addCollection = jest.fn(async () => 'test:doc:attached' as Ref<AttachedDoc>)

    const exporter = new DocumentExporter(context, targetClient, state, dataMapper, spaceExporter, attachmentExporter)
    exporter.setRelationExporter(relationExporter)
    exporter.setCustomHandlers([handler as unknown as CustomExportHandler])

    const unrelatedClass = 'test:class:Unrelated' as Ref<Class<Doc>>
    const unrelatedDoc: Doc = {
      _id: 'test:doc:unrelated' as Ref<Doc>,
      _class: unrelatedClass,
      space: 'test:source:space' as Ref<Space>,
      modifiedOn: 0,
      modifiedBy: 'test:account:user' as any
    }

    const sourceHierarchy = {
      isDerived: jest.fn(() => false),
      findDomain: jest.fn(() => 'domain:test'),
      getAllAttributes: jest.fn(() => new Map())
    } as unknown as Hierarchy
    const sourceLowLevel = {
      rawFindAll: jest.fn(async () => [])
    } as unknown as LowLevelStorage

    const result = await exporter.exportDocument(
      unrelatedDoc,
      'duplicate',
      true,
      sourceHierarchy,
      sourceLowLevel,
      new Map(),
      []
    )

    expect(result).toBe(true)
    expect(handler.resolve).not.toHaveBeenCalled()
    // Default flow ran: space exporter, data mapper, and createDoc were invoked.
    expect(spaceExporter.getOrCreateTargetSpace).toHaveBeenCalledTimes(1)
    expect(dataMapper.prepareDocumentData).toHaveBeenCalledTimes(1)
    expect((targetClient as any).createDoc).toHaveBeenCalledTimes(1)
  })
})
