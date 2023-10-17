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

import type { Asset, IntlString, Plugin } from '@hcengineering/platform'

/**
 * @public
 */
export type Ref<T extends Doc> = string & { __ref: T }

/**
 * @public
 */
export type PrimitiveType = number | string | boolean | undefined | Ref<Doc>

/**
 * @public
 */
export type Timestamp = number

/**
 * @public
 */
export type Markup = string

/**
 * @public
 */
export type Hyperlink = string

/**
 * @public
 */
export interface Obj {
  _class: Ref<Class<this>>
}

/**
 * @public
 */
export interface Doc extends Obj {
  _id: Ref<this>
  space: Ref<Space>
  modifiedOn: Timestamp
  modifiedBy: Ref<Account>
  createdBy?: Ref<Account> // Marked as optional since it will be filled by platform.
  createdOn?: Timestamp // Marked as optional since it will be filled by platform.
}

/**
 * @public
 */
export type PropertyType = any

/**
 * @public
 */
export interface UXObject extends Obj {
  label: IntlString
  icon?: Asset
  hidden?: boolean
  readonly?: boolean
}

/**
 * @public
 */
export interface AttachedDoc extends Doc {
  attachedTo: Ref<Doc>
  attachedToClass: Ref<Class<Doc>>
  collection: string
}

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Type<T extends PropertyType> extends UXObject {}

/**
 * @public
 */
export enum IndexKind {
  /**
   * Attribute with this index annotation should be added to elastic for search
   * Could be added to string or Ref attribute
   * TODO: rename properly for better code readability
   */
  FullText,
  /**
   * For attribute with this annotation should be created an index in mongo database
   */
  Indexed
}

/**
 * @public
 */
export interface Enum extends Doc {
  name: string
  enumValues: string[]
}

/**
 * @public
 */
export interface Attribute<T extends PropertyType> extends Doc, UXObject {
  attributeOf: Ref<Class<Obj>>
  name: string
  type: Type<T>
  index?: IndexKind
  shortLabel?: IntlString
  isCustom?: boolean
  defaultValue?: any

  // Extra customization properties
  [key: string]: any
}

/**
 * @public
 */
export type AnyAttribute = Attribute<Type<any>>

/**
 * @public
 */
export enum ClassifierKind {
  CLASS,
  INTERFACE,
  MIXIN
}

/**
 * @public
 */
export interface Classifier extends Doc, UXObject {
  kind: ClassifierKind
}

/**
 * @public
 */
export type Domain = string & { __domain: true }

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Interface<T extends Doc> extends Classifier {
  extends?: Ref<Interface<Doc>>[]
}

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Class<T extends Obj> extends Classifier {
  extends?: Ref<Class<Obj>>
  implements?: Ref<Interface<Doc>>[]
  domain?: Domain
  shortLabel?: string
  sortingKey?: string
  filteringKey?: string
}

/**
 * @public
 * Define a set of plugin to model document bindings.
 */
export interface PluginConfiguration extends Doc {
  pluginId: Plugin
  transactions: Ref<Doc>[]

  label?: IntlString
  icon?: Asset
  description?: IntlString
  enabled: boolean

  // If specified, will show beta/testing label in UI.
  beta: boolean

  // If defined, will only remove classes in list.
  classFilter?: Ref<Class<Obj>>[]
}

/**
 * @public
 */
export type Mixin<T extends Doc> = Class<T>

// D A T A

/**
 * @public
 */
export type Data<T extends Doc> = Omit<T, keyof Doc>

/**
 * @public
 */
export type AttachedData<T extends AttachedDoc> = Omit<T, keyof AttachedDoc>

/**
 * @public
 */
export type DocData<T extends Doc> = T extends AttachedDoc ? AttachedData<T> : Data<T>

// T Y P E S

/**
 * @public
 */
export enum DateRangeMode {
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime'
}

/**
 * @public
 */
export interface TypeDate extends Type<Date> {
  // If not set date mode default
  mode: DateRangeMode
  // If not set to true, will be false
  withShift: boolean
}

/**
 * @public
 */
export interface RefTo<T extends Doc> extends Type<Ref<Class<T>>> {
  to: Ref<Class<T>>
}

/**
 * @public
 */
export interface Collection<T extends AttachedDoc> extends Type<number> {
  of: Ref<Class<T>>
  itemLabel?: IntlString
}

/**
 * @public
 */
export type Arr<T extends PropertyType> = T[]

/**
 * @public
 */
export interface ArrOf<T extends PropertyType> extends Type<T[]> {
  of: Type<T>
}

/**
 * @public
 */
export interface EnumOf extends Type<string> {
  of: Ref<Enum>
}

/**
 * @public
 */
export interface TypeHyperlink extends Type<Hyperlink> {}

/**
 * @public
 */
export const DOMAIN_MODEL = 'model' as Domain

/**
 * @public
 */
export const DOMAIN_CONFIGURATION = '_configuration' as Domain

/**
 * @public
 */
export const DOMAIN_MIGRATION = '_migrations' as Domain

/**
 * @public
 */
export const DOMAIN_TRANSIENT = 'transient' as Domain

/**
 * Special domain to access s3 blob data.
 * @public
 */
export const DOMAIN_BLOB = 'blob' as Domain

/**
 * Special domain to access s3 blob data.
 * @public
 */
export const DOMAIN_FULLTEXT_BLOB = 'fulltext-blob' as Domain

/**
 * Special domain to access s3 blob data.
 * @public
 */
export const DOMAIN_DOC_INDEX_STATE = 'doc-index-state' as Domain

// S P A C E

/**
 * @public
 */
export interface Space extends Doc {
  name: string
  description: string
  private: boolean
  members: Arr<Ref<Account>>
  archived: boolean
}

/**
 * @public
 */
export interface Account extends Doc {
  email: string
  role: AccountRole
}

/**
 * @public
 */
export enum AccountRole {
  User,
  Maintainer,
  Owner
}

/**
 * @public
 */
export interface UserStatus extends Doc {
  online: boolean
}

/**
 * @public
 */
export interface Version extends Doc {
  major: number
  minor: number
  patch: number
}

/**
 * @public
 */
export interface MigrationState extends Doc {
  plugin: string
  state: string
}

/**
 * @public
 */
export function versionToString (version: Version): string {
  return `${version?.major}.${version?.minor}.${version?.patch}`
}

/**
 * Blob data from s3 storage
 * @public
 */
export interface BlobData extends Doc {
  name: string
  size: number
  type: string
  base64Data: string // base64 encoded data
}

/**
 * Blob data from s3 storage
 * @public
 */
export interface FullTextData extends Doc {
  data: any
}

/**
 * @public
 *
 * Define status for full text indexing
 */
export interface DocIndexState extends Doc {
  objectClass: Ref<Class<Doc>>

  attachedTo?: Ref<Doc>
  attachedToClass?: Ref<Class<Doc>>

  // States for stages
  stages: Record<string, boolean | string>

  removed: boolean

  // Indexable attributes, including child ones.
  attributes: Record<string, any>

  // Full Summary
  fullSummary?: Markup | null
  shortSummary?: Markup | null
}

/**
 * @public
 */
export interface IndexStageState extends Doc {
  stageId: string
  attributes: Record<string, any>
}

/**
 * @public
 *
 * If defined for class, this class will be enabled for embedding search like openai.
 */
export interface FullTextSearchContext extends Class<Doc> {
  fullTextSummary?: boolean
  forceIndex?: boolean

  // If defined, will propagate changes to child's with defined set of classes
  propagate?: Ref<Class<Doc>>[]
  // If defined, will propagate all document from child's based on class
  propagateClasses?: Ref<Class<Doc>>[]

  // Do we need to propagate child value to parent one. Default(true)
  parentPropagate?: boolean
}

/**
 * @public
 */
export interface ConfigurationElement extends Class<Doc> {
  // Title will be presented to owner.
  title: IntlString
  // Group for grouping.
  group: IntlString
}

/**
 * @public
 *
 * Define configuration value configuration for workspace.
 *
 * Configuration is accessible only for owners of workspace and under hood services.
 */
export interface Configuration extends Doc {
  enabled: boolean
}

/**
 * @public
 */
export type RelatedDocument = Pick<Doc, '_id' | '_class'>

/**
 * @public
 */
export enum IndexOrder {
  Ascending = 1,
  Descending = -1
}

/**
 * @public
 */
export type FieldIndex<T extends Doc> = {
  [P in keyof T]?: IndexOrder
} & {
  [key: string]: IndexOrder
}

/**
 * @public
 *
 * Mixin for extra indexing fields.
 */
export interface IndexingConfiguration<T extends Doc> extends Class<Doc> {
  // Define a list of extra index definitions.
  indexes: (FieldIndex<T> | string)[]
}
