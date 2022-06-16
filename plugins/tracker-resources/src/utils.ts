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

import contact, { Employee, formatName } from '@anticrm/contact'
import { DocumentQuery, Ref, SortingOrder, TxOperations } from '@anticrm/core'
import { Asset, IntlString, translate } from '@anticrm/platform'
import {
  IssuePriority,
  Team,
  IssuesGrouping,
  IssuesOrdering,
  Issue,
  IssuesDateModificationPeriod,
  ProjectStatus,
  IssueStatus
} from '@anticrm/tracker'
import { AnyComponent, AnySvelteComponent, getMillisecondsInMonth, MILLISECONDS_IN_WEEK } from '@anticrm/ui'
import { TypeState } from '@anticrm/kanban'
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
  [IssuesGrouping.Project]: tracker.string.Project,
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

export type IssuesGroupByKeys = keyof Pick<Issue, 'status' | 'priority' | 'assignee' | 'project'>
export type IssuesOrderByKeys = keyof Pick<Issue, 'status' | 'priority' | 'modifiedOn' | 'dueDate'>

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
  [IssuesOrdering.DueDate]: 'dueDate'
}

export const issuesSortOrderMap: Record<IssuesOrderByKeys, SortingOrder> = {
  status: SortingOrder.Ascending,
  priority: SortingOrder.Ascending,
  modifiedOn: SortingOrder.Descending,
  dueDate: SortingOrder.Descending
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

export const defaultProjectStatuses = [
  ProjectStatus.Backlog,
  ProjectStatus.Planned,
  ProjectStatus.InProgress,
  ProjectStatus.Paused,
  ProjectStatus.Completed,
  ProjectStatus.Canceled
]

export const projectStatusAssets: Record<ProjectStatus, { icon: Asset, label: IntlString }> = {
  [ProjectStatus.Backlog]: { icon: tracker.icon.ProjectStatusBacklog, label: tracker.string.Backlog },
  [ProjectStatus.Planned]: { icon: tracker.icon.ProjectStatusPlanned, label: tracker.string.Planned },
  [ProjectStatus.InProgress]: { icon: tracker.icon.ProjectStatusInProgress, label: tracker.string.InProgress },
  [ProjectStatus.Paused]: { icon: tracker.icon.ProjectStatusPaused, label: tracker.string.Paused },
  [ProjectStatus.Completed]: { icon: tracker.icon.ProjectStatusCompleted, label: tracker.string.Completed },
  [ProjectStatus.Canceled]: { icon: tracker.icon.ProjectStatusCanceled, label: tracker.string.Canceled }
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

export const defaultPriorities = [
  IssuePriority.NoPriority,
  IssuePriority.Urgent,
  IssuePriority.High,
  IssuePriority.Medium,
  IssuePriority.Low
]

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

export function getIssueId (team: Team, issue: Issue): string {
  return `${team.identifier}-${issue.number}`
}

export async function getKanbanStatuses (
  client: TxOperations,
  groupBy: IssuesGrouping,
  issueQuery: DocumentQuery<Issue>,
  shouldShowEmptyGroups: boolean
): Promise<TypeState[]> {
  if (groupBy === IssuesGrouping.NoGrouping) {
    return [{ _id: undefined, color: 0, title: await translate(tracker.string.NoGrouping, {}) }]
  }
  if (groupBy === IssuesGrouping.Status && shouldShowEmptyGroups) {
    return (
      await client.findAll(
        tracker.class.IssueStatus,
        { attachedTo: issueQuery.space },
        {
          lookup: { category: tracker.class.IssueStatusCategory },
          sort: { rank: SortingOrder.Ascending }
        }
      )
    ).map((status) => ({
      _id: status._id,
      title: status.name,
      color: status.color ?? status.$lookup?.category?.color ?? 0,
      icon: status.$lookup?.category?.icon ?? undefined
    }))
  }
  if (groupBy === IssuesGrouping.Priority) {
    const issues = await client.findAll(tracker.class.Issue, issueQuery, {
      sort: { priority: SortingOrder.Ascending }
    })
    const states = issues.reduce<TypeState[]>((result, issue) => {
      const { priority } = issue
      if (result.find(({ _id }) => _id === priority) !== undefined) return result
      return [
        ...result,
        {
          _id: priority,
          title: issuePriorities[priority].label,
          color: 0,
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
    const issues = await client.findAll(tracker.class.Issue, issueQuery, {
      lookup: { status: [tracker.class.IssueStatus, { category: tracker.class.IssueStatusCategory }] },
      sort: { '$lookup.status.rank': SortingOrder.Ascending }
    })
    return issues.reduce<TypeState[]>((result, issue) => {
      const status = issue.$lookup?.status
      if (status === undefined || result.find(({ _id }) => _id === status._id) !== undefined) return result
      const icon = '$lookup' in status ? status.$lookup?.category?.icon : undefined
      return [
        ...result,
        {
          _id: status._id,
          title: status.name,
          color: status.color ?? 0,
          icon
        }
      ]
    }, [])
  }
  if (groupBy === IssuesGrouping.Assignee) {
    const issues = await client.findAll(tracker.class.Issue, issueQuery, {
      lookup: { assignee: contact.class.Employee },
      sort: { '$lookup.assignee.name': SortingOrder.Ascending }
    })
    const noAssignee = await translate(tracker.string.NoAssignee, {})
    return issues.reduce<TypeState[]>((result, issue) => {
      if (result.find(({ _id }) => _id === issue.assignee) !== undefined) return result
      return [
        ...result,
        {
          _id: issue.assignee,
          title: issue.$lookup?.assignee?.name ?? noAssignee,
          color: 0,
          icon: undefined
        }
      ]
    }, [])
  }
  if (groupBy === IssuesGrouping.Project) {
    const issues = await client.findAll(tracker.class.Issue, issueQuery, {
      lookup: { project: tracker.class.Project },
      sort: { '$lookup.project.label': SortingOrder.Ascending }
    })
    const noProject = await translate(tracker.string.NoProject, {})
    return issues.reduce<TypeState[]>((result, issue) => {
      if (result.find(({ _id }) => _id === issue.project) !== undefined) return result
      return [
        ...result,
        {
          _id: issue.project,
          title: issue.$lookup?.project?.label ?? noProject,
          color: 0,
          icon: undefined
        }
      ]
    }, [])
  }
  return []
}
