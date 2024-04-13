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

import platform from './platform'

/**
 * @public
 * @typedef Resources
 * 
 * A type representing a map of resources, where each resource is a map of string keys to any value.
 */
export type Resources = Record<string, Record<string, any>>

/**
 * @public
 * @interface PluginModule
 * 
 * An interface representing a plugin module, which is a function that returns a promise resolving to a map of resources.
 */
export interface PluginModule<R extends Resources> {
  default: () => Promise<R>
}

/**
 * @public
 * @typedef PluginLoader
 * 
 * A type representing a function that loads a plugin module and returns a promise resolving to it.
 */
export type PluginLoader<R extends Resources> = () => Promise<PluginModule<R>>

// A map of plugins to their loaders.
const locations = new Map<Plugin, PluginLoader<Resources>>()

/**
 * @public
 * @function addLocation
 * 
 * Registers a plugin and its loader.
 * 
 * @param plugin - The plugin to register.
 * @param module - The loader for the plugin.
 */
export function addLocation<R extends Resources> (plugin: Plugin, module: PluginLoader<R>): void {
  locations.set(plugin, module)
}

/**
 * @public
 * @function getPlugins
 * 
 * Returns a list of all registered plugins.
 * 
 * @returns {Plugin[]} - An array of registered plugins.
 */
export function getPlugins (): Plugin[] {
  return Array.from(locations.keys())
}

/**
 * @function getLocation
 * 
 * Retrieves the loader for a plugin.
 * 
 * @param {Plugin} plugin - The plugin to retrieve the loader for.
 * @returns {PluginLoader<Resources>} - The loader for the plugin.
 */
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

// A map of plugins to promises that resolve to their loaded resources.
const loading = new Map<Plugin, Promise<Resources>>()

/**
 * @function loadPlugin
 * 
 * Loads a plugin and returns a promise that resolves to its resources.
 * 
 * @param {Plugin} id - The ID of the plugin to load.
 * @returns {Promise<Resources>} - A promise that resolves to the loaded resources.
 */
async function loadPlugin (id: Plugin): Promise<Resources> {
  let pluginLoader = loading.get(id)
  if (pluginLoader === undefined) {
    const status = new Status(Severity.INFO, platform.status.LoadingPlugin, {
      plugin: id
    })
    pluginLoader = monitor(status, getLocation(id)()).then(async (plugin) => {
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
    })
    loading.set(id, pluginLoader)
  }
  return await pluginLoader
}

// A map of resources ot their cached values.
const cachedResource = new Map<string, any>()

/**
 * @public
 * @function getResource
 * 
 * Retrieves a resource. If the resource is cached, it returns the cached value. Otherwise, it loads the resource, caches it, and then returns it.
 * 
 * @param resource - The resource to retrieve.
 * @returns {Promise<T>} - A promise that resolves to the retrieved resource.
 */
export async function getResource<T> (resource: Resource<T>): Promise<T> {
  const cached = cachedResource.get(resource)
  if (cached !== undefined) {
    return cached
  }
  const info = _parseId(resource)
  const resources = loading.get(info.component) ?? loadPlugin(info.component)
  const value = (await resources)[info.kind]?.[info.name]
  if (value === undefined) {
    throw new PlatformError(new Status(Severity.ERROR, platform.status.ResourceNotFound, { resource }))
  }
  cachedResource.set(resource, value)
  return value
}

/**
 * @public
 * @function getResourcePlugin
 * 
 * Retrieves the plugin associated with a resource.
 * 
 * @param resource - The resource to retrieve the plugin for.
 * @returns {Plugin} - The plugin associated with the resource.
 */
export function getResourcePlugin<T> (resource: Resource<T>): Plugin {
  const info = _parseId(resource)
  return info.component
}
