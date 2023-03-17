//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { SortingOrder, SortingQuery } from '@hcengineering/core'
import { Asset, IntlString } from '@hcengineering/platform'
import {
  Issue,
  IssuePriority,
  IssuesDateModificationPeriod,
  IssuesGrouping,
  IssuesOrdering,
  ComponentStatus,
  SprintStatus
} from '@hcengineering/tracker'
import tracker from './plugin'

export const issuePriorities: Record<IssuePriority, { icon: Asset, label: IntlString }> = {
  [IssuePriority.NoPriority]: { icon: tracker.icon.PriorityNoPriority, label: tracker.string.NoPriority },
  [IssuePriority.Urgent]: { icon: tracker.icon.PriorityUrgent, label: tracker.string.Urgent },
  [IssuePriority.High]: { icon: tracker.icon.PriorityHigh, label: tracker.string.High },
  [IssuePriority.Medium]: { icon: tracker.icon.PriorityMedium, label: tracker.string.Medium },
  [IssuePriority.Low]: { icon: tracker.icon.PriorityLow, label: tracker.string.Low }
}

export const issuesGroupByOptions: Record<IssuesGrouping, IntlString> = {
  [IssuesGrouping.Status]: tracker.string.Status,
  [IssuesGrouping.Assignee]: tracker.string.Assignee,
  [IssuesGrouping.Priority]: tracker.string.Priority,
  [IssuesGrouping.Component]: tracker.string.Component,
  [IssuesGrouping.Sprint]: tracker.string.Sprint,
  [IssuesGrouping.NoGrouping]: tracker.string.NoGrouping
}

export const issuesOrderByOptions: Record<IssuesOrdering, IntlString> = {
  [IssuesOrdering.Status]: tracker.string.Status,
  [IssuesOrdering.Priority]: tracker.string.Priority,
  [IssuesOrdering.LastUpdated]: tracker.string.LastUpdated,
  [IssuesOrdering.DueDate]: tracker.string.DueDate,
  [IssuesOrdering.Manual]: tracker.string.Manual
}

export const issuesDateModificationPeriodOptions: Record<IssuesDateModificationPeriod, IntlString> = {
  [IssuesDateModificationPeriod.All]: tracker.string.All,
  [IssuesDateModificationPeriod.PastWeek]: tracker.string.PastWeek,
  [IssuesDateModificationPeriod.PastMonth]: tracker.string.PastMonth
}
export const defaultComponentStatuses = [
  ComponentStatus.Backlog,
  ComponentStatus.Planned,
  ComponentStatus.InProgress,
  ComponentStatus.Paused,
  ComponentStatus.Completed,
  ComponentStatus.Canceled
]

export const defaultSprintStatuses = [
  SprintStatus.Planned,
  SprintStatus.InProgress,
  SprintStatus.Completed,
  SprintStatus.Canceled
]

export const componentStatusAssets: Record<ComponentStatus, { icon: Asset, label: IntlString }> = {
  [ComponentStatus.Backlog]: { icon: tracker.icon.ComponentStatusBacklog, label: tracker.string.Backlog },
  [ComponentStatus.Planned]: { icon: tracker.icon.ComponentStatusPlanned, label: tracker.string.Planned },
  [ComponentStatus.InProgress]: { icon: tracker.icon.ComponentStatusInProgress, label: tracker.string.InProgress },
  [ComponentStatus.Paused]: { icon: tracker.icon.ComponentStatusPaused, label: tracker.string.Paused },
  [ComponentStatus.Completed]: { icon: tracker.icon.ComponentStatusCompleted, label: tracker.string.Completed },
  [ComponentStatus.Canceled]: { icon: tracker.icon.ComponentStatusCanceled, label: tracker.string.Canceled }
}

export const sprintStatusAssets: Record<SprintStatus, { icon: Asset, label: IntlString }> = {
  [SprintStatus.Planned]: { icon: tracker.icon.SprintStatusPlanned, label: tracker.string.Planned },
  [SprintStatus.InProgress]: { icon: tracker.icon.SprintStatusInProgress, label: tracker.string.InProgress },
  [SprintStatus.Completed]: { icon: tracker.icon.SprintStatusCompleted, label: tracker.string.Completed },
  [SprintStatus.Canceled]: { icon: tracker.icon.SprintStatusCanceled, label: tracker.string.Canceled }
}

export const defaultPriorities = [
  IssuePriority.NoPriority,
  IssuePriority.Urgent,
  IssuePriority.High,
  IssuePriority.Medium,
  IssuePriority.Low
]

export const issuesGroupBySorting: Record<IssuesGrouping, SortingQuery<Issue>> = {
  [IssuesGrouping.Status]: { '$lookup.status.rank': SortingOrder.Ascending },
  [IssuesGrouping.Assignee]: { '$lookup.assignee.name': SortingOrder.Ascending },
  [IssuesGrouping.Priority]: { priority: SortingOrder.Ascending },
  [IssuesGrouping.Component]: { '$lookup.component.label': SortingOrder.Ascending },
  [IssuesGrouping.Sprint]: { '$lookup.sprint.label': SortingOrder.Ascending },
  [IssuesGrouping.NoGrouping]: { rank: SortingOrder.Ascending }
}
