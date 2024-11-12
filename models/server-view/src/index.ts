//
// Copyright © 2022 Hardcore Engineering Inc.
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

import core, { type Doc } from '@hcengineering/core'
import { type Builder, Mixin } from '@hcengineering/model'
import { TClass } from '@hcengineering/model-core'
import { type Resource } from '@hcengineering/platform'
import serverCore, { type TriggerControl } from '@hcengineering/server-core'
import serverView, { type ServerLinkIdProvider } from '@hcengineering/server-view'

export { serverViewId } from '@hcengineering/server-view'

@Mixin(serverView.mixin.ServerLinkIdProvider, core.class.Class)
export class TServerLinkIdProvider extends TClass implements ServerLinkIdProvider {
  encode!: Resource<(doc: Doc, control: TriggerControl) => Promise<string>>
}

export function createModel (builder: Builder): void {
  builder.createModel(TServerLinkIdProvider)

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverView.trigger.OnCustomAttributeRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: core.class.Attribute
    }
  })
}
