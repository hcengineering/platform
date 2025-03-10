//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { type Builder } from '@hcengineering/model'

import core from '@hcengineering/core'
import serverCore from '@hcengineering/server-core'
import serverCard from '@hcengineering/server-card'
import card from '@hcengineering/card'

export { serverCardId } from '@hcengineering/server-card'

export function createModel (builder: Builder): void {
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverCard.trigger.OnAttribute,
    isAsync: true,
    txMatch: {
      _class: core.class.TxCreateDoc,
      objectClass: core.class.Attribute
    }
  })

  builder.mixin(card.class.Card, core.class.Class, serverCore.mixin.SearchPresenter, {
    searchIcon: card.icon.Card,
    title: [['title']]
  })
}
