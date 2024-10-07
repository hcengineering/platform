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

import { type MeasureContext } from '@hcengineering/core'
import { type DbAdapterFactory } from './adapter'
import type { ContentTextAdapterFactory, ServiceAdapterConfig } from './types'

/**
 * @public
 */
export interface DbAdapterConfiguration {
  factory: DbAdapterFactory
  url: string
}

/**
 * @public
 */
export interface ContentTextAdapterConfiguration {
  factory: ContentTextAdapterFactory
  contentType: string
  url: string
}

/**
 * @public
 */
export interface DbConfiguration {
  adapters: Record<string, DbAdapterConfiguration>
  domains: Record<string, string>
  defaultAdapter: string
  metrics: MeasureContext
  contentAdapters: Record<string, ContentTextAdapterConfiguration>
  serviceAdapters: Record<string, ServiceAdapterConfig>
  defaultContentAdapter: string
}
