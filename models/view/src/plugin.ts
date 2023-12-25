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

import { type Ref } from '@hcengineering/core'
import { type IntlString, mergeIds } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { type FilterFunction, type ViewAction, type ViewCategoryAction, viewId } from '@hcengineering/view'
import { type PresentationMiddlewareFactory } from '@hcengineering/presentation/src/pipeline'
import view from '@hcengineering/view-resources/src/plugin'

export default mergeIds(viewId, view, {
  actionImpl: {
    Delete: '' as ViewAction,
    Archive: '' as ViewAction,
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
    Preview: '' as ViewAction,

    Open: '' as ViewAction
  },
  component: {
    StringEditor: '' as AnyComponent,
    StringEditorPopup: '' as AnyComponent,
    StringPresenter: '' as AnyComponent,
    HyperlinkPresenter: '' as AnyComponent,
    HyperlinkEditor: '' as AnyComponent,
    HyperlinkEditorPopup: '' as AnyComponent,
    IntlStringPresenter: '' as AnyComponent,
    NumberEditor: '' as AnyComponent,
    NumberPresenter: '' as AnyComponent,
    MarkupDiffPresenter: '' as AnyComponent,
    MarkupPresenter: '' as AnyComponent,
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
    ClassRefPresenter: '' as AnyComponent,
    EnumEditor: '' as AnyComponent,
    EnumArrayEditor: '' as AnyComponent,
    HTMLEditor: '' as AnyComponent,
    CollaborativeHTMLEditor: '' as AnyComponent,
    MarkupEditor: '' as AnyComponent,
    MarkupEditorPopup: '' as AnyComponent,
    ListView: '' as AnyComponent,
    IndexedDocumentPreview: '' as AnyComponent,
    SpaceRefPresenter: '' as AnyComponent,
    EnumPresenter: '' as AnyComponent,
    StatusPresenter: '' as AnyComponent,
    StatusRefPresenter: '' as AnyComponent,
    DateFilterPresenter: '' as AnyComponent,
    StringFilterPresenter: '' as AnyComponent
  },
  string: {
    Table: '' as IntlString,
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
    // Action categories
    General: '' as IntlString,
    Navigation: '' as IntlString,
    Editor: '' as IntlString,
    MarkdownFormatting: '' as IntlString
  },
  function: {
    FilterArrayAllResult: '' as FilterFunction,
    FilterArrayAnyResult: '' as FilterFunction,
    FilterObjectInResult: '' as FilterFunction,
    FilterObjectNinResult: '' as FilterFunction,
    FilterValueInResult: '' as FilterFunction,
    FilterValueNinResult: '' as FilterFunction,
    FilterBeforeResult: '' as FilterFunction,
    FilterAfterResult: '' as FilterFunction,
    FilterContainsResult: '' as FilterFunction,
    FilterNestedMatchResult: '' as FilterFunction,
    FilterNestedDontMatchResult: '' as FilterFunction,
    FilterDateOutdated: '' as FilterFunction,
    FilterDateToday: '' as FilterFunction,
    FilterDateYesterday: '' as FilterFunction,
    FilterDateWeek: '' as FilterFunction,
    FilterDateNextWeek: '' as FilterFunction,
    FilterDateMonth: '' as FilterFunction,
    FilterDateNextMonth: '' as FilterFunction,
    FilterDateNotSpecified: '' as FilterFunction,
    FilterDateCustom: '' as FilterFunction,
    ShowEmptyGroups: '' as ViewCategoryAction
  },
  pipeline: {
    PresentationMiddleware: '' as Ref<PresentationMiddlewareFactory>
  }
})
