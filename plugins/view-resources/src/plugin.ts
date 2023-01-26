//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { IntlString, mergeIds } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import view, { viewId } from '@hcengineering/view'

export default mergeIds(viewId, view, {
  component: {
    ObjectFilter: '' as AnyComponent,
    ValueFilter: '' as AnyComponent,
    TimestampFilter: '' as AnyComponent,
    FilterTypePopup: '' as AnyComponent,
    ActionsPopup: '' as AnyComponent,
    ProxyPresenter: '' as AnyComponent
  },
  string: {
    MoveClass: '' as IntlString,
    SelectToMove: '' as IntlString,
    Move: '' as IntlString,
    Cancel: '' as IntlString,
    LabelYes: '' as IntlString,
    LabelNo: '' as IntlString,
    ChooseAColor: '' as IntlString,
    DeleteObject: '' as IntlString,
    DeleteObjectConfirm: '' as IntlString,
    Assignees: '' as IntlString,
    Labels: '' as IntlString,
    ActionPlaceholder: '' as IntlString,
    RestoreDefaults: '' as IntlString,
    Filter: '' as IntlString,
    ClearFilters: '' as IntlString,
    FilterIsNot: '' as IntlString,
    FilterIsEither: '' as IntlString,
    FilterStatesCount: '' as IntlString,
    Before: '' as IntlString,
    After: '' as IntlString,
    Apply: '' as IntlString,
    Save: '' as IntlString,
    IncludeItemsThatMatch: '' as IntlString,
    AnyFilter: '' as IntlString,
    AllFilters: '' as IntlString,
    MatchCriteria: '' as IntlString,
    DontMatchCriteria: '' as IntlString,
    MarkupEditor: '' as IntlString,
    Select: '' as IntlString,
    NoGrouping: '' as IntlString,
    Grouping: '' as IntlString,
    Ordering: '' as IntlString,
    Manual: '' as IntlString,
    Than: '' as IntlString,
    ShowPreviewOnClick: '' as IntlString
  }
})
