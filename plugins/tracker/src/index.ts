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

import { Employee } from '@hcengineering/contact'
import type { AttachedDoc, Class, Doc, Markup, Ref, RelatedDocument, Space, Timestamp, Type } from '@hcengineering/core'
import type { Asset, IntlString, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { TagCategory, TagElement } from '@hcengineering/tags'
import { AnyComponent, Location } from '@hcengineering/ui'
import { Action, ActionCategory } from '@hcengineering/view'
import { TagReference } from '@hcengineering/tags'

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
  identifier: string // Team identifier
  sequence: number
  issueStatuses: number
  defaultIssueStatus: Ref<IssueStatus>
  icon?: Asset
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
  Project = 'project',
  Sprint = 'sprint',
  NoGrouping = 'noGrouping'
}

/**
 * @public
 */
export enum IssuesOrdering {
  Status = 'status',
  Priority = 'priority',
  LastUpdated = 'modifiedOn',
  DueDate = 'dueDate',
  Manual = 'rank'
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
export enum SprintStatus {
  Planned,
  InProgress,
  Completed,
  Canceled
}

/**
 * @public
 */
export interface Sprint extends Doc {
  label: string
  description?: Markup

  status: SprintStatus

  lead: Ref<Employee> | null
  members: Ref<Employee>[]

  space: Ref<Team>

  comments: number
  attachments?: number

  startDate: Timestamp
  targetDate: Timestamp

  // Capacity in man days.
  capacity: number

  project?: Ref<Project>
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
  subIssues: number
  blockedBy?: RelatedDocument[]
  relations?: RelatedDocument[]
  parents: IssueParentInfo[]

  comments: number
  attachments?: number
  labels?: number

  space: Ref<Team>

  dueDate: Timestamp | null

  rank: string

  sprint?: Ref<Sprint> | null

  // Estimation in man days
  estimation: number

  // ReportedTime time, auto updated using trigger.
  reportedTime: number
  // Collection of reportedTime entries, for proper time estimations per person.
  reports: number

  childInfo: IssueChildInfo[]

  template?: {
    // A template issue is based on
    template: Ref<IssueTemplate>
    // Child id in template
    childId?: string
  }
}

/**
 * @public
 */
export interface IssueDraft extends Doc {
  issueId: Ref<Issue>
  title: string
  description: Markup
  status: Ref<IssueStatus>
  priority: IssuePriority
  assignee: Ref<Employee> | null
  project: Ref<Project> | null
  team: Ref<Team> | null
  dueDate: Timestamp | null
  sprint?: Ref<Sprint> | null

  // Estimation in man days
  estimation: number
  parentIssue?: string
  labels?: TagReference[]
  subIssues?: IssueTemplateChild[]
  template?: {
    // A template issue is based on
    template: Ref<IssueTemplate>
    // Child id in template
    childId?: string
  }
}

/**
 * @public
 */
export interface IssueTemplateData {
  title: string
  description: Markup
  priority: IssuePriority

  assignee: Ref<Employee> | null
  project: Ref<Project> | null

  sprint?: Ref<Sprint> | null

  // Estimation in man days
  estimation: number

  labels?: Ref<TagElement>[]
}

/**
 * @public
 */
export interface IssueTemplateChild extends IssueTemplateData {
  id: string
}

/**
 * @public
 */
export interface IssueTemplate extends Doc, IssueTemplateData {
  space: Ref<Team>

  children: IssueTemplateChild[]

  // Discussion stuff
  comments: number
  attachments?: number

  relations?: RelatedDocument[]
}

/**
 * @public
 *
 * Declares time spend entry
 */
export interface TimeSpendReport extends AttachedDoc {
  attachedTo: Ref<Issue>

  employee: Ref<Employee> | null

  date: Timestamp | null
  // Value in man days
  value: number

  description: string
}

/**
 * @public
 */
export interface IssueParentInfo {
  parentId: Ref<Issue>
  parentTitle: string
}

/**
 * @public
 */
export interface IssueChildInfo {
  childId: Ref<Issue>
  estimation: number
  reportedTime: number
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
export interface ViewOptions {
  groupBy: IssuesGrouping
  orderBy: IssuesOrdering
  completedIssuesPeriod: IssuesDateModificationPeriod
  shouldShowEmptyGroups: boolean
  shouldShowSubIssues: boolean
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
    IssueDraft: '' as Ref<Class<IssueDraft>>,
    IssueTemplate: '' as Ref<Class<IssueTemplate>>,
    Document: '' as Ref<Class<Document>>,
    Project: '' as Ref<Class<Project>>,
    IssueStatus: '' as Ref<Class<IssueStatus>>,
    IssueStatusCategory: '' as Ref<Class<IssueStatusCategory>>,
    TypeIssuePriority: '' as Ref<Class<Type<IssuePriority>>>,
    TypeProjectStatus: '' as Ref<Class<Type<ProjectStatus>>>,
    Sprint: '' as Ref<Class<Sprint>>,
    TypeSprintStatus: '' as Ref<Class<Type<SprintStatus>>>,
    TimeSpendReport: '' as Ref<Class<TimeSpendReport>>,
    TypeReportedTime: '' as Ref<Class<Type<number>>>
  },
  ids: {
    NoParent: '' as Ref<Issue>
  },
  component: {
    Tracker: '' as AnyComponent,
    TrackerApp: '' as AnyComponent,
    RelatedIssues: '' as AnyComponent,
    RelatedIssueTemplates: '' as AnyComponent,
    EditIssue: '' as AnyComponent,
    CreateIssue: '' as AnyComponent,
    CreateIssueTemplate: '' as AnyComponent
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
    RedCircle: '' as Asset,
    Labels: '' as Asset,
    DueDate: '' as Asset,
    Parent: '' as Asset,
    Sprint: '' as Asset,

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
    ProjectStatusCanceled: '' as Asset,

    SprintStatusPlanned: '' as Asset,
    SprintStatusInProgress: '' as Asset,
    SprintStatusPaused: '' as Asset,
    SprintStatusCompleted: '' as Asset,
    SprintStatusCanceled: '' as Asset,

    CopyID: '' as Asset,
    CopyURL: '' as Asset,
    CopyBranch: '' as Asset,
    Duplicate: '' as Asset,

    TimeReport: '' as Asset,
    Estimation: '' as Asset
  },
  category: {
    Other: '' as Ref<TagCategory>,
    Tracker: '' as Ref<ActionCategory>
  },
  action: {
    SetDueDate: '' as Ref<Action>,
    SetParent: '' as Ref<Action>,
    SetStatus: '' as Ref<Action>,
    SetPriority: '' as Ref<Action>,
    SetAssignee: '' as Ref<Action>,
    SetProject: '' as Ref<Action>,
    CopyIssueId: '' as Ref<Action>,
    CopyIssueTitle: '' as Ref<Action>,
    CopyIssueLink: '' as Ref<Action>,
    MoveToTeam: '' as Ref<Action>,
    Duplicate: '' as Ref<Action>,
    Relations: '' as Ref<Action>,
    NewSubIssue: '' as Ref<Action>,
    EditWorkflowStatuses: '' as Ref<Action>,
    SetSprint: '' as Ref<Action>
  },
  team: {
    DefaultTeam: '' as Ref<Team>
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<Location | undefined>>
  }
})
