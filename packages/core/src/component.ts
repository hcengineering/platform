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
import type { IntlString, Plugin, StatusCode } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import { Mixin, Version } from '.'
import type {
  Account,
  AnyAttribute,
  ArrOf,
  AttachedDoc,
  Class,
  Collection,
  Doc,
  Interface,
  Obj,
  PluginConfiguration,
  PropertyType,
  Ref,
  RefTo,
  Space,
  Timestamp,
  Type,
  UserStatus
} from './classes'
import type {
  Tx,
  TxBulkWrite,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxPutBag,
  TxRemoveDoc,
  TxUpdateDoc
} from './tx'

/**
 * @public
 */
export const coreId = 'core' as Plugin

export default plugin(coreId, {
  class: {
    Obj: '' as Ref<Class<Obj>>,
    Doc: '' as Ref<Class<Doc>>,
    AttachedDoc: '' as Ref<Class<AttachedDoc>>,
    Class: '' as Ref<Class<Class<Obj>>>,
    Mixin: '' as Ref<Class<Mixin<Doc>>>,
    Interface: '' as Ref<Class<Interface<Doc>>>,
    Attribute: '' as Ref<Class<AnyAttribute>>,
    Tx: '' as Ref<Class<Tx>>,
    TxBulkWrite: '' as Ref<Class<TxBulkWrite>>,
    TxCUD: '' as Ref<Class<TxCUD<Doc>>>,
    TxCreateDoc: '' as Ref<Class<TxCreateDoc<Doc>>>,
    TxCollectionCUD: '' as Ref<Class<TxCollectionCUD<Doc, AttachedDoc>>>,
    TxMixin: '' as Ref<Class<TxMixin<Doc, Doc>>>,
    TxUpdateDoc: '' as Ref<Class<TxUpdateDoc<Doc>>>,
    TxRemoveDoc: '' as Ref<Class<TxRemoveDoc<Doc>>>,
    TxPutBag: '' as Ref<Class<TxPutBag<PropertyType>>>,
    Space: '' as Ref<Class<Space>>,
    Account: '' as Ref<Class<Account>>,
    TypeString: '' as Ref<Class<Type<string>>>,
    TypeIntlString: '' as Ref<Class<Type<IntlString>>>,
    TypeNumber: '' as Ref<Class<Type<string>>>,
    TypeMarkup: '' as Ref<Class<Type<string>>>,
    TypeBoolean: '' as Ref<Class<Type<boolean>>>,
    TypeTimestamp: '' as Ref<Class<Type<Timestamp>>>,
    TypeDate: '' as Ref<Class<Type<Timestamp | Date>>>,
    RefTo: '' as Ref<Class<RefTo<Doc>>>,
    ArrOf: '' as Ref<Class<ArrOf<Doc>>>,
    Collection: '' as Ref<Class<Collection<AttachedDoc>>>,
    Bag: '' as Ref<Class<Type<Record<string, PropertyType>>>>,
    Version: '' as Ref<Class<Version>>,
    PluginConfiguration: '' as Ref<Class<PluginConfiguration>>,
    UserStatus: '' as Ref<Class<UserStatus>>
  },
  space: {
    Tx: '' as Ref<Space>,
    DerivedTx: '' as Ref<Space>,
    Model: '' as Ref<Space>,
    Space: '' as Ref<Space>
  },
  account: {
    System: '' as Ref<Account>
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
    Modified: '' as IntlString,
    ModifiedBy: '' as IntlString,
    Class: '' as IntlString,
    AttachedTo: '' as IntlString,
    AttachedToClass: '' as IntlString
  }
})
