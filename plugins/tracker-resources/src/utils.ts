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

import { Employee, formatName } from '@anticrm/contact'
import { DocumentQuery, Ref, SortingOrder, WithLookup } from '@anticrm/core'
import { TypeState } from '@anticrm/kanban'
import { Asset, IntlString, translate } from '@anticrm/platform'
import {
  Issue,
  IssuesDateModificationPeriod,
  IssuesGrouping,
  IssuesOrdering,
  IssueStatus,
  ProjectStatus,
  Team
} from '@anticrm/tracker'
import { AnyComponent, AnySvelteComponent, getMillisecondsInMonth, getPlatformColor, MILLISECONDS_IN_WEEK } from '@anticrm/ui'
import tracker from './plugin'
import { defaultPriorities, defaultProjectStatuses, issuePriorities } from './types'

export * from './types'

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

export type IssuesGroupByKeys = keyof Pick<Issue, 'status' | 'priority' | 'assignee' | 'project'>
export type IssuesOrderByKeys = keyof Pick<Issue, 'status' | 'priority' | 'modifiedOn' | 'dueDate' | 'rank'>

export const issuesGroupKeyMap: Record<IssuesGrouping, IssuesGroupByKeys | undefined> = {
  [IssuesGrouping.Status]: 'status',
  [IssuesGrouping.Priority]: 'priority',
  [IssuesGrouping.Assignee]: 'assignee',
  [IssuesGrouping.Project]: 'project',
  [IssuesGrouping.NoGrouping]: undefined
}

export const issuesOrderKeyMap: Record<IssuesOrdering, IssuesOrderByKeys> = {
  [IssuesOrdering.Status]: 'status',
  [IssuesOrdering.Priority]: 'priority',
  [IssuesOrdering.LastUpdated]: 'modifiedOn',
  [IssuesOrdering.DueDate]: 'dueDate',
  [IssuesOrdering.Manual]: 'rank'
}

export const issuesSortOrderMap: Record<IssuesOrderByKeys, SortingOrder> = {
  status: SortingOrder.Ascending,
  priority: SortingOrder.Ascending,
  modifiedOn: SortingOrder.Descending,
  dueDate: SortingOrder.Descending,
  rank: SortingOrder.Ascending
}

export const issuesGroupEditorMap: Record<'status' | 'priority' | 'project', AnyComponent | undefined> = {
  status: tracker.component.StatusEditor,
  priority: tracker.component.PriorityEditor,
  project: tracker.component.ProjectEditor
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

export interface IssueFilter {
  mode: '$in' | '$nin'
  query: DocumentQuery<Issue>
}

export const getGroupedIssues = (
  key: IssuesGroupByKeys | undefined,
  elements: Issue[],
  orderedCategories?: any[]
): { [p: string]: Issue[] } => {
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

export const getIssueFilterAssetsByType = (type: string): { icon: Asset, label: IntlString } | undefined => {
  switch (type) {
    case 'status': {
      return {
        icon: tracker.icon.CategoryBacklog,
        label: tracker.string.Status
      }
    }
    case 'priority': {
      return {
        icon: tracker.icon.PriorityHigh,
        label: tracker.string.Priority
      }
    }
    case 'project': {
      return {
        icon: tracker.icon.Project,
        label: tracker.string.Project
      }
    }
    default: {
      return undefined
    }
  }
}

export const getArraysIntersection = (a: any[], b: any[]): any[] => {
  const setB = new Set(b)
  const intersection = new Set(a.filter((x) => setB.has(x)))

  return Array.from(intersection)
}

export const getArraysUnion = (a: any[], b: any[]): any[] => {
  const setB = new Set(b)
  const union = new Set(a)

  for (const element of setB) {
    union.add(element)
  }

  return Array.from(union)
}

const WARNING_DAYS = 7

export const getDueDateIconModifier = (
  isOverdue: boolean,
  daysDifference: number | null
): 'overdue' | 'critical' | 'warning' | undefined => {
  if (isOverdue) {
    return 'overdue'
  }

  if (daysDifference === 0) {
    return 'critical'
  }

  if (daysDifference !== null && daysDifference <= WARNING_DAYS) {
    return 'warning'
  }
}

export type ProjectsViewMode = 'all' | 'backlog' | 'active' | 'closed'

export const getIncludedProjectStatuses = (mode: ProjectsViewMode): ProjectStatus[] => {
  switch (mode) {
    case 'all': {
      return defaultProjectStatuses
    }
    case 'active': {
      return [ProjectStatus.Planned, ProjectStatus.InProgress, ProjectStatus.Paused]
    }
    case 'backlog': {
      return [ProjectStatus.Backlog]
    }
    case 'closed': {
      return [ProjectStatus.Completed, ProjectStatus.Canceled]
    }
    default: {
      return []
    }
  }
}

export const projectsTitleMap: Record<ProjectsViewMode, IntlString> = Object.freeze({
  all: tracker.string.AllProjects,
  backlog: tracker.string.BacklogProjects,
  active: tracker.string.ActiveProjects,
  closed: tracker.string.ClosedProjects
})

const listIssueStatusOrder = [
  tracker.issueStatusCategory.Started,
  tracker.issueStatusCategory.Unstarted,
  tracker.issueStatusCategory.Backlog,
  tracker.issueStatusCategory.Completed,
  tracker.issueStatusCategory.Canceled
] as const

export function getCategories (
  key: IssuesGroupByKeys | undefined,
  elements: Issue[],
  shouldShowAll: boolean,
  statuses: IssueStatus[],
  employees: Employee[]
): any[] {
  if (key === undefined) {
    return [undefined] // No grouping
  }

  const defaultStatuses = listIssueStatusOrder.map(
    (category) => statuses.find((status) => status.category === category)?._id
  )

  const existingCategories = Array.from(
    new Set(
      elements.map((x) => {
        return x[key]
      })
    )
  )

  if (shouldShowAll) {
    if (key === 'status') {
      return defaultStatuses
    }

    if (key === 'priority') {
      return defaultPriorities
    }
  }

  if (key === 'status') {
    existingCategories.sort((s1, s2) => {
      const i1 = defaultStatuses.findIndex((x) => x === s1)
      const i2 = defaultStatuses.findIndex((x) => x === s2)

      return i1 - i2
    })
  }

  if (key === 'priority') {
    existingCategories.sort((p1, p2) => {
      const i1 = defaultPriorities.findIndex((x) => x === p1)
      const i2 = defaultPriorities.findIndex((x) => x === p2)

      return i1 - i2
    })
  }

  if (key === 'assignee') {
    existingCategories.sort((a1, a2) => {
      const employeeId1 = a1 as Ref<Employee> | null
      const employeeId2 = a2 as Ref<Employee> | null

      if (employeeId1 === null && employeeId2 !== null) {
        return 1
      }

      if (employeeId1 !== null && employeeId2 === null) {
        return -1
      }

      if (employeeId1 !== null && employeeId2 !== null) {
        const name1 = formatName(employees.find((x) => x?._id === employeeId1)?.name ?? '')
        const name2 = formatName(employees.find((x) => x?._id === employeeId2)?.name ?? '')

        if (name1 > name2) {
          return 1
        } else if (name2 > name1) {
          return -1
        }

        return 0
      }

      return 0
    })
  }

  return existingCategories
}

export async function getKanbanStatuses (
  groupBy: IssuesGrouping,
  issues: Array<WithLookup<Issue>>
): Promise<TypeState[]> {
  if (groupBy === IssuesGrouping.NoGrouping) {
    return [{ _id: undefined, title: await translate(tracker.string.NoGrouping, {}) }]
  }
  if (groupBy === IssuesGrouping.Priority) {
    const states = issues.reduce<TypeState[]>((result, issue) => {
      const { priority } = issue
      if (result.find(({ _id }) => _id === priority) !== undefined) return result
      return [
        ...result,
        {
          _id: priority,
          title: issuePriorities[priority].label,
          icon: issuePriorities[priority].icon
        }
      ]
    }, [])
    await Promise.all(
      states.map(async (state) => {
        state.title = await translate(state.title as IntlString, {})
      })
    )
    return states
  }
  if (groupBy === IssuesGrouping.Status) {
    return issues.reduce<TypeState[]>((result, issue) => {
      const status = issue.$lookup?.status
      if (status === undefined || result.find(({ _id }) => _id === status._id) !== undefined) return result
      const category = '$lookup' in status ? status.$lookup?.category : undefined
      const color = status.color ?? category?.color
      return [
        ...result,
        {
          _id: status._id,
          title: status.name,
          icon: category?.icon,
          ...color !== undefined ? { color: getPlatformColor(color) } : {}
        }
      ]
    }, [])
  }
  if (groupBy === IssuesGrouping.Assignee) {
    const noAssignee = await translate(tracker.string.NoAssignee, {})
    return issues.reduce<TypeState[]>((result, issue) => {
      if (result.find(({ _id }) => _id === issue.assignee) !== undefined) return result
      return [
        ...result,
        {
          _id: issue.assignee,
          title: issue.$lookup?.assignee?.name ?? noAssignee,
          icon: undefined
        }
      ]
    }, [])
  }
  if (groupBy === IssuesGrouping.Project) {
    const noProject = await translate(tracker.string.NoProject, {})
    return issues.reduce<TypeState[]>((result, issue) => {
      if (result.find(({ _id }) => _id === issue.project) !== undefined) return result
      return [
        ...result,
        {
          _id: issue.project,
          title: issue.$lookup?.project?.label ?? noProject,
          icon: undefined
        }
      ]
    }, [])
  }
  return []
}

export function getIssueStatusStates (issueStatuses: Array<WithLookup<IssueStatus>> = []): TypeState[] {
  return issueStatuses.map((status) => {
    const color = status.color ?? status.$lookup?.category?.color
    return {
      _id: status._id,
      title: status.name,
      icon: status.$lookup?.category?.icon ?? undefined,
      ...color !== undefined ? { color: getPlatformColor(color) } : {}
    }
  })
}

export async function getPriorityStates (): Promise<TypeState[]> {
  return await Promise.all(
    defaultPriorities.map(async (priority) => ({
      _id: priority,
      title: await translate(issuePriorities[priority].label, {}),
      icon: issuePriorities[priority].icon
    }))
  )
}
