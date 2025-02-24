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

import { monitor } from './event'
import { _parseId } from './ident'
import type { Plugin, Resource } from './platform'
import { PlatformError, Severity, Status } from './status'

import { getMetadata } from './metadata'
import platform from './platform'

/**
 * @public
 */
export type Resources = Record<string, Record<string, any>>

/**
 * @public
 */
export interface PluginModule<R extends Resources> {
  default: () => Promise<R>
}

/**
 * @public
 */
export type PluginLoader<R extends Resources> = () => Promise<PluginModule<R>>

const locations = new Map<Plugin, PluginLoader<Resources>>()

/**
 * @public
 * @param plugin -
 * @param module -
 */
export function addLocation<R extends Resources> (plugin: Plugin, module: PluginLoader<R>): void {
  locations.set(plugin, module)
}

/**
 * @public
 * return list of registred plugins.
 */
export function getPlugins (): Plugin[] {
  return Array.from(locations.keys())
}

function getLocation (plugin: Plugin): PluginLoader<Resources> {
  const location = locations.get(plugin)
  if (location === undefined) {
    throw new PlatformError(
      new Status(Severity.ERROR, platform.status.NoLocationForPlugin, {
        plugin
      })
    )
  }
  return location
}

const loading = new Map<Plugin, Resources | Promise<Resources>>()

function loadPlugin (id: Plugin): Resources | Promise<Resources> {
  let pluginLoader = loading.get(id)
  if (pluginLoader === undefined) {
    const status = new Status(Severity.INFO, platform.status.LoadingPlugin, {
      plugin: id
    })

    const loadHelper = getMetadata(platform.metadata.LoadHelper)

    const locationLoader = getLocation(id)
    pluginLoader = monitor(status, loadHelper !== undefined ? loadHelper(locationLoader) : locationLoader()).then(
      async (plugin) => {
        try {
          // In case of ts-node, we have a bit different import structure, so let's check for it.
          if (typeof plugin.default === 'object') {
            // eslint-disable-next-line @typescript-eslint/return-await
            return await (plugin as any).default.default()
          }
          return await plugin.default()
        } catch (err: any) {
          console.error(err)
          throw err
        }
      }
    )
    loading.set(id, pluginLoader)
  }
  return pluginLoader
}

const cachedResource = new Map<string, any>()

/**
 * @public
 * @param resource -
 * @returns
 */
export async function getResource<T> (resource: Resource<T>): Promise<T> {
  const cached = cachedResource.get(resource)
  if (cached !== undefined) {
    return cached
  }
  const info = _parseId(resource)
  let resources = loading.get(info.component) ?? loadPlugin(info.component)
  if (resources instanceof Promise) {
    resources = await resources
    loading.set(info.component, resources)
  }
  const value = resources[info.kind]?.[info.name]
  if (value === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.ResourceNotFound, { resource }))
  }
  cachedResource.set(resource, value)
  return value
}

/**
 * @public
 * @param resource -
 * @returns
 */
export function getResourceP<T> (resource: Resource<T>): T | Promise<T> {
  return cachedResource.get(resource) ?? getResource(resource)
}

/**
 * @public
 * @param resource -
 * @returns
 */
export function getResourceC<T> (resource: Resource<T> | undefined, callback: (resource: T | undefined) => void): void {
  if (resource === undefined) {
    callback(undefined)
    return
  }
  const cached = cachedResource.get(resource)
  if (cached !== undefined) {
    callback(cached)
  } else {
    void getResource(resource)
      .then((r) => {
        callback(r)
      })
      .catch(() => {
        callback(undefined)
      })
  }
}

/**
 * @public
 */
export function getResourcePlugin<T> (resource: Resource<T>): Plugin {
  const info = _parseId(resource)
  return info.component
}
