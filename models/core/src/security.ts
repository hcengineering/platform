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

import type { Account, Arr, Ref, Space } from '@anticrm/core'
import { DOMAIN_MODEL } from '@anticrm/core'
import { Model } from '@anticrm/model'
import core from './component'
import { TDoc } from './core'

// S E C U R I T Y

@Model(core.class.Space, core.class.Doc, DOMAIN_MODEL)
export class TSpace extends TDoc implements Space {
  name!: string
  description!: string
  private!: boolean
  members!: Arr<Ref<Account>>
}

@Model(core.class.Account, core.class.Doc, DOMAIN_MODEL)
export class TAccount extends TDoc implements Account {}
