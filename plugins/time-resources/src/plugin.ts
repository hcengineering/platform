//
// Copyright © 2023 Hardcore Engineering Inc.
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
import { type TagCategory } from '@hcengineering/tags'
import time, { timeId } from '@hcengineering/time'

export default mergeIds(timeId, time, {
  category: {
    Other: '' as Ref<TagCategory>
  },
  string: {
    Today: '' as IntlString,
    TodayColon: '' as IntlString,
    ToDoColon: '' as IntlString,
    Tomorrow: '' as IntlString,
    Yesterday: '' as IntlString,
    Completed: '' as IntlString,
    Now: '' as IntlString,
    Scheduled: '' as IntlString,
    Schedule: '' as IntlString,
    WithoutProject: '' as IntlString,
    TotalGroupTime: '' as IntlString,
    Tasks: '' as IntlString,
    WorkItem: '' as IntlString,
    WorkSlot: '' as IntlString,
    CreateToDo: '' as IntlString,
    Inbox: '' as IntlString,
    All: '' as IntlString,
    Done: '' as IntlString,
    ToDos: '' as IntlString,
    Unplanned: '' as IntlString,
    Planned: '' as IntlString,
    AddSlot: '' as IntlString,
    SetPriority: '' as IntlString,
    NoPriority: '' as IntlString,
    LowPriority: '' as IntlString,
    MediumPriority: '' as IntlString,
    HighPriority: '' as IntlString,
    UrgentPriority: '' as IntlString,
    Low: '' as IntlString,
    Medium: '' as IntlString,
    High: '' as IntlString,
    Urgent: '' as IntlString,
    AddTo: '' as IntlString,
    AddTitle: '' as IntlString,
    MyWork: '' as IntlString,
    WorkSchedule: '' as IntlString,
    SummaryDuration: '' as IntlString,
    TeamPlanner: '' as IntlString,

    UnassignToDo: '' as IntlString,
    UnassignToDoConfirm: '' as IntlString,
    ReassignToDo: '' as IntlString,
    ReassignToDoConfirm: '' as IntlString
  }
})
