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

import type { IntlString, Asset, Resource } from '@anticrm/platform'
import type { Ref, Class, Space, Doc, Arr, Domain, State } from '@anticrm/core'
import { DOMAIN_MODEL } from '@anticrm/core'
import { Model, Mixin, Builder, Prop, TypeString, TypeRef, Collection } from '@anticrm/model'
import type { AnyComponent } from '@anticrm/ui'
import type { ViewletDescriptor, Viewlet, AttributeEditor, AttributePresenter, KanbanCard, ObjectEditor, Action, ActionTarget, Kanban, Sequence, KanbanTemplateSpace, KanbanTemplate, BaseKanban } from '@anticrm/view'
import workbench from '@anticrm/workbench'
import type { Application } from '@anticrm/workbench'

import core, { TDoc, TClass, TSpace } from '@anticrm/model-core'

import view from './plugin'

const DOMAIN_KANBAN = 'kanban' as Domain

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

@Mixin(view.mixin.ObjectEditor, core.class.Class)
export class TObjectEditor extends TClass implements ObjectEditor {
  editor!: AnyComponent
}

@Model(view.class.ViewletDescriptor, core.class.Doc, DOMAIN_MODEL)
export class TViewletDescriptor extends TDoc implements ViewletDescriptor {
  component!: AnyComponent
  label!: IntlString
}

@Model(view.class.Viewlet, core.class.Doc, DOMAIN_MODEL)
export class TViewlet extends TDoc implements Viewlet {
  attachTo!: Ref<Class<Space>>
  descriptor!: Ref<ViewletDescriptor>
  open!: AnyComponent
  config: any
}

@Model(view.class.Action, core.class.Doc, DOMAIN_MODEL)
export class TAction extends TDoc implements Action {
  label!: IntlString
  icon?: Asset
  action!: Resource<(doc: Doc) => Promise<void>>
}

@Model(view.class.ActionTarget, core.class.Doc, DOMAIN_MODEL)
export class TActionTarget extends TDoc implements ActionTarget {
  target!: Ref<Class<Doc>>
  action!: Ref<Action>
}

@Model(view.class.BaseKanban, core.class.Doc, DOMAIN_KANBAN)
export class TBaseKanban extends TDoc implements BaseKanban {
  states!: Arr<Ref<State>>
}

@Model(view.class.Kanban, view.class.BaseKanban, DOMAIN_KANBAN)
export class TKanban extends TBaseKanban implements Kanban {
  attachedTo!: Ref<Space>
  order!: Arr<Ref<Doc>>
}

@Model(view.class.KanbanTemplateSpace, core.class.Space, DOMAIN_MODEL)
export class TKanbanTemplateSpace extends TSpace implements KanbanTemplateSpace {
  icon!: AnyComponent
}

@Model(view.class.KanbanTemplate, view.class.BaseKanban, DOMAIN_KANBAN)
export class TKanbanTemplate extends TBaseKanban implements KanbanTemplate {
  @Prop(TypeString(), 'Title' as IntlString)
  title!: string

  @Prop(Collection(core.class.State), 'States' as IntlString)
  states!: Arr<Ref<State>>

  @Prop(TypeRef(workbench.class.Application), 'Application' as IntlString)
  application?: Ref<Application>
}

@Model(view.class.Sequence, core.class.Doc, DOMAIN_KANBAN)
export class TSequence extends TDoc implements Sequence {
  attachedTo!: Ref<Class<Doc>>
  sequence!: number
}

export function createModel (builder: Builder): void {
  builder.createModel(TAttributeEditor, TAttributePresenter, TKanbanCard, TObjectEditor, TViewletDescriptor, TViewlet, TAction, TActionTarget, TBaseKanban, TKanban, TSequence, TKanbanTemplateSpace, TKanbanTemplate)

  builder.mixin(core.class.TypeString, core.class.Class, view.mixin.AttributeEditor, {
    editor: view.component.StringEditor
  })

  builder.mixin(core.class.TypeString, core.class.Class, view.mixin.AttributePresenter, {
    presenter: view.component.StringPresenter
  })

  builder.mixin(core.class.TypeBoolean, core.class.Class, view.mixin.AttributePresenter, {
    presenter: view.component.BooleanPresenter
  })

  builder.mixin(core.class.TypeBoolean, core.class.Class, view.mixin.AttributeEditor, {
    editor: view.component.BooleanEditor
  })

  builder.mixin(core.class.TypeTimestamp, core.class.Class, view.mixin.AttributePresenter, {
    presenter: view.component.TimestampPresenter
  })

  builder.mixin(core.class.TypeDate, core.class.Class, view.mixin.AttributePresenter, {
    presenter: view.component.DatePresenter
  })

  builder.mixin(core.class.TypeDate, core.class.Class, view.mixin.AttributeEditor, {
    editor: view.component.DateEditor
  })

  builder.mixin(core.class.State, core.class.Class, view.mixin.AttributeEditor, {
    editor: view.component.StateEditor
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

  builder.createDoc(view.class.Action, core.space.Model, {
    label: 'Delete' as IntlString,
    icon: view.icon.Delete,
    action: view.actionImpl.Delete
  }, view.action.Delete)

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: core.class.Doc,
    action: view.action.Delete
  })

  builder.createDoc(view.class.Action, core.space.Model, {
    label: 'Move' as IntlString,
    icon: view.icon.Move,
    action: view.actionImpl.Move
  }, view.action.Move)

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: core.class.Doc,
    action: view.action.Move
  })

  builder.createDoc(core.class.Space, core.space.Model, {
    name: 'Sequences',
    description: 'Internal space to store sequence numbers',
    members: [],
    private: false
  }, view.space.Sequence)
}

export default view
