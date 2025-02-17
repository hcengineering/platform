import type postgres from 'postgres'
import type {WorkspaceID} from "@hcengineering/communication-types";

export class BaseDb {
    constructor(
        readonly client: postgres.Sql,
        readonly workspace: WorkspaceID
    ) {
    }

    async insert(table: string, data: Record<string, any>): Promise<void> {
        const keys = Object.keys(data)
        const values = Object.values(data)
        const sql = `
            INSERT INTO ${table} (${keys.map((k) => `"${k}"`).join(', ')})
            VALUES (${keys.map((_, idx) => `$${idx + 1}`).join(', ')});
        `
        await this.client.unsafe(sql, values)
    }

    async insertWithReturn(table: string, data: Record<string, any>, returnField: string): Promise<any> {
        const keys = Object.keys(data)
        const values = Object.values(data)
        const sql = `
            INSERT INTO ${table} (${keys.map((k) => `"${k}"`).join(', ')})
            VALUES (${keys.map((_, idx) => `$${idx + 1}`).join(', ')})
            RETURNING ${returnField};`
        const result = await this.client.unsafe(sql, values)

        return result[0][returnField]
    }

    async remove(table: string, where: Record<string, any>): Promise<void> {
        const keys = Object.keys(where)
        const values = Object.values(where)

        if (keys.length === 0) {
            throw new Error("WHERE condition cannot be empty");
        }

        const sql = `
            DELETE
            FROM ${table}
            WHERE ${keys.map((k, idx) => `"${k}" = $${idx + 1}`).join(' AND ')};`

        await this.client.unsafe(sql, values)
    }

    async removeWithReturn(table: string, where: Record<string, any>, returnField: string): Promise<any[]> {
        const keys = Object.keys(where);
        const values: any[] = [];

        if (keys.length === 0) {
            throw new Error("WHERE condition cannot be empty");
        }

        const whereClause = keys.map((key) => {
            const value = where[key];
            if (Array.isArray(value)) {
                const placeholders = value.map((_, i) => `$${values.length + i + 1}`).join(", ");
                values.push(...value);
                return `"${key}" IN (${placeholders})`;
            } else {
                values.push(value);
                return `"${key}" = $${values.length}`;
            }
        }).join(" AND ");

        const sql = `
        DELETE FROM ${table}
        WHERE ${whereClause}
        RETURNING ${returnField};
    `;

        const result = await this.client.unsafe(sql, values);

        return result.map((it: any) => it[returnField]);
    }
}
