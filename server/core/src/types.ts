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

import type { Account, Class, Doc, DocumentQuery, FindOptions, FindResult, MeasureContext, ModelDb, Obj, Ref, ServerStorage, Space, Storage, Timestamp, Tx, TxResult } from '@anticrm/core'
import { Hierarchy, TxFactory } from '@anticrm/core'
import type { Resource } from '@anticrm/platform'
import type { Client as MinioClient } from 'minio'

/**
 * @public
 */
export interface SessionContext extends MeasureContext {
  userEmail: string
}

/**
 * @public
 */
export interface Middleware {
  tx: (ctx: SessionContext, tx: Tx) => Promise<TxMiddlewareResult>
  findAll: <T extends Doc>(ctx: SessionContext, _class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>) => Promise<FindAllMiddlewareResult<T>>
}

/**
 * @public
 */
export type MiddlewareCreator = (storage: ServerStorage, next?: Middleware) => Middleware

/**
 * @public
 */
export type TxMiddlewareResult = [SessionContext, Tx, string | undefined]

/**
 * @public
 */
export type FindAllMiddlewareResult<T extends Doc> = [SessionContext, Ref<Class<T>>, DocumentQuery<T>, FindOptions<T> | undefined]

/**
 * @public
 */
export interface Pipeline {
  findAll: <T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
  tx: (ctx: SessionContext, tx: Tx) => Promise<[TxResult, Tx[], string | undefined]>
  close: () => Promise<void>
}

/**
 * @public
 */
export interface TriggerControl {
  txFactory: TxFactory
  findAll: Storage['findAll']
  hierarchy: Hierarchy
  modelDb: ModelDb

  fulltextFx: (f: (adapter: FullTextAdapter) => Promise<void>) => void
  // Since we don't have other storages let's consider adapter is MinioClient
  // Later can be replaced with generic one with bucket encapsulated inside.
  storageFx: (f: (adapter: MinioClient, bucket: string) => Promise<void>) => void
  fx: (f: () => Promise<void>) => void
}

/**
 * @public
 */
export type TriggerFunc = (tx: Tx, ctrl: TriggerControl) => Promise<Tx[]>

/**
 * @public
 */
export interface Trigger extends Doc {
  trigger: Resource<TriggerFunc>
}

/**
 * @public
 */
export interface IndexedDoc {
  id: Ref<Doc>
  _class: Ref<Class<Doc>>
  space: Ref<Space>
  modifiedOn: Timestamp
  modifiedBy: Ref<Account>
  attachedTo?: Ref<Doc>
  attachedToClass?: Ref<Class<Doc>>

  [key: string]: any
}

/**
 * @public
 */
export interface FullTextAdapter {
  index: (doc: IndexedDoc) => Promise<TxResult>
  update: (id: Ref<Doc>, update: Record<string, any>) => Promise<TxResult>
  remove: (id: Ref<Doc>) => Promise<void>
  search: (_classes: Ref<Class<Doc>>[], search: DocumentQuery<Doc>, size: number | undefined, from?: number) => Promise<IndexedDoc[]>
  close: () => Promise<void>
}

/**
 * @public
 */
export type FullTextAdapterFactory = (url: string, workspace: string) => Promise<FullTextAdapter>

/**
 * @public
 */
export interface WithFind {
  findAll: <T extends Doc> (ctx: MeasureContext, clazz: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>) => Promise<FindResult<T>>
}

/**
 * Allow to contribute and find all derived objects for document.
 * @public
 */
export interface ObjectDDParticipant extends Class<Obj> {
  // Collect more items to be deleted if parent document is deleted.
  collectDocs: Resource<(doc: Doc, hiearachy: Hierarchy, findAll: <T extends Doc> (clazz: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>) => Promise<FindResult<T>>) => Promise<Doc[]>>
}
