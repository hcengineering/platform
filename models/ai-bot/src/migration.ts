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

import contact, { type Channel, type Person, type PersonAccount } from '@hcengineering/contact'
import core, {
  DOMAIN_MODEL_TX,
  type TxCUD,
  type TxCreateDoc,
  type Ref,
  type TxUpdateDoc,
  TxProcessor,
  type Domain
} from '@hcengineering/core'
import { DOMAIN_CHANNEL, DOMAIN_CONTACT } from '@hcengineering/model-contact'
import {
  tryMigrate,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import aiBot, { aiBotId } from '@hcengineering/ai-bot'

const DOMAIN_ACTIVITY = 'activity' as Domain

async function migrateAiExtraAccounts (client: MigrationClient): Promise<void> {
  const currentAccount = (
    await client.model.findAll(contact.class.PersonAccount, { _id: aiBot.account.AIBot as Ref<PersonAccount> })
  )[0]
  if (currentAccount === undefined) return

  const txes = await client.find<TxCUD<PersonAccount>>(DOMAIN_MODEL_TX, {
    _class: { $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc] },
    objectClass: contact.class.PersonAccount,
    objectId: aiBot.account.AIBot as Ref<PersonAccount>
  })

  const personsToDelete: Ref<Person>[] = []
  const txesToDelete: Ref<TxCUD<PersonAccount>>[] = []

  for (const tx of txes) {
    if (tx._class === core.class.TxCreateDoc) {
      const acc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<PersonAccount>)
      if (acc.person !== currentAccount.person) {
        personsToDelete.push(acc.person)
        txesToDelete.push(tx._id)
      }
    } else if (tx._class === core.class.TxUpdateDoc) {
      const person = (tx as TxUpdateDoc<PersonAccount>).operations.person
      if (person !== undefined && person !== currentAccount.person) {
        personsToDelete.push(person)
        txesToDelete.push(tx._id)
      }
    }
  }

  if (personsToDelete.length === 0) return

  await client.deleteMany(DOMAIN_MODEL_TX, { _id: { $in: txesToDelete } })
  await client.deleteMany(DOMAIN_ACTIVITY, { attachedTo: { $in: personsToDelete } })
  await client.deleteMany<Channel>(DOMAIN_CHANNEL, { attachedTo: { $in: personsToDelete } })
  await client.deleteMany(DOMAIN_CONTACT, { _id: { $in: personsToDelete } })
}

export const aiBotOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, aiBotId, [
      {
        state: 'remove-ai-bot-extra-accounts-v100',
        func: migrateAiExtraAccounts
      }
    ])
  },
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>): Promise<void> {}
}
