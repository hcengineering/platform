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

import { Model, Builder } from '@hcengineering/model'
import type { Resource } from '@hcengineering/platform'
import { TClass, TDoc } from '@hcengineering/model-core'

import type {
  AsyncTrigger,
  ObjectDDParticipant,
  Trigger,
  TriggerFunc,
  AsyncTriggerState,
  AsyncTriggerFunc
} from '@hcengineering/server-core'
import core, {
  Class,
  Doc,
  DocumentQuery,
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_MODEL,
  FindOptions,
  FindResult,
  Hierarchy,
  Ref,
  TxCUD
} from '@hcengineering/core'
import serverCore from '@hcengineering/server-core'

@Model(serverCore.class.Trigger, core.class.Doc, DOMAIN_MODEL)
export class TTrigger extends TDoc implements Trigger {
  trigger!: Resource<TriggerFunc>
}

@Model(serverCore.class.AsyncTrigger, core.class.Doc, DOMAIN_MODEL)
export class TAsyncTrigger extends TDoc implements AsyncTrigger {
  trigger!: Resource<AsyncTriggerFunc>
  classes!: Ref<Class<Doc>>[]
}

@Model(serverCore.class.AsyncTriggerState, core.class.Doc, DOMAIN_DOC_INDEX_STATE)
export class TAsyncTriggerState extends TDoc implements AsyncTriggerState {
  tx!: TxCUD<Doc>
  message!: string
}

@Model(serverCore.mixin.ObjectDDParticipant, core.class.Class)
export class TObjectDDParticipant extends TClass implements ObjectDDParticipant {
  collectDocs!: Resource<
  (
    doc: Doc,
    hiearachy: Hierarchy,
    findAll: <T extends Doc>(
      clazz: Ref<Class<T>>,
      query: DocumentQuery<T>,
      options?: FindOptions<T>
    ) => Promise<FindResult<T>>
  ) => Promise<Doc[]>
  >
}

export function createModel (builder: Builder): void {
  builder.createModel(TTrigger, TObjectDDParticipant, TAsyncTriggerState, TAsyncTrigger)
}
