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

import {
  DOMAIN_BENCHMARK,
  DOMAIN_BLOB,
  DOMAIN_CONFIGURATION,
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_MIGRATION,
  DOMAIN_SPACE,
  DOMAIN_STATUS,
  DOMAIN_TRANSIENT,
  DOMAIN_TX
} from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import { TBenchmarkDoc } from './benchmark'
import core from './component'
import {
  TArrOf,
  TAssociation,
  TAttachedDoc,
  TAttribute,
  TBlob,
  TClass,
  TCollection,
  TConfiguration,
  TConfigurationElement,
  TDoc,
  TDocIndexState,
  TDomainIndexConfiguration,
  TEnum,
  TEnumOf,
  TFullTextSearchContext,
  TIndexConfiguration,
  TInterface,
  TMigrationState,
  TMixin,
  TObj,
  TPluginConfiguration,
  TRefTo,
  TRelation,
  TTransientConfiguration,
  TType,
  TTypeAny,
  TTypeBlob,
  TTypeBoolean,
  TTypeCollaborativeDoc,
  TTypeDate,
  TTypeFileSize,
  TTypeHyperlink,
  TTypeIntlString,
  TTypeMarkup,
  TTypePersonId,
  TTypeAccountUuid,
  TTypeNumber,
  TTypeRank,
  TTypeRecord,
  TTypeRelatedDocument,
  TTypeString,
  TTypeTimestamp,
  TVersion,
  TSequence
} from './core'
import { definePermissions } from './permissions'
import { TPermission, TRole, TSpace, TSpaceType, TSpaceTypeDescriptor, TSystemSpace, TTypedSpace } from './security'
import { defineSpaceType } from './spaceType'
import { TDomainStatusPlaceholder, TStatus, TStatusCategory } from './status'
import { TUserStatus } from './transient'
import { TTx, TTxApplyIf, TTxCreateDoc, TTxCUD, TTxMixin, TTxRemoveDoc, TTxUpdateDoc, TTxWorkspaceEvent } from './tx'

export { coreId, DOMAIN_SPACE } from '@hcengineering/core'
export * from './core'
export {
  coreOperation,
  getSocialIdByOldAccount,
  getAccountsFromTxes,
  getSocialKeyByOldEmail,
  getUniqueAccounts
} from './migration'
export * from './security'
export * from './status'
export * from './tx'
export { core as default }

export function createModel (builder: Builder): void {
  builder.createModel(
    TObj,
    TDoc,
    TClass,
    TMixin,
    TInterface,
    TTx,
    TTxCUD,
    TTxCreateDoc,
    TAttachedDoc,
    TTxMixin,
    TTxUpdateDoc,
    TTxRemoveDoc,
    TTxApplyIf,
    TTxWorkspaceEvent,
    TSpace,
    TSystemSpace,
    TTypedSpace,
    TSpaceType,
    TSpaceTypeDescriptor,
    TRole,
    TPermission,
    TAttribute,
    TType,
    TEnumOf,
    TTypeMarkup,
    TTypePersonId,
    TTypeAccountUuid,
    TTypeCollaborativeDoc,
    TArrOf,
    TRefTo,
    TTypeDate,
    TTypeFileSize,
    TTypeTimestamp,
    TTypeNumber,
    TTypeBoolean,
    TTypeString,
    TTypeRank,
    TTypeRecord,
    TTypeBlob,
    TTypeHyperlink,
    TCollection,
    TVersion,
    TTypeIntlString,
    TPluginConfiguration,
    TUserStatus,
    TEnum,
    TTypeAny,
    TTypeRelatedDocument,
    TDocIndexState,
    TFullTextSearchContext,
    TConfiguration,
    TConfigurationElement,
    TIndexConfiguration,
    TStatus,
    TSequence,
    TDomainStatusPlaceholder,
    TStatusCategory,
    TMigrationState,
    TBlob,
    TRelation,
    TAssociation,
    TDomainIndexConfiguration,
    TBenchmarkDoc,
    TTransientConfiguration
  )

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_TX,
    disabled: [
      { _class: 1 },
      { space: 1 },
      { objectClass: 1 },
      { createdBy: 1 },
      { createdBy: -1 },
      { createdOn: -1 },
      { modifiedBy: 1 }
    ],
    indexes: [
      {
        keys: {
          objectSpace: 1
        }
      }
    ]
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_TRANSIENT,
    disableCollection: true,
    disabled: [
      { _id: 1 },
      { space: 1 },
      { objectClass: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { createdBy: -1 },
      { createdOn: -1 }
    ]
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_BENCHMARK,
    disableCollection: true,
    disabled: []
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_CONFIGURATION,
    disabled: [
      { _class: 1 },
      { space: 1 },
      { modifiedOn: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { createdBy: -1 },
      { createdOn: -1 }
    ]
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_MIGRATION,
    disabled: [
      { _class: 1 },
      { space: 1 },
      { modifiedOn: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { createdBy: -1 },
      { createdOn: -1 }
    ]
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_STATUS,
    disabled: [
      { modifiedOn: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { createdBy: -1 },
      { createdOn: -1 },
      { space: 1 }
    ]
  })
  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_SPACE,
    disabled: [{ space: 1 }, { modifiedBy: 1 }, { createdBy: 1 }, { createdBy: -1 }, { createdOn: -1 }]
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_BLOB,
    disabled: [
      { _class: 1 },
      { space: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { createdBy: -1 },
      { createdOn: -1 },
      { modifiedOn: 1 }
    ]
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_DOC_INDEX_STATE,
    indexes: [
      {
        keys: { needIndex: 1, objectClass: 1 }
      }
    ],
    disabled: [
      { attachedToClass: 1 },
      { stages: 1 },
      { space: 1 },
      { _class: 1 },
      { needIndex: 1 },
      { objectClass: 1 },
      { _class: 1 },
      { attachedTo: 1 },
      { modifiedBy: 1 },
      { modifiedOn: 1 },
      { createdBy: 1 },
      { createdBy: -1 },
      { createdOn: -1 }
    ]
  })

  builder.createDoc(core.class.FullTextSearchContext, core.space.Model, {
    toClass: core.class.Space,
    childProcessingAllowed: false
  })

  definePermissions(builder)
  defineSpaceType(builder)

  builder.createDoc(core.class.FullTextSearchContext, core.space.Model, {
    toClass: core.class.MigrationState,
    forceIndex: false
  })
  builder.mixin(core.class.Configuration, core.class.Class, core.mixin.IndexConfiguration, {
    indexes: [],
    searchDisabled: true
  })
  builder.mixin(core.class.MigrationState, core.class.Class, core.mixin.IndexConfiguration, {
    indexes: [],
    searchDisabled: true
  })
}
