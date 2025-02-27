//
// Copyright © 2025 Hardcore Engineering Inc.
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
