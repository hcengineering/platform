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

import type { Metadata } from './metadata'

// Re-exporting modules for easier access
export * from './event'
export * from './i18n'
export * from './metadata'
export * from './platform'
export { default } from './platform'
export * from './resource'
export * from './status'
export * from './testUtils'

/**
 * @public
 * @typedef URL
 * 
 * A type representing a URL as a string.
 */
export type URL = string

/**
 * @public
 * @typedef Asset
 * 
 * A type representing an asset. An asset is a metadata object where the metadata is a URL.
 */
export type Asset = Metadata<URL>
