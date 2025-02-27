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

import type {Sqlite3Worker1Promiser} from "../connection";

export class BaseDb {
    constructor(protected readonly worker: Sqlite3Worker1Promiser, protected readonly dbId: string) {
    }

    async insert( table: string, data: Record<string, any>): Promise<void> {
        const keys = Object.keys(data)
        const values = Object.values(data)
        const sql = `
            INSERT INTO ${table} (${keys.map((k) => `${k}`).join(', ')})
            VALUES (${values.map((value) => `'${value}'`).join(', ')});
        `
        await this.worker('exec', {
            dbId: this.dbId,
            sql
        });
    }

    async remove(table: string, where: Record<string, any>): Promise<void> {
        const keys = Object.keys(where)
        const values = Object.values(where)

        const sql = `
            DELETE
            FROM ${table}
            WHERE ${keys.map((k, idx) => `${k} = '${values[idx]}'`).join(' AND ')};`

        await this.worker('exec', {
            dbId: this.dbId,
            sql
        });
    }


    async select(sql: string): Promise<Record<string, any>[]> {
        return new Promise(async (resolve) => {
            const rows: Record<string, any>[] = [];

            await this.worker('exec', {
                dbId: this.dbId,
                sql,
                callback: (res) => {
                    if (res == null) {
                        resolve(rows);
                        return;
                    }
                    if (res.row == null || res.rowNumber == null) {
                        resolve(rows);
                    } else {
                        const rowObject: Record<string, any> = {};
                        res.columnNames.forEach((columnName, index) => {
                            rowObject[columnName] = res.row?.[index] ?? undefined
                        });

                        rows.push(rowObject);
                    }
                },
            });
        });
    }
}