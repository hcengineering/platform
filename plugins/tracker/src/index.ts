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

import { Employee } from '@anticrm/contact'
import type { AttachedDoc, Class, Doc, Markup, Ref, Space, Timestamp, Type } from '@anticrm/core'
import { Action, ActionCategory } from '@anticrm/view'
import type { Asset, IntlString, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import { AnyComponent } from '@anticrm/ui'

/**
 * @public
 */
export interface IssueStatus extends AttachedDoc {
  name: string
  description?: string
  color?: number
  category: Ref<IssueStatusCategory>
  rank: string
}

/**
 * @public
 */
export interface IssueStatusCategory extends Doc {
  icon: Asset
  label: IntlString
  color: number
  defaultStatusName: string
  order: number
}

/**
 * @public
 */
export interface Team extends Space {
  teamLogo?: string | null
  identifier: string // Team identifier
  sequence: number
  issueStatuses: number
  defaultIssueStatus: Ref<IssueStatus>
}

/**
 * @public
 */
export enum IssuePriority {
  NoPriority,
  Urgent,
  High,
  Medium,
  Low
}

/**
 * @public
 */
export enum IssuesGrouping {
  Status = 'status',
  Assignee = 'assignee',
  Priority = 'priority',
  NoGrouping = 'noGrouping'
}

/**
 * @public
 */
export enum IssuesOrdering {
  Status = 'status',
  Priority = 'priority',
  LastUpdated = 'lastUpdated',
  DueDate = 'dueDate'
}

/**
 * @public
 */
export enum IssuesDateModificationPeriod {
  All = 'all',
  PastWeek = 'pastWeek',
  PastMonth = 'pastMonth'
}

/**
 * @public
 */
export interface Issue extends AttachedDoc {
  title: string
  description: Markup
  status: Ref<IssueStatus>
  priority: IssuePriority

  number: number
  assignee: Ref<Employee> | null
  project: Ref<Project> | null

  // For subtasks
  subIssues?: number
  blockedBy?: Ref<Issue>[]
  relatedIssue?: Ref<Issue>[]

  comments: number
  attachments?: number
  labels?: string[]

  space: Ref<Team>

  dueDate: Timestamp | null

  rank: string
}

/**
 * @public
 */
export interface Document extends Doc {
  title: string
  icon: string | null
  color: number
  content?: Markup

  space: Ref<Team>
}

/**
 * @public
 */
export enum ProjectStatus {
  Backlog,
  Planned,
  InProgress,
  Paused,
  Completed,
  Canceled
}

/**
 * @public
 */
export interface Project extends Doc {
  label: string
  description?: Markup
  icon: Asset

  status: ProjectStatus

  lead: Ref<Employee> | null
  members: Ref<Employee>[]

  space: Ref<Team>

  comments: number
  attachments?: number

  startDate: Timestamp | null
  targetDate: Timestamp | null

  // Ref<Document>[]
  documents: number
}

/**
 * @public
 */
export const trackerId = 'tracker' as Plugin

export * from './utils'

export default plugin(trackerId, {
  class: {
    Team: '' as Ref<Class<Team>>,
    Issue: '' as Ref<Class<Issue>>,
    Document: '' as Ref<Class<Document>>,
    Project: '' as Ref<Class<Project>>,
    IssueStatus: '' as Ref<Class<IssueStatus>>,
    IssueStatusCategory: '' as Ref<Class<IssueStatusCategory>>,
    TypeIssuePriority: '' as Ref<Class<Type<IssuePriority>>>
  },
  ids: {
    NoParent: '' as Ref<Issue>
  },
  component: {
    Tracker: '' as AnyComponent,
    TrackerApp: '' as AnyComponent
  },
  issueStatusCategory: {
    Backlog: '' as Ref<IssueStatusCategory>,
    Unstarted: '' as Ref<IssueStatusCategory>,
    Started: '' as Ref<IssueStatusCategory>,
    Completed: '' as Ref<IssueStatusCategory>,
    Canceled: '' as Ref<IssueStatusCategory>
  },
  icon: {
    TrackerApplication: '' as Asset,
    Project: '' as Asset,
    Issue: '' as Asset,
    Team: '' as Asset,
    Document: '' as Asset,
    Inbox: '' as Asset,
    MyIssues: '' as Asset,
    Views: '' as Asset,
    Issues: '' as Asset,
    Projects: '' as Asset,
    NewIssue: '' as Asset,
    Magnifier: '' as Asset,
    Home: '' as Asset,
    Labels: '' as Asset,
    DueDate: '' as Asset,
    Parent: '' as Asset,

    CategoryBacklog: '' as Asset,
    CategoryUnstarted: '' as Asset,
    CategoryStarted: '' as Asset,
    CategoryCompleted: '' as Asset,
    CategoryCanceled: '' as Asset,

    PriorityNoPriority: '' as Asset,
    PriorityUrgent: '' as Asset,
    PriorityHigh: '' as Asset,
    PriorityMedium: '' as Asset,
    PriorityLow: '' as Asset,

    ProjectsList: '' as Asset,
    ProjectsTimeline: '' as Asset,
    ProjectMembers: '' as Asset,

    ProjectStatusBacklog: '' as Asset,
    ProjectStatusPlanned: '' as Asset,
    ProjectStatusInProgress: '' as Asset,
    ProjectStatusPaused: '' as Asset,
    ProjectStatusCompleted: '' as Asset,
    ProjectStatusCanceled: '' as Asset
  },
  category: {
    Tracker: '' as Ref<ActionCategory>
  },
  action: {
    SetDueDate: '' as Ref<Action>,
    SetParent: '' as Ref<Action>
  }
})
