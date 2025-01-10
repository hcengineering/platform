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

import type { IntlString, Metadata, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { type AnyComponent } from './types'

/**
 * @public
 */
export const uiId = 'ui' as Plugin

export const uis = plugin(uiId, {
  string: {
    EditBoxPlaceholder: '' as IntlString,
    Ok: '' as IntlString,
    Cancel: '' as IntlString,
    Save: '' as IntlString,
    Publish: '' as IntlString,
    SaveDraft: '' as IntlString,
    MinutesAgo: '' as IntlString,
    HoursAgo: '' as IntlString,
    DaysAgo: '' as IntlString,
    MonthsAgo: '' as IntlString,
    YearsAgo: '' as IntlString,
    Minutes: '' as IntlString,
    Hours: '' as IntlString,
    Days: '' as IntlString,
    Weeks: '' as IntlString,
    Months: '' as IntlString,
    Years: '' as IntlString,
    Before: '' as IntlString,
    After: '' as IntlString,
    MinutesShort: '' as IntlString,
    HoursShort: '' as IntlString,
    DaysShort: '' as IntlString,
    ShowMore: '' as IntlString,
    ShowLess: '' as IntlString,
    Search: '' as IntlString,
    SearchDots: '' as IntlString,
    Suggested: '' as IntlString,
    TimeTooltip: '' as IntlString,
    SelectDate: '' as IntlString,
    None: '' as IntlString,
    NotSelected: '' as IntlString,
    Today: '' as IntlString,
    NoDate: '' as IntlString,
    StartDate: '' as IntlString,
    TargetDate: '' as IntlString,
    Overdue: '' as IntlString,
    DueDate: '' as IntlString,
    AddDueDate: '' as IntlString,
    SetDueDate: '' as IntlString,
    EditDueDate: '' as IntlString,
    SaveDueDate: '' as IntlString,
    NeedsToBeCompletedByThisDate: '' as IntlString,
    English: '' as IntlString,
    Russian: '' as IntlString,
    Spanish: '' as IntlString,
    Portuguese: '' as IntlString,
    Chinese: '' as IntlString,
    French: '' as IntlString,
    Italian: '' as IntlString,
    Czech: '' as IntlString,
    German: '' as IntlString,
    MinutesBefore: '' as IntlString,
    HoursBefore: '' as IntlString,
    DaysBefore: '' as IntlString,
    WeeksBefore: '' as IntlString,
    MonthsBefore: '' as IntlString,
    MinutesAfter: '' as IntlString,
    HoursAfter: '' as IntlString,
    DaysAfter: '' as IntlString,
    WeeksAfter: '' as IntlString,
    MonthsAfter: '' as IntlString,
    NoActionsDefined: '' as IntlString,
    Incoming: '' as IntlString,
    HoursLabel: '' as IntlString,
    Back: '' as IntlString,
    Next: '' as IntlString,
    DropdownDefaultLabel: '' as IntlString,
    DD: '' as IntlString,
    MM: '' as IntlString,
    YYYY: '' as IntlString,
    HH: '' as IntlString,
    DueDatePopupTitle: '' as IntlString,
    DueDatePopupOverdueTitle: '' as IntlString,
    DueDatePopupDescription: '' as IntlString,
    DueDatePopupOverdueDescription: '' as IntlString,

    GettingWorkDone: '' as IntlString,
    ExpressYourself: '' as IntlString,
    Smileys: '' as IntlString,
    Nature: '' as IntlString,
    Symbols: '' as IntlString,
    TravelAndPlaces: '' as IntlString,
    Food: '' as IntlString,
    MoreCount: '' as IntlString,
    Objects: '' as IntlString,
    Spacious: '' as IntlString,
    Compact: '' as IntlString,
    ThemeLight: '' as IntlString,
    ThemeDark: '' as IntlString,
    ThemeSystem: '' as IntlString,
    NoTimeZonesFound: '' as IntlString,
    Selected: '' as IntlString,
    Submit: '' as IntlString,
    NextStep: '' as IntlString,
    TypeHere: '' as IntlString,

    NormalSize: '' as IntlString,
    FullSize: '' as IntlString,
    UseMaxWidth: '' as IntlString,
    Sidebar: '' as IntlString,
    Language: '' as IntlString
  },
  metadata: {
    DefaultApplication: '' as Metadata<AnyComponent>,
    Routes: '' as Metadata<Map<string, AnyComponent>>,
    Languages: '' as Metadata<string[]>,
    PlatformTitle: '' as Metadata<string>,
    SearchPopup: '' as Metadata<AnyComponent>
  }
})

export default uis
