// @ts-expect-error error
import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm'

export type Sqlite3Worker1Promiser = {
  (
    command: 'config-get',
    params: object
  ): Promise<{
    result: {
      version: {
        libVersion: string
      }
    }
  }>

  (
    command: 'open',
    params: { filename: string }
  ): Promise<{
    dbId: string
  }>

  (
    command: 'exec',
    params: {
      dbId: string
      sql: string
      callback?: (row: SqlResult | null | undefined) => void
    }
  ): Promise<void>

  (command: 'close'): Promise<void>
}

type SqlResult = {
  columnNames: string[]
  row: any[] | null | undefined
  rowNumber: number | null | undefined
}

export async function initializeSQLite(
  connectionString: string
): Promise<{ worker: Sqlite3Worker1Promiser; dbId: string }> {
  const promiser: Sqlite3Worker1Promiser = await new Promise((resolve) => {
    const _promiser = sqlite3Worker1Promiser({
      onready: () => resolve(_promiser)
    })
  })

  const configResponse = await promiser('config-get', {})
  console.log('SQLite3 config', configResponse.result)

  const { dbId } = await promiser('open', { filename: connectionString })

  return { worker: promiser, dbId }
}
