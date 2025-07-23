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
import { Domain, type LabelUpdates, type RemoveLabelQuery } from '@hcengineering/communication-sdk-types'

import { BaseDb } from './base'
import { toLabel } from './mapping'
import { DbModel, DbModelFilter, DbModelUpdate } from '../schema'

export class LabelsDb extends BaseDb {
  async createLabel (
    label: LabelID,
    card: CardID,
    cardType: CardType,
    account: AccountID,
    created: Date
  ): Promise<void> {
    const db: DbModel<Domain.Label> = {
      workspace_id: this.workspace,
      label_id: label,
      card_id: card,
      card_type: cardType,
      account,
      created
    }
    const { sql, values } = this.getInsertSql(Domain.Label, db, [], {
      conflictColumns: ['workspace_id', 'label_id', 'card_id', 'account'],
      conflictAction: 'DO NOTHING'
    })
    await this.execute(sql, values, 'insert label')
  }

  async removeLabels (query: RemoveLabelQuery): Promise<void> {
    const filter: DbModelFilter<Domain.Label> = []

    if (query.labelId != null) {
      filter.push({
        column: 'label_id',
        value: query.labelId
      })
    }
    if (query.cardId != null) {
      filter.push({
        column: 'card_id',
        value: query.cardId
      })
    }
    if (query.account != null) {
      filter.push({
        column: 'account',
        value: query.account
      })
    }

    if (filter.length === 0) return

    filter.unshift({
      column: 'workspace_id',
      value: this.workspace
    })

    const { sql, values } = this.getDeleteSql(Domain.Label, filter)

    await this.execute(sql, values, 'remove labels')
  }

  async updateLabels (card: CardID, updates: LabelUpdates): Promise<void> {
    const update: DbModelUpdate<Domain.Label> = []

    const filter: DbModelFilter<Domain.Label> = [
      {
        column: 'workspace_id',
        value: this.workspace
      },
      {
        column: 'card_id',
        value: card
      }
    ]

    if (updates.cardType != null) {
      update.push({
        column: 'card_type',
        value: updates.cardType
      })
    }

    if (update.length === 0) return

    const { sql, values } = this.getUpdateSql(Domain.Label, filter, update)

    await this.execute(sql, values, 'update labels')
  }

  async findLabels (params: FindLabelsParams): Promise<Label[]> {
    const select = `SELECT *
                    FROM ${Domain.Label} l`

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
