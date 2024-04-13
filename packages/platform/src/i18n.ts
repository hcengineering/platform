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

import { IntlMessageFormat } from 'intl-messageformat'
import { setPlatformStatus } from './event'
import { _IdInfo, _parseId } from './ident'
import type { IntlString, Plugin } from './platform'
import { Severity, Status, unknownError } from './status'

import { getMetadata } from './metadata'
import platform, { _EmbeddedId } from './platform'

/**
 * @public
 * @typedef Loader
 * 
 * Loads a set of strings for a given locale and resolves to a record of strings. 
 * Each string can be either a simple string or a record of strings.
 */
export type Loader = (locale: string) => Promise<Record<string, string | Record<string, string>>>

type Messages = Record<string, IntlString | Record<string, IntlString>>

const loaders = new Map<Plugin, Loader>()
const translations = new Map<Plugin, Messages | Status>()
const cache = new Map<IntlString, IntlMessageFormat | Status>()

/**
 * @public
 * @function addStringsLoader
 * 
 * Adds a strings loader for a given plugin.
 * 
 * @param plugin - The plugin to add the strings loader for.
 * @param loader - The strings loader to add.
 */
export function addStringsLoader (plugin: Plugin, loader: Loader): void {
  loaders.set(plugin, loader)
}

/**
 * @public
 * @function loadPluginStrings
 * 
 * Perform load of all internationalization sources for all plugins available.
 * 
 * @param locale - The locale to load the strings for.
 * @param force - Whether to force a reload of the strings, even if they are already loaded.
 */
export async function loadPluginStrings (locale: string, force: boolean = false): Promise<void> {
  if (force) {
    cache.clear()
  }
  for (const [plugin] of loaders) {
    let messages = translations.get(plugin)
    if (messages === undefined || force) {
      messages = await loadTranslationsForComponent(plugin, locale)
      translations.set(plugin, messages)
    }
  }
}

/**
 * @function loadTranslationsForComponent
 * 
 * Loads translations for a given plugin and locale. If no loader is found for the plugin, it sets an error status. 
 * If the loader fails, it tries to load the 'en' locale as a fallback.
 * 
 * @param plugin - The plugin to load translations for.
 * @param locale - The locale to load translations for.
 * @returns A promise that resolves to the loaded messages or a status indicating an error.
 */
async function loadTranslationsForComponent (plugin: Plugin, locale: string): Promise<Messages | Status> {
  const loader = loaders.get(plugin)
  if (loader === undefined) {
    const status = new Status(Severity.ERROR, platform.status.NoLoaderForStrings, { plugin })
    await setPlatformStatus(status)
    return status
  }
  try {
    return (await loader(locale)) as Record<string, IntlString> | Status
  } catch (err) {
    console.error('No translations found for plugin', plugin, err)
    try {
      return (await loader('en')) as Record<string, IntlString> | Status
    } catch (err: any) {
      const status = unknownError(err)
      await setPlatformStatus(status)
      return status
    }
  }
}

/**
 * @function getTranslation
 * 
 * Gets a translation for a given id and locale. If no translations are loaded for the id's component, it loads them. 
 * If an error occurs, it sets an error status.
 * 
 * @param id - The id of the translation to get.
 * @param locale - The locale to get the translation for.
 * @returns A promise that resolves to the translation, a status indicating an error, or undefined if no translation is found.
 */
async function getTranslation (id: _IdInfo, locale: string): Promise<IntlString | Status | undefined> {
  try {
    let messages = translations.get(id.component)
    if (messages === undefined) {
      messages = await loadTranslationsForComponent(id.component, locale)
      translations.set(id.component, messages)
    }
    if (messages instanceof Status) {
      return messages
    }
    return id.kind !== undefined
      ? (messages[id.kind] as Record<string, IntlString>)?.[id.name]
      : (messages[id.name] as IntlString)
  } catch (err) {
    const status = unknownError(err)
    await setPlatformStatus(status)
    return status
  }
}

/**
 * @public
 * @function translate
 * 
 * Translates a message using the provided parameters and the current locale. If a translation is 
 * not found, it uses the original message. If an error occurs, it sets an error status.
 * 
 * @param message - The message to translate.
 * @param params - The parameters to use for the translation.
 * @param language - The language to translate the message to. If not provided, the current locale is used.
 * @returns A promise that resolves to the translated message.
 */
export async function translate<P extends Record<string, any>> (
  message: IntlString<P>,
  params: P,
  language?: string
): Promise<string> {
  const locale = language ?? getMetadata(platform.metadata.locale) ?? 'en'
  const compiled = cache.get(message)

  if (compiled !== undefined) {
    if (compiled instanceof Status) {
      return message
    }
    return compiled.format(params)
  } else {
    try {
      const id = _parseId(message)
      if (id.component === _EmbeddedId) {
        return id.name
      }
      const translation = (await getTranslation(id, locale)) ?? message
      if (translation instanceof Status) {
        cache.set(message, translation)
        return message
      }
      const compiled = new IntlMessageFormat(translation, locale, undefined, { ignoreTag: true })
      cache.set(message, compiled)
      return compiled.format(params)
    } catch (err) {
      const status = unknownError(err)
      await setPlatformStatus(status)
      cache.set(message, status)
      return message
    }
  }
}
