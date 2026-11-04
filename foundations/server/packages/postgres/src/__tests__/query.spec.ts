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

import {
  Hierarchy,
  MeasureMetricsContext,
  ModelDb,
  type DocumentQuery,
  type Domain,
  type MeasureContext,
  type Ref,
  type SessionData,
  type WorkspaceUuid
} from '@hcengineering/core'
import type { ConnectionMgr, DBClient, DBResult } from '@hcengineering/postgres-base'
import { PostgresAdapter } from '../storage'
import { genMinModel } from './minmodel'
import { createTaskModel, type Task, type TaskComment, taskPlugin } from './tasks'

function makeAdapter (): { adapter: PostgresAdapter, execute: jest.Mock } {
  const hierarchy = new Hierarchy()
  const txes = genMinModel()
  createTaskModel(txes)
  for (const tx of txes) {
    hierarchy.tx(tx)
  }
  const execute = jest.fn(async (_sql: string, _params: unknown[]) => Object.assign([], { count: 0 }) as DBResult)
  const client = { execute } as unknown as DBClient
  const mgr = {
    retry: async (_id: string | undefined, _mgrId: string, fn: (client: DBClient) => Promise<unknown>) =>
      await fn(client)
  } as unknown as ConnectionMgr
  const adapter = new PostgresAdapter(
    client,
    mgr,
    { url: () => 'test', close: () => {} },
    '00000000-0000-0000-0000-000000000001' as WorkspaceUuid,
    hierarchy,
    new ModelDb(hierarchy),
    'test'
  )
  return { adapter, execute }
}

describe('PostgreSQL query filters', () => {
  it.each([[[]], [['6a7c92737874bf5782edd3b1']], [['first', "second'quoted"]]])(
    'treats a scalar ID filter containing %j as a list of alternatives',
    async (ids) => {
      const { adapter, execute } = makeAdapter()
      // Saved UI filters can contain arrays even for scalar attributes.
      const query = { _id: ids } as unknown as DocumentQuery<Task>
      const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>

      await adapter.findAll(ctx, taskPlugin.class.Task, query, { unsecured: true })

      const [sql, params] = execute.mock.calls[0] as [string, unknown[]]
      if (ids.length === 0) {
        expect(sql).toContain(' AND FALSE')
        expect(params).not.toContainEqual([])
      } else {
        expect(sql).toContain('test_task."_id" = ANY($2::text[])')
        expect(params[1]).toEqual(ids)
        expect(sql).not.toContain(ids[0])
      }
      expect(sql).not.toMatch(/"_id" = \$\d+::(?:text\[\]|jsonb)/)
    }
  )

  it('keeps scalar equality unchanged', async () => {
    const { adapter, execute } = makeAdapter()

    await adapter.rawFindAll('test-task' as Domain, { _id: 'first' as Ref<Task> })

    expect(execute.mock.calls[0][0]).toContain('"_id" = $2::text')
    expect(execute.mock.calls[0][1][1]).toBe('first')
  })

  it('never matches a scalar value against an empty $in, including the literal NULL', async () => {
    const { adapter, execute } = makeAdapter()

    await adapter.rawFindAll('test-task' as Domain, { _id: { $in: [] } })

    expect(execute.mock.calls[0][0]).toContain(' AND FALSE')
    expect(execute.mock.calls[0][0]).not.toContain("IN ('NULL')")
  })

  it('uses the same scalar list translation for raw queries', async () => {
    const { adapter, execute } = makeAdapter()

    const query = { _id: ['first', 'second'] } as unknown as DocumentQuery<Task>
    await adapter.rawFindAll('test-task' as Domain, query)

    expect(execute.mock.calls[0][0]).toContain('"_id" = ANY($2::text[])')
    expect(execute.mock.calls[0][1][1]).toEqual(['first', 'second'])
  })

  it('preserves $in null matching for scalar JSON fields', async () => {
    const { adapter, execute } = makeAdapter()

    await adapter.rawFindAll('test-task' as Domain, { name: { $in: ['first', null] } })

    expect(execute.mock.calls[0][0]).toContain("(data#>>'{name}' = ANY($2::text[]) OR data#>>'{name}' IS NULL)")
    expect(execute.mock.calls[0][1][1]).toEqual(['first'])
  })

  it('preserves $in containment for JSON array attributes', async () => {
    const { adapter, execute } = makeAdapter()
    const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>

    await adapter.findAll(ctx, taskPlugin.class.Task, { arr: { $in: [1, 2] } }, { unsecured: true })

    expect(execute.mock.calls[0][0]).toContain("test_task.data->'arr' ?| $2::text[]")
    expect(execute.mock.calls[0][1][1]).toEqual(['1', '2'])
  })

  it('filters by existence of a looked-up document via LEFT JOIN', async () => {
    const { adapter, execute } = makeAdapter()
    const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
    // Used by the workbench to skip activity inbox notifications whose message is gone.
    const query = { '$lookup.attachedTo._id': { $exists: true } } as unknown as DocumentQuery<TaskComment>

    await adapter.findAll(ctx, taskPlugin.class.TaskComment, query, {
      unsecured: true,
      lookup: { attachedTo: taskPlugin.class.Task }
    })

    const sql = execute.mock.calls[0][0] as string
    const alias = sql.match(/LEFT JOIN \S+ AS (\S+) ON/)?.[1]
    expect(alias).toBeDefined()
    expect(sql).toContain(`${alias}."_id" IS NOT NULL`)
  })
})
