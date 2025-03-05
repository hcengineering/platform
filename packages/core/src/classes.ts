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
import type { DocumentQuery } from './storage'
import { WorkspaceDataId, WorkspaceUuid } from './utils'

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
export type CollectionSize<T> = T[]['length']

/**
 * @public
 *
 * String representation of {@link https://www.npmjs.com/package/lexorank LexoRank} type
 */
export type Rank = string

/**
 * @public
 *
 * Reference to blob containing snapshot of collaborative doc.
 */
export type MarkupBlobRef = Ref<Blob>

/**
 * @public
 */
export interface Obj {
  _class: Ref<Class<this>>
}

export interface Account {
  uuid: AccountUuid
  role: AccountRole
  primarySocialId: PersonId
  socialIds: PersonId[]
}

/**
 * @public
 * Global person UUID.
 */
export type PersonUuid = string & { __personUuid: true }

/**
 * @public
 * Global person account UUID.
 * The same UUID as PersonUuid but for when account exists.
 */
export type AccountUuid = PersonUuid & { __accountUuid: true }

/**
 * @public
 * String representation of a social id linked to a global person.
 * E.g. email:pied.piper@hcengineering.com or huly:ea3bf257-94b5-4a31-a7da-466d578d850f
 */
export type PersonId = string & { __personId: true }

export interface BasePerson {
  name: string
  personUuid?: PersonUuid
}

/**
 * @public
 */
export interface Doc<S extends Space = Space> extends Obj {
  _id: Ref<this>
  space: Ref<S>
  modifiedOn: Timestamp
  modifiedBy: PersonId
  createdBy?: PersonId // Marked as optional since it will be filled by platform.
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
export interface Association extends Doc {
  classA: Ref<Class<Doc>>
  classB: Ref<Class<Doc>>
  nameA: string
  nameB: string
  type: '1:1' | '1:N' | 'N:N'
}

/**
 * @public
 */
export interface Relation extends Doc {
  docA: Ref<Doc>
  docB: Ref<Doc>
  association: Ref<Association>
}

/**
 * @public
 */
export interface AttachedDoc<
  Parent extends Doc = Doc,
  Collection extends Extract<keyof Parent, string> | string = Extract<keyof Parent, string> | string,
  S extends Space = Space
> extends Doc<S> {
  attachedTo: Ref<Parent>
  attachedToClass: Ref<Class<Parent>>
  collection: Collection
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
   *
   * Also mean to include into Elastic search.
   */
  Indexed,

  // Same as indexed but for descending
  IndexedDsc
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
  pluralLabel?: IntlString
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
  DATETIME = 'datetime',
  TIMEONLY = 'timeonly'
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
export interface Collection<T extends AttachedDoc> extends Type<CollectionSize<T>> {
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
 *
 * A type for some custom serialized field with a set of editors
 */
export interface TypeAny<AnyComponent = any> extends Type<any> {
  presenter: AnyComponent
  editor?: AnyComponent
}

/**
 * @public
 */
export const DOMAIN_MODEL = 'model' as Domain

/**
 * @public
 */
export const DOMAIN_MODEL_TX = 'model_tx' as Domain

/**
 * @public
 */
export const DOMAIN_SPACE = 'space' as Domain

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
 * @public
 */
export const DOMAIN_RELATION = 'relation' as Domain

/**
 * @public
 */
export interface TransientConfiguration extends Class<Doc> {
  // If set will not store transient objects into memdb
  broadcastOnly: boolean
}

/**
 * Special domain to access s3 blob data.
 * @public
 */
export const DOMAIN_BLOB = 'blob' as Domain

export const DOMAIN_DOC_INDEX_STATE = 'doc-index-state' as Domain

/**
 * @public
 */
export const DOMAIN_SEQUENCE = 'sequence' as Domain

// S P A C E

/**
 * @public
 */
export interface Space extends Doc {
  name: string
  description: string
  private: boolean
  members: AccountUuid[]
  archived: boolean
  owners?: AccountUuid[]
  autoJoin?: boolean
}

/**
 * @public
 */
export interface SystemSpace extends Space {}

/**
 * @public
 *
 * Space with custom configured type
 */
export interface TypedSpace extends Space {
  type: Ref<SpaceType>
}

/**
 * @public
 *
 * Is used to describe "types" for space type
 */
export interface SpaceTypeDescriptor extends Doc {
  name: IntlString
  description: IntlString
  icon: Asset
  baseClass: Ref<Class<Space>> // Child class of Space for which the space type can be defined
  availablePermissions: Ref<Permission>[]
  system?: boolean
}

/**
 * @public
 *
 * Customisable space type allowing to configure space roles and permissions within them
 */
export interface SpaceType extends Doc {
  name: string
  shortDescription?: string
  descriptor: Ref<SpaceTypeDescriptor>
  members?: AccountUuid[] // this members will be added automatically to new space, also change this fiield will affect existing spaces
  autoJoin?: boolean // if true, all new users will be added to space automatically
  targetClass: Ref<Class<Space>> // A dynamic mixin for Spaces to hold custom attributes and roles assignment of the space type
  roles: CollectionSize<Role>
}

/**
 * @public
 * Role defines permissions for employees assigned to this role within the space
 */
export interface Role extends AttachedDoc<SpaceType, 'roles'> {
  name: string
  permissions: Ref<Permission>[]
}

/**
 * @public
 * Defines assignment of employees to a role within a space
 */
export type RolesAssignment = Record<Ref<Role>, AccountUuid[] | undefined>

/**
 * @public
 * Permission is a basic access control item in the system
 */
export interface Permission extends Doc {
  label: IntlString
  description?: IntlString
  icon?: Asset
}

/**
 * @public
 */
export enum AccountRole {
  DocGuest = 'DocGuest',
  Guest = 'GUEST',
  User = 'USER',
  Maintainer = 'MAINTAINER',
  Owner = 'OWNER'
}

/**
 * @public
 */
export const roleOrder: Record<AccountRole, number> = {
  [AccountRole.DocGuest]: 10,
  [AccountRole.Guest]: 20,
  [AccountRole.User]: 30,
  [AccountRole.Maintainer]: 40,
  [AccountRole.Owner]: 50
}

/**
 * @public
 */
export interface Person {
  uuid: string
  firstName: string
  lastName: string
  country?: string
  city?: string
}

export interface PersonInfo extends BasePerson {
  socialIds: PersonId[]
}

/**
 * @public
 */
// TODO: move to contact
export interface UserStatus extends Doc {
  online: boolean
  user: AccountUuid
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
export function versionToString (version: Version | Data<Version>): string {
  return `${version?.major}.${version?.minor}.${version?.patch}`
}

/**
 * @public
 *
 * Define status for full text indexing
 */
export interface DocIndexState extends Doc {
  objectClass: Ref<Class<Doc>>
  needIndex: boolean
  removed: boolean
}

/**
 * @public
 */
export interface Sequence extends Doc {
  attachedTo: Ref<Class<Doc>>
  sequence: number
}

/**
 * @public
 *
 * A blob document to manage blob attached documents.
 *
 * _id: is a platform ID and it created using our regular generateId(),
 * and storageId is a provider specified storage id.
 */
export interface Blob extends Doc {
  // Provider
  provider: string
  // A provider specific id
  contentType: string
  // A etag for blob
  etag: string
  // Document version if supported by provider
  version: string | null
  // A document size
  size: number
}

/**
 * For every blob will automatically add a lookup.
 *
 * It extends Blob to allow for $lookup operations work as expected.
 */
export interface BlobLookup extends Blob {
  // An URL document could be downloaded from, with ${id} to put blobId into
  downloadUrl: string
  downloadUrlExpire?: number
}

/**
 * @public
 *
 * If defined for class, this class will be enabled for embedding search like openai.
 */
export interface FullTextSearchContext extends Doc {
  toClass: Ref<Class<Doc>>
  fullTextSummary?: boolean
  forceIndex?: boolean

  // If defined, will propagate changes to child's with defined set of classes
  propagate?: Ref<Class<Doc>>[]
  // If defined, will propagate all document from child's based on class
  propagateClasses?: Ref<Class<Doc>>[]

  childProcessingAllowed?: boolean
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
} & Record<string, IndexOrder>

export interface FieldIndexConfig<T extends Doc> {
  sparse?: boolean
  filter?: Omit<DocumentQuery<T>, '$search'>
  keys: FieldIndex<T> | string
}

/**
 * @public
 *
 * Mixin for extra indexing fields.
 */
export interface IndexingConfiguration<T extends Doc> extends Class<Doc> {
  // Define a list of extra index definitions.
  indexes: (string | FieldIndexConfig<T>)[]
  searchDisabled?: boolean
}

export interface DomainIndexConfiguration extends Doc {
  domain: Domain
  disableCollection?: boolean // For some special cases we could decide to disable collection and index creations at all.

  // A set of indexes we need to disable for domain
  // Disabled indexes will be removed
  disabled?: (FieldIndex<Doc> | string)[]

  // Additional indexes we could like to enabled
  indexes?: (FieldIndexConfig<Doc> | string)[]

  skip?: string[]
}

export type WorkspaceMode =
  | 'manual-creation'
  | 'pending-creation' // -> 'creating'
  | 'creating' // -> 'active
  | 'upgrading' // -> 'active'
  | 'pending-deletion' // -> 'deleting'
  | 'deleting' // -> "deleted"
  | 'active'
  | 'deleted'
  | 'archiving-pending-backup' // -> 'cleaning'
  | 'archiving-backup' // -> 'archiving-pending-clean'
  | 'archiving-pending-clean' // -> 'archiving-clean'
  | 'archiving-clean' // -> 'archived'
  | 'archived'
  | 'migration-pending-backup' // -> 'migration-backup'
  | 'migration-backup' // -> 'migration-pending-cleanup'
  | 'migration-pending-clean' // -> 'migration-pending-cleaning'
  | 'migration-clean' // -> 'pending-restoring'
  | 'pending-restore' // -> 'restoring'
  | 'restoring' // -> 'active'

export type WorkspaceUserOperation = 'archive' | 'migrate-to' | 'unarchive' | 'delete' | 'reset-attempts'

export function isActiveMode (mode?: WorkspaceMode): boolean {
  return mode === 'active'
}
export function isDeletingMode (mode: WorkspaceMode): boolean {
  return mode === 'pending-deletion' || mode === 'deleting' || mode === 'deleted'
}
export function isArchivingMode (mode?: WorkspaceMode): boolean {
  return (
    mode === 'archiving-pending-backup' ||
    mode === 'archiving-backup' ||
    mode === 'archiving-pending-clean' ||
    mode === 'archiving-clean' ||
    mode === 'archived'
  )
}

export function isMigrationMode (mode?: WorkspaceMode): boolean {
  return (
    mode === 'migration-pending-backup' ||
    mode === 'migration-backup' ||
    mode === 'migration-pending-clean' ||
    mode === 'migration-clean'
  )
}
export function isRestoringMode (mode?: WorkspaceMode): boolean {
  return mode === 'restoring' || mode === 'pending-restore'
}

export function isUpgradingMode (mode?: WorkspaceMode): boolean {
  return mode === 'upgrading'
}

export type WorkspaceUpdateEvent =
  | 'ping'
  | 'create-started'
  | 'create-done'
  | 'upgrade-started'
  | 'upgrade-done'
  | 'restore-started'
  | 'restore-done'
  | 'progress'
  | 'migrate-backup-started' // -> state = 'migration-backup'
  | 'migrate-backup-done' // -> state = 'migration-pending-cleaning'
  | 'migrate-clean-started' // -> state = 'migration-cleaning'
  | 'migrate-clean-done' // -> state = 'pending-restoring'
  | 'archiving-backup-started' // -> state = 'archiving'
  | 'archiving-backup-done' // -> state = 'archiving-pending-cleaning'
  | 'archiving-clean-started'
  | 'archiving-clean-done'
  | 'archiving-done'
  | 'delete-started'
  | 'delete-done'

export interface WorkspaceInfo {
  uuid: WorkspaceUuid
  dataId?: WorkspaceDataId // Old workspace identifier. E.g. Database name in Mongo, bucket in R2, etc.
  name: string
  url: string
  region?: string
  branding?: string
  createdOn: number
  createdBy?: PersonUuid // Should always be set for NEW workspaces
  billingAccount?: PersonUuid // Should always be set for NEW workspaces
}

export interface BackupStatus {
  dataSize: number
  blobsSize: number

  backupSize: number

  lastBackup: Timestamp
  backups: number
}

export interface WorkspaceInfoWithStatus extends WorkspaceInfo {
  isDisabled?: boolean
  versionMajor: number
  versionMinor: number
  versionPatch: number
  lastVisit?: number
  mode: WorkspaceMode
  processingProgress?: number
  backupInfo?: BackupStatus
}

export interface WorkspaceMemberInfo {
  person: PersonUuid
  role: AccountRole
}

export enum SocialIdType {
  EMAIL = 'email',
  GITHUB = 'github',
  GOOGLE = 'google',
  PHONE = 'phone',
  OIDC = 'oidc',
  HULY = 'huly',
  TELEGRAM = 'telegram'
}
export interface SocialId {
  id: string
  type: SocialIdType
  value: string
  key: PersonId
  verifiedOn?: number
}

export type SocialKey = Pick<SocialId, 'type' | 'value'>
