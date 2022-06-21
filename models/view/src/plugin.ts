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

import { ObjQueryType, Ref } from '@anticrm/core'
import { IntlString, mergeIds, Resource } from '@anticrm/platform'
import type { AnyComponent } from '@anticrm/ui'
import { Action, Filter, ViewAction, viewId } from '@anticrm/view'
import view from '@anticrm/view-resources/src/plugin'

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
    ObjectFilter: '' as AnyComponent,
    ValueFilter: '' as AnyComponent,
    TimestampFilter: '' as AnyComponent,
    StringEditor: '' as AnyComponent,
    StringEditorPopup: '' as AnyComponent,
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
    TableBrowser: '' as AnyComponent,
    RolePresenter: '' as AnyComponent,
    YoutubePresenter: '' as AnyComponent,
    GithubPresenter: '' as AnyComponent,
    ClassPresenter: '' as AnyComponent,
    EnumEditor: '' as AnyComponent
  },
  string: {
    Table: '' as IntlString,
    Delete: '' as IntlString,
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
    Open: '' as IntlString,
    // Action categories
    General: '' as IntlString,
    Navigation: '' as IntlString,
    Editor: '' as IntlString,
    MarkdownFormatting: '' as IntlString
  },
  function: {
    FilterObjectInResult: '' as Resource<(filter: Filter, onUpdate: () => void) => Promise<ObjQueryType<any>>>,
    FilterObjectNinResult: '' as Resource<(filter: Filter, onUpdate: () => void) => Promise<ObjQueryType<any>>>,
    FilterValueInResult: '' as Resource<(filter: Filter, onUpdate: () => void) => Promise<ObjQueryType<any>>>,
    FilterValueNinResult: '' as Resource<(filter: Filter, onUpdate: () => void) => Promise<ObjQueryType<any>>>,
    FilterBeforeResult: '' as Resource<(filter: Filter, onUpdate: () => void) => Promise<ObjQueryType<any>>>,
    FilterAfterResult: '' as Resource<(filter: Filter, onUpdate: () => void) => Promise<ObjQueryType<any>>>,
    FilterNestedMatchResult: '' as Resource<(filter: Filter, onUpdate: () => void) => Promise<ObjQueryType<any>>>,
    FilterNestedDontMatchResult: '' as Resource<(filter: Filter, onUpdate: () => void) => Promise<ObjQueryType<any>>>
  }
})
