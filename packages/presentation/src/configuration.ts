//
// Copyright © 2023 Hardcore Engineering Inc.
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

import core, { type Configuration, type PluginConfiguration, type Ref, SortingOrder, toIdMap, type Tx, type TxUpdateDoc } from '@hcengineering/core'
import { getResourcePlugin, type Plugin, type Resource } from '@hcengineering/platform'
import { writable } from 'svelte/store'
import { addTxListener, createQuery } from '.'

/**
 * @public
 */
export class ConfigurationManager {
  constructor (
    readonly list: PluginConfiguration[],
    readonly configuration: Map<Plugin, PluginConfiguration>
  ) {}

  has (plugin: Plugin): boolean {
    return this.configuration.get(plugin)?.enabled !== false
  }

  hasResource<T>(resource?: Resource<T> | null): boolean | undefined {
    if (resource == null) {
      return false
    }
    try {
      return this.has(getResourcePlugin(resource))
    } catch {}
  }
}
// Issue status live query
export let pluginConfiguration = new ConfigurationManager([], new Map())
export const pluginConfigurationStore = writable<ConfigurationManager>(pluginConfiguration)

const pluginConfigQuery = createQuery(true)

addTxListener((txes: Tx[]) => {
  for (const tx of txes) {
    if (tx._class === core.class.TxUpdateDoc) {
      const cud = tx as TxUpdateDoc<PluginConfiguration>
      if (cud.objectClass === core.class.PluginConfiguration) {
        if (cud.operations.enabled !== undefined) {
          // Plugin enabled/disabled we need to refresh
          location.reload()
        }
      }
    }
  }
})
/**
 * @public
 */
export function hasResource<T> (resource?: Resource<T>): boolean | undefined {
  return pluginConfiguration.hasResource(resource)
}

pluginConfigQuery.query(
  core.class.PluginConfiguration,
  {},
  (res) => {
    pluginConfiguration = new ConfigurationManager(res, new Map(res.map((it) => [it.pluginId, it])))
    pluginConfigurationStore.set(pluginConfiguration)
  },
  { sort: { pluginId: SortingOrder.Ascending } }
)

const configQuery = createQuery(true)
export const configurationStore = writable <Map<Ref<Configuration>, Configuration>>(new Map())

configQuery.query(
  core.class.Configuration,
  {},
  (res) => { configurationStore.set(toIdMap(res)) })
