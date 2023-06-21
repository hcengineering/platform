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

import core, { PluginConfiguration, SortingOrder } from '@hcengineering/core'
import { Plugin, Resource, getResourcePlugin } from '@hcengineering/platform'
import { get, writable } from 'svelte/store'
import { createQuery } from '.'
import { location as platformLocation } from '@hcengineering/ui'

/**
 * @public
 */
export class ConfigurationManager {
  constructor (readonly list: PluginConfiguration[], readonly configuration: Map<Plugin, PluginConfiguration>) {}

  has (plugin: Plugin): boolean {
    return this.configuration.get(plugin)?.enabled !== false
  }

  hasResource<T>(resource?: Resource<T> | null): boolean {
    if (resource == null) {
      return false
    }
    return this.has(getResourcePlugin(resource))
  }
}
// Issue status live query
export let configuration = new ConfigurationManager([], new Map())
export const configurationStore = writable<ConfigurationManager>(configuration)

const configQuery = createQuery(true)

let hashString = ''
let workspaceId: string = ''

/**
 * @public
 */
export function hasResource<T> (resource?: Resource<T>): boolean {
  return configuration.hasResource(resource)
}

configQuery.query(
  core.class.PluginConfiguration,
  {},
  (res) => {
    const newHash = res.map((it) => `${it.pluginId}=${it.enabled ? '+' : '-'}`).join('&')
    const wsId = get(platformLocation).path[1]

    if (hashString !== '' && hashString !== newHash && workspaceId !== '' && workspaceId === wsId) {
      // Configuration is changed for same workspace.
      location.reload()
    }
    workspaceId = wsId
    hashString = newHash
    configuration = new ConfigurationManager(res, new Map(res.map((it) => [it.pluginId, it])))
    configurationStore.set(configuration)
  },
  { sort: { label: SortingOrder.Ascending } }
)
