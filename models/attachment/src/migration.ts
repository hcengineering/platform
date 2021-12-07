//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { Class, Doc, DOMAIN_TX, Ref, TxCUD } from '@anticrm/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@anticrm/model'
import { DOMAIN_ATTACHMENT } from './index'
import attachment from './plugin'

export const attachmentOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    console.log('Attachments: Upgrading attachments.')
    // Replace attachment class
    const attachResult = await client.update(DOMAIN_ATTACHMENT, { _class: 'chunter:class:Attachment' as Ref<Class<Doc>> }, { _class: attachment.class.Attachment as Ref<Class<Doc>> })
    if (attachResult.updated > 0) {
      console.log(`Attachments: Update ${attachResult.updated} Attachment objects`)
    }

    // Update transactions.
    const txResult = await client.update<TxCUD<Doc>>(DOMAIN_TX, { objectClass: 'chunter:class:Attachment' as Ref<Class<Doc>> }, { objectClass: attachment.class.Attachment as Ref<Class<Doc>> })

    if (txResult.updated > 0) {
      console.log(`Attachments: Update ${txResult.updated} Transactions`)
    }

    const txResult2 = await client.update<TxCUD<Doc>>(DOMAIN_TX, { 'tx.objectClass': 'chunter:class:Attachment' as Ref<Class<Doc>> }, { 'tx.objectClass': attachment.class.Attachment as Ref<Class<Doc>> })

    if (txResult2.updated > 0) {
      console.log(`Attachments: Update ${txResult.updated} Transactions`)
    }
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {
  }
}
