//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { type Class, type Data, type Doc, type Ref } from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { type Action, type AttributeCategory } from '@hcengineering/view'
import view from '.'

export function createAction<T extends Doc = Doc, P = Record<string, any>> (
  builder: Builder,
  data: Data<Action<T, P>>,
  id?: Ref<Action<T, P>>
): void {
  const { label, ...adata } = data
  builder.createDoc<Action<T, P>>(view.class.Action, core.space.Model, { label, ...adata }, id)
}

export function classPresenter (
  builder: Builder,
  _class: Ref<Class<Doc>>,
  presenter: AnyComponent,
  editor?: AnyComponent,
  popup?: AnyComponent,
  activity?: AnyComponent
): void {
  builder.mixin(_class, core.class.Class, view.mixin.AttributePresenter, {
    presenter
  })
  if (editor !== undefined) {
    builder.mixin(_class, core.class.Class, view.mixin.AttributeEditor, {
      inlineEditor: editor,
      popup
    })
  }
  if (activity !== undefined) {
    builder.mixin(_class, core.class.Class, view.mixin.ActivityAttributePresenter, {
      presenter: activity
    })
  }
}

export function createAttributePresenter<T extends Doc> (
  builder: Builder,
  component: AnyComponent,
  _class: Ref<Class<T>>,
  key: keyof T,
  category: AttributeCategory
): void {
  const attr = builder.hierarchy.getAttribute(_class, key as string)
  builder.createDoc(view.class.AttrPresenter, core.space.Model, {
    component,
    attribute: attr._id,
    objectClass: _class,
    category
  })
}
