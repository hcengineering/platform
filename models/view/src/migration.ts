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

import core, { AnyAttribute, DOMAIN_TX, Ref, TxCreateDoc, TxCUD, TxProcessor, TxRemoveDoc } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import { DOMAIN_PREFERENCE } from '@hcengineering/preference'
import { BuildModelKey, FilteredView, Viewlet, ViewletPreference } from '@hcengineering/view'
import { DOMAIN_VIEW } from '.'
import view from './plugin'

async function migrateViewletPreference (client: MigrationClient): Promise<void> {
  const targets: Record<string, string[]> = {
    'inventory:viewlet:TableProduct': ['attachedTo'],
    'lead:viewlet:TableCustomer': ['_class'],
    'lead:viewlet:TableLead': ['attachedTo', 'state', 'doneState'],
    'recruit.viewlet.TableApplicant': ['attachedTo', 'assignee', 'state', 'doneState'],
    'task.viewlet.TableIssue': ['assignee', 'state', 'doneState']
  }
  for (const target in targets) {
    const keys = targets[target]
    const preferences = await client.find<ViewletPreference>(DOMAIN_PREFERENCE, {
      attachedTo: target as Ref<Viewlet>
    })
    for (const pref of preferences) {
      let needUpdate = false

      for (const key of keys) {
        const index = pref.config.findIndex((p) => p === `$lookup.${key}`)
        if (index !== -1) {
          pref.config.splice(index, 1, key)
          needUpdate = true
        }
      }
      if (needUpdate) {
        await client.update<ViewletPreference>(
          DOMAIN_PREFERENCE,
          {
            _id: pref._id
          },
          {
            config: pref.config
          }
        )
      }
    }
  }
}

async function migrateSavedFilters (client: MigrationClient): Promise<void> {
  try {
    await client.move(
      DOMAIN_PREFERENCE,
      {
        _class: view.class.FilteredView
      },
      DOMAIN_VIEW
    )
  } catch (err: any) {
    console.log(err)
  }
  const preferences = await client.find<FilteredView>(DOMAIN_VIEW, {
    _class: view.class.FilteredView,
    users: { $exists: false }
  })
  for (const pref of preferences) {
    await client.update<FilteredView>(
      DOMAIN_VIEW,
      {
        _id: pref._id
      },
      {
        users: [pref.createdBy]
      }
    )
  }
}

async function fixViewletPreferenceRemovedAttributes (client: MigrationClient): Promise<void> {
  const removeTxes = await client.find<TxRemoveDoc<AnyAttribute>>(DOMAIN_TX, {
    _class: core.class.TxRemoveDoc,
    objectClass: core.class.Attribute
  })
  for (const removeTx of removeTxes) {
    const createTx = (
      await client.find<TxCreateDoc<AnyAttribute>>(DOMAIN_TX, {
        _class: core.class.TxCreateDoc,
        objectId: removeTx.objectId
      })
    )[0]
    const key = createTx.attributes.name
    await client.update<ViewletPreference>(
      DOMAIN_PREFERENCE,
      { config: key },
      {
        $pull: { config: key }
      }
    )
  }
}

async function fixPreferenceObjectKey (client: MigrationClient): Promise<void> {
  const preferences = await client.find<ViewletPreference>(DOMAIN_PREFERENCE, { _class: view.class.ViewletPreference })
  for (const preference of preferences) {
    let index = preference.config.indexOf('')
    if (index === -1) continue
    index = preference.config.indexOf('', index + 1)
    if (index === -1) continue
    const descTxes = await client.find<TxCUD<Viewlet>>(DOMAIN_TX, { objectId: preference.attachedTo })
    const desc = TxProcessor.buildDoc2Doc<Viewlet>(descTxes)
    if (desc === undefined) continue
    const targets = desc.config.filter((p) => (p as BuildModelKey).key === '')
    let i = 0
    while (index !== -1) {
      const target = targets[i++]
      if (target !== undefined) {
        await client.update(
          DOMAIN_PREFERENCE,
          {
            _id: preference._id
          },
          { $set: { [`config.${index}`]: target } }
        )
      } else {
        await client.update(
          DOMAIN_PREFERENCE,
          {
            _id: preference._id
          },
          { $unset: { [`config.${index}`]: 1 } }
        )
        await client.update(
          DOMAIN_PREFERENCE,
          {
            _id: preference._id
          },
          { $pull: { config: null } }
        )
      }
      index = preference.config.indexOf('', index + 1)
    }
  }
}

export const viewOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await migrateViewletPreference(client)
    await migrateSavedFilters(client)
    await fixViewletPreferenceRemovedAttributes(client)
    await fixPreferenceObjectKey(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
