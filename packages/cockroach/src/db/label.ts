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

import {
  SortingOrder,
  type AccountID,
  type CardID,
  type CardType,
  type FindLabelsParams,
  type LabelID,
  type Label
} from '@hcengineering/communication-types'

import { BaseDb } from './base'
import { type LabelDb, TableName } from './schema'
import { toLabel } from './mapping'
import type { LabelUpdates, RemoveLabelQuery } from '@hcengineering/communication-sdk-types'

export class LabelsDb extends BaseDb {
  async createLabel (
    label: LabelID,
    card: CardID,
    cardType: CardType,
    account: AccountID,
    created: Date
  ): Promise<void> {
    const db: LabelDb = {
      workspace_id: this.workspace,
      label_id: label,
      card_id: card,
      card_type: cardType,
      account,
      created
    }
    const sql = `INSERT INTO ${TableName.Label} (workspace_id, label_id, card_id, card_type, account, created)
                 VALUES ($1::uuid, $2::varchar, $3::varchar, $4::varchar, $5::uuid, $6::timestamptz)
                 ON CONFLICT DO NOTHING`
    await this.execute(
      sql,
      [db.workspace_id, db.label_id, db.card_id, db.card_type, db.account, db.created],
      'insert label'
    )
  }

  async removeLabels (query: RemoveLabelQuery): Promise<void> {
    const db: Partial<LabelDb> = {
      label_id: query.labelId,
      card_id: query.cardId,
      account: query.account
    }

    const entries = Object.entries(db).filter(([_, value]) => value !== undefined)

    if (entries.length === 0) return

    entries.unshift(['workspace_id', this.workspace])

    const whereClauses = entries.map(([key], index) => `${key} = $${index + 1}`)
    const whereValues = entries.map(([_, value]) => value)

    const sql = `DELETE
                 FROM ${TableName.Label}
                 WHERE ${whereClauses.join(' AND ')}`

    await this.execute(sql, whereValues, 'remove labels')
  }

  async updateLabels (card: CardID, updates: LabelUpdates): Promise<void> {
    const dbData: Partial<LabelDb> = {
      card_type: updates.cardType
    }

    const entries = Object.entries(dbData).filter(([_, value]) => value !== undefined)
    if (entries.length === 0) return

    const setClauses = entries.map(([key], index) => `${key} = $${index + 3}`)
    const setValues = entries.map(([_, value]) => value)

    const sql = `UPDATE ${TableName.Label}
             SET ${setClauses.join(', ')}
             WHERE workspace_id = $1::uuid AND card_id = $2::varchar`

    await this.execute(sql, [this.workspace, card, ...setValues], 'update labels')
  }

  async findLabels (params: FindLabelsParams): Promise<Label[]> {
    const select = `SELECT *
                    FROM ${TableName.Label} l`

    const { where, values } = this.buildWhere(params)

    const limit = params.limit != null ? `LIMIT ${params.limit}` : ''
    const orderBy =
      params.order != null ? `ORDER BY l.created ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''
    const sql = [select, where, orderBy, limit].join(' ')

    const result = await this.execute(sql, values, 'find labels')

    return result.map((it: any) => toLabel(it))
  }

  buildWhere (params: FindLabelsParams, startIndex: number = 0, prefix = 'l.'): { where: string, values: any[] } {
    const where: string[] = []
    const values: any[] = []
    let index = startIndex + 1

    where.push(`${prefix}workspace_id = $${index++}::uuid`)
    values.push(this.workspace)

    if (params.label != null) {
      const labels = Array.isArray(params.label) ? params.label : [params.label]
      if (labels.length === 1) {
        where.push(`${prefix}label_id = $${index++}::varchar`)
        values.push(labels[0])
      } else {
        where.push(`${prefix}label_id = ANY($${index++}::varchar[])`)
        values.push(labels)
      }
    }

    if (params.card != null) {
      where.push(`${prefix}card_id = $${index++}::varchar`)
      values.push(params.card)
    }

    if (params.cardType != null) {
      const types = Array.isArray(params.cardType) ? params.cardType : [params.cardType]

      if (types.length === 1) {
        where.push(`${prefix}card_type = $${index++}::varchar`)
        values.push(types[0])
      } else {
        where.push(`${prefix}card_type = ANY($${index++}::varchar[])`)
        values.push(types)
      }
    }

    if (params.account != null) {
      where.push(`${prefix}account = $${index++}::uuid`)
      values.push(params.account)
    }

    return { where: `WHERE ${where.join(' AND ')}`, values }
  }
}
