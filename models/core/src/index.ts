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

import { Builder } from '@anticrm/model'
import core from './component'
import {
  TArrOf,
  TAttachedDoc,
  TAttribute,
  TClass,
  TCollection,
  TDoc,
  TInterface,
  TMixin,
  TObj,
  TRefTo,
  TType,
  TTypeBoolean,
  TTypeDate,
  TTypeString,
  TTypeTimestamp,
  TVersion
} from './core'
import { TAccount, TSpace } from './security'
import {
  TTx,
  TTxBulkWrite,
  TTxCollectionCUD,
  TTxCreateDoc,
  TTxCUD,
  TTxMixin,
  TTxPutBag,
  TTxRemoveDoc,
  TTxUpdateDoc
} from './tx'

export * from './core'
export { coreOperation } from './migration'
export * from './security'
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
    TTxPutBag,
    TTxMixin,
    TTxUpdateDoc,
    TTxRemoveDoc,
    TTxBulkWrite,
    TSpace,
    TAccount,
    TAttribute,
    TType,
    TTypeString,
    TTypeBoolean,
    TTypeTimestamp,
    TRefTo,
    TCollection,
    TTypeDate,
    TArrOf,
    TVersion
  )
}
