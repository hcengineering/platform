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

import { Ref } from '@anticrm/core'
import { IntlString, mergeIds } from '@anticrm/platform'
import type { AnyComponent } from '@anticrm/ui'
import view, { Action, ViewAction, viewId } from '@anticrm/view'

export default mergeIds(viewId, view, {
  action: {
    Delete: '' as Ref<Action>,
    Move: '' as Ref<Action>,
    MoveLeft: '' as Ref<Action>,
    MoveRight: '' as Ref<Action>,
    MoveUp: '' as Ref<Action>,
    MoveDown: '' as Ref<Action>,

    SelectItem: '' as Ref<Action>,
    SelectItemAll: '' as Ref<Action>,
    SelectItemNone: '' as Ref<Action>,
    SelectUp: '' as Ref<Action>,
    SelectDown: '' as Ref<Action>,

    ShowPreview: '' as Ref<Action>,
    ShowActions: '' as Ref<Action>,

    // Edit document
    Open: '' as Ref<Action>
  },
  actionImpl: {
    Delete: '' as ViewAction,
    Move: '' as ViewAction,
    MoveLeft: '' as ViewAction,
    MoveRight: '' as ViewAction,
    MoveUp: '' as ViewAction,
    MoveDown: '' as ViewAction,

    SelectItem: '' as ViewAction,
    SelectItemAll: '' as ViewAction,
    SelectItemNone: '' as ViewAction,
    SelectUp: '' as ViewAction,
    SelectDown: '' as ViewAction,

    ShowPreview: '' as ViewAction,
    ShowActions: '' as ViewAction,

    Open: '' as ViewAction
  },
  component: {
    StringEditor: '' as AnyComponent,
    StringPresenter: '' as AnyComponent,
    IntlStringPresenter: '' as AnyComponent,
    NumberEditor: '' as AnyComponent,
    NumberPresenter: '' as AnyComponent,
    HTMLPresenter: '' as AnyComponent,
    BooleanPresenter: '' as AnyComponent,
    BooleanEditor: '' as AnyComponent,
    TimestampPresenter: '' as AnyComponent,
    DateEditor: '' as AnyComponent,
    DatePresenter: '' as AnyComponent,
    TableView: '' as AnyComponent,
    RolePresenter: '' as AnyComponent
  },
  string: {
    Table: '' as IntlString,
    Delete: '' as IntlString,
    Move: '' as IntlString,
    Role: '' as IntlString,
    // Keybaord actions
    MoveUp: '' as IntlString,
    MoveDown: '' as IntlString,
    MoveLeft: '' as IntlString,
    MoveRight: '' as IntlString,
    SelectItem: '' as IntlString,
    SelectItemAll: '' as IntlString,
    SelectItemNone: '' as IntlString,
    SelectUp: '' as IntlString,
    SelectDown: '' as IntlString,
    ShowPreview: '' as IntlString,
    ShowActions: '' as IntlString,
    Open: '' as IntlString
  }
})
