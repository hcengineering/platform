//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { DOMAIN_TX, TxCreateDoc, TxOperations } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationResult, MigrationUpgradeClient } from '@anticrm/model'
import core from '@anticrm/model-core'
import { DOMAIN_TASK } from '@anticrm/model-task'
import { Lead } from '@anticrm/lead'
import lead from './plugin'
import contact from '@anticrm/model-contact'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function logInfo (msg: string, result: MigrationResult): void {
  if (result.updated > 0) {
    console.log(`Lead: Migrate ${msg} ${result.updated}`)
  }
}

export const leadOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    // Update done states for tasks
    logInfo('lead done states', await client.update(DOMAIN_TASK, { _class: lead.class.Lead, doneState: { $exists: false } }, { doneState: null }))
    const txes = await client.find<TxCreateDoc<Lead>>(DOMAIN_TX, {
      _class: core.class.TxCreateDoc,
      objectClass: lead.class.Lead
    })
    for (const tx of txes) {
      if (tx.attributes.attachedTo !== undefined) continue
      await client.update<TxCreateDoc<Lead>>(DOMAIN_TX, { _id: tx._id }, {
        attributes: {
          ...tx.attributes,
          attachedTo: (tx.attributes as any).customer,
          attachedToClass: contact.class.Contact
        }
      })
    }
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
    console.log('Lead: Performing model upgrades')

    const ops = new TxOperations(client, core.account.System)

    const leads = await client.findAll(lead.class.Lead, {})
    for (const lead of leads) {
      if (lead.attachedTo === undefined) {
        await ops.updateDoc(lead._class, lead.space, lead._id, {
          attachedTo: (lead as any).customer,
          attachedToClass: contact.class.Contact
        })
      }
    }
  }
}
