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
import core, {
  AttachedData,
  Class,
  Doc,
  DocumentQuery,
  Ref,
  SortingOrder,
  Space,
  toIdMap,
  TxCollectionCUD,
  TxOperations,
  TxUpdateDoc,
  WithLookup
} from '@hcengineering/core'
import { TypeState } from '@hcengineering/kanban'
import { Asset, IntlString, translate } from '@hcengineering/platform'
import { createQuery } from '@hcengineering/presentation'
import {
  Issue,
  IssuePriority,
  IssuesDateModificationPeriod,
  IssuesGrouping,
  IssuesOrdering,
  IssueStatus,
  IssueTemplateData,
  Project,
  ProjectStatus,
  Sprint,
  SprintStatus,
  Team,
  TimeReportDayType
} from '@hcengineering/tracker'
import {
  AnyComponent,
  AnySvelteComponent,
  areDatesEqual,
  getMillisecondsInMonth,
  isWeekend,
  MILLISECONDS_IN_WEEK
} from '@hcengineering/ui'
import { CategoryQuery, ListSelectionProvider, SelectDirection } from '@hcengineering/view-resources'
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

export type ScrumRecordViewMode = 'timeReports' | 'objects'

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

export const scrumRecordTitleMap: Record<ScrumRecordViewMode, IntlString> = Object.freeze({
  timeReports: tracker.string.ScrumRecordTimeReports,
  objects: tracker.string.ScrumRecordObjects
})

const listIssueStatusOrder = [
  tracker.issueStatusCategory.Started,
  tracker.issueStatusCategory.Unstarted,
  tracker.issueStatusCategory.Backlog,
  tracker.issueStatusCategory.Completed,
  tracker.issueStatusCategory.Canceled
] as const

export async function issueStatusSort (value: Array<Ref<IssueStatus>>): Promise<Array<Ref<IssueStatus>>> {
  return await new Promise((resolve) => {
    const query = createQuery(true)
    query.query(tracker.class.IssueStatus, { _id: { $in: value } }, (res) => {
      res.sort((a, b) => listIssueStatusOrder.indexOf(a.category) - listIssueStatusOrder.indexOf(b.category))
      resolve(res.map((p) => p._id))
      query.unsubscribe()
    })
  })
}

export async function issuePrioritySort (value: IssuePriority[]): Promise<IssuePriority[]> {
  value.sort((a, b) => {
    const i1 = defaultPriorities.indexOf(a)
    const i2 = defaultPriorities.indexOf(b)

    return i1 - i2
  })
  return value
}

export async function sprintSort (value: Array<Ref<Sprint>>): Promise<Array<Ref<Sprint>>> {
  return await new Promise((resolve) => {
    const query = createQuery(true)
    query.query(tracker.class.Sprint, { _id: { $in: value } }, (res) => {
      const sprints = toIdMap(res)
      value.sort((a, b) => (sprints.get(b)?.startDate ?? 0) - (sprints.get(a)?.startDate ?? 0))
      resolve(value)
      query.unsubscribe()
    })
  })
}

export async function mapKanbanCategories (
  groupBy: string,
  categories: any[],
  statuses: Array<WithLookup<IssueStatus>>,
  projects: Project[],
  sprints: Sprint[],
  assignee: Employee[]
): Promise<TypeState[]> {
  if (groupBy === IssuesGrouping.NoGrouping) {
    return [{ _id: undefined, color: UNSET_COLOR, title: await translate(tracker.string.NoGrouping, {}) }]
  }
  if (groupBy === IssuesGrouping.Priority) {
    const res: TypeState[] = []
    for (const priority of categories) {
      const title = await translate((issuePriorities as any)[priority].label, {})
      res.push({
        _id: priority,
        title,
        color: UNSET_COLOR,
        icon: (issuePriorities as any)[priority].icon
      })
    }
    return res
  }
  if (groupBy === IssuesGrouping.Status) {
    return statuses
      .filter((p) => categories.includes(p._id))
      .map((status) => {
        const category = '$lookup' in status ? status.$lookup?.category : undefined
        return {
          _id: status._id,
          title: status.name,
          icon: category?.icon,
          color: status.color ?? category?.color ?? UNSET_COLOR
        }
      })
  }
  if (groupBy === IssuesGrouping.Assignee) {
    const noAssignee = await translate(tracker.string.NoAssignee, {})
    const res: TypeState[] = assignee
      .filter((p) => categories.includes(p._id))
      .map((employee) => {
        return {
          _id: employee._id,
          title: formatName(employee.name),
          color: UNSET_COLOR,
          icon: undefined
        }
      })
    if (categories.includes(undefined)) {
      res.push({
        _id: null,
        title: noAssignee,
        color: UNSET_COLOR,
        icon: undefined
      })
    }
    return res
  }
  if (groupBy === IssuesGrouping.Project) {
    const noProject = await translate(tracker.string.NoProject, {})
    const res: TypeState[] = projects
      .filter((p) => categories.includes(p._id))
      .map((project) => ({
        _id: project._id,
        title: project.label,
        color: UNSET_COLOR,
        icon: undefined
      }))
    if (categories.includes(undefined)) {
      res.push({
        _id: null,
        title: noProject,
        color: UNSET_COLOR,
        icon: undefined
      })
    }
    return res
  }
  if (groupBy === IssuesGrouping.Sprint) {
    const noSprint = await translate(tracker.string.NoSprint, {})
    const res: TypeState[] = sprints
      .filter((p) => categories.includes(p._id))
      .map((sprint) => ({
        _id: sprint._id,
        title: sprint.label,
        color: UNSET_COLOR,
        icon: undefined
      }))
    if (categories.includes(undefined)) {
      res.push({
        _id: null,
        title: noSprint,
        color: UNSET_COLOR,
        icon: undefined
      })
    }
    return res
  }
  return []
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
      awaitedUpdates.push(client.update(issue, { sprint: newSprint?._id ?? null }))
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

export function getTimeReportDate (type: TimeReportDayType): number {
  const date = new Date(Date.now())

  if (type === TimeReportDayType.PreviousWorkDay) {
    date.setDate(date.getDate() - 1)
  }

  // if date is day off then set date to last working day
  while (isWeekend(date)) {
    date.setDate(date.getDate() - 1)
  }

  return date.valueOf()
}

export function getTimeReportDayType (timestamp: number): TimeReportDayType | undefined {
  const date = new Date(timestamp)
  const currentWorkDate = new Date(getTimeReportDate(TimeReportDayType.CurrentWorkDay))
  const previousWorkDate = new Date(getTimeReportDate(TimeReportDayType.PreviousWorkDay))

  if (areDatesEqual(date, currentWorkDate)) {
    return TimeReportDayType.CurrentWorkDay
  } else if (areDatesEqual(date, previousWorkDate)) {
    return TimeReportDayType.PreviousWorkDay
  }
}

export function subIssueQuery (value: boolean, query: DocumentQuery<Issue>): DocumentQuery<Issue> {
  return value ? query : { ...query, attachedTo: tracker.ids.NoParent }
}

async function getAllSomething (
  _class: Ref<Class<Doc>>,
  space: Ref<Space> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>
): Promise<any[] | undefined> {
  const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
    let refresh: boolean = false
    const lq = CategoryQuery.getLiveQuery(queryId)
    refresh = lq.query(
      _class,
      {
        space
      },
      (res) => {
        const result = res.map((p) => p._id)
        CategoryQuery.results.set(queryId, result)
        resolve(result)
        onUpdate()
      }
    )

    if (!refresh) {
      resolve(CategoryQuery.results.get(queryId) ?? [])
    }
  })
  return await promise
}

export async function getAllStatuses (
  space: Ref<Space> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>
): Promise<any[] | undefined> {
  return await getAllSomething(tracker.class.IssueStatus, space, onUpdate, queryId)
}

export async function getAllPriority (
  space: Ref<Space> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>
): Promise<any[] | undefined> {
  return defaultPriorities
}

export async function getAllProjects (
  space: Ref<Team> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>
): Promise<any[] | undefined> {
  return await getAllSomething(tracker.class.Project, space, onUpdate, queryId)
}

export async function getAllSprints (
  space: Ref<Team> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>
): Promise<any[] | undefined> {
  return await getAllSomething(tracker.class.Sprint, space, onUpdate, queryId)
}

export function subIssueListProvider (subIssues: Issue[], target: Ref<Issue>): void {
  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (dir === 'vertical') {
      let pos = subIssues.findIndex((p) => p._id === of?._id)
      pos += offset
      if (pos < 0) {
        pos = 0
      }
      if (pos >= subIssues.length) {
        pos = subIssues.length - 1
      }
      listProvider.updateFocus(subIssues[pos])
    }
  }, false)
  listProvider.update(subIssues)
  const selectedIssue = subIssues.find((p) => p._id === target)
  if (selectedIssue != null) {
    listProvider.updateFocus(selectedIssue)
  }
}

export async function getPreviousAssignees (
  issue: Issue | AttachedData<Issue> | IssueTemplateData
): Promise<Array<Ref<Employee>>> {
  return await new Promise((resolve) => {
    const query = createQuery(true)
    query.query(
      core.class.Tx,
      {
        'tx.objectId': (issue as Issue)._id,
        'tx.operations.assignee': { $exists: true }
      },
      (res) => {
        const prevAssignee = res
          .map((t) => ((t as TxCollectionCUD<Doc, Issue>).tx as TxUpdateDoc<Issue>).operations.assignee)
          .filter((p) => !(p == null)) as Array<Ref<Employee>>
        resolve(prevAssignee)
        query.unsubscribe()
      }
    )
  })
}
