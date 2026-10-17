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

import core, { type Class, type Doc, DOMAIN_TX, type Ref, type Tx, TxFactory } from '@hcengineering/core'
import { ModelMiddleware } from '../../model'
import { bench, describeBench } from './bench'
import { createHarness, genCoreModel, makeNextMiddleware } from './harness'

const factory = new TxFactory(core.account.System)

// Same predicate as ModelMiddleware uses to keep account txs out of the model.
const isAccountTx = (it: Tx): boolean =>
  (it as any).objectClass === 'core:class:Account' || (it as any).objectClass === 'contact:class:PersonAccount'

/**
 * A big workspace model: thousands of user txs, like a long-lived project workspace.
 */
function makeUserTx (n: number): Tx[] {
  const docClass = 'bench:class:Item' as Ref<Class<Doc>>
  const res: Tx[] = []
  for (let i = 0; i < n; i++) {
    res.push(
      factory.createTxCreateDoc(
        docClass,
        'bench:space:S' as Ref<any>,
        { name: `item ${i}`, counter: i },
        `bench:doc:${i}` as Ref<Doc>
      )
    )
  }
  return res
}

describeBench('ModelMiddleware loadModel bench', () => {
  const N_USER = 10_000

  it('full loadModel: cached model (post-PR) vs fetch-per-call (pre-PR)', async () => {
    const userTx = makeUserTx(N_USER)
    const systemTx = genCoreModel().concat([
      factory.createTxCreateDoc(
        core.class.Class,
        core.space.Model,
        { label: 'Item', extends: core.class.Doc, kind: 'CLASS' as any, domain: 'bench' } as any,
        'bench:class:Item' as Ref<Class<Doc>>
      )
    ])

    const harness = createHarness()
    const adapter = (harness.pipelineContext.adapterManager as any).getAdapter(DOMAIN_TX, true)
    // The real pg adapter reads the whole tx domain and deserializes every row; JSON.parse models
    // that per-call cost. Network latency is not modeled, so the measured gap is conservative.
    const serialized = JSON.stringify(userTx)
    adapter.getModel = async (): Promise<Tx[]> => JSON.parse(serialized)

    const middleware = (await ModelMiddleware.doCreate(
      harness.ctx,
      harness.pipelineContext,
      makeNextMiddleware(harness),
      systemTx
    )) as ModelMiddleware

    // Pre-PR loadModel: a full model fetch + filter + concat on every single call.
    const legacy = async (): Promise<void> => {
      const fetched = ((await adapter.getModel(harness.ctx)) as Tx[]).filter((it) => !isAccountTx(it))
      void systemTx.concat(fetched).filter((it) => it.modifiedOn > 0)
    }
    // Post-PR loadModel: the model is fetched once and concats are served from the cache.
    const optimized = async (): Promise<void> => {
      void (await middleware.loadModel(harness.ctx, 0))
    }

    const rLegacy = await bench(`loadModel pre-PR (fetch per call, ${N_USER} user txs)`, legacy, { budgetMs: 2000 })
    const rOpt = await bench(`loadModel post-PR (cached model, ${N_USER} user txs)`, optimized, { budgetMs: 2000 })

    console.log(`\nspeedup on full loadModel: ${(rLegacy.meanUs / rOpt.meanUs).toFixed(1)}x`)

    // Loose guard against regressions on loaded CI machines.
    expect(rOpt.meanUs).toBeLessThan(rLegacy.meanUs / 5)

    // Worst case: the evictor drops the cache before every call. That degrades exactly to the
    // pre-PR behaviour and must never be worse than it.
    const evicted = async (): Promise<void> => {
      ModelMiddleware.evictExpired(Date.now() + ModelMiddleware.modelCacheTtl + 1)
      await optimized()
    }
    const rEvicted = await bench(`loadModel post-PR (evicted every call, ${N_USER} user txs)`, evicted, {
      budgetMs: 2000
    })
    console.log(`evict-every-call vs pre-PR: ${(rLegacy.meanUs / rEvicted.meanUs).toFixed(2)}x`)
    expect(rEvicted.meanUs).toBeLessThan(rLegacy.meanUs * 1.5)

    await middleware.close()
  })

  it('evictor sweep cost across many pipelines', async () => {
    const systemTx = genCoreModel()
    const harness = createHarness()
    const adapter = (harness.pipelineContext.adapterManager as any).getAdapter(DOMAIN_TX, true)
    adapter.getModel = async (): Promise<Tx[]> => []

    const N_PIPELINES = 1000
    const mws: ModelMiddleware[] = []
    for (let i = 0; i < N_PIPELINES; i++) {
      mws.push(
        (await ModelMiddleware.doCreate(
          harness.ctx,
          harness.pipelineContext,
          makeNextMiddleware(harness),
          systemTx
        )) as ModelMiddleware
      )
    }

    // What the once-a-minute timer actually costs with every cache still fresh.
    const r = await bench(`evictExpired sweep (${N_PIPELINES} pipelines, none expired)`, () => {
      ModelMiddleware.evictExpired()
    })
    console.log(`per-pipeline sweep cost: ${((r.meanUs * 1000) / N_PIPELINES).toFixed(1)} ns`)

    for (const m of mws) {
      await m.close()
    }
  })

  it('cache footprint: what a cached workspace model retains per pipeline', () => {
    // The price of the cache, and so what the evictor gives back on an idle pipeline.
    const serialized = JSON.stringify(makeUserTx(N_USER))
    const mb = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(1)
    let heap = 'n/a (run jest with --expose-gc)'
    if (global.gc != null) {
      global.gc()
      const before = process.memoryUsage().heapUsed
      const held = JSON.parse(serialized) as Tx[]
      global.gc()
      heap = `${mb(process.memoryUsage().heapUsed - before)}MB`
      expect(held.length).toBe(N_USER)
    }
    console.log(`cached model of ${N_USER} txs: ${mb(serialized.length)}MB serialized, retained heap ${heap}`)
    expect(serialized.length).toBeGreaterThan(0)
  })
})
