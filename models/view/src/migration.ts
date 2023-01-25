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

import { Ref } from '@hcengineering/core'
import { MigrateOperation, MigrationClient, MigrationUpgradeClient } from '@hcengineering/model'
import { FilteredView, Viewlet, ViewletPreference } from '@hcengineering/view'
import { DOMAIN_PREFERENCE } from '@hcengineering/preference'
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
  const preferences = await client.find<FilteredView>(DOMAIN_PREFERENCE, {
    _class: view.class.FilteredView,
    viewOptions: { $exists: true }
  })
  for (const pref of preferences) {
    if (pref.viewOptions === undefined) continue
    if (Array.isArray(pref.viewOptions.groupBy)) continue
    pref.viewOptions.groupBy = [pref.viewOptions.groupBy]
    await client.update<FilteredView>(
      DOMAIN_PREFERENCE,
      {
        _id: pref._id
      },
      {
        viewOptions: pref.viewOptions
      }
    )
  }
}

export const viewOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await migrateViewletPreference(client)
    await migrateSavedFilters(client)
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
