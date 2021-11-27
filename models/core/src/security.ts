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

import type { IntlString } from '@anticrm/platform'
import type { Account, Arr, Ref, Space, Domain, State } from '@anticrm/core'
import { DOMAIN_MODEL } from '@anticrm/core'
import { Model, Prop, TypeString } from '@anticrm/model'
import core from './component'
import { TDoc } from './core'

export const DOMAIN_STATE = 'state' as Domain

// S P A C E

@Model(core.class.Space, core.class.Doc, DOMAIN_MODEL)
export class TSpace extends TDoc implements Space {
  @Prop(TypeString(), 'Name' as IntlString)
  name!: string

  description!: string
  private!: boolean
  members!: Arr<Ref<Account>>
}

@Model(core.class.Account, core.class.Doc, DOMAIN_MODEL)
export class TAccount extends TDoc implements Account {
  email!: string
}

@Model(core.class.State, core.class.Doc, DOMAIN_STATE)
export class TState extends TDoc implements State {
  @Prop(TypeString(), 'Title' as IntlString)
  title!: string

  color!: string
}

@Model(core.class.DocWithState, core.class.AttachedDoc)
export class TDocWithState extends TDoc {
  @Prop(TypeString(), 'State' as IntlString)
  state!: Ref<State>

  @Prop(TypeString(), 'No.' as IntlString)
  number!: number
}

@Model(core.class.SpaceWithStates, core.class.Space)
export class TSpaceWithStates extends TSpace {}
