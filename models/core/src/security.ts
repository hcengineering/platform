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

import { Account, Arr, DOMAIN_MODEL, IndexKind, Ref, Space } from '@anticrm/core'
import { Index, Model, Prop, TypeBoolean, TypeString } from '@anticrm/model'
import type { IntlString } from '@anticrm/platform'
import core from './component'
import { TDoc } from './core'

// S P A C E

@Model(core.class.Space, core.class.Doc, DOMAIN_MODEL)
export class TSpace extends TDoc implements Space {
  @Prop(TypeString(), 'Name' as IntlString)
  @Index(IndexKind.FullText)
  name!: string

  @Prop(TypeString(), 'Description' as IntlString)
  @Index(IndexKind.FullText)
  description!: string

  @Prop(TypeBoolean(), 'Private' as IntlString)
  private!: boolean

  @Prop(TypeBoolean(), 'Archived' as IntlString)
  archived!: boolean

  members!: Arr<Ref<Account>>
}

@Model(core.class.Account, core.class.Doc, DOMAIN_MODEL)
export class TAccount extends TDoc implements Account {
  email!: string
}
