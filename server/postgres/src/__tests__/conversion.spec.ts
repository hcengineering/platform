import core, {
  Hierarchy,
  MeasureMetricsContext,
  ModelDb,
  TxFactory,
  type DocumentUpdate,
  type PersonId,
  type Ref,
  type Space,
  type Tx,
  type WorkspaceUuid
} from '@hcengineering/core'
import { PostgresAdapter } from '../storage'
import { convertArrayParams, decodeArray } from '../utils'
import { genMinModel, test, type ComplexClass } from './minmodel'
import { createDummyClient, type TypedQuery } from './utils'

describe('array conversion', () => {
  it('should handle undefined parameters', () => {
    expect(convertArrayParams(undefined)).toBeUndefined()
  })

  it('should convert empty arrays', () => {
    expect(convertArrayParams([['foo']])).toEqual(['{"foo"}'])
    expect(convertArrayParams([[]])).toEqual(['{}'])
  })

  it('should handle string arrays with special characters', () => {
    expect(convertArrayParams([['hello', 'world"quote"']])).toEqual(['{"hello","world\\"quote\\""}'])
  })

  it('should handle null values', () => {
    expect(convertArrayParams([[null, 'value', null]])).toEqual(['{NULL,"value",NULL}'])
  })

  it('should handle mixed type arrays', () => {
    expect(convertArrayParams([[123, 'text', null, true]])).toEqual(['{123,"text",NULL,true}'])
  })

  it('should pass through non-array parameters', () => {
    expect(convertArrayParams(['text', 123, null])).toEqual(['text', 123, null])
  })
})

describe('array decoding', () => {
  it('should decode NULL to empty array', () => {
    expect(decodeArray('NULL')).toEqual([])
  })

  it('should decode empty array', () => {
    expect(decodeArray('{}')).toEqual([''])
  })

  it('should decode simple string array', () => {
    expect(decodeArray('{hello,world}')).toEqual(['hello', 'world'])
  })
  it('should decode encoded string array', () => {
    expect(decodeArray('{"hello","world"}')).toEqual(['hello', 'world'])
  })

  it('should decode array with quoted strings', () => {
    expect(decodeArray('{hello,"quoted value"}')).toEqual(['hello', 'quoted value'])
  })

  it('should decode array with escaped quotes', () => {
    expect(decodeArray('{"hello \\"world\\""}')).toEqual(['hello "world"'])
  })

  it('should decode array with multiple escaped characters', () => {
    expect(decodeArray('{"first \\"quote\\"","second \\"quote\\""}')).toEqual(['first "quote"', 'second "quote"'])
  })
})

const factory = new TxFactory('email:test' as PersonId)
function upd (id: string, partial: DocumentUpdate<ComplexClass>): Tx {
  return factory.createTxUpdateDoc<ComplexClass>(
    test.class.ComplexClass,
    core.space.Workspace,
    id as Ref<ComplexClass>,
    partial
  )
}

describe('query to sql conversion tests', () => {
  it('check dummy db client', async () => {
    const queries: TypedQuery[] = []
    const c = createDummyClient(queries)

    await c.execute('select now()')
    expect(queries[0].query).toEqual('select now()')
  })
  it('check simple update', async () => {
    const { adapter, ctx, queries } = createTestContext()

    await adapter.tx(
      ctx,
      upd('obj1', {
        stringField: 'test'
      })
    )
    expect(queries[0].query).toEqual(
      'UPDATE pg_testing SET "modifiedBy" = update_data."_modifiedBy", "modifiedOn" = update_data."_modifiedOn", "%hash%" = update_data."_%hash%", data = COALESCE(data || update_data._data)\n            FROM (values ($2::text, $3::text,$4::bigint,$5::text,$6::jsonb)) AS update_data(__id, "_modifiedBy","_modifiedOn","_%hash%","_data")\n            WHERE "workspaceId" = $1::uuid AND "_id" = update_data.__id'
    )
  })
  it('check space update', async () => {
    const { adapter, ctx, queries } = createTestContext()

    await adapter.tx(
      ctx,
      upd('obj1', {
        space: 'new-space' as Ref<Space>
      })
    )
    expect(queries[0].query).toEqual(
      'UPDATE pg_testing SET "modifiedBy" = update_data."_modifiedBy", "modifiedOn" = update_data."_modifiedOn", "%hash%" = update_data."_%hash%", "space" = update_data."_space"\n            FROM (values ($2::text, $3::text,$4::bigint,$5::text,$6::text)) AS update_data(__id, "_modifiedBy","_modifiedOn","_%hash%","_space")\n            WHERE "workspaceId" = $1::uuid AND "_id" = update_data.__id'
    )
  })
  it('check few documents update', async () => {
    const { adapter, ctx, queries } = createTestContext()

    await adapter.tx(
      ctx,
      upd('obj1', {
        stringField: 'test'
      }),
      upd('obj2', {
        stringField: 'test2'
      }),
      upd('obj3', {
        stringField: 'test'
      })
    )
    expect(queries[0].query).toEqual(
      'UPDATE pg_testing SET "modifiedBy" = update_data."_modifiedBy", "modifiedOn" = update_data."_modifiedOn", "%hash%" = update_data."_%hash%", data = COALESCE(data || update_data._data)\n            FROM (values ($2::text, $3::text,$4::bigint,$5::text,$6::jsonb),($7::text, $8::text,$9::bigint,$10::text,$11::jsonb),($12::text, $13::text,$14::bigint,$15::text,$16::jsonb)) AS update_data(__id, "_modifiedBy","_modifiedOn","_%hash%","_data")\n            WHERE "workspaceId" = $1::uuid AND "_id" = update_data.__id'
    )
  })
})
function createTestContext (): { adapter: PostgresAdapter, ctx: MeasureMetricsContext, queries: TypedQuery[] } {
  const ctx = new MeasureMetricsContext('test', {})
  const queries: TypedQuery[] = []
  const c = createDummyClient(queries)

  const minModel = genMinModel()
  const hierarchy = new Hierarchy()
  for (const tx of minModel) {
    hierarchy.tx(tx)
  }
  const modelDb = new ModelDb(hierarchy)
  modelDb.addTxes(ctx, minModel, true)
  const adapter = new PostgresAdapter(
    c,
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
