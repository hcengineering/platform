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

import type { Class, Client, Doc, DocumentQuery, Ref, Space } from '@anticrm/core'
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
  HTMLPresenter,
  IgnoreActions,
  KeyBinding,
  LinkPresenter,
  ObjectEditor,
  ObjectEditorHeader,
  ObjectFactory,
  ObjectValidator,
  PreviewPresenter,
  SpaceHeader,
  SpaceName,
  TextPresenter,
  ViewAction,
  ViewContext,
  ViewContextType,
  Viewlet,
  ViewletDescriptor
} from '@anticrm/view'
import view from './plugin'

export { viewOperation } from './migration'
export { ViewAction }

export function createAction (
  builder: Builder,
  id: Ref<Action>,
  label: IntlString,
  action: ViewAction,
  config?: {
    icon?: Asset
    keyBinding?: KeyBinding[]
    singleInput?: boolean
  }
): void {
  builder.createDoc(
    view.class.Action,
    core.space.Model,
    {
      label,
      icon: config?.icon,
      keyBinding: config?.keyBinding,
      singleInput: config?.singleInput,
      action
    },
    id
  )
}

export function actionTarget (
  builder: Builder,
  action: Ref<Action>,
  target: Ref<Class<Doc>>,
  options: {
    mode: ViewContextType | ViewContextType[]
    application?: Ref<Doc>
    group?: string
    override?: ViewAction
  }
): void {
  builder.createDoc(view.class.ActionTarget, core.space.Model, {
    target,
    action,
    context: {
      mode: options.mode,
      application: options.application,
      group: options.group
    },
    override: options.override
  })
}

export function classPresenter (
  builder: Builder,
  _class: Ref<Class<Doc>>,
  presenter: AnyComponent,
  editor?: AnyComponent
): void {
  builder.mixin(_class, core.class.Class, view.mixin.AttributePresenter, {
    presenter
  })
  if (editor !== undefined) {
    builder.mixin(_class, core.class.Class, view.mixin.AttributeEditor, {
      editor
    })
  }
}

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

@Mixin(view.mixin.SpaceHeader, core.class.Class)
export class TSpaceHeader extends TClass implements SpaceHeader {
  header!: AnyComponent
}

@Mixin(view.mixin.SpaceName, core.class.Class)
export class TSpaceName extends TClass implements SpaceName {
  getName!: Resource<(client: Client, space: Space) => Promise<string>>
}

@Mixin(view.mixin.ObjectValidator, core.class.Class)
export class TObjectValidator extends TClass implements ObjectValidator {
  validator!: Resource<<T extends Doc>(doc: T, client: Client) => Promise<Status<{}>>>
}

@Mixin(view.mixin.ObjectFactory, core.class.Class)
export class TObjectFactory extends TClass implements ObjectFactory {
  component!: AnyComponent
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
  action!: ViewAction
}

@Model(view.class.ActionTarget, core.class.Doc, DOMAIN_MODEL)
export class TActionTarget extends TDoc implements ActionTarget {
  target!: Ref<Class<Doc>>
  action!: Ref<Action>
  query!: DocumentQuery<Doc>
  context!: ViewContext
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

@Mixin(view.mixin.PreviewPresenter, core.class.Class)
export class TPreviewPresenter extends TClass implements PreviewPresenter {
  presenter!: AnyComponent
}

@Model(view.class.LinkPresenter, core.class.Doc, DOMAIN_MODEL)
export class TLinkPresenter extends TDoc implements LinkPresenter {
  pattern!: string

  component!: AnyComponent
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
    THTMLPresenter,
    TSpaceHeader,
    TSpaceName,
    TTextPresenter,
    TIgnoreActions,
    TPreviewPresenter,
    TLinkPresenter
  )

  classPresenter(builder, core.class.TypeString, view.component.StringPresenter, view.component.StringEditor)
  classPresenter(builder, core.class.TypeIntlString, view.component.IntlStringPresenter)
  classPresenter(builder, core.class.TypeNumber, view.component.NumberPresenter, view.component.NumberEditor)
  classPresenter(builder, core.class.TypeMarkup, view.component.HTMLPresenter)
  classPresenter(builder, core.class.TypeBoolean, view.component.BooleanPresenter, view.component.BooleanEditor)
  classPresenter(builder, core.class.TypeTimestamp, view.component.TimestampPresenter)
  classPresenter(builder, core.class.TypeDate, view.component.DatePresenter, view.component.DateEditor)
  classPresenter(builder, core.class.Space, view.component.ObjectPresenter)

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

  createAction(builder, view.action.Delete, view.string.Delete, view.actionImpl.Delete, {
    icon: view.icon.Delete,
    keyBinding: ['Meta + Backspace', 'Ctrl + Backspace']
  })
  actionTarget(builder, view.action.Delete, core.class.Doc, { mode: ['context', 'browser'], group: 'tools' })

  createAction(builder, view.action.Move, view.string.Move, view.actionImpl.Move, {
    icon: view.icon.Move,
    singleInput: true
  })

  // Keyboard actions.
  createAction(builder, view.action.MoveUp, view.string.MoveUp, view.actionImpl.MoveUp, {
    keyBinding: ['ArrowUp', 'keyK']
  })
  actionTarget(builder, view.action.MoveUp, core.class.Doc, { mode: 'browser' })
  createAction(builder, view.action.MoveDown, view.string.MoveDown, view.actionImpl.MoveDown, {
    keyBinding: ['ArrowDown', 'keyJ']
  })
  actionTarget(builder, view.action.MoveDown, core.class.Doc, { mode: 'browser' })

  createAction(builder, view.action.MoveLeft, view.string.MoveLeft, view.actionImpl.MoveLeft, {
    keyBinding: ['ArrowLeft']
  })
  actionTarget(builder, view.action.MoveLeft, core.class.Doc, { mode: 'browser' })
  createAction(builder, view.action.MoveRight, view.string.MoveRight, view.actionImpl.MoveRight, {
    keyBinding: ['ArrowRight']
  })
  actionTarget(builder, view.action.MoveRight, core.class.Doc, { mode: 'browser' })

  builder.mixin(core.class.Space, core.class.Class, view.mixin.AttributePresenter, {
    presenter: view.component.SpacePresenter
  })

  // Selection stuff
  createAction(builder, view.action.SelectItem, view.string.SelectItem, view.actionImpl.SelectItem, {
    keyBinding: ['keyX']
  })
  actionTarget(builder, view.action.SelectItem, core.class.Doc, { mode: 'browser' })

  createAction(builder, view.action.SelectItemAll, view.string.SelectItemAll, view.actionImpl.SelectItemAll, {
    keyBinding: ['meta + keyA', 'ctrl + keyA']
  })
  actionTarget(builder, view.action.SelectItemAll, core.class.Doc, { mode: 'browser' })

  createAction(builder, view.action.SelectItemNone, view.string.SelectItemNone, view.actionImpl.SelectItemNone, {
    keyBinding: ['escape']
  })
  actionTarget(builder, view.action.SelectItemNone, core.class.Doc, { mode: 'browser' })

  createAction(builder, view.action.ShowActions, view.string.ShowActions, view.actionImpl.ShowActions, {
    keyBinding: ['meta + keyK', 'ctrl + keyK']
  })
  actionTarget(builder, view.action.ShowActions, core.class.Doc, {
    mode: ['workbench', 'browser', 'popup', 'panel', 'editor']
  })

  createAction(builder, view.action.ShowPreview, view.string.ShowPreview, view.actionImpl.ShowPreview, {
    keyBinding: ['Space'],
    singleInput: true
  })
  actionTarget(builder, view.action.ShowPreview, core.class.Doc, { mode: 'browser' })

  createAction(builder, view.action.Open, view.string.Open, view.actionImpl.Open, {
    icon: view.icon.Open,
    keyBinding: ['Enter'],
    singleInput: true
  })

  builder.createDoc(view.class.LinkPresenter, core.space.Model, {
    pattern: '(www.)?youtube.(com|ru)',
    component: view.component.YoutubePresenter
  })

  builder.createDoc(view.class.LinkPresenter, core.space.Model, {
    pattern: '(www.)?github.com/',
    component: view.component.GithubPresenter
  })

  // Should be contributed via individual plugins.
  // actionTarget(builder, view.action.Open, core.class.Doc, { mode: ['browser', 'context'] })
}

export default view
