//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { type ClientSocketFactory } from '@hcengineering/client'
import {
  CollaborativeDoc,
  type AttachedData,
  type AttachedDoc,
  type Class,
  type Data,
  type Doc,
  type DocumentQuery,
  type DocumentUpdate,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type Mixin,
  type MixinData,
  type MixinUpdate,
  type ModelDb,
  type Ref,
  type Space,
  type TxResult,
  type WithLookup
} from '@hcengineering/core'
import { type MarkupContent, type MarkupOperations } from './markup'

type WithPropertyType<T, X, Y> = {
  [P in keyof T]: T[P] extends X ? Y : T[P]
}

/** @public */
export type WithMarkup<T> = WithPropertyType<
WithPropertyType<T, CollaborativeDoc | undefined, MarkupContent | undefined>,
CollaborativeDoc,
MarkupContent
>

/**
 * Platform API client
 * @public
 * */
export type PlatformClient = {
  getHierarchy: () => Hierarchy

  getModel: () => ModelDb

  close: () => Promise<void>
} & FindOperations &
DocOperations &
CollectionOperations &
MixinOperations &
MarkupOperations &
AsyncDisposable

/**
 * @public
 */
export interface FindOperations {
  findAll: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ) => Promise<FindResult<T>>

  findOne: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ) => Promise<WithLookup<T> | undefined>
}

/**
 * @public
 */
export interface DocOperations {
  createDoc: <T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    attributes: WithMarkup<Data<T>>,
    id?: Ref<T>
  ) => Promise<Ref<T>>

  updateDoc: <T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>,
    operations: WithMarkup<DocumentUpdate<T>>,
    retrieve?: boolean
  ) => Promise<TxResult>

  removeDoc: <T extends Doc>(_class: Ref<Class<T>>, space: Ref<Space>, objectId: Ref<T>) => Promise<TxResult>
}

/**
 * @public
 */
export interface CollectionOperations {
  addCollection: <T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: Extract<keyof T, string> | string,
    attributes: WithMarkup<AttachedData<P>>,
    id?: Ref<P>
  ) => Promise<Ref<P>>

  updateCollection: <T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    objectId: Ref<P>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: Extract<keyof T, string> | string,
    operations: WithMarkup<DocumentUpdate<P>>,
    retrieve?: boolean
  ) => Promise<Ref<T>>

  removeCollection: <T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    objectId: Ref<P>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: Extract<keyof T, string> | string
  ) => Promise<Ref<T>>
}

/**
 * @public
 */
export interface MixinOperations {
  createMixin: <D extends Doc, M extends D>(
    objectId: Ref<D>,
    objectClass: Ref<Class<D>>,
    objectSpace: Ref<Space>,
    mixin: Ref<Mixin<M>>,
    attributes: WithMarkup<MixinData<D, M>>
  ) => Promise<TxResult>

  updateMixin: <D extends Doc, M extends D>(
    objectId: Ref<D>,
    objectClass: Ref<Class<D>>,
    objectSpace: Ref<Space>,
    mixin: Ref<Mixin<M>>,
    attributes: WithMarkup<MixinUpdate<D, M>>
  ) => Promise<TxResult>
}

/**
 * Configuration options for password-based authentication
 * @public
 */
export interface PasswordAuthOptions {
  /** User's email address */
  email: string

  /** User's password */
  password: string

  /** Workspace URL name */
  workspace: string
}

/**
 * Configuration options for token-based authentication
 * @public
 */
export interface TokenAuthOptions {
  /** Authentication token */
  token: string

  /** Workspace URL name */
  workspace: string
}

/**
 * Union type representing all authentication options
 * Can be either password-based or token-based authentication
 * @public
 */
export type AuthOptions = PasswordAuthOptions | TokenAuthOptions

/**
 * Configuration options for socket connection
 * @public
 */
export interface ConnectSocketOptions {
  /**
   * Optional factory for creating custom WebSocket implementations
   * Particularly useful in Node.js environments where you might need
   * to provide a specific WebSocket client implementation
   * If not provided, a default WebSocket implementation will be used
   */
  socketFactory?: ClientSocketFactory

  /**
   * Optional timeout duration for the connection attempt in milliseconds
   * Specifies how long to wait for a connection before timing out
   */
  connectionTimeout?: number
}

/**
 * API connect options
 * @public
 */
export type ConnectOptions = ConnectSocketOptions & AuthOptions
