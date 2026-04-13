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
  type DocumentQuery,
  Hierarchy,
  MeasureMetricsContext,
  ModelDb,
  type Ref,
  type Space,
  type WorkspaceUuid
} from '@hcengineering/core'
import { ConnectionMgr } from '@hcengineering/postgres-base'
import { PostgresAdapter } from '../storage'
import { genMinModel, test, type ComplexClass } from './minmodel'
import { createDummyClient, type TypedQuery } from './utils'

function createAdapterWithQueryCapture (): {
  adapter: PostgresAdapter
  ctx: MeasureMetricsContext
  queries: TypedQuery[]
} {
  const queries: TypedQuery[] = []
  const client = createDummyClient(queries)
  const minModel = genMinModel()
  const hierarchy = new Hierarchy()
  for (const tx of minModel) {
    hierarchy.tx(tx)
  }
  const modelDb = new ModelDb(hierarchy)
  const ctx = new MeasureMetricsContext('query-sql-test', {})
  modelDb.addTxes(ctx, minModel, true)
  const adapter = new PostgresAdapter(
    client,
    new ConnectionMgr(client),
    {
      url: () => 'test',
      close: () => {}
    },
    'workspace' as WorkspaceUuid,
    hierarchy,
    modelDb,
    'test'
  )
  return { adapter, ctx, queries }
}

describe('PostgresAdapter findAll SQL (top-level $and, empty $in)', () => {
  it('does not treat $and as a JSON data path (security-style merged query)', async () => {
    const { adapter, ctx, queries } = createAdapterWithQueryCapture()
    const docId = '6968889052c59ef292857a08' as Ref<ComplexClass>
    const noIds: Ref<ComplexClass>[] = []
    const noSpaces: Ref<Space>[] = []
    const query: DocumentQuery<ComplexClass> = {
      $and: [{ _id: docId }, { _id: { $in: noIds } }],
      space: { $in: noSpaces }
    }

    await adapter.findAll(ctx as any, test.class.ComplexClass, query)

    expect(queries.length).toBeGreaterThan(0)
    const sql = queries[queries.length - 1]?.query ?? ''
    expect(sql).not.toMatch(/data#>>'\{\$and\}'/)
    expect(sql).not.toMatch(/#>>'\{\$and\}'/)
    expect(sql).toContain('FALSE')
    expect(sql).not.toContain("IN ('NULL')")
    expect(sql).toMatch(/_id/)
  })

  it("uses FALSE for empty $in on a column field (not IN ('NULL'))", async () => {
    const { adapter, ctx, queries } = createAdapterWithQueryCapture()

    const noSpaces: Ref<Space>[] = []
    const q: DocumentQuery<ComplexClass> = { space: { $in: noSpaces } }
    await adapter.findAll(ctx as any, test.class.ComplexClass, q)

    const sql = queries[queries.length - 1]?.query ?? ''
    expect(sql).toContain('FALSE')
    expect(sql).not.toContain("IN ('NULL')")
  })

  it('uses FALSE for empty $in on _id alone', async () => {
    const { adapter, ctx, queries } = createAdapterWithQueryCapture()

    const noIds: Ref<ComplexClass>[] = []
    const q: DocumentQuery<ComplexClass> = { _id: { $in: noIds } }
    await adapter.findAll(ctx as any, test.class.ComplexClass, q)

    const sql = queries[queries.length - 1]?.query ?? ''
    expect(sql).toContain('FALSE')
    expect(sql).not.toContain("IN ('NULL')")
  })
})
