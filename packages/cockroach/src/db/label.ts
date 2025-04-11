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
} from '@hcengineering/communication-types';

import {BaseDb} from './base'
import {type LabelDb, TableName} from "./schema.ts";
import {toLabel} from './mapping.ts';

export class LabelsDb extends BaseDb {
  async createLabel(label: LabelID, card: CardID, cardType: CardType, account: AccountID, created: Date): Promise<void> {
    const db: LabelDb = {
      workspace_id: this.workspace,
      label_id: label,
      card_id: card,
      card_type: cardType,
      account,
      created,
    }
    const sql = `INSERT INTO ${TableName.Label} (workspace_id, label_id, card_id, card_type, account, created)
                 VALUES ($1::uuid, $2::varchar, $3::varchar, $4::varchar, $5::uuid, $6::timestamptz)
                 ON CONFLICT DO NOTHING`
    await this.execute(sql, [db.workspace_id, db.label_id, db.card_id, db.card_type, db.account, db.created], 'insert label')
  }

  async removeLabel(label: LabelID, card: CardID, account: AccountID): Promise<void> {
    const sql = `DELETE
                 FROM ${TableName.Label}
                 WHERE workspace_id = $1::uuid
                   AND label_id = $2::varchar
                   AND card_id = $3::varchar
                   AND account = $4::uuid`
    await this.execute(sql, [this.workspace, label, card, account], 'remove label')
  }

  async findLabels(params: FindLabelsParams): Promise<Label[]> {
    const select = `SELECT *
                    FROM ${TableName.Label} l`

    const where: string[] = ['l.workspace_id = $1::uuid']
    const whereValues: any[] = [this.workspace]
    let index = whereValues.length + 1

    if (params.label != null) {
      where.push(`l.label_id = $${index++}::varchar`)
      whereValues.push(params.label)
    }

    if (params.card != null) {
      where.push(`l.card_id = $${index++}::varchar`)
      whereValues.push(params.card)
    }

    if (params.cardType != null) {
      const types = Array.isArray(params.cardType) ? params.cardType : [params.cardType]

      if (types.length === 1) {
        where.push(`l.card_type = $${index++}::varchar`)
        whereValues.push(types[0])
      } else {
        where.push(`l.card_type = ANY($${index++}::varchar[])`)
        whereValues.push(types)
      }
    }

    if (params.account != null) {
      where.push(`l.account = $${index++}::uuid`)
      whereValues.push(params.account)
    }

    const limit = params.limit != null ? `LIMIT ${params.limit}` : ''
    const orderBy = params.order != null ? `ORDER BY l.created ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''

    const whereString = `WHERE ${where.join(' AND ')}`
    const sql = [select, whereString, orderBy, limit].join(' ')

    const result = await this.execute(sql, whereValues, 'find labels')

    return result.map((it: any) => toLabel(it))
  }
}
