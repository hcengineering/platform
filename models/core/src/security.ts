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

import { Account, AccountRole, Arr, Domain, DOMAIN_MODEL, IndexKind, Ref, Space } from '@hcengineering/core'
import { ArrOf, Hidden, Index, Model, Prop, TypeBoolean, TypeRef, TypeString, UX } from '@hcengineering/model'
import core from './component'
import { TDoc } from './core'

export const DOMAIN_SPACE = 'space' as Domain

// S P A C E

@Model(core.class.Space, core.class.Doc, DOMAIN_SPACE)
@UX(core.string.Space, undefined, undefined, 'name')
export class TSpace extends TDoc implements Space {
  @Prop(TypeString(), core.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeString(), core.string.Description)
  @Index(IndexKind.FullText)
    description!: string

  @Prop(TypeBoolean(), core.string.Private)
    private!: boolean

  @Prop(TypeBoolean(), core.string.Archived)
    archived!: boolean

  @Prop(ArrOf(TypeRef(core.class.Account)), core.string.Members)
  @Hidden()
    members!: Arr<Ref<Account>>
}

@Model(core.class.Account, core.class.Doc, DOMAIN_MODEL)
@UX(core.string.Account, undefined, undefined, 'name')
export class TAccount extends TDoc implements Account {
  email!: string
  role!: AccountRole
}
