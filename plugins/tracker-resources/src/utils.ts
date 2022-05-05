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

import { Ref, SortingOrder } from '@anticrm/core'
import type { Asset, IntlString } from '@anticrm/platform'
import {
  IssuePriority,
  Team,
  IssuesGrouping,
  IssuesOrdering,
  Issue,
  IssuesDateModificationPeriod,
  ProjectStatus
} from '@anticrm/tracker'
import { AnyComponent, AnySvelteComponent, getMillisecondsInMonth, MILLISECONDS_IN_WEEK } from '@anticrm/ui'
import tracker from './plugin'

export interface NavigationItem {
  id: string
  label: IntlString
  icon: Asset
  component: AnyComponent
  componentProps?: Record<string, string>
  top: boolean
}

export interface Selection {
  currentTeam?: Ref<Team>
  currentSpecial?: string
}

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
  [IssuesGrouping.NoGrouping]: tracker.string.NoGrouping
}

export const issuesOrderByOptions: Record<IssuesOrdering, IntlString> = {
  [IssuesOrdering.Status]: tracker.string.Status,
  [IssuesOrdering.Priority]: tracker.string.Priority,
  [IssuesOrdering.LastUpdated]: tracker.string.LastUpdated,
  [IssuesOrdering.DueDate]: tracker.string.DueDate
}

export const issuesDateModificationPeriodOptions: Record<IssuesDateModificationPeriod, IntlString> = {
  [IssuesDateModificationPeriod.All]: tracker.string.All,
  [IssuesDateModificationPeriod.PastWeek]: tracker.string.PastWeek,
  [IssuesDateModificationPeriod.PastMonth]: tracker.string.PastMonth
}

export type IssuesGroupByKeys = keyof Pick<Issue, 'status' | 'priority' | 'assignee'>
export type IssuesOrderByKeys = keyof Pick<Issue, 'status' | 'priority' | 'modifiedOn' | 'dueDate'>

export const issuesGroupKeyMap: Record<IssuesGrouping, IssuesGroupByKeys | undefined> = {
  [IssuesGrouping.Status]: 'status',
  [IssuesGrouping.Priority]: 'priority',
  [IssuesGrouping.Assignee]: 'assignee',
  [IssuesGrouping.NoGrouping]: undefined
}

export const issuesOrderKeyMap: Record<IssuesOrdering, IssuesOrderByKeys> = {
  [IssuesOrdering.Status]: 'status',
  [IssuesOrdering.Priority]: 'priority',
  [IssuesOrdering.LastUpdated]: 'modifiedOn',
  [IssuesOrdering.DueDate]: 'dueDate'
}

export const issuesSortOrderMap: Record<IssuesOrderByKeys, SortingOrder> = {
  status: SortingOrder.Ascending,
  priority: SortingOrder.Ascending,
  modifiedOn: SortingOrder.Descending,
  dueDate: SortingOrder.Descending
}

export const issuesGroupEditorMap: Record<'status' | 'priority', AnyComponent | undefined> = {
  status: tracker.component.StatusEditor,
  priority: tracker.component.PriorityEditor
}

export const getIssuesModificationDatePeriodTime = (period: IssuesDateModificationPeriod | null): number => {
  const today = new Date(Date.now())

  switch (period) {
    case IssuesDateModificationPeriod.PastWeek: {
      return today.getTime() - MILLISECONDS_IN_WEEK
    }
    case IssuesDateModificationPeriod.PastMonth: {
      return today.getTime() - getMillisecondsInMonth(today)
    }
    default: {
      return 0
    }
  }
}

// TODO: update icons
export const projectStatuses: Record<ProjectStatus, { icon: Asset, label: IntlString }> = {
  [ProjectStatus.Planned]: { icon: tracker.icon.CategoryBacklog, label: tracker.string.Planned },
  [ProjectStatus.InProgress]: { icon: tracker.icon.CategoryStarted, label: tracker.string.InProgress },
  [ProjectStatus.Paused]: { icon: tracker.icon.CategoryUnstarted, label: tracker.string.Paused },
  [ProjectStatus.Completed]: { icon: tracker.icon.CategoryCompleted, label: tracker.string.Completed },
  [ProjectStatus.Canceled]: { icon: tracker.icon.CategoryCanceled, label: tracker.string.Canceled }
}

export const groupBy = (data: any, key: any): { [key: string]: any[] } => {
  return data.reduce((storage: { [key: string]: any[] }, item: any) => {
    const group = item[key]

    storage[group] = storage[group] ?? []

    storage[group].push(item)

    return storage
  }, {})
}

export interface FilterAction {
  icon?: Asset | AnySvelteComponent
  label?: IntlString
  onSelect: (event: MouseEvent | KeyboardEvent) => void
}

export interface FilterSectionElement extends Omit<FilterAction, 'label'> {
  title?: string
  count?: number
  isSelected?: boolean
}

export const getGroupedIssues = (
  key: IssuesGroupByKeys | undefined, elements: Issue[], orderedCategories?: any[]
): {[p: string]: Issue[]} => {
  if (key === undefined) {
    return { [undefined as any]: elements }
  }

  const unorderedIssues = groupBy(elements, key)

  if (orderedCategories === undefined || orderedCategories.length === 0) {
    return unorderedIssues
  }

  return Object.keys(unorderedIssues)
    .sort((o1, o2) => {
      const key1 = o1 === 'null' ? null : o1
      const key2 = o2 === 'null' ? null : o2

      const i1 = orderedCategories.findIndex((x) => x === key1)
      const i2 = orderedCategories.findIndex((x) => x === key2)

      return i1 - i2
    })
    .reduce((obj: { [p: string]: any[] }, objKey) => {
      obj[objKey] = unorderedIssues[objKey]
      return obj
    }, {})
}

export const getIssueFilterAssetsByType = (type: string): {icon: Asset, label: IntlString} | undefined => {
  switch (type) {
    case 'status': {
      return {
        icon: tracker.icon.CategoryBacklog,
        label: tracker.string.Status
      }
    }
    default: {
      return undefined
    }
  }
}
