//
// Copyright © 2020 Anticrm Platform Contributors.
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
import type { Ref, Class, Space } from '@anticrm/core'
import { DOMAIN_MODEL } from '@anticrm/core'
import { Model, Mixin, Builder } from '@anticrm/model'
import type { AnyComponent } from '@anticrm/ui'
import type { ViewletDescriptor, Viewlet, AttributeEditor, AttributePresenter, KanbanCard } from '@anticrm/view'

import core, { TDoc, TClass } from '@anticrm/model-core'

import view from './plugin'

@Mixin(view.mixin.AttributeEditor, core.class.Class)
export class TAttributeEditor extends TClass implements AttributeEditor {
  editor!: AnyComponent
}

@Mixin(view.mixin.AttributePresenter, core.class.Class)
export class TAttributePresenter extends TClass implements AttributePresenter {
  presenter!: AnyComponent
}

@Mixin(view.mixin.KanbanCard, core.class.Class)
export class TKanbanCard extends TClass implements KanbanCard {
  card!: AnyComponent
}

@Model(view.class.ViewletDescriptor, core.class.Doc, DOMAIN_MODEL)
export class TViewletDescriptor extends TDoc implements ViewletDescriptor {
  component!: AnyComponent
}

@Model(view.class.Viewlet, core.class.Doc, DOMAIN_MODEL)
export class TViewlet extends TDoc implements Viewlet {
  attachTo!: Ref<Class<Space>>
  descriptor!: Ref<ViewletDescriptor>
  open!: AnyComponent
  config: any
}

export function createModel (builder: Builder): void {
  builder.createModel(TAttributeEditor, TAttributePresenter, TKanbanCard, TViewletDescriptor, TViewlet)

  builder.mixin(core.class.TypeString, core.class.Class, view.mixin.AttributeEditor, {
    editor: view.component.StringEditor
  })

  builder.mixin(core.class.TypeString, core.class.Class, view.mixin.AttributePresenter, {
    presenter: view.component.StringPresenter
  })

  builder.mixin(core.class.State, core.class.Class, view.mixin.AttributePresenter, {
    presenter: view.component.StatePresenter
  })

  builder.createDoc(view.class.ViewletDescriptor, core.space.Model, {
    label: 'Table' as IntlString,
    icon: view.icon.Table,
    component: view.component.TableView
  }, view.viewlet.Table)

  builder.createDoc(view.class.ViewletDescriptor, core.space.Model, {
    label: 'Kanban' as IntlString,
    icon: view.icon.Kanban,
    component: view.component.KanbanView
  }, view.viewlet.Kanban)
}

export default view
