import type postgres from 'postgres'
import type { ParameterOrJSON } from 'postgres'
import { convertArrayParams, doFetchTypes, getPrepare } from './utils'

export type DBResult = any[] & { count: number }
export interface DBClient {
  execute: (query: string, parameters?: ParameterOrJSON<any>[] | undefined) => Promise<DBResult>

  release: () => void

  reserve: () => Promise<DBClient>

  raw: () => postgres.Sql
}

export function createDBClient (client: postgres.Sql, release: () => void = () => {}): DBClient {
  return {
    execute: (query, parameters) =>
      client.unsafe(query, doFetchTypes ? parameters : convertArrayParams(parameters), getPrepare()),
    release,
    reserve: async () => {
      const reserved = await client.reserve()
      return createDBClient(reserved, () => {
        reserved.release()
      })
    },
    raw: () => client
  }
}
