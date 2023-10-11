//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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

import {
  Account,
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  LowLevelStorage,
  MeasureContext,
  MeasureMetricsContext,
  ModelDb,
  Obj,
  Ref,
  ServerStorage,
  Space,
  Storage,
  Timestamp,
  Tx,
  TxFactory,
  TxResult,
  WorkspaceId
} from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import type { Resource } from '@hcengineering/platform'
import { Readable } from 'stream'

/**
 * @public
 */
export interface SessionContext extends MeasureContext {
  userEmail: string
  sessionId: string
}

/**
 * @public
 */
export interface Middleware {
  tx: (ctx: SessionContext, tx: Tx) => Promise<TxMiddlewareResult>
  findAll: <T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
}

/**
 * @public
 */
export type BroadcastFunc = (tx: Tx[], targets?: string[]) => void

/**
 * @public
 */
export type MiddlewareCreator = (
  ctx: MeasureContext,
  broadcast: BroadcastFunc,
  storage: ServerStorage,
  next?: Middleware
) => Promise<Middleware>

/**
 * @public
 */
export type TxMiddlewareResult = [TxResult, Tx[], string[] | undefined]

/**
 * @public
 */
export interface Pipeline extends LowLevelStorage {
  modelDb: ModelDb
  storage: ServerStorage
  findAll: <T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
  tx: (ctx: SessionContext, tx: Tx) => Promise<[TxResult, Tx[], string[] | undefined]>
  close: () => Promise<void>
}

/**
 * @public
 */
export interface TriggerControl {
  workspace: WorkspaceId
  txFactory: TxFactory
  findAll: Storage['findAll']
  hierarchy: Hierarchy
  modelDb: ModelDb
  removedMap: Map<Ref<Doc>, Doc>

  fulltextFx: (f: (adapter: FullTextAdapter) => Promise<void>) => void
  // Since we don't have other storages let's consider adapter is MinioClient
  // Later can be replaced with generic one with bucket encapsulated inside.
  storageFx: (f: (adapter: StorageAdapter, workspaceId: WorkspaceId) => Promise<void>) => void
  fx: (f: () => Promise<void>) => void

  // Bulk operations in case trigger require some
  apply: (tx: Tx[], broadcast: boolean) => Promise<void>
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

  // We should match transaction
  txMatch?: DocumentQuery<Tx>
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
export interface EmbeddingSearchOption {
  field: string
  field_enable: string
  size?: number
  from?: number
  embeddingBoost?: number // default 100
  fulltextBoost?: number // default 10
  minScore?: number // 75 for example.
}

/**
 * @public
 */
export type StorageAdapter = MinioService

/**
 * @public
 */
export interface FullTextAdapter {
  index: (doc: IndexedDoc) => Promise<TxResult>
  update: (id: Ref<Doc>, update: Record<string, any>) => Promise<TxResult>
  remove: (id: Ref<Doc>[]) => Promise<void>
  updateMany: (docs: IndexedDoc[]) => Promise<TxResult[]>
  search: (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ) => Promise<IndexedDoc[]>

  searchEmbedding: (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    embedding: number[],
    options: EmbeddingSearchOption
  ) => Promise<IndexedDoc[]>

  close: () => Promise<void>
  metrics: () => MeasureContext

  // If no field is provided, will return existing mapping of all dimms.
  initMapping: (field?: { key: string, dims: number }) => Promise<Record<string, number>>

  load: (docs: Ref<Doc>[]) => Promise<IndexedDoc[]>
}

/**
 * @public
 */
export class DummyFullTextAdapter implements FullTextAdapter {
  async initMapping (field?: { key: string, dims: number }): Promise<Record<string, number>> {
    return {}
  }

  async index (doc: IndexedDoc): Promise<TxResult> {
    return {}
  }

  async load (docs: Ref<Doc>[]): Promise<IndexedDoc[]> {
    return []
  }

  async update (id: Ref<Doc>, update: Record<string, any>): Promise<TxResult> {
    return {}
  }

  async updateMany (docs: IndexedDoc[]): Promise<TxResult[]> {
    return []
  }

  async search (query: any): Promise<IndexedDoc[]> {
    return []
  }

  async searchEmbedding (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    embedding: number[],
    options: EmbeddingSearchOption
  ): Promise<IndexedDoc[]> {
    return []
  }

  async remove (id: Ref<Doc>[]): Promise<void> {}

  async close (): Promise<void> {}

  metrics (): MeasureContext {
    return new MeasureMetricsContext('', {})
  }
}

/**
 * @public
 */
export type FullTextAdapterFactory = (
  url: string,
  workspace: WorkspaceId,
  context: MeasureContext
) => Promise<FullTextAdapter>

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
export interface ContentTextAdapter {
  content: (name: string, type: string, doc: Readable | Buffer | string) => Promise<string>
  metrics: () => MeasureContext
}

/**
 * @public
 */
export type ContentTextAdapterFactory = (
  url: string,
  workspace: WorkspaceId,
  context: MeasureContext
) => Promise<ContentTextAdapter>

/**
 * @public
 */
export interface WithFind {
  findAll: <T extends Doc>(
    ctx: MeasureContext,
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<FindResult<T>>
}

/**
 * Allow to contribute and find all derived objects for document.
 * @public
 */
export interface ObjectDDParticipant extends Class<Obj> {
  // Collect more items to be deleted if parent document is deleted.
  collectDocs: Resource<
  (
    doc: Doc,
    hiearachy: Hierarchy,
    findAll: <T extends Doc>(
      clazz: Ref<Class<T>>,
      query: DocumentQuery<T>,
      options?: FindOptions<T>
    ) => Promise<FindResult<T>>
  ) => Promise<Doc[]>
  >
}
