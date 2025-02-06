import type { DBClient } from '../client'

export interface TypedQuery {
  query: string
  params?: any[]
}
export function createDummyClient (queries: TypedQuery[]): DBClient {
  const client: DBClient = {
    execute: async (query, params) => {
      queries.push({ query, params })
      return Object.assign([], { count: 0 })
    },
    raw: () => jest.fn() as any,
    reserve: async () => client,
    release: jest.fn()
  }
  return client
}
