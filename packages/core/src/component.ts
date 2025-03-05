//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
import type { Asset, IntlString, Plugin, StatusCode } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { BenchmarkDoc } from './benchmark'
import { AccountRole } from './classes'
import type {
  Account,
  AnyAttribute,
  ArrOf,
  Association,
  AttachedDoc,
  Blob,
  Class,
  Collection,
  Configuration,
  ConfigurationElement,
  Doc,
  DocIndexState,
  DomainIndexConfiguration,
  Enum,
  EnumOf,
  FullTextSearchContext,
  Hyperlink,
  IndexingConfiguration,
  Interface,
  MarkupBlobRef,
  MigrationState,
  Mixin,
  Obj,
  Permission,
  PersonId,
  PluginConfiguration,
  Rank,
  Ref,
  RefTo,
  RelatedDocument,
  Relation,
  Role,
  Sequence,
  Space,
  SpaceType,
  SpaceTypeDescriptor,
  SystemSpace,
  Timestamp,
  TransientConfiguration,
  Type,
  TypeAny,
  TypedSpace,
  UserStatus,
  Version,
  AccountUuid
} from './classes'
import { Status, StatusCategory } from './status'
import type {
  Tx,
  TxApplyIf,
  TxCUD,
  TxCreateDoc,
  TxMixin,
  TxModelUpgrade,
  TxRemoveDoc,
  TxUpdateDoc,
  TxWorkspaceEvent
} from './tx'

/**
 * @public
 */
export const coreId = 'core' as Plugin

/**
 * @public
 */
// TODO: consider removing email?
export const systemAccountEmail = 'anticrm@hc.engineering'
export const systemAccountUuid = '1749089e-22e6-48de-af4e-165e18fbd2f9' as AccountUuid
export const systemAccount: Account = {
  uuid: systemAccountUuid,
  role: AccountRole.Owner,
  primarySocialId: '' as PersonId,
  socialIds: []
}

export const configUserAccountUuid = '0d94731c-0787-4bcd-aefe-304efc3706b1' as AccountUuid

export default plugin(coreId, {
  class: {
    Obj: '' as Ref<Class<Obj>>,
    Doc: '' as Ref<Class<Doc>>,
    Blob: '' as Ref<Class<Blob>>,
    AttachedDoc: '' as Ref<Class<AttachedDoc>>,
    Class: '' as Ref<Class<Class<Obj>>>,
    Mixin: '' as Ref<Class<Mixin<Doc>>>,
    Interface: '' as Ref<Class<Interface<Doc>>>,
    Attribute: '' as Ref<Class<AnyAttribute>>,
    Tx: '' as Ref<Class<Tx>>,
    TxModelUpgrade: '' as Ref<Class<TxModelUpgrade>>,
    TxWorkspaceEvent: '' as Ref<Class<TxWorkspaceEvent>>,
    TxApplyIf: '' as Ref<Class<TxApplyIf>>,
    TxCUD: '' as Ref<Class<TxCUD<Doc>>>,
    TxCreateDoc: '' as Ref<Class<TxCreateDoc<Doc>>>,
    TxMixin: '' as Ref<Class<TxMixin<Doc, Doc>>>,
    TxUpdateDoc: '' as Ref<Class<TxUpdateDoc<Doc>>>,
    TxRemoveDoc: '' as Ref<Class<TxRemoveDoc<Doc>>>,
    Space: '' as Ref<Class<Space>>,
    SystemSpace: '' as Ref<Class<SystemSpace>>,
    TypedSpace: '' as Ref<Class<TypedSpace>>,
    SpaceTypeDescriptor: '' as Ref<Class<SpaceTypeDescriptor>>,
    SpaceType: '' as Ref<Class<SpaceType>>,
    Role: '' as Ref<Class<Role>>,
    Permission: '' as Ref<Class<Permission>>,
    Type: '' as Ref<Class<Type<any>>>,
    TypeRelation: '' as Ref<Class<Type<string>>>,
    TypeString: '' as Ref<Class<Type<string>>>,
    TypeBlob: '' as Ref<Class<Type<Ref<Blob>>>>,
    TypeIntlString: '' as Ref<Class<Type<IntlString>>>,
    TypeHyperlink: '' as Ref<Class<Type<Hyperlink>>>,
    TypeNumber: '' as Ref<Class<Type<number>>>,
    TypeFileSize: '' as Ref<Class<Type<number>>>,
    TypeMarkup: '' as Ref<Class<Type<string>>>,
    TypeRank: '' as Ref<Class<Type<Rank>>>,
    TypeRecord: '' as Ref<Class<Type<Record<any, any>>>>,
    TypeBoolean: '' as Ref<Class<Type<boolean>>>,
    TypeTimestamp: '' as Ref<Class<Type<Timestamp>>>,
    TypeDate: '' as Ref<Class<Type<Timestamp | Date>>>,
    TypeCollaborativeDoc: '' as Ref<Class<Type<MarkupBlobRef>>>,
    TypePersonId: '' as Ref<Class<Type<string>>>,
    TypeAccountUuid: '' as Ref<Class<Type<string>>>,
    RefTo: '' as Ref<Class<RefTo<Doc>>>,
    ArrOf: '' as Ref<Class<ArrOf<Doc>>>,
    Enum: '' as Ref<Class<Enum>>,
    EnumOf: '' as Ref<Class<EnumOf>>,
    Collection: '' as Ref<Class<Collection<AttachedDoc>>>,
    TypeAny: '' as Ref<Class<TypeAny>>,
    Version: '' as Ref<Class<Version>>,
    PluginConfiguration: '' as Ref<Class<PluginConfiguration>>,
    UserStatus: '' as Ref<Class<UserStatus>>,
    TypeRelatedDocument: '' as Ref<Class<Type<RelatedDocument>>>,
    DocIndexState: '' as Ref<Class<DocIndexState>>,
    DomainIndexConfiguration: '' as Ref<Class<DomainIndexConfiguration>>,

    Configuration: '' as Ref<Class<Configuration>>,

    Status: '' as Ref<Class<Status>>,
    StatusCategory: '' as Ref<Class<StatusCategory>>,
    MigrationState: '' as Ref<Class<MigrationState>>,

    BenchmarkDoc: '' as Ref<Class<BenchmarkDoc>>,
    FullTextSearchContext: '' as Ref<Mixin<FullTextSearchContext>>,
    Association: '' as Ref<Class<Association>>,
    Relation: '' as Ref<Class<Relation>>,
    Sequence: '' as Ref<Class<Sequence>>
  },
  icon: {
    TypeString: '' as Asset,
    TypeBlob: '' as Asset,
    TypeHyperlink: '' as Asset,
    TypeNumber: '' as Asset,
    TypeMarkup: '' as Asset,
    TypeRank: '' as Asset,
    TypeRecord: '' as Asset,
    TypeBoolean: '' as Asset,
    TypeDate: '' as Asset,
    TypeRef: '' as Asset,
    TypeArray: '' as Asset,
    TypeEnumOf: '' as Asset,
    TypeCollection: '' as Asset
  },
  mixin: {
    ConfigurationElement: '' as Ref<Mixin<ConfigurationElement>>,
    IndexConfiguration: '' as Ref<Mixin<IndexingConfiguration<Doc>>>,
    SpacesTypeData: '' as Ref<Mixin<Space>>,
    TransientConfiguration: '' as Ref<Mixin<TransientConfiguration>>
  },
  space: {
    Tx: '' as Ref<Space>,
    DerivedTx: '' as Ref<Space>,
    Model: '' as Ref<Space>,
    Space: '' as Ref<TypedSpace>,
    Configuration: '' as Ref<Space>,
    Workspace: '' as Ref<Space>
  },
  account: {
    System: '' as PersonId,
    ConfigUser: '' as PersonId
  },
  status: {
    ObjectNotFound: '' as StatusCode<{ _id: Ref<Doc> }>,
    ItemNotFound: '' as StatusCode<{ _id: Ref<Doc>, _localId: string }>
  },
  version: {
    Model: '' as Ref<Version>
  },
  string: {
    Id: '' as IntlString,
    Space: '' as IntlString,
    Spaces: '' as IntlString,
    SpacesDescription: '' as IntlString,
    TypedSpace: '' as IntlString,
    SpaceType: '' as IntlString,
    Modified: '' as IntlString,
    ModifiedDate: '' as IntlString,
    ModifiedBy: '' as IntlString,
    Class: '' as IntlString,
    AttachedTo: '' as IntlString,
    AttachedToClass: '' as IntlString,
    String: '' as IntlString,
    Record: '' as IntlString,
    Markup: '' as IntlString,
    Relation: '' as IntlString,
    Relations: '' as IntlString,
    AddRelation: '' as IntlString,
    Collaborative: '' as IntlString,
    CollaborativeDoc: '' as IntlString,
    MarkupBlobRef: '' as IntlString,
    PersonId: '' as IntlString,
    AccountId: '' as IntlString,
    Number: '' as IntlString,
    Boolean: '' as IntlString,
    Timestamp: '' as IntlString,
    Date: '' as IntlString,
    IntlString: '' as IntlString,
    Ref: '' as IntlString,
    Collection: '' as IntlString,
    Array: '' as IntlString,
    Name: '' as IntlString,
    Enum: '' as IntlString,
    Size: '' as IntlString,
    Description: '' as IntlString,
    ShortDescription: '' as IntlString,
    Descriptor: '' as IntlString,
    TargetClass: '' as IntlString,
    Role: '' as IntlString,
    Roles: '' as IntlString,
    Hyperlink: '' as IntlString,
    Private: '' as IntlString,
    Object: '' as IntlString,
    System: '' as IntlString,
    CreatedBy: '' as IntlString,
    CreatedDate: '' as IntlString,
    Status: '' as IntlString,
    Account: '' as IntlString,
    StatusCategory: '' as IntlString,
    Rank: '' as IntlString,
    Members: '' as IntlString,
    Owners: '' as IntlString,
    Permission: '' as IntlString,
    CreateObject: '' as IntlString,
    UpdateObject: '' as IntlString,
    DeleteObject: '' as IntlString,
    ForbidDeleteObject: '' as IntlString,
    UpdateSpace: '' as IntlString,
    ArchiveSpace: '' as IntlString,
    CreateObjectDescription: '' as IntlString,
    UpdateObjectDescription: '' as IntlString,
    DeleteObjectDescription: '' as IntlString,
    ForbidDeleteObjectDescription: '' as IntlString,
    UpdateSpaceDescription: '' as IntlString,
    ArchiveSpaceDescription: '' as IntlString,
    AutoJoin: '' as IntlString,
    AutoJoinDescr: '' as IntlString
  },
  descriptor: {
    SpacesType: '' as Ref<SpaceTypeDescriptor>
  },
  spaceType: {
    SpacesType: '' as Ref<SpaceType>
  },
  permission: {
    CreateObject: '' as Ref<Permission>,
    UpdateObject: '' as Ref<Permission>,
    DeleteObject: '' as Ref<Permission>,
    ForbidDeleteObject: '' as Ref<Permission>,
    UpdateSpace: '' as Ref<Permission>,
    ArchiveSpace: '' as Ref<Permission>
  },
  role: {
    Admin: '' as Ref<Role>
  }
})
