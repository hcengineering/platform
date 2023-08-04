/*!
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
*/

import { Metadata } from '.'

/**
 * Id in format 'plugin.resource-kind.id'
 *
 * @public
 */
export type Id = string & { __id: true }

/**
 * Plugin Id
 *
 * @public
 */
export type Plugin = string & { __plugin: true }

/**
 * Platform Resource Identifier (PRI)
 *
 * @remarks
 *
 * Almost anything in the Anticrm Platform is a `Resource`. Resources referenced by Platform Resource Identifier (PRI).
 *
 * @example
 * ```typescript
 *   `core.string.ClassLabel` as Resource<string> // translated string according to current language and i18n settings
 *   `workbench.icon.Add` as Resource<URL> // URL to SVG sprites
 * ```
 *
 * @public
 */
export type Resource<T> = Id & { __resource: T }

/**
 * Internationalized string Id
 *
 * @public
 */
export type IntlString<T extends Record<string, any> = {}> = Id & { __intl_string: T }

/**
 * Status Code. Also works as i18n string Id for status description.
 *
 * @public
 */
export type StatusCode<T extends Record<string, any> = {}> = IntlString<T>

/**
 * @public
 */
export type Namespace = Record<string, Record<string, string>>

/**
 * @internal
 */
export const _ID_SEPARATOR = ':'

/**
 * @internal
 */
export const _EmbeddedId = 'embedded'

function identify (result: Record<string, any>, prefix: string, namespace: Record<string, any>): Namespace {
  for (const key in namespace) {
    const value = namespace[key]
    if (typeof result[key] === 'string') {
      throw new Error(`'identify' overwrites '${key}' for ${prefix}`)
    }
    const ident = prefix + _ID_SEPARATOR + key
    result[key] = typeof value === 'string' ? ident : identify(result[key] ?? {}, ident, value)
  }
  return result
}

/**
 * @public
 */
export function getEmbeddedLabel (str: string): IntlString {
  return (_EmbeddedId + _ID_SEPARATOR + _EmbeddedId + _ID_SEPARATOR + str) as IntlString
}

/**
 * Defines plugin Ids.
 *
 * @public
 * @param plugin -
 * @param namespace -
 * @returns
 */
export function plugin<N extends Namespace> (plugin: Plugin, namespace: N): N {
  return identify({}, plugin, namespace) as N
}

/**
 * Merges plugin Ids with Ids provided.
 *
 * @public
 * @param plugin -
 * @param ns -
 * @param merge -
 * @returns
 */
export function mergeIds<N extends Namespace, M extends Namespace> (plugin: Plugin, ns: N, merge: M): N & M {
  return identify({ ...ns }, plugin, merge) as N & M
}

/**
 * @public
 */
export const platformId = 'platform' as Plugin

export default plugin(platformId, {
  status: {
    OK: '' as StatusCode,
    BadError: '' as StatusCode,
    UnknownError: '' as StatusCode<{ message: string }>,
    InvalidId: '' as StatusCode<{ id: string }>,

    LoadingPlugin: '' as StatusCode<{ plugin: string }>,
    NoLocationForPlugin: '' as StatusCode<{ plugin: Plugin }>,
    ResourceNotFound: '' as StatusCode<{ resource: Resource<any> }>,

    NoLoaderForStrings: '' as StatusCode<{ plugin: Plugin }>,

    BadRequest: '' as StatusCode,
    Forbidden: '' as StatusCode,
    Unauthorized: '' as StatusCode,
    ExpiredLink: '' as StatusCode,
    UnknownMethod: '' as StatusCode<{ method: string }>,
    InternalServerError: '' as StatusCode,
    MaintenanceWarning: '' as StatusCode<{ time: number }>,
    AccountNotFound: '' as StatusCode<{ account: string }>,
    WorkspaceNotFound: '' as StatusCode<{ workspace: string }>,
    InvalidPassword: '' as StatusCode<{ account: string }>,
    AccountAlreadyExists: '' as StatusCode<{ account: string }>,
    AccountAlreadyConfirmed: '' as StatusCode<{ account: string }>,
    WorkspaceAlreadyExists: '' as StatusCode<{ workspace: string }>,
    WorkspaceRateLimit: '' as StatusCode<{ workspace: string }>,
    ProductIdMismatch: '' as StatusCode<{ productId: string }>
  },
  metadata: {
    locale: '' as Metadata<string>
  }
})
