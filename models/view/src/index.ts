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

import type { Class, Client, Doc, Ref, Space } from '@anticrm/core'
import { DOMAIN_MODEL } from '@anticrm/core'
import { Builder, Mixin, Model } from '@anticrm/model'
import core, { TClass, TDoc } from '@anticrm/model-core'
import type { Asset, IntlString, Resource, Status } from '@anticrm/platform'
import type { AnyComponent } from '@anticrm/ui'
import type {
  Action,
  ActionTarget,
  AttributeEditor,
  AttributePresenter,
  IgnoreActions,
  ObjectDDParticipant,
  ObjectEditor,
  ObjectEditorHeader,
  ObjectFactory,
  ObjectValidator,
  Viewlet,
  HTMLPresenter,
  TextPresenter,
  ViewletDescriptor
} from '@anticrm/view'
import view from './plugin'

export { ObjectDDParticipant } from '@anticrm/view'
export { viewOperation } from './migration'

@Mixin(view.mixin.AttributeEditor, core.class.Class)
export class TAttributeEditor extends TClass implements AttributeEditor {
  editor!: AnyComponent
}

@Mixin(view.mixin.AttributePresenter, core.class.Class)
export class TAttributePresenter extends TClass implements AttributePresenter {
  presenter!: AnyComponent
}

@Mixin(view.mixin.ObjectEditor, core.class.Class)
export class TObjectEditor extends TClass implements ObjectEditor {
  editor!: AnyComponent
}

@Mixin(view.mixin.ObjectEditorHeader, core.class.Class)
export class TObjectEditorHeader extends TClass implements ObjectEditorHeader {
  editor!: AnyComponent
}

@Mixin(view.mixin.ObjectValidator, core.class.Class)
export class TObjectValidator extends TClass implements ObjectValidator {
  validator!: Resource<<T extends Doc>(doc: T, client: Client) => Promise<Status<{}>>>
}

@Mixin(view.mixin.ObjectFactory, core.class.Class)
export class TObjectFactory extends TClass implements ObjectFactory {
  component!: AnyComponent
}
@Mixin(view.mixin.ObjectDDParticipant, core.class.Class)
export class TObjectDDParticipant extends TClass implements ObjectDDParticipant {
  collectDocs!: Resource<(doc: Doc) => Promise<Doc[]>>
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

@Mixin(view.mixin.IgnoreActions, core.class.Class)
export class TIgnoreActions extends TClass implements IgnoreActions {
  actions!: Ref<Action>[]
}

@Mixin(view.mixin.HTMLPresenter, core.class.Class)
export class THTMLPresenter extends TClass implements HTMLPresenter {
  presenter!: Resource<(doc: Doc) => string>
}

@Mixin(view.mixin.TextPresenter, core.class.Class)
export class TTextPresenter extends TClass implements TextPresenter {
  presenter!: Resource<(doc: Doc) => string>
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TAttributeEditor,
    TAttributePresenter,
    TObjectEditor,
    TViewletDescriptor,
    TViewlet,
    TAction,
    TActionTarget,
    TObjectValidator,
    TObjectFactory,
    TObjectEditorHeader,
    TObjectDDParticipant,
    THTMLPresenter,
    TTextPresenter,
    TIgnoreActions
  )

  builder.mixin(core.class.TypeString, core.class.Class, view.mixin.AttributeEditor, {
    editor: view.component.StringEditor
  })

  builder.mixin(core.class.TypeString, core.class.Class, view.mixin.AttributePresenter, {
    presenter: view.component.StringPresenter
  })

  builder.mixin(core.class.TypeNumber, core.class.Class, view.mixin.AttributeEditor, {
    editor: view.component.NumberEditor
  })

  builder.mixin(core.class.TypeNumber, core.class.Class, view.mixin.AttributePresenter, {
    presenter: view.component.NumberPresenter
  })

  builder.mixin(core.class.TypeMarkup, core.class.Class, view.mixin.AttributePresenter, {
    presenter: view.component.HTMLPresenter
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

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: view.string.Table,
      icon: view.icon.Table,
      component: view.component.TableView
    },
    view.viewlet.Table
  )

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: view.string.Delete,
      icon: view.icon.Delete,
      action: view.actionImpl.Delete
    },
    view.action.Delete
  )

  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target: core.class.Doc,
    action: view.action.Delete
  })

  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label: view.string.Move,
      icon: view.icon.Move,
      action: view.actionImpl.Move
    },
    view.action.Move
  )
}

export default view
