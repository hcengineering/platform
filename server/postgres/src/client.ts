import { concatLink } from '@hcengineering/core'
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

class GreenClient implements DBClient {
  endpoint: string
  constructor (
    readonly url: string,
    private readonly token: string,
    private readonly connection: postgres.Sql,
    private readonly compression?: {
      decoder: (data: any) => Promise<any>
      compression: string
    }
  ) {
    this.endpoint = concatLink(url, '/api/v1/sql')
  }

  async execute (query: string, parameters?: ParameterOrJSON<any>[] | undefined): Promise<DBResult> {
    const params = convertArrayParams(parameters)
    const maxRetries = 3
    let lastError: any

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const st = Date.now()
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this.token,
            Connection: 'keep-alive',
            ...(this.compression?.compression !== undefined ? { compression: this.compression.compression } : {})
          },
          body: JSON.stringify({
            query,
            params
          })
        })
        if (!response.ok) {
          throw new Error(`Failed to execute sql: ${response.status} ${response.statusText}`)
        }
        let size = 0
        let encodedSize = 0
        try {
          if (
            this.compression?.decoder !== undefined &&
            response.headers.get('compression') === this.compression.compression
          ) {
            const buffer = Buffer.from(await response.arrayBuffer())
            encodedSize = buffer.length
            const decoded = await this.compression.decoder(buffer)
            size = decoded.length
            return JSON.parse(decoded)
          }

          return await response.json()
        } finally {
          const qtime = response.headers.get('querytime')
          const time = Date.now() - st
          console.info({
            message: `green query: ${time} ${qtime ?? 0}`,
            query,
            time,
            parameters,
            qtime: response.headers.get('querytime'),
            size,
            encodedSize
          })
        }
      } catch (err: any) {
        lastError = err
        if (attempt === maxRetries - 1) {
          console.warn({
            message: 'green failed after retries',
            query,
            errMessage: err.message,
            endpoint: this.endpoint
          })
          return await this.connection.unsafe(query, params, getPrepare())
        }
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100))
      }
    }

    throw lastError
  }

  release (): void {}

  async reserve (): Promise<DBClient> {
    return createDBClient(await this.connection.reserve())
  }

  raw (): postgres.Sql {
    return this.connection
  }
}

export function createGreenDBClient (
  url: string,
  token: string,
  connection: postgres.Sql,
  compression?: {
    decoder: (data: any) => Promise<any>
    compression: string
  }
): DBClient {
  return new GreenClient(url, token, connection, compression)
}
