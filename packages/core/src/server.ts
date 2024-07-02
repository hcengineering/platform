//
// Copyright © 2022 Hardcore Engineering Inc.
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

import type { Doc, Domain, Ref } from './classes'
import { MeasureContext, type FullParamsType, type ParamsType } from './measurements'
import type { Tx } from './tx'

/**
 * @public
 */
export interface DocInfo {
  id: string
  hash: string
  size: number // Aprox size
}
/**
 * @public
 */
export interface StorageIterator {
  next: (ctx: MeasureContext) => Promise<DocInfo | undefined>
  close: (ctx: MeasureContext) => Promise<void>
}

export interface SessionOperationContext {
  ctx: MeasureContext
  // A parts of derived data to deal with after operation will be complete
  derived: {
    derived: Tx[]
    target?: string[]
  }[]

  with: <T>(
    name: string,
    params: ParamsType,
    op: (ctx: SessionOperationContext) => T | Promise<T>,
    fullParams?: FullParamsType
  ) => Promise<T>
}

/**
 * @public
 */
export interface LowLevelStorage {
  // Low level streaming API to retrieve information
  // If recheck is passed, all %hash% for documents, will be re-calculated.
  find: (ctx: MeasureContext, domain: Domain, recheck?: boolean) => StorageIterator

  // Load passed documents from domain
  load: (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => Promise<Doc[]>

  // Upload new versions of documents
  // docs - new/updated version of documents.
  upload: (ctx: MeasureContext, domain: Domain, docs: Doc[]) => Promise<void>

  // Remove a list of documents.
  clean: (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]) => Promise<void>
}

export interface Branding {
  key?: string
  front?: string
  title?: string
  language?: string
  initWorkspace?: string
  lastNameFirst?: string
  protocol?: string
}

export type BrandingMap = Record<string, Branding>
