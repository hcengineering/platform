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

import core, { DOMAIN_TRANSIENT, MeasureMetricsContext, TxFactory, TxProcessor, type Doc } from '@hcengineering/core'
import { DummyDbAdapter } from '../mem'

describe('DummyDbAdapter', () => {
  const ctx = new MeasureMetricsContext('test', {})
  const factory = new TxFactory(core.account.System)
  const tx = factory.createTxCreateDoc(core.class.Doc, core.space.Space, {})
  const doc = TxProcessor.createDoc2Doc(tx)

  it('ignores writes and returns empty query and aggregation results', async () => {
    const adapter = new DummyDbAdapter()
    expect(await adapter.tx(ctx, tx)).toEqual([])
    await adapter.upload(ctx, DOMAIN_TRANSIENT, [doc])
    await adapter.rawUpdate<Doc>(DOMAIN_TRANSIENT, { _id: doc._id }, { space: core.space.Model })
    await adapter.rawDeleteMany(DOMAIN_TRANSIENT, { _id: doc._id })
    await adapter.clean(ctx, DOMAIN_TRANSIENT, [doc._id])

    const result = await adapter.findAll(ctx, core.class.Doc, { _id: doc._id }, { limit: 1 })
    expect(result).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(await adapter.load(ctx, DOMAIN_TRANSIENT, [doc._id])).toEqual([])
    expect(await adapter.rawFindAll(DOMAIN_TRANSIENT, { _id: doc._id }, { limit: 1 })).toEqual([])
    expect(await adapter.groupBy<string, Doc>(ctx, DOMAIN_TRANSIENT, 'space', { _id: doc._id })).toEqual(new Map())
    expect(await adapter.getDomainHash(ctx, DOMAIN_TRANSIENT)).toBe('')
  })

  it('provides exhausted traversal, storage and raw iterators that can be closed', async () => {
    const adapter = new DummyDbAdapter()
    const iterator = await adapter.traverse(DOMAIN_TRANSIENT, {}, { limit: 1 })
    expect(await iterator.next(1)).toEqual([])
    await expect(iterator.close()).resolves.toBeUndefined()

    const storageIterator = adapter.find(ctx, DOMAIN_TRANSIENT)
    expect(await storageIterator.next(ctx)).toEqual([])
    await expect(storageIterator.close(ctx)).resolves.toBeUndefined()

    const rawIterator = adapter.rawFind(ctx, DOMAIN_TRANSIENT)
    expect(await rawIterator.find(ctx)).toEqual([])
    await expect(rawIterator.close()).resolves.toBeUndefined()
  })

  it('supports the lifecycle and domain helpers without creating indexes or domains', async () => {
    const adapter = new DummyDbAdapter()
    await adapter.init()
    await adapter.createIndexes(DOMAIN_TRANSIENT, { indexes: ['space'] })
    await adapter.removeOldIndex(DOMAIN_TRANSIENT, [], [])
    const helper = adapter.helper()

    await expect(helper.create(DOMAIN_TRANSIENT)).resolves.toBeUndefined()
    expect(await helper.exists(DOMAIN_TRANSIENT)).toBe(true)
    expect(await helper.listDomains()).toEqual(new Set())
    await expect(helper.createIndex(DOMAIN_TRANSIENT, 'space', { name: 'space_idx' })).resolves.toBeUndefined()
    await expect(helper.dropIndex(DOMAIN_TRANSIENT, 'space_idx')).resolves.toBeUndefined()
    expect(await helper.listIndexes(DOMAIN_TRANSIENT)).toEqual([])
    expect(await helper.estimatedCount(DOMAIN_TRANSIENT)).toBe(0)
    await expect(adapter.close()).resolves.toBeUndefined()
  })
})
