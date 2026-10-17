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

import core, {
  type AccountUuid,
  type Hierarchy,
  type Class,
  ClassifierKind,
  type Doc,
  type Domain,
  DOMAIN_TX,
  type Ref,
  type Space,
  type Tx,
  type TxCUD,
  TxFactory
} from '@hcengineering/core'
import type { IntlString } from '@hcengineering/platform'
import { ModelMiddleware } from '../model'
import { createHarness, genCoreModel, makeNextMiddleware, type BenchHarness } from './bench/harness'

const factory = new TxFactory(core.account.System)
const acc = 'bench-user' as AccountUuid
const itemClass = 'test:class:Item' as Ref<Class<Doc>>

function classTx (id: Ref<Class<Doc>>): Tx {
  return factory.createTxCreateDoc(
    core.class.Class,
    core.space.Model,
    { label: 'Item' as IntlString, extends: core.class.Doc, kind: ClassifierKind.CLASS, domain: 'test' as Domain },
    id
  )
}

function makeUserTx (n: number): Tx[] {
  const res: Tx[] = []
  for (let i = 0; i < n; i++) {
    res.push(
      factory.createTxCreateDoc(
        itemClass,
        'test:space:S' as Ref<Space>,
        { name: `item ${i}` } as any,
        `test:doc:${i}` as Ref<Doc>
      )
    )
  }
  return res
}

interface Fixture {
  harness: BenchHarness
  middleware: ModelMiddleware
  getModelCalls: () => number
  // What the adapter will return on the next fetch - lets a test simulate a write that landed
  // in the DB without going through `tx()` (migration, restore, another pod).
  setDbModel: (txes: Tx[]) => void
  // Blocks the next fetch until the returned resolver is called.
  blockNextFetch: () => () => void
}

/**
 * A harness whose tx adapter serves the workspace model from `getModel`, counting the calls -
 * that is the DB round-trip the model cache is supposed to amortize away.
 */
const created: ModelMiddleware[] = []

async function makeMiddleware (userTx: Tx[], filter?: (h: Hierarchy, model: Tx[]) => Tx[]): Promise<Fixture> {
  const harness = createHarness()
  const adapter = (harness.pipelineContext.adapterManager as any).getAdapter(DOMAIN_TX, true) as Record<string, any>
  let calls = 0
  let dbModel = userTx
  let gate: Promise<void> | undefined
  adapter.getModel = async (): Promise<Tx[]> => {
    calls++
    if (gate !== undefined) {
      const g = gate
      gate = undefined
      await g
    }
    // Model the deserialization cost of a real fetch - each call returns fresh objects.
    return JSON.parse(JSON.stringify(dbModel))
  }
  // core:class:Account has to exist in the hierarchy - ModelDb applies account txes too, it is
  // only the cached user model they are kept out of.
  const systemTx = genCoreModel().concat([classTx(itemClass), classTx('core:class:Account' as Ref<Class<Doc>>)])
  const middleware = (await ModelMiddleware.doCreate(
    harness.ctx,
    harness.pipelineContext,
    makeNextMiddleware(harness),
    systemTx,
    filter
  )) as ModelMiddleware
  created.push(middleware)
  return {
    harness,
    middleware,
    getModelCalls: () => calls,
    setDbModel: (txes: Tx[]) => {
      dbModel = txes
    },
    blockNextFetch: () => {
      let release: () => void = () => {}
      gate = new Promise<void>((resolve) => {
        release = resolve
      })
      return release
    }
  }
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// The evictor is idle-based, so tests drive it directly instead of waiting on the shared timer.
const evictAll = (): number => ModelMiddleware.evictExpired(Date.now() + ModelMiddleware.modelCacheTtl + 1)

describe('ModelMiddleware model cache', () => {
  const defaultTtl = ModelMiddleware.modelCacheTtl
  afterEach(async () => {
    // The evictor registry is static - leaking middlewares would make evictAll() count them.
    for (const m of created) {
      await m.close()
    }
    created.length = 0
    ModelMiddleware.modelCacheTtl = defaultTtl
  })

  it('should answer repeated full loadModel from the cache, fetching only once', async () => {
    const { harness, middleware, getModelCalls } = await makeMiddleware(makeUserTx(3))

    const r1 = (await middleware.loadModel(harness.ctx, 0)) as Tx[]
    const r2 = (await middleware.loadModel(harness.ctx, 0)) as Tx[]

    expect(r1.length).toBeGreaterThan(0)
    expect(r2).toEqual(r1)
    // One fetch, done in init and reused by both loadModel calls.
    expect(getModelCalls()).toBe(1)
  })

  it('should re-fetch the model after the evictor dropped an idle cache', async () => {
    const { harness, middleware, getModelCalls } = await makeMiddleware(makeUserTx(3))
    expect(getModelCalls()).toBe(1)

    expect(evictAll()).toBe(1)
    await middleware.loadModel(harness.ctx, 0)
    expect(getModelCalls()).toBe(2)

    // A fresh fetch re-primes the cache - the very next call is a hit again.
    await middleware.loadModel(harness.ctx, 0)
    expect(getModelCalls()).toBe(2)
  })

  it('should keep a cache that is still being used', async () => {
    const { harness, middleware } = await makeMiddleware(makeUserTx(3))

    await sleep(5)
    await middleware.loadModel(harness.ctx, 0) // refreshes last-access
    expect(ModelMiddleware.evictExpired(Date.now() + 1)).toBe(0)
  })

  it('should stop the shared timer once the last middleware is closed', async () => {
    const { middleware } = await makeMiddleware(makeUserTx(3))
    expect(evictAll()).toBe(1)
    await middleware.close()
    // Closed middlewares are no longer visited by the evictor.
    expect(evictAll()).toBe(0)
  })

  it('should pick up a model tx written behind our back once the cache is evicted', async () => {
    const userTx = makeUserTx(3)
    const { harness, middleware, setDbModel } = await makeMiddleware(userTx)

    const external = factory.createTxCreateDoc(
      itemClass,
      'test:space:S' as Ref<Space>,
      { name: 'written by a migration' } as any,
      'test:doc:external' as Ref<Doc>
    )
    setDbModel(userTx.concat([external]))

    expect(((await middleware.loadModel(harness.ctx, 0)) as Tx[]).some((it) => it._id === external._id)).toBe(false)
    evictAll()
    expect(((await middleware.loadModel(harness.ctx, 0)) as Tx[]).some((it) => it._id === external._id)).toBe(true)
  })

  it('should include a model tx applied via tx() without re-fetching', async () => {
    const { harness, middleware, getModelCalls } = await makeMiddleware(makeUserTx(3))
    const before = getModelCalls()

    const newClass = classTx('test:class:Item2' as Ref<Class<Doc>>)
    await middleware.tx(harness.ctx, [newClass])

    const model = (await middleware.loadModel(harness.ctx, 0)) as Tx[]
    expect(model.some((it) => it._id === newClass._id)).toBe(true)
    // The tx was pushed into the cached model, no extra fetch.
    expect(getModelCalls()).toBe(before)
  })

  it('should keep a model tx applied after the cache was evicted', async () => {
    const { harness, middleware, setDbModel } = await makeMiddleware(makeUserTx(3))
    evictAll()

    // The tx enters lastHash, but its DB write has not landed - the next fetch will not see it.
    const newClass = classTx('test:class:Item3' as Ref<Class<Doc>>)
    await middleware.tx(harness.ctx, [newClass])
    setDbModel(makeUserTx(3))

    const model = (await middleware.loadModel(harness.ctx, 0)) as Tx[]
    expect(model.some((it) => it._id === newClass._id)).toBe(true)
    // And it is not duplicated once the write does land.
    expect(model.filter((it) => it._id === newClass._id)).toHaveLength(1)
  })

  it('should not duplicate a re-applied tx that the fetch already returned', async () => {
    const { harness, middleware, setDbModel } = await makeMiddleware(makeUserTx(3))
    evictAll()

    const newClass = classTx('test:class:Item5' as Ref<Class<Doc>>)
    await middleware.tx(harness.ctx, [newClass])
    setDbModel(makeUserTx(3).concat([newClass]))

    const model = (await middleware.loadModel(harness.ctx, 0)) as Tx[]
    expect(model.filter((it) => it._id === newClass._id)).toHaveLength(1)
  })

  it('should fetch once for concurrent loadModels on an evicted cache', async () => {
    const { harness, middleware, getModelCalls, blockNextFetch } = await makeMiddleware(makeUserTx(3))
    evictAll()

    const release = blockNextFetch()
    const both = Promise.all([middleware.loadModel(harness.ctx, 0), middleware.loadModel(harness.ctx, 0)])
    release()
    const [a, b] = (await both) as Tx[][]

    expect(a).toEqual(b)
    expect(getModelCalls()).toBe(2) // init + a single shared re-fetch
  })

  it('should keep a model tx that landed while a re-fetch was in flight', async () => {
    const { harness, middleware, blockNextFetch } = await makeMiddleware(makeUserTx(3))
    evictAll()

    const release = blockNextFetch()
    const pending = middleware.loadModel(harness.ctx, 0)

    // The tx commits (and enters lastHash) while the re-fetch is still waiting on the DB.
    await sleep(1)
    const newClass = classTx('test:class:Item4' as Ref<Class<Doc>>)
    await middleware.tx(harness.ctx, [newClass])
    release()
    await pending

    const model = (await middleware.loadModel(harness.ctx, 0)) as Tx[]
    expect(model.some((it) => it._id === newClass._id)).toBe(true)
  })

  it('should not push account txs into the cached model', async () => {
    const { harness, middleware, getModelCalls } = await makeMiddleware(makeUserTx(3))
    const before = getModelCalls()

    const accountTx = {
      _id: 'test:tx:account',
      _class: core.class.TxCreateDoc,
      space: core.space.Model,
      objectSpace: core.space.Model,
      objectClass: 'core:class:Account',
      objectId: 'test:account',
      attributes: {},
      createdOn: 1,
      createdBy: acc,
      modifiedOn: 1,
      modifiedBy: acc
    } as unknown as TxCUD<Doc>
    await middleware.tx(harness.ctx, [accountTx as Tx])

    const model = (await middleware.loadModel(harness.ctx, 0)) as Tx[]
    expect(model.some((it) => it._id === 'test:tx:account')).toBe(false)
    expect(getModelCalls()).toBe(before)
  })

  it('should answer a matching hash with an empty model and never touch the cache', async () => {
    const { harness, middleware, getModelCalls } = await makeMiddleware(makeUserTx(3))
    evictAll()

    const res = (await middleware.loadModel(harness.ctx, 0, middleware.lastHash)) as {
      full: boolean
      hash: string
      transactions: Tx[]
    }
    expect(res.full).toBe(false)
    expect(res.transactions).toEqual([])
    // Cache is gone, but the hash-match path returns without re-fetching it.
    expect(getModelCalls()).toBe(1)
  })

  it('should not register a middleware whose init failed', async () => {
    const harness = createHarness()
    const adapter = (harness.pipelineContext.adapterManager as any).getAdapter(DOMAIN_TX, true)
    // A tx of an undeclared class makes modelDb.addTxes throw at the end of init.
    adapter.getModel = async (): Promise<Tx[]> => [
      factory.createTxCreateDoc(
        'test:class:Undeclared' as Ref<Class<Doc>>,
        core.space.Model,
        {} as any,
        'test:doc:broken' as Ref<Doc>
      )
    ]

    await expect(
      ModelMiddleware.doCreate(harness.ctx, harness.pipelineContext, makeNextMiddleware(harness), genCoreModel())
    ).rejects.toThrow()
    // Nothing was registered, so the evictor is not holding on to a dead pipeline.
    expect(evictAll()).toBe(0)
  })

  it('should serve exactly the model the hash was computed over when filtered', async () => {
    const keep = (_h: Hierarchy, model: Tx[]): Tx[] => model.filter((it) => (it as any).objectClass !== itemClass)
    const { harness, middleware } = await makeMiddleware(makeUserTx(3), keep)

    const before = middleware.lastHash
    // A tx the filter drops must move neither the hash nor the served model.
    await middleware.tx(harness.ctx, [
      factory.createTxCreateDoc(itemClass, core.space.Model, { name: 'x' } as any, 'test:doc:filtered' as Ref<Doc>)
    ])
    expect(middleware.lastHash).toBe(before)

    const model = (await middleware.loadModel(harness.ctx, 0)) as Tx[]
    expect(model.some((it) => (it as any).objectClass === itemClass)).toBe(false)
  })

  it('should bound the buffer of txs held while the cache is evicted', async () => {
    const { harness, middleware } = await makeMiddleware(makeUserTx(1))
    evictAll()

    const n = ModelMiddleware.maxRecentModelTx + 10
    for (let i = 0; i < n; i++) {
      await middleware.tx(harness.ctx, [classTx(`test:class:Bulk${i}` as Ref<Class<Doc>>)])
    }

    expect((middleware as any).recentModelTx).toHaveLength(ModelMiddleware.maxRecentModelTx)

    const model = (await middleware.loadModel(harness.ctx, 0)) as Tx[]
    // The newest txs survive; the oldest were already committed to the DB by then.
    const objectIds = new Set(model.map((it) => (it as any).objectId))
    expect(objectIds.has(`test:class:Bulk${n - 1}`)).toBe(true)
  })

  it('should answer a stale hash with the full cached model', async () => {
    const { harness, middleware, getModelCalls } = await makeMiddleware(makeUserTx(3))

    const res = (await middleware.loadModel(harness.ctx, 0, 'stale-hash')) as {
      full: boolean
      hash: string
      transactions: Tx[]
    }
    expect(res.full).toBe(true)
    expect(res.hash).toBe(middleware.lastHash)
    expect(res.transactions.length).toBeGreaterThan(0)
    expect(getModelCalls()).toBe(1)
  })
})
