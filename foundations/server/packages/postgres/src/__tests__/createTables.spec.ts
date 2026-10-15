import { type MeasureContext } from '@hcengineering/core'
import type postgres from 'postgres'
import { addSchema, domainSchemas, translateDomain, type Schema } from '../schemas'
import { createTables } from '../utils'

function createCtx (): MeasureContext {
  return { with: async (_name: string, _params: any, op: any) => await op() } as unknown as MeasureContext
}

// Like postgres.js, DDL resolves with count === null.
function createMockClient (existingTables: string[] = []): { client: postgres.Sql, queries: string[] } {
  const queries: string[] = []
  const unsafe = jest.fn(async (query: string) => {
    queries.push(query)
    if (query.includes('information_schema.tables')) {
      return Object.assign(
        existingTables.map((name) => ({ table_name: name })),
        { count: existingTables.length }
      )
    }
    return Object.assign([], { count: null })
  })
  const client: any = { unsafe }
  client.begin = async (op: (tx: any) => Promise<any>) => await op(client)
  return { client: client as postgres.Sql, queries }
}

const indexQueries = (queries: string[]): string[] =>
  queries.filter((q) => q.includes('CREATE INDEX')).map((q) => q.replace(/\s+/g, ' ').trim())

describe('createTables - index creation', () => {
  // Module-level caches are keyed by url + domain, so each test needs its own.
  let seq = 0
  const uniq = (): { url: string, domain: string } => {
    seq++
    return { url: `postgresql://test/${seq}`, domain: `idx_test_${seq}` }
  }

  it('creates indexes for columns with index: true even though DDL count is null', async () => {
    const { url, domain } = uniq()
    const schema: Schema = {
      _id: { type: 'text', notNull: true, index: false },
      space: { type: 'text', notNull: true, index: true },
      _class: { type: 'text', notNull: true, index: true },
      note: { type: 'text', notNull: false, index: false }
    }
    addSchema(domain, schema)
    const { client, queries } = createMockClient()

    await createTables(createCtx(), client, url, [domain])

    expect(queries.some((q) => q.includes(`CREATE TABLE IF NOT EXISTS ${domain}`))).toBe(true)
    expect(indexQueries(queries)).toEqual([
      `CREATE INDEX IF NOT EXISTS ${domain}_space_idx ON ${domain} ("space")`,
      `CREATE INDEX IF NOT EXISTS ${domain}__class_idx ON ${domain} ("_class")`
    ])
  })

  it('creates indexes after the table and honours indexType', async () => {
    const { url, domain } = uniq()
    addSchema(domain, {
      _id: { type: 'text', notNull: true, index: false },
      refs: { type: 'text[]', notNull: false, index: true, indexType: 'gin' }
    })
    const { client, queries } = createMockClient()

    await createTables(createCtx(), client, url, [domain])

    const tableIdx = queries.findIndex((q) => q.includes('CREATE TABLE'))
    const indexIdx = queries.findIndex((q) => q.includes('CREATE INDEX'))
    expect(tableIdx).toBeGreaterThanOrEqual(0)
    expect(indexIdx).toBeGreaterThan(tableIdx)
    expect(indexQueries(queries)).toEqual([
      `CREATE INDEX IF NOT EXISTS ${domain}_refs_idx ON ${domain} USING gin ("refs")`
    ])
  })

  it('does not create indexes when no column is indexed', async () => {
    const { url, domain } = uniq()
    addSchema(domain, { _id: { type: 'text', notNull: true, index: false } })
    const { client, queries } = createMockClient()

    await createTables(createCtx(), client, url, [domain])

    expect(queries.some((q) => q.includes('CREATE TABLE'))).toBe(true)
    expect(indexQueries(queries)).toEqual([])
  })

  it('generates index names that are unique, within the identifier limit and never clash with table names', async () => {
    const domains = Object.keys(domainSchemas)
    const tables = new Set(domains.map((d) => translateDomain(d)))
    const names: string[] = []
    for (const domain of domains) {
      const { client, queries } = createMockClient()
      await createTables(createCtx(), client, `postgresql://test/real/${domain}`, [domain])
      for (const q of indexQueries(queries)) {
        const match = /CREATE INDEX IF NOT EXISTS (\S+) ON/.exec(q)
        expect(match).not.toBeNull()
        names.push(match?.[1].toLowerCase() as string)
      }
    }
    expect(names.length).toBeGreaterThan(0)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) {
      expect(name.length).toBeLessThanOrEqual(63)
      expect(tables.has(name)).toBe(false)
    }
  })
})
