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

import { Employee, formatName } from '@hcengineering/contact'
import { DocumentQuery, Ref, SortingOrder, TxOperations, WithLookup } from '@hcengineering/core'
import { TypeState } from '@hcengineering/kanban'
import { Asset, IntlString, translate } from '@hcengineering/platform'
import {
  Issue,
  IssuesDateModificationPeriod,
  IssuesGrouping,
  IssuesOrdering,
  IssueStatus,
  IssueTemplate,
  ProjectStatus,
  Sprint,
  SprintStatus,
  Team
} from '@hcengineering/tracker'
import { ViewOptionModel } from '@hcengineering/view-resources'
import {
  AnyComponent,
  AnySvelteComponent,
  getMillisecondsInMonth,
  isWeekend,
  MILLISECONDS_IN_WEEK
} from '@hcengineering/ui'
import tracker from './plugin'
import { defaultPriorities, defaultProjectStatuses, defaultSprintStatuses, issuePriorities } from './types'

export * from './types'

export const UNSET_COLOR = -1

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

export type IssuesGroupByKeys = keyof Pick<Issue, 'status' | 'priority' | 'assignee' | 'project' | 'sprint'>
export type IssuesOrderByKeys = keyof Pick<Issue, 'status' | 'priority' | 'modifiedOn' | 'dueDate' | 'rank'>

export const issuesGroupKeyMap: Record<IssuesGrouping, IssuesGroupByKeys | undefined> = {
  [IssuesGrouping.Status]: 'status',
  [IssuesGrouping.Priority]: 'priority',
  [IssuesGrouping.Assignee]: 'assignee',
  [IssuesGrouping.Project]: 'project',
  [IssuesGrouping.Sprint]: 'sprint',
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

export const issuesGroupEditorMap: Record<'status' | 'priority' | 'project' | 'sprint', AnyComponent | undefined> = {
  status: tracker.component.StatusEditor,
  priority: tracker.component.PriorityEditor,
  project: tracker.component.ProjectEditor,
  sprint: tracker.component.SprintEditor
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
    const group = item[key] ?? undefined

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
    case 'sprint': {
      return {
        icon: tracker.icon.Sprint,
        label: tracker.string.Sprint
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

export type SprintViewMode = 'all' | 'planned' | 'active' | 'closed'

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

export const getIncludedSprintStatuses = (mode: SprintViewMode): SprintStatus[] => {
  switch (mode) {
    case 'all': {
      return defaultSprintStatuses
    }
    case 'active': {
      return [SprintStatus.InProgress]
    }
    case 'planned': {
      return [SprintStatus.Planned]
    }
    case 'closed': {
      return [SprintStatus.Completed, SprintStatus.Canceled]
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

export const sprintTitleMap: Record<SprintViewMode, IntlString> = Object.freeze({
  all: tracker.string.AllSprints,
  planned: tracker.string.PlannedSprints,
  active: tracker.string.ActiveSprints,
  closed: tracker.string.ClosedSprints
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
  elements: Array<WithLookup<Issue | IssueTemplate>>,
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

  const existingCategories = Array.from(new Set(elements.map((x: any) => x[key] ?? undefined)))

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

  if (key === 'sprint') {
    const sprints = new Map(elements.map((x) => [x.sprint, x.$lookup?.sprint]))

    existingCategories.sort((p1, p2) => {
      const i1 = sprints.get(p1 as Ref<Sprint>)
      const i2 = sprints.get(p2 as Ref<Sprint>)

      return (i2?.startDate ?? 0) - (i1?.startDate ?? 0)
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
    return [{ _id: undefined, color: UNSET_COLOR, title: await translate(tracker.string.NoGrouping, {}) }]
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
          color: UNSET_COLOR,
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
      return [
        ...result,
        {
          _id: status._id,
          title: status.name,
          icon: category?.icon,
          color: status.color ?? category?.color ?? UNSET_COLOR
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
          color: UNSET_COLOR,
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
          color: UNSET_COLOR,
          icon: undefined
        }
      ]
    }, [])
  }
  if (groupBy === IssuesGrouping.Sprint) {
    const noSprint = await translate(tracker.string.NoSprint, {})
    return issues.reduce<TypeState[]>((result, issue) => {
      if (result.find(({ _id }) => _id === issue.sprint) !== undefined) return result
      return [
        ...result,
        {
          _id: issue.sprint,
          title: issue.$lookup?.sprint?.label ?? noSprint,
          color: UNSET_COLOR,
          icon: undefined
        }
      ]
    }, [])
  }
  return []
}

export function getIssueStatusStates (issueStatuses: Array<WithLookup<IssueStatus>> = []): TypeState[] {
  return issueStatuses.map((status) => ({
    _id: status._id,
    title: status.name,
    color: status.color ?? status.$lookup?.category?.color ?? UNSET_COLOR,
    icon: status.$lookup?.category?.icon ?? undefined
  }))
}

export async function getPriorityStates (): Promise<TypeState[]> {
  return await Promise.all(
    defaultPriorities.map(async (priority) => ({
      _id: priority,
      title: await translate(issuePriorities[priority].label, {}),
      color: UNSET_COLOR,
      icon: issuePriorities[priority].icon
    }))
  )
}

export function getDefaultViewOptionsConfig (subIssuesValue = false): ViewOptionModel[] {
  const groupByCategory: ViewOptionModel = {
    key: 'groupBy',
    label: tracker.string.Grouping,
    defaultValue: 'status',
    values: [
      { id: 'status', label: tracker.string.Status },
      { id: 'assignee', label: tracker.string.Assignee },
      { id: 'priority', label: tracker.string.Priority },
      { id: 'project', label: tracker.string.Project },
      { id: 'sprint', label: tracker.string.Sprint },
      { id: 'noGrouping', label: tracker.string.NoGrouping }
    ],
    type: 'dropdown'
  }
  const orderByCategory: ViewOptionModel = {
    key: 'orderBy',
    label: tracker.string.Ordering,
    defaultValue: 'status',
    values: [
      { id: 'status', label: tracker.string.Status },
      { id: 'modifiedOn', label: tracker.string.LastUpdated },
      { id: 'priority', label: tracker.string.Priority },
      { id: 'dueDate', label: tracker.string.DueDate },
      { id: 'rank', label: tracker.string.Manual }
    ],
    type: 'dropdown'
  }
  const showSubIssuesCategory: ViewOptionModel = {
    key: 'shouldShowSubIssues',
    label: tracker.string.SubIssues,
    defaultValue: subIssuesValue,
    type: 'toggle'
  }
  const showEmptyGroups: ViewOptionModel = {
    key: 'shouldShowEmptyGroups',
    label: tracker.string.ShowEmptyGroups,
    defaultValue: false,
    type: 'toggle',
    hidden: ({ groupBy }) => !['status', 'priority'].includes(groupBy)
  }
  const result: ViewOptionModel[] = [groupByCategory, orderByCategory]

  result.push(showSubIssuesCategory)

  result.push(showEmptyGroups)
  return result
}

export function getDefaultViewOptionsTemplatesConfig (): ViewOptionModel[] {
  const groupByCategory: ViewOptionModel = {
    key: 'groupBy',
    label: tracker.string.Grouping,
    defaultValue: 'project',
    values: [
      { id: 'assignee', label: tracker.string.Assignee },
      { id: 'priority', label: tracker.string.Priority },
      { id: 'project', label: tracker.string.Project },
      { id: 'sprint', label: tracker.string.Sprint },
      { id: 'noGrouping', label: tracker.string.NoGrouping }
    ],
    type: 'dropdown'
  }
  const orderByCategory: ViewOptionModel = {
    key: 'orderBy',
    label: tracker.string.Ordering,
    defaultValue: 'priority',
    values: [
      { id: 'modifiedOn', label: tracker.string.LastUpdated },
      { id: 'priority', label: tracker.string.Priority },
      { id: 'dueDate', label: tracker.string.DueDate }
    ],
    type: 'dropdown'
  }
  const showEmptyGroups: ViewOptionModel = {
    key: 'shouldShowEmptyGroups',
    label: tracker.string.ShowEmptyGroups,
    defaultValue: false,
    type: 'toggle',
    hidden: ({ groupBy }) => !['status', 'priority'].includes(groupBy)
  }
  const result: ViewOptionModel[] = [groupByCategory, orderByCategory]
  result.push(showEmptyGroups)
  return result
}

/**
 * @public
 */
export function getSprintDays (value: Sprint): string {
  const st = new Date(value.startDate).getDate()
  const days = Math.floor(Math.abs((1 + value.targetDate - value.startDate) / 1000 / 60 / 60 / 24)) + 1
  const stDate = new Date(value.startDate)
  const stTime = stDate.getTime()
  let ds = Array.from(Array(days).keys()).map((it) => st + it)
  ds = ds.filter((it) => ![0, 6].includes(new Date(new Date(stTime).setDate(it)).getDay()))
  return ds.join(' ')
}

export function getDayOfSprint (startDate: number, now: number): number {
  startDate = new Date(startDate).setHours(0, 0)
  now = new Date(now).setHours(0, 0)
  const days = Math.floor(Math.abs((1 + now - startDate) / 1000 / 60 / 60 / 24))
  const stDate = new Date(startDate)
  const stDateDate = stDate.getDate()
  const stTime = stDate.getTime()
  const ds = Array.from(Array(days).keys()).map((it) => stDateDate + it)
  return ds.filter((it) => !isWeekend(new Date(new Date(stTime).setDate(it)))).length
}

export async function moveIssuesToAnotherSprint (
  client: TxOperations,
  oldSprint: Sprint,
  newSprint: Sprint | undefined
): Promise<boolean> {
  try {
    // Find all Issues by Sprint
    const movedIssues = await client.findAll(tracker.class.Issue, { sprint: oldSprint._id })

    // Update Issues by new Sprint
    const awaitedUpdates = []
    for (const issue of movedIssues) {
      awaitedUpdates.push(client.update(issue, { sprint: newSprint?._id ?? undefined }))
    }
    await Promise.all(awaitedUpdates)

    return true
  } catch (error) {
    console.error(
      `Error happened while moving issues between sprints from ${oldSprint.label} to ${
        newSprint?.label ?? 'No Sprint'
      }: `,
      error
    )
    return false
  }
}
