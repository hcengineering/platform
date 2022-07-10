//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { DOMAIN_TX, SortingOrder, TxCreateDoc, TxOperations, TxUpdateDoc } from '@anticrm/core'
import { Request } from '@anticrm/hr'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import core from '@anticrm/model-core'
import hr, { DOMAIN_HR } from './index'

async function createSpace (tx: TxOperations): Promise<void> {
  const current = await tx.findOne(core.class.Space, {
    _id: hr.ids.Head
  })
  if (current === undefined) {
    await tx.createDoc(
      hr.class.Department,
      core.space.Space,
      {
        name: 'Organization',
        description: '',
        private: false,
        archived: false,
        members: [],
        teamLead: null
      },
      hr.ids.Head
    )
  }
}

function toUTC (date: Date | number): number {
  const res = new Date(date)
  if (res.getUTCFullYear() !== res.getFullYear()) {
    res.setUTCFullYear(res.getFullYear())
  }
  if (res.getUTCMonth() !== res.getMonth()) {
    res.setUTCMonth(res.getMonth())
  }
  if (res.getUTCDate() !== res.getDate()) {
    res.setUTCDate(res.getDate())
  }
  return res.setUTCHours(12, 0, 0, 0)
}

function isDefault (date: number, due: number): boolean {
  const start = new Date(date)
  const end = new Date(due)
  if (start.getDate() === end.getDate() && end.getHours() - start.getHours() === 12) {
    return true
  }
  if (start.getDate() + 1 === end.getDate() && end.getHours() === start.getHours()) {
    return true
  }
  return false
}

async function migrateRequestTime (client: MigrationClient, request: Request): Promise<void> {
  const date = toUTC(request.date)
  const dueDate = isDefault(request.date, request.dueDate) ? date : toUTC(request.dueDate)
  await client.update(
    DOMAIN_HR,
    { _id: request._id },
    {
      date,
      dueDate
    }
  )

  const updateDateTx = (
    await client.find<TxUpdateDoc<Request>>(
      DOMAIN_TX,
      { _class: core.class.TxUpdateDoc, objectId: request._id, 'operations.date': { $exists: true } },
      { sort: { modifiedOn: SortingOrder.Descending } }
    )
  )[0]
  if (updateDateTx !== undefined) {
    const operations = updateDateTx.operations
    operations.dueDate = date
    await client.update(
      DOMAIN_TX,
      { _id: updateDateTx._id },
      {
        operations
      }
    )
  }
  const updateDueTx = (
    await client.find<TxUpdateDoc<Request>>(
      DOMAIN_TX,
      { _class: core.class.TxUpdateDoc, objectId: request._id, 'operations.dueDate': { $exists: true } },
      { sort: { modifiedOn: SortingOrder.Descending } }
    )
  )[0]
  if (updateDueTx !== undefined) {
    const operations = updateDueTx.operations
    operations.dueDate = dueDate
    await client.update(
      DOMAIN_TX,
      { _id: updateDateTx._id },
      {
        operations
      }
    )
  }

  if (updateDueTx === undefined || updateDateTx === undefined) {
    const createTx = (
      await client.find<TxCreateDoc<Request>>(
        DOMAIN_TX,
        { _class: core.class.TxCreateDoc, objectId: request._id },
        { sort: { modifiedOn: SortingOrder.Descending } }
      )
    )[0]
    if (createTx !== undefined) {
      const attributes = createTx.attributes
      if (updateDateTx === undefined) {
        attributes.date = date
      }
      if (updateDueTx === undefined) {
        attributes.dueDate = dueDate
      }
      await client.update(
        DOMAIN_TX,
        { _id: createTx._id },
        {
          attributes
        }
      )
    }
  }
}

async function migrateTime (client: MigrationClient): Promise<void> {
  const requests = await client.find<Request>(DOMAIN_HR, { _class: hr.class.Request })
  for (const request of requests) {
    await migrateRequestTime(client, request)
  }
}

export const hrOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await migrateTime(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createSpace(tx)
  }
}
