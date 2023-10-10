//
// Copyright © 2022-2023 Hardcore Engineering Inc.
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

import { Employee, Person } from '@hcengineering/contact'
import {
  AttachedDoc,
  Attribute,
  Class,
  Doc,
  DocData,
  DocManager,
  IdMap,
  Markup,
  Mixin,
  Ref,
  RelatedDocument,
  Space,
  Status,
  StatusCategory,
  Timestamp,
  Type,
  WithLookup
} from '@hcengineering/core'
import { Asset, IntlString, Plugin, Resource, plugin } from '@hcengineering/platform'
import { TagCategory, TagElement, TagReference } from '@hcengineering/tags'
import { SpaceWithStates, Task } from '@hcengineering/task'
import { AnyComponent, ComponentExtensionId, Location, ResolvedLocation } from '@hcengineering/ui'
import { Action, ActionCategory, IconProps } from '@hcengineering/view'

/**
 * @public
 */
export interface IssueStatus extends Status {}

/**
 * @public
 */
export interface Project extends SpaceWithStates, IconProps {
  identifier: string // Project identifier
  sequence: number
  defaultIssueStatus: Ref<IssueStatus>
  defaultAssignee?: Ref<Employee>
  defaultTimeReportDay: TimeReportDayType
}

export type RelatedIssueKind = 'classRule' | 'spaceRule'

export interface RelatedClassRule {
  kind: 'classRule'
  ofClass: Ref<Class<Doc>>
}

export interface RelatedSpaceRule {
  kind: 'spaceRule'
  space: Ref<Space>
}

/**
 * @public
 *
 * If defined, will be used to set a default project for this kind of document's related issues.
 */
export interface RelatedIssueTarget extends Doc {
  // Attached to project.
  target?: Ref<Project> | null
  rule: RelatedClassRule | RelatedSpaceRule
}

/**
 * @public
 */
export type IssueUpdateFunction = (
  id: Ref<Issue>,
  space: Ref<Space>,
  issue: DocData<Issue>,
  data: Record<string, any>
) => Promise<void>

/**
 * @public
 *
 * Customization mixin for project class.
 *
 * Allow to customize create issue/move issue dialogs, in case of selecting project of special kind.
 */
export interface ProjectIssueTargetOptions extends Class<Doc> {
  // Component receiving project and context data.
  headerComponent?: AnyComponent
  bodyComponent?: AnyComponent
  footerComponent?: AnyComponent
  poolComponent?: AnyComponent

  update: Resource<IssueUpdateFunction>
}

/**
 * @public
 */
export enum TimeReportDayType {
  CurrentWorkDay = 'CurrentWorkDay',
  PreviousWorkDay = 'PreviousWorkDay'
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
  Component = 'component',
  Milestone = 'milestone',
  NoGrouping = '#no_category'
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
export enum MilestoneStatus {
  Planned,
  InProgress,
  Completed,
  Canceled
}

/**
 * @public
 */
export interface Milestone extends Doc {
  label: string
  description?: Markup

  status: MilestoneStatus

  space: Ref<Project>

  comments: number
  attachments?: number

  targetDate: Timestamp
}

/**
 * @public
 */
export interface Issue extends Task {
  attachedTo: Ref<Issue>
  title: string
  description: Markup
  status: Ref<IssueStatus>
  priority: IssuePriority

  component: Ref<Component> | null

  // For subtasks
  subIssues: number
  blockedBy?: RelatedDocument[]
  relations?: RelatedDocument[]
  parents: IssueParentInfo[]

  space: Ref<Project>

  milestone?: Ref<Milestone> | null

  // Estimation in man hours
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
export interface IssueDraft {
  _id: Ref<Issue>
  title: string
  description: Markup
  status?: Ref<IssueStatus>
  priority: IssuePriority
  assignee: Ref<Person> | null
  component: Ref<Component> | null
  space: Ref<Project>
  dueDate: Timestamp | null
  milestone?: Ref<Milestone> | null

  // Estimation in man days
  estimation: number
  parentIssue?: Ref<Issue>
  attachments?: number
  labels: TagReference[]
  subIssues: IssueDraft[]
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

  assignee: Ref<Person> | null
  component: Ref<Component> | null

  milestone?: Ref<Milestone> | null

  // Estimation in man days
  estimation: number

  labels?: Ref<TagElement>[]
}

/**
 * @public
 */
export interface IssueTemplateChild extends IssueTemplateData {
  id: Ref<Issue>
}

/**
 * @public
 */
export interface IssueTemplate extends Doc, IssueTemplateData {
  space: Ref<Project>

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
  // Value in man hours
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

  space: Ref<Project>
}

/**
 * @public
 */
export interface Component extends Doc {
  label: string
  description?: Markup
  lead: Ref<Employee> | null
  space: Ref<Project>
  comments: number
  attachments?: number
}

/**
 * @public
 *
 * Allow to query for status keys/values.
 */
export class ComponentManager extends DocManager {
  get (ref: Ref<WithLookup<Component>>): WithLookup<Component> | undefined {
    return this.getIdMap().get(ref) as WithLookup<Component>
  }

  getDocs (): Array<WithLookup<Component>> {
    return this.docs as Component[]
  }

  getIdMap (): IdMap<WithLookup<Component>> {
    return this.byId as IdMap<WithLookup<Component>>
  }

  filter (predicate: (value: Component) => boolean): Component[] {
    return this.getDocs().filter(predicate)
  }
}

/**
 * @public
 */
export const trackerId = 'tracker' as Plugin

export * from './utils'

export default plugin(trackerId, {
  class: {
    Project: '' as Ref<Class<Project>>,
    Issue: '' as Ref<Class<Issue>>,
    IssueTemplate: '' as Ref<Class<IssueTemplate>>,
    Component: '' as Ref<Class<Component>>,
    IssueStatus: '' as Ref<Class<IssueStatus>>,
    TypeIssuePriority: '' as Ref<Class<Type<IssuePriority>>>,
    Milestone: '' as Ref<Class<Milestone>>,
    TypeMilestoneStatus: '' as Ref<Class<Type<MilestoneStatus>>>,
    TimeSpendReport: '' as Ref<Class<TimeSpendReport>>,
    TypeReportedTime: '' as Ref<Class<Type<number>>>,
    RelatedIssueTarget: '' as Ref<Class<RelatedIssueTarget>>
  },
  ids: {
    NoParent: '' as Ref<Issue>,
    IssueDraft: '',
    IssueDraftChild: ''
  },
  component: {
    Tracker: '' as AnyComponent,
    TrackerApp: '' as AnyComponent,
    RelatedIssues: '' as AnyComponent,
    RelatedIssuesSection: '' as AnyComponent,
    RelatedIssueSelector: '' as AnyComponent,
    RelatedIssueTemplates: '' as AnyComponent,
    EditIssue: '' as AnyComponent,
    CreateIssue: '' as AnyComponent,
    CreateIssueTemplate: '' as AnyComponent
  },
  attribute: {
    IssueStatus: '' as Ref<Attribute<Status>>
  },
  issueStatusCategory: {
    Backlog: '' as Ref<StatusCategory>,
    Unstarted: '' as Ref<StatusCategory>,
    Started: '' as Ref<StatusCategory>,
    Completed: '' as Ref<StatusCategory>,
    Canceled: '' as Ref<StatusCategory>
  },
  icon: {
    TrackerApplication: '' as Asset,
    Component: '' as Asset,
    Issue: '' as Asset,
    Subissue: '' as Asset,
    Project: '' as Asset,
    Relations: '' as Asset,
    Inbox: '' as Asset,
    MyIssues: '' as Asset,
    Views: '' as Asset,
    Issues: '' as Asset,
    Components: '' as Asset,
    NewIssue: '' as Asset,
    Magnifier: '' as Asset,
    Labels: '' as Asset,
    DueDate: '' as Asset,
    Parent: '' as Asset,
    Milestone: '' as Asset,
    IssueTemplates: '' as Asset,
    Start: '' as Asset,
    Stop: '' as Asset,

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

    ComponentsList: '' as Asset,

    MilestoneStatusPlanned: '' as Asset,
    MilestoneStatusInProgress: '' as Asset,
    MilestoneStatusPaused: '' as Asset,
    MilestoneStatusCompleted: '' as Asset,
    MilestoneStatusCanceled: '' as Asset,

    CopyBranch: '' as Asset,
    Duplicate: '' as Asset,

    TimeReport: '' as Asset,
    Estimation: '' as Asset,

    // Project icons
    Home: '' as Asset,
    RedCircle: '' as Asset
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
    SetComponent: '' as Ref<Action>,
    CopyIssueId: '' as Ref<Action>,
    CopyIssueTitle: '' as Ref<Action>,
    CopyIssueLink: '' as Ref<Action>,
    MoveToProject: '' as Ref<Action>,
    Duplicate: '' as Ref<Action>,
    Relations: '' as Ref<Action>,
    NewIssue: '' as Ref<Action>,
    NewSubIssue: '' as Ref<Action>,
    EditWorkflowStatuses: '' as Ref<Action>,
    EditProject: '' as Ref<Action>,
    SetMilestone: '' as Ref<Action>,
    SetLabels: '' as Ref<Action>,
    EditRelatedTargets: '' as Ref<Action>
  },
  project: {
    DefaultProject: '' as Ref<Project>
  },
  resolver: {
    Location: '' as Resource<(loc: Location) => Promise<ResolvedLocation | undefined>>
  },
  string: {
    ConfigLabel: '' as IntlString,
    NewRelatedIssue: '' as IntlString,
    IssueNotificationTitle: '' as IntlString,
    IssueNotificationBody: '' as IntlString,
    IssueNotificationChanged: '' as IntlString,
    IssueNotificationChangedProperty: '' as IntlString,
    IssueNotificationMessage: '' as IntlString,
    IssueAssigneedToYou: '' as IntlString,
    RelatedIssues: '' as IntlString
  },
  mixin: {
    ProjectIssueTargetOptions: '' as Ref<Mixin<ProjectIssueTargetOptions>>
  },
  extensions: {
    IssueListHeader: '' as ComponentExtensionId,
    EditIssueHeader: '' as ComponentExtensionId
  }
})
