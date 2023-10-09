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

import { Contact } from '@hcengineering/contact'
import core, {
  ApplyOperations,
  AttachedData,
  AttachedDoc,
  Class,
  Collection,
  Doc,
  DocumentQuery,
  DocumentUpdate,
  IdMap,
  Ref,
  SortingOrder,
  Space,
  Status,
  StatusCategory,
  TxCollectionCUD,
  TxCreateDoc,
  TxOperations,
  TxResult,
  TxUpdateDoc,
  toIdMap
} from '@hcengineering/core'
import { Asset, IntlString } from '@hcengineering/platform'
import { createQuery, getClient } from '@hcengineering/presentation'
import { calcRank } from '@hcengineering/task'
import {
  Component,
  Issue,
  IssuePriority,
  IssueStatus,
  IssuesDateModificationPeriod,
  IssuesGrouping,
  IssuesOrdering,
  Milestone,
  MilestoneStatus,
  Project,
  TimeReportDayType
} from '@hcengineering/tracker'
import {
  AnyComponent,
  AnySvelteComponent,
  MILLISECONDS_IN_WEEK,
  PaletteColorIndexes,
  areDatesEqual,
  getMillisecondsInMonth,
  isWeekend
} from '@hcengineering/ui'
import { KeyFilter, ViewletDescriptor } from '@hcengineering/view'
import {
  CategoryQuery,
  ListSelectionProvider,
  SelectDirection,
  groupBy,
  statusStore
} from '@hcengineering/view-resources'
import { get } from 'svelte/store'
import tracker from './plugin'
import { defaultMilestoneStatuses, defaultPriorities } from './types'

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
  currentProject?: Ref<Project>
  currentSpecial?: string
}

export type IssuesGroupByKeys = keyof Pick<Issue, 'status' | 'priority' | 'assignee' | 'component' | 'milestone'>
export type IssuesOrderByKeys = keyof Pick<Issue, 'status' | 'priority' | 'modifiedOn' | 'dueDate' | 'rank'>

export const issuesGroupKeyMap: Record<IssuesGrouping, IssuesGroupByKeys | undefined> = {
  [IssuesGrouping.Status]: 'status',
  [IssuesGrouping.Priority]: 'priority',
  [IssuesGrouping.Assignee]: 'assignee',
  [IssuesGrouping.Component]: 'component',
  [IssuesGrouping.Milestone]: 'milestone',
  [IssuesGrouping.NoGrouping]: undefined
}

export const issuesOrderKeyMap: Record<IssuesOrdering, IssuesOrderByKeys> = {
  [IssuesOrdering.Status]: 'status',
  [IssuesOrdering.Priority]: 'priority',
  [IssuesOrdering.LastUpdated]: 'modifiedOn',
  [IssuesOrdering.DueDate]: 'dueDate',
  [IssuesOrdering.Manual]: 'rank'
}

export const issuesGroupEditorMap: Record<'status' | 'priority' | 'component' | 'milestone', AnyComponent | undefined> =
  {
    status: tracker.component.StatusEditor,
    priority: tracker.component.PriorityEditor,
    component: tracker.component.ComponentEditor,
    milestone: tracker.component.MilestoneEditor
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
    case 'component': {
      return {
        icon: tracker.icon.Component,
        label: tracker.string.Component
      }
    }
    case 'milestone': {
      return {
        icon: tracker.icon.Milestone,
        label: tracker.string.Milestone
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

export type ComponentsFilterMode = 'all' | 'backlog' | 'active' | 'closed'

export type MilestoneViewMode = 'all' | 'planned' | 'active' | 'closed'

export const getIncludedMilestoneStatuses = (mode: MilestoneViewMode): MilestoneStatus[] => {
  switch (mode) {
    case 'all': {
      return defaultMilestoneStatuses
    }
    case 'active': {
      return [MilestoneStatus.InProgress]
    }
    case 'planned': {
      return [MilestoneStatus.Planned]
    }
    case 'closed': {
      return [MilestoneStatus.Completed, MilestoneStatus.Canceled]
    }
    default: {
      return []
    }
  }
}

export const componentsTitleMap: Record<ComponentsFilterMode, IntlString> = Object.freeze({
  all: tracker.string.AllComponents,
  backlog: tracker.string.BacklogComponents,
  active: tracker.string.ActiveComponents,
  closed: tracker.string.ClosedComponents
})

export const milestoneTitleMap: Record<MilestoneViewMode, IntlString> = Object.freeze({
  all: tracker.string.AllMilestones,
  planned: tracker.string.PlannedMilestones,
  active: tracker.string.ActiveMilestones,
  closed: tracker.string.ClosedMilestones
})

/**
 * @public
 */
export const listIssueStatusOrder = [
  tracker.issueStatusCategory.Started,
  tracker.issueStatusCategory.Unstarted,
  tracker.issueStatusCategory.Backlog,
  tracker.issueStatusCategory.Completed,
  tracker.issueStatusCategory.Canceled
] as const

/**
 * @public
 */
export const listIssueKanbanStatusOrder = [
  tracker.issueStatusCategory.Backlog,
  tracker.issueStatusCategory.Unstarted,
  tracker.issueStatusCategory.Started,
  tracker.issueStatusCategory.Completed,
  tracker.issueStatusCategory.Canceled
] as const

export async function issueStatusSort (
  client: TxOperations,
  value: Array<Ref<IssueStatus>>,
  space: Ref<Project> | undefined,
  viewletDescriptorId?: Ref<ViewletDescriptor>
): Promise<Array<Ref<IssueStatus>>> {
  let _space: Project | undefined
  if (space !== undefined) {
    _space = await client.findOne(tracker.class.Project, { _id: space })
  }
  const statuses = get(statusStore)
  // TODO: How we track category updates.

  if (viewletDescriptorId === tracker.viewlet.Kanban) {
    value.sort((a, b) => {
      const aVal = statuses.get(a) as IssueStatus
      const bVal = statuses.get(b) as IssueStatus
      const res =
        listIssueKanbanStatusOrder.indexOf(aVal?.category as Ref<StatusCategory>) -
        listIssueKanbanStatusOrder.indexOf(bVal?.category as Ref<StatusCategory>)
      if (res === 0) {
        if (_space != null) {
          const aIndex = _space.states.findIndex((s) => s === a)
          const bIndex = _space.states.findIndex((s) => s === b)
          return aIndex - bIndex
        } else {
          return aVal.name.localeCompare(bVal.name)
        }
      }
      return res
    })
  } else {
    value.sort((a, b) => {
      const aVal = statuses.get(a) as IssueStatus
      const bVal = statuses.get(b) as IssueStatus
      const res =
        listIssueStatusOrder.indexOf(aVal?.category as Ref<StatusCategory>) -
        listIssueStatusOrder.indexOf(bVal?.category as Ref<StatusCategory>)
      if (res === 0) {
        if (_space != null) {
          const aIndex = _space.states.findIndex((s) => s === a)
          const bIndex = _space.states.findIndex((s) => s === b)
          return aIndex - bIndex
        } else {
          return aVal.name.localeCompare(bVal.name)
        }
      }
      return res
    })
  }
  return value
}

export async function issuePrioritySort (client: TxOperations, value: IssuePriority[]): Promise<IssuePriority[]> {
  value.sort((a, b) => {
    const i1 = defaultPriorities.indexOf(a)
    const i2 = defaultPriorities.indexOf(b)

    return i2 - i1
  })
  return value
}

export async function milestoneSort (
  client: TxOperations,
  value: Array<Ref<Milestone>>
): Promise<Array<Ref<Milestone>>> {
  return await new Promise((resolve) => {
    const query = createQuery(true)
    query.query(tracker.class.Milestone, { _id: { $in: value } }, (res) => {
      const milestones = toIdMap(res)
      value.sort((a, b) => (milestones.get(b)?.targetDate ?? 0) - (milestones.get(a)?.targetDate ?? 0))
      resolve(value)
      query.unsubscribe()
    })
  })
}

export async function moveIssuesToAnotherMilestone (
  client: TxOperations,
  oldMilestone: Milestone,
  newMilestone: Milestone | undefined
): Promise<boolean> {
  try {
    // Find all Issues by Milestone
    const movedIssues = await client.findAll(tracker.class.Issue, { milestone: oldMilestone._id })

    // Update Issues by new Milestone
    const awaitedUpdates: Array<Promise<TxResult>> = []
    for (const issue of movedIssues) {
      awaitedUpdates.push(client.update(issue, { milestone: newMilestone?._id ?? null }))
    }
    await Promise.all(awaitedUpdates)

    return true
  } catch (error) {
    console.error(
      `Error happened while moving issues between milestones from ${oldMilestone.label} to ${
        newMilestone?.label ?? 'No Milestone'
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
  query: DocumentQuery<Doc> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>
): Promise<any[] | undefined> {
  const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
    let refresh: boolean = false
    const lq = CategoryQuery.getLiveQuery(queryId)
    refresh = lq.query(_class, query ?? {}, (res) => {
      const result = res.map((p) => p._id)
      CategoryQuery.results.set(queryId, result)
      resolve(result)
      onUpdate()
    })

    if (!refresh) {
      resolve(CategoryQuery.results.get(queryId) ?? [])
    }
  })
  return await promise
}

export async function getAllPriority (
  query: DocumentQuery<Doc> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>
): Promise<any[] | undefined> {
  return defaultPriorities
}

export async function getAllComponents (
  query: DocumentQuery<Doc> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>
): Promise<any[] | undefined> {
  return await getAllSomething(tracker.class.Component, query, onUpdate, queryId)
}

export async function getAllMilestones (
  query: DocumentQuery<Doc> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>
): Promise<any[] | undefined> {
  return await getAllSomething(tracker.class.Milestone, query, onUpdate, queryId)
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

export async function getPreviousAssignees (objectId: Ref<Doc> | undefined): Promise<Array<Ref<Contact>>> {
  if (objectId === undefined) {
    return []
  }
  const client = getClient()
  const createTx = (
    await client.findAll<TxCollectionCUD<Issue, Issue>>(core.class.TxCollectionCUD, {
      'tx.objectId': objectId,
      'tx._class': core.class.TxCreateDoc
    })
  )[0]
  const updateTxes = await client.findAll<TxCollectionCUD<Issue, Issue>>(
    core.class.TxCollectionCUD,
    { 'tx.objectId': objectId, 'tx._class': core.class.TxUpdateDoc, 'tx.operations.assignee': { $exists: true } },
    { sort: { modifiedOn: -1 } }
  )
  const set: Set<Ref<Contact>> = new Set()
  const createAssignee = (createTx.tx as TxCreateDoc<Issue>).attributes.assignee
  for (const tx of updateTxes) {
    const assignee = (tx.tx as TxUpdateDoc<Issue>).operations.assignee
    if (assignee == null) continue
    set.add(assignee)
  }
  if (createAssignee != null) {
    set.add(createAssignee)
  }
  return Array.from(set)
}

async function updateIssuesOnMove (
  client: TxOperations,
  applyOps: ApplyOperations,
  doc: Doc,
  space: Project,
  extra: DocumentUpdate<any>,
  updates: Map<Ref<Issue>, DocumentUpdate<Issue>>
): Promise<void> {
  const hierarchy = client.getHierarchy()
  const attributes = hierarchy.getAllAttributes(doc._class)
  for (const attribute of attributes.values()) {
    if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) {
      const collection = attribute.type as Collection<AttachedDoc>
      const allAttached = await client.findAll(collection.of, { attachedTo: doc._id })
      for (const attached of allAttached) {
        if (hierarchy.isDerived(collection.of, tracker.class.Issue)) {
          const lastOne = await client.findOne(tracker.class.Issue, {}, { sort: { rank: SortingOrder.Descending } })
          const incResult = await client.updateDoc(
            tracker.class.Project,
            core.space.Space,
            space._id,
            {
              $inc: { sequence: 1 }
            },
            true
          )
          await updateIssuesOnMove(
            client,
            applyOps,
            attached,
            space,
            {
              ...updates.get(attached._id as Ref<Issue>),
              rank: calcRank(lastOne, undefined),
              number: (incResult as any).object.sequence
            },
            updates
          )
        } else {
          await updateIssuesOnMove(client, applyOps, attached, space, {}, updates)
        }
      }
    }
  }
  await applyOps.update(doc, {
    space: space._id,
    ...extra
  })
}

/**
 * @public
 */
export async function moveIssueToSpace (
  client: TxOperations,
  docs: Issue[],
  space: Project,
  updates: Map<Ref<Issue>, DocumentUpdate<Issue>>
): Promise<void> {
  const applyOps = client.apply(docs[0]._id)
  for (const doc of docs) {
    const lastOne = await client.findOne(tracker.class.Issue, {}, { sort: { rank: SortingOrder.Descending } })
    const incResult = await client.updateDoc(
      tracker.class.Project,
      core.space.Space,
      space._id,
      {
        $inc: { sequence: 1 }
      },
      true
    )
    await updateIssuesOnMove(
      client,
      applyOps,
      doc,
      space,
      {
        ...updates.get(doc._id),
        rank: calcRank(lastOne, undefined),
        number: (incResult as any).object.sequence
      },
      updates
    )
  }
  await applyOps.commit()
}

/**
 * @public
 *
 * Will collect all issues to be moved.
 */
export async function collectIssues (client: TxOperations, docs: Doc[]): Promise<Issue[]> {
  const result: Issue[] = []
  const hierarchy = client.getHierarchy()
  for (const doc of docs) {
    if (hierarchy.isDerived(doc._class, tracker.class.Issue)) {
      result.push(doc as Issue)
    }

    const attributes = hierarchy.getAllAttributes(doc._class)
    for (const attribute of attributes.values()) {
      if (hierarchy.isDerived(attribute.type._class, core.class.Collection)) {
        const collection = attribute.type as Collection<AttachedDoc>
        const allAttached = await client.findAll(collection.of, { attachedTo: doc._id })
        for (const attached of allAttached) {
          if (hierarchy.isDerived(collection.of, tracker.class.Issue)) {
            if (result.find((it) => it._id === attached._id) === undefined) {
              result.push(attached as Issue)
            }
          }

          const subIssues = await collectIssues(client, [attached])
          if (subIssues.length > 0) {
            for (const s of subIssues) {
              if (result.find((it) => it._id === s._id) === undefined) {
                result.push(s)
              }
            }
          }
        }
      }
    }
  }
  return result
}

/**
 * @public
 */
export function findTargetStatus (
  status: Ref<Status>,
  targetProject: Project,
  statusStore: IdMap<Status>,
  useCategory = false
): Ref<Status> | undefined {
  if (targetProject.states.includes(status)) return status

  if (useCategory) {
    const currentCategroy = statusStore.get(status)?.category
    for (const status of targetProject.states) {
      const st = statusStore.get(status)
      if (st?.category === currentCategroy) return st?._id
    }
  }
}

/**
 * @public
 */
export function issueToAttachedData (issue: Issue): AttachedData<Issue> {
  const { _id, _class, space, ...data } = issue
  return { ...data }
}

/**
 * @public
 */
export const IssuePriorityColor = {
  [IssuePriority.NoPriority]: PaletteColorIndexes.Blueberry,
  [IssuePriority.Urgent]: PaletteColorIndexes.Orange,
  [IssuePriority.High]: PaletteColorIndexes.Sunshine,
  [IssuePriority.Medium]: PaletteColorIndexes.Ocean,
  [IssuePriority.Low]: PaletteColorIndexes.Cloud
}

export async function getVisibleFilters (filters: KeyFilter[], space?: Ref<Space>): Promise<KeyFilter[]> {
  // Removes the "Project" filter if a specific space is provided
  return space === undefined ? filters : filters.filter((f) => f.key !== 'space')
}

interface ManualUpdates {
  useStatus: boolean
  useComponent: boolean
  createStatus: boolean
  createComponent: boolean
}
export type IssueToUpdate = DocumentUpdate<Issue> & Partial<ManualUpdates>

export interface StatusToUpdate {
  ref: Ref<IssueStatus>
  create?: boolean
}

export interface ComponentToUpdate {
  ref: Ref<Component>
  create?: boolean
}
