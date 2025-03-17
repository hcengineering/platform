//
// Copyright © 2024 Hardcore Engineering Inc.
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
import contact, { type Person, type PersonAccount } from '@hcengineering/contact'
import core, { DOMAIN_MODEL_TX, type Ref, type TxCreateDoc } from '@hcengineering/core'
import {
  tryMigrate,
  type MigrateOperation,
  type MigrateUpdate,
  type MigrationClient,
  type MigrationDocumentQuery,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import request, { requestId, type Request } from '@hcengineering/request'

import { DOMAIN_REQUEST } from '.'

async function migrateRequestPersonAccounts (client: MigrationClient): Promise<void> {
  const descendants = client.hierarchy.getDescendants(request.class.Request)
  const requests = await client.find<Request>(DOMAIN_REQUEST, {
    _class: { $in: descendants }
  })
  const personAccountsCreateTxes = await client.find(DOMAIN_MODEL_TX, {
    _class: core.class.TxCreateDoc,
    objectClass: contact.class.PersonAccount
  })
  const personAccountToPersonMap = personAccountsCreateTxes.reduce<Record<Ref<PersonAccount>, Ref<Person>>>(
    (map, tx) => {
      const ctx = tx as TxCreateDoc<PersonAccount>

      map[ctx.objectId] = ctx.attributes.person

      return map
    },
    {}
  )
  const operations: { filter: MigrationDocumentQuery<Request>, update: MigrateUpdate<Request> }[] = []
  for (const request of requests) {
    const newRequestedPersons = request.requested
      .map((paId) => personAccountToPersonMap[paId as unknown as Ref<PersonAccount>])
      .filter((p) => p != null)
    const newApprovedPersons = request.approved
      .map((paId) => personAccountToPersonMap[paId as unknown as Ref<PersonAccount>])
      .filter((p) => p != null)
    const newRejectedPerson =
      request.rejected != null ? personAccountToPersonMap[request.rejected as unknown as Ref<PersonAccount>] : undefined

    if (newRequestedPersons.length > 0) {
      operations.push({
        filter: {
          _id: request._id
        },
        update: {
          requested: newRequestedPersons,
          approved: newApprovedPersons
        }
      })
    }

    if (newRejectedPerson !== undefined) {
      operations.push({
        filter: {
          _id: request._id
        },
        update: {
          rejected: newRejectedPerson
        }
      })
    }
  }

  if (operations.length > 0) {
    await client.bulk(DOMAIN_REQUEST, operations)
  }
}

export const requestOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, requestId, [
      {
        state: 'migrateRequestPersonAccounts',
        func: migrateRequestPersonAccounts
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
