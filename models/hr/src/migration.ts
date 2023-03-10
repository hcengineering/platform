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

import { Employee } from '@hcengineering/contact'
import { DOMAIN_TX, TxCollectionCUD, TxCreateDoc, TxOperations, TxUpdateDoc } from '@hcengineering/core'
import { Department, Request, TzDate } from '@hcengineering/hr'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import core, { DOMAIN_SPACE } from '@hcengineering/model-core'
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
        teamLead: null,
        managers: []
      },
      hr.ids.Head
    )
  }
}

function toTzDate (date: number): TzDate {
  const res = new Date(date)
  return {
    year: res.getFullYear(),
    month: res.getMonth(),
    day: res.getDate(),
    offset: res.getTimezoneOffset()
  }
}

async function migrateRequestTime (client: MigrationClient, request: Request): Promise<void> {
  const date = toTzDate((request as any).date as unknown as number)
  const dueDate = toTzDate((request as any).dueDate as unknown as number)
  await client.update(
    DOMAIN_HR,
    { _id: request._id },
    {
      tzDate: date,
      tzDueDate: dueDate
    }
  )

  const txes = await client.find<TxCollectionCUD<Employee, Request>>(DOMAIN_TX, {
    'tx._class': { $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc] },
    'tx.objectId': request._id
  })

  for (const utx of txes) {
    if (utx.tx._class === core.class.TxCreateDoc) {
      const ctx = utx.tx as TxCreateDoc<Request>
      const { date, dueDate, ...attributes } = ctx.attributes as any
      await client.update(
        DOMAIN_TX,
        { _id: utx._id },
        {
          tx: {
            ...ctx,
            attributes: {
              ...attributes,
              tzDate: toTzDate(date as unknown as number),
              tzDueDate: toTzDate((dueDate ?? date) as unknown as number)
            }
          }
        }
      )
    }
    if (utx.tx._class === core.class.TxUpdateDoc) {
      const ctx = utx.tx as TxUpdateDoc<Request>
      const { date, dueDate, ...operations } = ctx.operations as any
      const ops: any = {
        ...operations
      }
      if (date !== undefined) {
        ops.tzDate = toTzDate(date as unknown as number)
      }
      if (dueDate !== undefined) {
        ops.tzDueDate = toTzDate(dueDate as unknown as number)
      }
      await client.update(
        DOMAIN_TX,
        { _id: utx._id },
        {
          tx: {
            ...ctx,
            operations: ops
          }
        }
      )
    }
  }
}

async function migrateTime (client: MigrationClient): Promise<void> {
  const createTxes = await client.find<TxCreateDoc<Request>>(DOMAIN_TX, {
    _class: core.class.TxCreateDoc,
    objectClass: hr.class.Request
  })
  for (const tx of createTxes) {
    await client.update(
      DOMAIN_TX,
      { _id: tx._id },
      {
        _class: core.class.TxCollectionCUD,
        tx,
        collection: tx.attributes.collection,
        objectId: tx.attributes.attachedTo,
        objectClass: tx.attributes.attachedToClass
      }
    )
    await client.update(
      DOMAIN_TX,
      { _id: tx._id },
      {
        $unset: {
          attributes: ''
        }
      }
    )
  }

  const requests = await client.find<Request>(DOMAIN_HR, { _class: hr.class.Request, tzDate: { $exists: false } })
  for (const request of requests) {
    await migrateRequestTime(client, request)
  }
}

async function fillManagers (client: MigrationClient): Promise<void> {
  await client.update<Department>(
    DOMAIN_SPACE,
    {
      _class: hr.class.Department,
      managers: { $exists: false }
    },
    {
      managers: []
    }
  )

  await client.update<TxCreateDoc<Department>>(
    DOMAIN_TX,
    {
      _class: core.class.TxCreateDoc,
      objectClass: hr.class.Department,
      'attributes.managers': { $exists: false }
    },
    {
      'attributes.managers': []
    }
  )
}

export const hrOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await migrateTime(client)
    await fillManagers(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    const tx = new TxOperations(client, core.account.System)
    await createSpace(tx)
  }
}
