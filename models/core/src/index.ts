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
  AccountRole,
  DOMAIN_BENCHMARK,
  DOMAIN_BLOB,
  DOMAIN_CONFIGURATION,
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_MIGRATION,
  DOMAIN_STATUS,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  systemAccountEmail,
  type AttachedDoc,
  type Class,
  type Doc,
  type DocIndexState,
  type IndexingConfiguration,
  type TxCollectionCUD
} from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import { TBenchmarkDoc } from './benchmark'
import core from './component'
import {
  TArrOf,
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
  TFulltextData,
  TIndexConfiguration,
  TIndexStageState,
  TInterface,
  TMigrationState,
  TMixin,
  TObj,
  TPluginConfiguration,
  TRefTo,
  TType,
  TTypeAny,
  TTypeBlob,
  TTypeBoolean,
  TTypeCollaborativeDoc,
  TTypeCollaborativeDocVersion,
  TTypeDate,
  TTypeHyperlink,
  TTypeIntlString,
  TTypeMarkup,
  TTypeNumber,
  TTypeRank,
  TTypeRecord,
  TTypeRelatedDocument,
  TTypeString,
  TTypeTimestamp,
  TVersion
} from './core'
import { definePermissions } from './permissions'
import {
  DOMAIN_SPACE,
  TAccount,
  TPermission,
  TRole,
  TSpace,
  TSpaceType,
  TSpaceTypeDescriptor,
  TTypedSpace,
  TSystemSpace
} from './security'
import { TStatus, TStatusCategory, TDomainStatusPlaceholder } from './status'
import { TUserStatus } from './transient'
import {
  TTx,
  TTxApplyIf,
  TTxCUD,
  TTxCollectionCUD,
  TTxCreateDoc,
  TTxMixin,
  TTxRemoveDoc,
  TTxUpdateDoc,
  TTxWorkspaceEvent
} from './tx'
import { defineSpaceType } from './spaceType'

export { coreId } from '@hcengineering/core'
export * from './core'
export { coreOperation } from './migration'
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
    TTxCollectionCUD,
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
    TAccount,
    TAttribute,
    TType,
    TEnumOf,
    TTypeMarkup,
    TTypeCollaborativeDoc,
    TTypeCollaborativeDocVersion,
    TArrOf,
    TRefTo,
    TTypeDate,
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
    TFulltextData,
    TTypeRelatedDocument,
    TDocIndexState,
    TIndexStageState,
    TFullTextSearchContext,
    TConfiguration,
    TConfigurationElement,
    TIndexConfiguration,
    TStatus,
    TDomainStatusPlaceholder,
    TStatusCategory,
    TMigrationState,
    TBlob,
    TDomainIndexConfiguration,
    TBenchmarkDoc
  )

  builder.createDoc(
    core.class.Account,
    core.space.Model,
    {
      email: systemAccountEmail,
      role: AccountRole.Owner
    },
    core.account.System
  )

  builder.mixin<Class<TxCollectionCUD<Doc, AttachedDoc>>, IndexingConfiguration<TxCollectionCUD<Doc, AttachedDoc>>>(
    core.class.TxCollectionCUD,
    core.class.Class,
    core.mixin.IndexConfiguration,
    {
      indexes: [
        'tx.objectId',
        'tx.operations.attachedTo',
        'space',
        {
          objectSpace: 1,
          _id: 1,
          modifiedOn: 1
        },
        {
          objectSpace: 1,
          modifiedBy: 1,
          objectClass: 1
        }
      ]
    }
  )
  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_TX,
    disabled: [{ space: 1 }, { objectClass: 1 }, { createdBy: 1 }, { createdBy: -1 }, { createdOn: -1 }]
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
    disabled: [{ modifiedOn: 1 }, { modifiedBy: 1 }, { createdBy: 1 }, { createdBy: -1 }, { createdOn: -1 }]
  })
  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_SPACE,
    disabled: [{ space: 1 }, { modifiedBy: 1 }, { createdBy: 1 }, { createdBy: -1 }, { createdOn: -1 }]
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_BLOB,
    disabled: [{ _class: 1 }, { space: 1 }, { modifiedBy: 1 }, { createdBy: 1 }, { createdBy: -1 }, { createdOn: -1 }]
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_DOC_INDEX_STATE,
    disabled: [
      { attachedToClass: 1 },
      { stages: 1 },
      { generationId: 1 },
      { space: 1 },
      { _class: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { createdBy: -1 },
      { createdOn: -1 }
    ],
    skip: ['stages.']
  })

  builder.mixin<Class<DocIndexState>, IndexingConfiguration<TxCollectionCUD<Doc, AttachedDoc>>>(
    core.class.DocIndexState,
    core.class.Class,
    core.mixin.IndexConfiguration,
    {
      indexes: [
        {
          _class: 1,
          stages: 1,
          _id: 1,
          modifiedOn: 1
        },
        {
          _class: 1,
          _id: 1,
          modifiedOn: 1
        },
        {
          _class: 1,
          _id: 1,
          objectClass: 1
        }
      ]
    }
  )

  builder.mixin(core.class.Space, core.class.Class, core.mixin.FullTextSearchContext, {
    childProcessingAllowed: false
  })

  definePermissions(builder)
  defineSpaceType(builder)
}
