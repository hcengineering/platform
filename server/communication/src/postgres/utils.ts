//
// Copyright © 2024 Hardcore Engineering Inc.
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

import type postgres from 'postgres'
import { getIndex, schemaByClass, tableNameByClass } from './schemas'
import { type Obj } from '@hcengineering/communication'

export async function createTables (client: postgres.Sql): Promise<void> {
  const names = Object.values(tableNameByClass)
    .map((it) => `'${it}'`)
    .join(', ')
  const tables = await client.unsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name IN (${names})
  `)
  const exists = new Set(tables.map((it) => it.table_name))

  await client.begin(async (client) => {
    for (const [_class, tableName] of Object.entries(tableNameByClass)) {
      if (exists.has(tableName)) continue

      await createTable(client, _class, tableName)
    }
  })
}

async function createTable (client: postgres.Sql, _class: string, tableName: string): Promise<void> {
  const schema = schemaByClass[_class]
  const fields: string[] = []
  for (const key in schema) {
    const val = schema[key]
    fields.push(`"${key}" ${val.type} ${val.notNull ? 'NOT NULL' : ''}`)
  }
  const columns = fields.join(', ')
  const res = await client.unsafe(`CREATE TABLE IF NOT EXISTS ${tableName} (
      "workspaceId" text NOT NULL,
      ${columns}, 
      PRIMARY KEY("workspaceId", _id)
    )`)

  if (res.count > 0) {
    for (const key in schema) {
      const val = schema[key]
      if (val.index) {
        await client.unsafe(`
          CREATE INDEX ${tableName}_${key} ON ${tableName} ${getIndex(val)} ("${key}")
        `)
      }
    }
  }
}

interface DBDoc {
  _id: string
  createdOn: number
  [key: string]: any
}

export function toDbObject<T extends Obj> (object: T): DBDoc {
  const schema = schemaByClass[object._class]

  const supportedFields: Partial<T> = {}
  for (const key in object) {
    if (schema[key] != null) {
      supportedFields[key] = object[key]
    }
  }

  return {
    _id: object._id,
    ...supportedFields,
    createdOn: object.createdOn ?? Date.now()
  }
}
