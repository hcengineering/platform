//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Model, Builder } from '@anticrm/model'
import type { Resource } from '@anticrm/platform'
import { TDoc } from '@anticrm/model-core'

import type { Trigger, TriggerFunc } from '@anticrm/server-core'
import core, { DOMAIN_MODEL } from '@anticrm/core'
import serverCore from '@anticrm/server-core'

@Model(serverCore.class.Trigger, core.class.Doc, DOMAIN_MODEL)
export class TTrigger extends TDoc implements Trigger {
  trigger!: Resource<TriggerFunc>
}

export function createModel (builder: Builder): void {
  builder.createModel(TTrigger)
}
