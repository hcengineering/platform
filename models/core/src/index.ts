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
import { TAttribute, TClass, TDoc, TMixin, TObj, TType, TTypeString } from './core'
import { TSpace, TAccount } from './security'
import { TTx, TTxCreateDoc, TTxMixin, TTxUpdateDoc } from './tx'

export * from './core'
export * from './security'
export * from './tx'
export { core as default }

export function createModel (builder: Builder): void {
  builder.createModel(
    TObj,
    TDoc,
    TClass,
    TMixin,
    TTx,
    TTxCreateDoc,
    TTxMixin,
    TTxUpdateDoc,
    TSpace,
    TAccount,
    TAttribute,
    TType,
    TTypeString
  )
}
