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
  WorkspaceID,
  type CardID,
  PeerKind,
  PeerExtra,
  FindPeersParams,
  SortingOrder,
  Peer
} from '@hcengineering/communication-types'
import { Domain } from '@hcengineering/communication-sdk-types'

import { BaseDb } from './base'
import { DbModel, DbModelFilter } from '../schema'
import { toPeer } from './mapping'

export class PeersDb extends BaseDb {
  async createPeer (
    workspaceId: WorkspaceID,
    cardId: CardID,
    kind: PeerKind,
    value: string,
    extra: PeerExtra,
    date: Date
  ): Promise<void> {
    const db: DbModel<Domain.Peer> = {
      workspace_id: workspaceId,
      card_id: cardId,
      kind,
      value,
      extra,
      created: date
    }
    const { sql, values } = this.getInsertSql(Domain.Peer, db, [])
    await this.execute(sql, values, 'insert peer')
  }

  async removePeer (workspaceId: WorkspaceID, cardId: CardID, kind: PeerKind, value: string): Promise<void> {
    const filter: DbModelFilter<Domain.Peer> = [
      {
        column: 'workspace_id',
        value: workspaceId
      },
      {
        column: 'card_id',
        value: cardId
      },
      {
        column: 'kind',
        value: kind
      },
      {
        column: 'value',
        value
      }
    ]

    if (filter.length === 0) return

    const { sql, values } = this.getDeleteSql(Domain.Peer, filter)

    await this.execute(sql, values, 'remove peer')
  }

  async findPeers (params: FindPeersParams): Promise<Peer[]> {
    const select = `SELECT *, COALESCE(members.members, '[]') AS members
                    FROM ${Domain.Peer} p`

    const { where, values } = this.buildWhere(params)

    const limit = params.limit != null ? `LIMIT ${params.limit}` : ''
    const orderBy =
      params.order != null ? `ORDER BY p.created ${params.order === SortingOrder.Ascending ? 'ASC' : 'DESC'}` : ''
    const join = `LEFT JOIN LATERAL (
      SELECT json_agg(
           json_build_object(
             'workspace_id', p2.workspace_id,
             'card_id',      p2.card_id,
             'extra',        p2.extra
           )
         ) AS members
    FROM ${Domain.Peer} AS p2
    WHERE p2.value = p.value
    AND p2.kind = 'card'
    AND NOT (p2.workspace_id = p.workspace_id AND p2.card_id = p.card_id)
  ) members ON true`
    const sql = [select, join, where, orderBy, limit].join(' ')

    const result = await this.execute(sql, values, 'find peers')

    return result.map((it: any) => toPeer(it))
  }

  buildWhere (params: FindPeersParams, startIndex: number = 0, prefix = 'p.'): { where: string, values: any[] } {
    const where: string[] = []
    const values: any[] = []
    let index = startIndex + 1

    if (params.workspaceId != null) {
      where.push(`${prefix}workspace_id = $${index++}::uuid`)
      values.push(params.workspaceId)
    }

    if (params.cardId != null) {
      where.push(`${prefix}card_id = $${index++}::varchar`)
      values.push(params.cardId)
    }

    if (params.kind != null) {
      where.push(`${prefix}kind = $${index++}::varchar`)
      values.push(params.kind)
    }

    if (params.value != null) {
      where.push(`${prefix}value = $${index++}::varchar`)
      values.push(params.value)
    }

    return { where: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '', values }
  }
}
