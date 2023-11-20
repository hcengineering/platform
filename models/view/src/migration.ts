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

import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  tryMigrate
} from '@hcengineering/model'
import { DOMAIN_PREFERENCE } from '@hcengineering/preference'
import view, { type Filter, type FilteredView, type ViewletPreference, viewId } from '@hcengineering/view'
import { DOMAIN_VIEW } from '.'

async function removeDoneStatePref (client: MigrationClient): Promise<void> {
  const prefs = await client.find<ViewletPreference>(DOMAIN_PREFERENCE, {
    _class: view.class.ViewletPreference,
    config: 'doneState'
  })
  for (const pref of prefs) {
    await client.update(DOMAIN_PREFERENCE, { _id: pref._id }, { config: pref.config.filter((p) => p !== 'doneState') })
  }
  const lookupPrefs = await client.find<ViewletPreference>(DOMAIN_PREFERENCE, {
    _class: view.class.ViewletPreference,
    config: '$lookup.doneState'
  })
  for (const pref of lookupPrefs) {
    await client.update(
      DOMAIN_PREFERENCE,
      { _id: pref._id },
      { config: pref.config.filter((p) => p !== '$lookup.doneState') }
    )
  }
}

async function removeDoneStateFilter (client: MigrationClient): Promise<void> {
  const filters = await client.find<FilteredView>(DOMAIN_VIEW, {
    _class: view.class.FilteredView
  })
  for (const filter of filters) {
    let changed = false
    const options = filter.viewOptions
    if (options != null) {
      if (options.orderBy[0] === 'doneState') {
        options.orderBy[0] = 'status'
        changed = true
      }
      if (options.groupBy.includes('doneState')) {
        changed = true
        options.groupBy = options.groupBy.filter((g) => g !== 'doneState')
        if (options.groupBy.length === 0) {
          options.groupBy[0] = 'status'
        }
      }
    }
    let filters = JSON.parse(filter.filters) as Filter[]
    const initLength = filters.length
    filters = filters.filter((p) => p.key.key !== 'doneState')
    if (initLength !== filters.length) {
      changed = true
    }
    if (changed) {
      await client.update(DOMAIN_VIEW, { _id: filter._id }, { viewOptions: options, filters: JSON.stringify(filters) })
    }
  }
}

export const viewOperation: MigrateOperation = {
  async migrate (client: MigrationClient): Promise<void> {
    await tryMigrate(client, viewId, [
      {
        state: 'remove-done-state-pref',
        func: removeDoneStatePref
      },
      {
        state: 'remove-done-state-filter',
        func: removeDoneStateFilter
      }
    ])
  },
  async upgrade (client: MigrationUpgradeClient): Promise<void> {}
}
