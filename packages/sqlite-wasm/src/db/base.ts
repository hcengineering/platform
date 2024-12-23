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