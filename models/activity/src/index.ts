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

import type { ActivityFilter, DisplayTx, ExtraActivityComponent, TxViewlet } from '@hcengineering/activity'
import activity from './plugin'
import core, { Class, Doc, DocumentQuery, DOMAIN_MODEL, Ref, Tx } from '@hcengineering/core'
import { Builder, Mixin, Model } from '@hcengineering/model'
import { TClass, TDoc } from '@hcengineering/model-core'
import type { Asset, IntlString, Resource } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'

export { activityId } from '@hcengineering/activity'

@Model(activity.class.TxViewlet, core.class.Doc, DOMAIN_MODEL)
export class TTxViewlet extends TDoc implements TxViewlet {
  icon!: Asset
  objectClass!: Ref<Class<Doc>>
  txClass!: Ref<Class<Tx>>
  // Component to display on.
  component!: AnyComponent
  // Filter
  match?: DocumentQuery<Tx>
  label!: IntlString
  display!: 'inline' | 'content' | 'emphasized'
  editable!: boolean
  hideOnRemove!: boolean
}

@Model(activity.class.ActivityFilter, core.class.Doc, DOMAIN_MODEL)
export class TActivityFilter extends TDoc implements ActivityFilter {
  label!: IntlString
  filter!: Resource<(tx: DisplayTx, _class?: Ref<Doc>) => boolean>
}

@Mixin(activity.mixin.ExtraActivityComponent, core.class.Class)
export class TExtraActivityComponent extends TClass implements ExtraActivityComponent {
  component!: AnyComponent
}

export function createModel (builder: Builder): void {
  builder.createModel(TTxViewlet, TActivityFilter, TExtraActivityComponent)

  builder.createDoc(activity.class.ActivityFilter, core.space.Model, {
    label: activity.string.Attributes,
    filter: activity.filter.AttributeFilter
  })
}

export default activity
