//
// Copyright © 2026 TraceX SAS.
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

import core, { DOMAIN_TRANSIENT, SortingOrder, type Class, type Doc, type Ref } from '@hcengineering/core'
import { createInMemoryAdapter } from '../mem'
import { createInMemoryFixture } from './fixtures/mem'
import type { InMemoryFixture } from './fixtures/mem'

interface TestDocument extends Doc {
  name: string
  count: number
}

interface TestDocumentMixin extends TestDocument {
  note: string
}

const MISSING_ID = 'test:doc:Missing' as Ref<TestDocument>

describe('InMemoryAdapter', () => {
  let fixture: InMemoryFixture
  let documentClass: Ref<Class<TestDocument>>

  beforeEach(async () => {
    fixture = await createInMemoryFixture()
    documentClass = fixture.createClass<TestDocument>('Document')
  })

  describe('creation and isolation', () => {
    it('creates empty and independent storage for each adapter', async () => {
      const { adapter, ctx, hierarchy, workspace } = fixture
      expect(await adapter.findAll(ctx, documentClass, {})).toHaveLength(0)
      await fixture.createDoc(documentClass, { name: 'First', count: 1 })
      const other = await createInMemoryAdapter(ctx, hierarchy, '', workspace)

      expect(await other.findAll(ctx, documentClass, {})).toHaveLength(0)
      expect(await adapter.findAll(ctx, documentClass, {})).toHaveLength(1)
    })
  })

  describe('reading', () => {
    it('filters queries and preserves total counts when sorting and limiting results', async () => {
      const { adapter, ctx } = fixture
      await fixture.createDoc(documentClass, { name: 'First', count: 1 })
      const second = await fixture.createDoc(documentClass, { name: 'Second', count: 2 })

      const filtered = await adapter.findAll(ctx, documentClass, { count: { $gt: 1 } })
      expect(filtered.map((doc) => doc._id)).toEqual([second._id])
      expect(filtered.total).toBe(1)

      const limited = await adapter.findAll(
        ctx,
        documentClass,
        {},
        {
          sort: { count: SortingOrder.Descending },
          limit: 1
        }
      )
      expect(limited.map((doc) => doc._id)).toEqual([second._id])
      expect(limited.total).toBe(2)
    })

    it('returns an empty result for unmatched queries', async () => {
      const { adapter, ctx } = fixture
      await fixture.createDoc(documentClass, { name: 'First', count: 1 })

      const result = await adapter.findAll(ctx, documentClass, { _id: MISSING_ID })
      expect(result).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('returns query snapshots that cannot mutate stored documents', async () => {
      const { adapter, ctx } = fixture
      const document = await fixture.createDoc(documentClass, { name: 'First', count: 1 })
      const result = await adapter.findAll(ctx, documentClass, { _id: document._id })
      result[0].name = 'Changed outside storage'

      const stored = await adapter.findAll(ctx, documentClass, { _id: document._id })
      expect(stored[0].name).toBe('First')
    })

    it('loads requested IDs across document classes, skipping missing and duplicate IDs', async () => {
      const { adapter, ctx } = fixture
      const otherClass = fixture.createClass<TestDocument>('Other')
      const first = await fixture.createDoc(documentClass, { name: 'First', count: 1 })
      const second = await fixture.createDoc(otherClass, { name: 'Second', count: 2 })

      const loaded = await adapter.load(ctx, DOMAIN_TRANSIENT, [second._id, first._id, first._id, MISSING_ID])
      expect(loaded.map((doc) => doc._id)).toEqual([second._id, first._id])
      expect(await adapter.load(ctx, DOMAIN_TRANSIENT, [MISSING_ID])).toHaveLength(0)
      expect(await adapter.load(ctx, DOMAIN_TRANSIENT, [])).toHaveLength(0)
    })
  })

  describe('transactions', () => {
    it('stores created documents with their attributes and transaction metadata', async () => {
      const { adapter, ctx, factory } = fixture
      const tx = factory.createTxCreateDoc(
        documentClass,
        core.space.Space,
        { name: 'Created', count: 3 },
        undefined,
        1000
      )

      expect(await adapter.tx(ctx, tx)).toEqual([{}])
      const result = await adapter.findAll(ctx, documentClass, { _id: tx.objectId })
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        _id: tx.objectId,
        _class: documentClass,
        space: core.space.Space,
        name: 'Created',
        count: 3,
        createdOn: 1000,
        modifiedOn: 1000,
        createdBy: core.account.System,
        modifiedBy: core.account.System
      })
    })

    it('updates stored fields and returns the updated document when requested', async () => {
      const { adapter, ctx, factory } = fixture
      const document = await fixture.createDoc(documentClass, { name: 'Initial', count: 2 })

      const result = await adapter.tx(
        ctx,
        factory.createTxUpdateDoc(
          documentClass,
          document.space,
          document._id,
          { name: 'Updated', $inc: { count: 3 } },
          true,
          2000
        )
      )

      expect(result).toMatchObject([{ object: { name: 'Updated', count: 5, modifiedOn: 2000 } }])
      const stored = await adapter.findAll(ctx, documentClass, { _id: document._id })
      expect(stored[0]).toMatchObject({
        name: 'Updated',
        count: 5,
        modifiedOn: 2000,
        modifiedBy: core.account.System
      })
      expect(await adapter.findAll(ctx, documentClass, { name: 'Initial' })).toHaveLength(0)
    })

    it('applies document mixins and supports queries by mixin', async () => {
      const { adapter, ctx, factory, hierarchy } = fixture
      const mixin = fixture.createMixin<TestDocument, TestDocumentMixin>('Note', documentClass)
      fixture.createStringAttribute(mixin, 'note')
      const document = await fixture.createDoc(documentClass, { name: 'First', count: 1 })
      expect(await adapter.findAll(ctx, mixin, {})).toHaveLength(0)

      expect(
        await adapter.tx(
          ctx,
          factory.createTxMixin(document._id, documentClass, document.space, mixin, { note: 'Initial' })
        )
      ).toEqual([{}])
      await adapter.tx(
        ctx,
        factory.createTxMixin(document._id, documentClass, document.space, mixin, { note: 'Updated' })
      )

      const result = await adapter.findAll(ctx, mixin, { note: 'Updated' })
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ _id: document._id, name: 'First' })
      expect(hierarchy.as(result[0], mixin).note).toBe('Updated')
    })

    it('removes documents through transactions and clears inherited class indexes', async () => {
      const { adapter, ctx, factory } = fixture
      const removed = await fixture.createDoc(documentClass, { name: 'Removed', count: 1 })
      const retained = await fixture.createDoc(documentClass, { name: 'Retained', count: 2 })

      expect(await adapter.tx(ctx, factory.createTxRemoveDoc(documentClass, removed.space, removed._id))).toEqual([{}])

      expect(await adapter.load(ctx, DOMAIN_TRANSIENT, [removed._id])).toHaveLength(0)
      expect((await adapter.findAll(ctx, documentClass, {})).map((doc) => doc._id)).toEqual([retained._id])
      expect((await adapter.findAll(ctx, core.class.Doc, {})).map((doc) => doc._id)).toEqual([retained._id])
    })

    it('processes mixed create, update and remove transactions in order', async () => {
      const { adapter, ctx, factory } = fixture
      const create = factory.createTxCreateDoc(documentClass, core.space.Space, { name: 'New', count: 0 })

      const result = await adapter.tx(
        ctx,
        create,
        factory.createTxUpdateDoc(documentClass, create.objectSpace, create.objectId, { count: 1 }, true),
        factory.createTxRemoveDoc(documentClass, create.objectSpace, create.objectId)
      )

      expect(result).toMatchObject([{}, { object: { count: 1 } }, {}])
      expect(await adapter.load(ctx, DOMAIN_TRANSIENT, [create.objectId])).toHaveLength(0)
      expect(await adapter.findAll(ctx, documentClass, {})).toHaveLength(0)
    })

    it('accepts empty batches and update or remove transactions for missing documents', async () => {
      const { adapter, ctx, factory } = fixture
      expect(await adapter.tx(ctx)).toEqual([])
      expect(
        await adapter.tx(
          ctx,
          factory.createTxUpdateDoc(documentClass, core.space.Space, MISSING_ID, { name: 'Missing' }),
          factory.createTxRemoveDoc(documentClass, core.space.Space, MISSING_ID)
        )
      ).toEqual([{}, {}])
      expect(await adapter.findAll(ctx, documentClass, {})).toHaveLength(0)
    })

    it('does not execute conditional transactions that belong to the server pipeline', async () => {
      const { adapter, ctx, factory } = fixture
      const create = factory.createTxCreateDoc(documentClass, core.space.Space, { name: 'Conditional', count: 0 })

      expect(
        await adapter.tx(ctx, factory.createTxApplyIf(core.space.Space, undefined, [], [], [create], undefined))
      ).toEqual([])
      expect(await adapter.load(ctx, DOMAIN_TRANSIENT, [create.objectId])).toHaveLength(0)
    })
  })

  describe('broadcastOnly', () => {
    it('excludes all broadcast-only CUD transactions while storing mixed normal transactions', async () => {
      const { adapter, ctx, factory } = fixture
      const broadcastClass = fixture.createClass<TestDocument>('Broadcast')
      fixture.setBroadcastOnly(broadcastClass, true)
      const mixin = fixture.createMixin<TestDocument, TestDocumentMixin>('Note', broadcastClass)
      const document = await fixture.createDoc(documentClass, { name: 'Normal', count: 1 })
      const create = factory.createTxCreateDoc(broadcastClass, core.space.Space, { name: 'Broadcast', count: 0 })
      const update = factory.createTxUpdateDoc(broadcastClass, create.objectSpace, create.objectId, { count: 1 })
      const applyMixin = factory.createTxMixin(create.objectId, broadcastClass, create.objectSpace, mixin, {
        note: 'Broadcast'
      })
      const remove = factory.createTxRemoveDoc(broadcastClass, create.objectSpace, create.objectId)

      expect(await adapter.tx(ctx, create, update, applyMixin, remove)).toEqual([])
      expect(
        await adapter.tx(
          ctx,
          create,
          factory.createTxUpdateDoc(documentClass, document.space, document._id, { count: 4 })
        )
      ).toEqual([{}])
      expect(await adapter.load(ctx, DOMAIN_TRANSIENT, [create.objectId])).toHaveLength(0)
      const stored = await adapter.findAll(ctx, documentClass, { _id: document._id })
      expect(stored[0].count).toBe(4)
    })

    it('stores transactions when broadcastOnly is explicitly false', async () => {
      const { adapter, ctx, factory } = fixture
      fixture.setBroadcastOnly(documentClass, false)
      const create = factory.createTxCreateDoc(documentClass, core.space.Space, { name: 'Stored', count: 3 })

      expect(await adapter.tx(ctx, create)).toEqual([{}])
      const result = await adapter.findAll(ctx, documentClass, {})
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ _id: create.objectId, name: 'Stored' })
    })
  })

  describe('clean', () => {
    it('removes selected documents from ID lookups and class indexes while keeping other documents', async () => {
      const { adapter, ctx } = fixture
      const removed = await fixture.createDoc(documentClass, { name: 'Removed', count: 1 })
      const retained = await fixture.createDoc(documentClass, { name: 'Retained', count: 2 })
      expect(await adapter.load(ctx, DOMAIN_TRANSIENT, [removed._id])).toHaveLength(1)

      await adapter.clean(ctx, DOMAIN_TRANSIENT, [removed._id])

      expect(await adapter.load(ctx, DOMAIN_TRANSIENT, [removed._id])).toHaveLength(0)
      expect(await adapter.findAll(ctx, documentClass, { _id: removed._id })).toHaveLength(0)
      expect((await adapter.findAll(ctx, documentClass, {})).map((doc) => doc._id)).toEqual([retained._id])
      expect((await adapter.findAll(ctx, core.class.Doc, {})).map((doc) => doc._id)).toEqual([retained._id])
    })

    it('accepts missing IDs, duplicate IDs and repeated cleanup', async () => {
      const { adapter, ctx } = fixture
      const removed = await fixture.createDoc(documentClass, { name: 'Removed', count: 1 })
      const retained = await fixture.createDoc(documentClass, { name: 'Retained', count: 2 })

      await adapter.clean(ctx, DOMAIN_TRANSIENT, [MISSING_ID, removed._id, removed._id])
      await adapter.clean(ctx, DOMAIN_TRANSIENT, [removed._id])
      await adapter.clean(ctx, DOMAIN_TRANSIENT, [])

      expect(await adapter.load(ctx, DOMAIN_TRANSIENT, [removed._id])).toHaveLength(0)
      expect((await adapter.findAll(ctx, documentClass, {})).map((doc) => doc._id)).toEqual([retained._id])
    })

    it('cleans multiple IDs from different classes in one batch', async () => {
      const { adapter, ctx } = fixture
      const otherClass = fixture.createClass<TestDocument>('Other')
      const first = await fixture.createDoc(documentClass, { name: 'First', count: 1 })
      const second = await fixture.createDoc(otherClass, { name: 'Second', count: 2 })
      const retained = await fixture.createDoc(documentClass, { name: 'Retained', count: 3 })

      await adapter.clean(ctx, DOMAIN_TRANSIENT, [first._id, second._id])

      expect(await adapter.load(ctx, DOMAIN_TRANSIENT, [first._id, second._id])).toHaveLength(0)
      expect(await adapter.findAll(ctx, otherClass, {})).toHaveLength(0)
      expect((await adapter.findAll(ctx, core.class.Doc, {})).map((doc) => doc._id)).toEqual([retained._id])
    })

    it('clears subclass and ancestor indexes', async () => {
      const { adapter, ctx } = fixture
      const childClass = fixture.createClass<TestDocument>('Child', { extends: documentClass })
      const parent = await fixture.createDoc(documentClass, { name: 'Parent', count: 1 })
      const child = await fixture.createDoc(childClass, { name: 'Child', count: 2 })
      expect(await adapter.findAll(ctx, documentClass, {})).toHaveLength(2)

      await adapter.clean(ctx, DOMAIN_TRANSIENT, [child._id])

      expect(await adapter.findAll(ctx, childClass, {})).toHaveLength(0)
      expect((await adapter.findAll(ctx, documentClass, {})).map((doc) => doc._id)).toEqual([parent._id])
      expect((await adapter.findAll(ctx, core.class.Doc, {})).map((doc) => doc._id)).toEqual([parent._id])
    })

    it('removes documents from mixin queries', async () => {
      const { adapter, ctx, factory } = fixture
      const mixin = fixture.createMixin<TestDocument, TestDocumentMixin>('Note', documentClass)
      const removed = await fixture.createDoc(documentClass, { name: 'Removed', count: 1 })
      const retained = await fixture.createDoc(documentClass, { name: 'Retained', count: 2 })
      await adapter.tx(
        ctx,
        factory.createTxMixin(removed._id, documentClass, removed.space, mixin, { note: 'Removed' })
      )
      expect(await adapter.findAll(ctx, mixin, {})).toHaveLength(1)

      await adapter.clean(ctx, DOMAIN_TRANSIENT, [removed._id])

      expect(await adapter.findAll(ctx, mixin, {})).toHaveLength(0)
      expect((await adapter.findAll(ctx, documentClass, {})).map((doc) => doc._id)).toEqual([retained._id])
    })

    it('can recreate a cleaned ID in another class without leaving old index entries', async () => {
      const { adapter, ctx } = fixture
      const otherClass = fixture.createClass<TestDocument>('Other')
      const removed = await fixture.createDoc(documentClass, { name: 'Removed', count: 1 })
      const retained = await fixture.createDoc(documentClass, { name: 'Retained', count: 2 })
      await adapter.clean(ctx, DOMAIN_TRANSIENT, [removed._id])
      const recreated = await fixture.createDoc(otherClass, { name: 'Recreated', count: 10 }, { id: removed._id })

      expect(await adapter.findAll(ctx, documentClass, { _id: removed._id })).toHaveLength(0)
      expect((await adapter.findAll(ctx, documentClass, {})).map((doc) => doc._id)).toEqual([retained._id])
      const result = await adapter.findAll(ctx, otherClass, {})
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ _id: recreated._id, name: 'Recreated' })
      expect(await adapter.findAll(ctx, core.class.Doc, {})).toHaveLength(2)
    })
  })
})
