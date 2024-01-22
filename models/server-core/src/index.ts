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

import { Mixin, Model, type Builder } from '@hcengineering/model'
import { TClass, TDoc } from '@hcengineering/model-core'
import type { Resource } from '@hcengineering/platform'

import core, { DOMAIN_MODEL } from '@hcengineering/core'
import type {
  ClassSearchConfig,
  ObjectDDParticipant,
  ObjectDDParticipantFunc,
  SearchPresenter,
  SearchPresenterFunc,
  Trigger,
  TriggerFunc
} from '@hcengineering/server-core'
import serverCore from '@hcengineering/server-core'

export { serverCoreId } from '@hcengineering/server-core'

@Model(serverCore.class.Trigger, core.class.Doc, DOMAIN_MODEL)
export class TTrigger extends TDoc implements Trigger {
  trigger!: Resource<TriggerFunc>
}

@Model(serverCore.mixin.ObjectDDParticipant, core.class.Class)
export class TObjectDDParticipant extends TClass implements ObjectDDParticipant {
  collectDocs!: Resource<ObjectDDParticipantFunc>
}

@Mixin(serverCore.mixin.SearchPresenter, core.class.Class)
export class TSearchPresenter extends TClass implements SearchPresenter {
  searchConfig!: ClassSearchConfig
  getSearchShortTitle!: SearchPresenterFunc
  getSearchTitle!: SearchPresenterFunc
}

export function createModel (builder: Builder): void {
  builder.createModel(TTrigger, TObjectDDParticipant, TSearchPresenter)
}
