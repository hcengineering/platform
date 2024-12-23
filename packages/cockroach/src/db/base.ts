import type postgres from 'postgres'

export class BaseDb {
    constructor(
        readonly client: postgres.Sql
    ) {}

    async insert(table: string, data: Record<string, any>): Promise<void> {
        const keys = Object.keys(data)
        const values = Object.values(data)
        const sql = `
            INSERT INTO ${table} (${keys.map((k) => `"${k}"`).join(', ')})
            VALUES (${keys.map((_, idx) => `$${idx + 1}`).join(', ')});
        `
        await this.client.unsafe(sql, values)
    }

    async insertWithReturn(table: string, data: Record<string, any>, returnField : string): Promise<any> {
        const keys = Object.keys(data)
        const values = Object.values(data)
        const sql = `
            INSERT INTO ${table} (${keys.map((k) => `"${k}"`).join(', ')})
            VALUES (${keys.map((_, idx) => `$${idx + 1}`).join(', ')})
            RETURNING ${returnField};`
        const result =await this.client.unsafe(sql, values)

        return result[0][returnField]
    }

    async remove(table: string, where: Record<string, any>): Promise<void> {
        const keys = Object.keys(where)
        const values = Object.values(where)

        const sql = `
            DELETE
            FROM ${table}
            WHERE ${keys.map((k, idx) => `"${k}" = $${idx + 1}`).join(' AND ')};`

        await this.client.unsafe(sql, values)
    }
}
