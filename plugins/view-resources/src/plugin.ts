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

import { type IntlString, type Resource, mergeIds } from '@hcengineering/platform'
import { type PresentationMiddlewareCreator } from '@hcengineering/presentation'
import { type AnyComponent } from '@hcengineering/ui'
import view, { viewId } from '@hcengineering/view'

export default mergeIds(viewId, view, {
  component: {
    ObjectFilter: '' as AnyComponent,
    DateFilter: '' as AnyComponent,
    ValueFilter: '' as AnyComponent,
    ArrayFilter: '' as AnyComponent,
    StringFilter: '' as AnyComponent,
    TimestampFilter: '' as AnyComponent,
    FilterTypePopup: '' as AnyComponent,
    ProxyPresenter: '' as AnyComponent,
    ArrayEditor: '' as AnyComponent,
    SpaceTypeSelector: '' as AnyComponent
  },
  string: {
    Contains: '' as IntlString,
    LabelYes: '' as IntlString,
    LabelNo: '' as IntlString,
    ChooseAColor: '' as IntlString,

    DeletePopupNoPermissionTitle: '' as IntlString,
    DeletePopupNoPermissionLabel: '' as IntlString,
    DeletePopupCreatorLabel: '' as IntlString,
    DeletePopupOwnerLabel: '' as IntlString,
    ArchiveConfirm: '' as IntlString,
    UnArchiveConfirm: '' as IntlString,
    Assignees: '' as IntlString,
    Labels: '' as IntlString,
    ActionPlaceholder: '' as IntlString,
    RestoreDefaults: '' as IntlString,
    Filter: '' as IntlString,
    ClearFilters: '' as IntlString,
    FilterIsNot: '' as IntlString,
    FilterIsEither: '' as IntlString,
    FilterIsEitherPlural: '' as IntlString,
    FilterArrayAll: '' as IntlString,
    FilterArrayAny: '' as IntlString,
    FilterStatesCount: '' as IntlString,
    FilterRemoved: '' as IntlString,
    FilterUpdated: '' as IntlString,
    Before: '' as IntlString,
    After: '' as IntlString,
    Apply: '' as IntlString,
    IncludeItemsThatMatch: '' as IntlString,
    AnyFilter: '' as IntlString,
    AllFilters: '' as IntlString,
    MatchCriteria: '' as IntlString,
    DontMatchCriteria: '' as IntlString,
    MarkupEditor: '' as IntlString,
    Select: '' as IntlString,
    Grouping: '' as IntlString,
    Ordering: '' as IntlString,
    Manual: '' as IntlString,
    ShowPreviewOnClick: '' as IntlString,
    Shown: '' as IntlString,
    ShowEmptyGroups: '' as IntlString,
    Total: '' as IntlString,
    Overdue: '' as IntlString,
    Today: '' as IntlString,
    Yesterday: '' as IntlString,
    ThisWeek: '' as IntlString,
    NextWeek: '' as IntlString,
    ThisMonth: '' as IntlString,
    NextMonth: '' as IntlString,
    NotSpecified: '' as IntlString,
    ExactDate: '' as IntlString,
    BeforeDate: '' as IntlString,
    AfterDate: '' as IntlString,
    BetweenDates: '' as IntlString,
    SaveAs: '' as IntlString,
    Between: '' as IntlString,
    ShowColors: '' as IntlString,
    Show: '' as IntlString,
    ChooseIcon: '' as IntlString,
    IconColor: '' as IntlString,
    IconCategory: '' as IntlString,
    EmojiCategory: '' as IntlString,
    NumberItems: '' as IntlString,
    ToViewCommands: '' as IntlString
  },
  function: {
    CreateDocMiddleware: '' as Resource<PresentationMiddlewareCreator>,
    AnalyticsMiddleware: '' as Resource<PresentationMiddlewareCreator>
  }
})
