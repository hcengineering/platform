//
// Copyright © 2023 Hardcore Engineering Inc.
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

import contact, { Employee, Person } from '@hcengineering/contact'
import {
  DOMAIN_MODEL,
  DateRangeMode,
  Domain,
  IndexKind,
  Markup,
  Ref,
  RelatedDocument,
  Timestamp,
  Type
} from '@hcengineering/core'
import {
  ArrOf,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeDate,
  TypeMarkup,
  TypeNumber,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import core, { TAttachedDoc, TClass, TDoc, TStatus, TType } from '@hcengineering/model-core'
import task, { TSpaceWithStates, TTask } from '@hcengineering/model-task'
import { IntlString, Resource } from '@hcengineering/platform'
import tags, { TagElement } from '@hcengineering/tags'
import { DoneState } from '@hcengineering/task'
import {
  Component,
  Issue,
  IssueChildInfo,
  IssueParentInfo,
  IssuePriority,
  IssueStatus,
  IssueTemplate,
  IssueTemplateChild,
  IssueUpdateFunction,
  Milestone,
  MilestoneStatus,
  Project,
  ProjectIssueTargetOptions,
  RelatedClassRule,
  RelatedIssueTarget,
  RelatedSpaceRule,
  TimeReportDayType,
  TimeSpendReport
} from '@hcengineering/tracker'
import { AnyComponent } from '@hcengineering/ui'
import tracker from './plugin'

export const DOMAIN_TRACKER = 'tracker' as Domain
/**
 * @public
 */

@Model(tracker.class.IssueStatus, core.class.Status)
@UX(tracker.string.IssueStatuses, undefined, undefined, 'rank', 'name')
export class TIssueStatus extends TStatus implements IssueStatus {}
/**
 * @public
 */

export function TypeIssuePriority (): Type<IssuePriority> {
  return { _class: tracker.class.TypeIssuePriority, label: tracker.string.TypeIssuePriority }
}
/**
 * @public
 */

@Model(tracker.class.TypeIssuePriority, core.class.Type, DOMAIN_MODEL)
export class TTypeIssuePriority extends TType {}
/**
 * @public
 */

export function TypeMilestoneStatus (): Type<MilestoneStatus> {
  return { _class: tracker.class.TypeMilestoneStatus, label: 'TypeMilestoneStatus' as IntlString }
}
/**
 * @public
 */

@Model(tracker.class.TypeMilestoneStatus, core.class.Type, DOMAIN_MODEL)
export class TTypeMilestoneStatus extends TType {}
/**
 * @public
 */

@Model(tracker.class.Project, task.class.SpaceWithStates)
@UX(tracker.string.Project, tracker.icon.Issues, 'Project', 'name')
export class TProject extends TSpaceWithStates implements Project {
  @Prop(TypeString(), tracker.string.ProjectIdentifier)
  @Index(IndexKind.FullText)
    identifier!: IntlString

  @Prop(TypeNumber(), tracker.string.Number)
  @Hidden()
    sequence!: number

  @Prop(TypeRef(tracker.class.IssueStatus), tracker.string.DefaultIssueStatus)
    defaultIssueStatus!: Ref<IssueStatus>

  @Prop(TypeRef(contact.mixin.Employee), tracker.string.DefaultAssignee)
    defaultAssignee!: Ref<Employee>

  declare defaultTimeReportDay: TimeReportDayType

  @Prop(Collection(tracker.class.RelatedIssueTarget), tracker.string.RelatedIssue)
    relatedIssueTargets!: number
}
/**
 * @public
 */

@Model(tracker.class.RelatedIssueTarget, core.class.Doc, DOMAIN_TRACKER)
@UX(tracker.string.RelatedIssues)
export class TRelatedIssueTarget extends TDoc implements RelatedIssueTarget {
  @Prop(TypeRef(tracker.class.Project), tracker.string.Project)
    target!: Ref<Project>

  rule!: RelatedClassRule | RelatedSpaceRule
}
/**
 * @public
 */

export function TypeReportedTime (): Type<number> {
  return { _class: tracker.class.TypeReportedTime, label: core.string.Number }
}
/**
 * @public
 */

@Model(tracker.class.Issue, task.class.Task)
@UX(tracker.string.Issue, tracker.icon.Issue, 'TSK', 'title')
export class TIssue extends TTask implements Issue {
  @Prop(TypeRef(tracker.class.Issue), tracker.string.Parent)
  declare attachedTo: Ref<Issue>

  @Prop(TypeString(), tracker.string.Title)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeMarkup(), tracker.string.Description)
  @Index(IndexKind.FullText)
    description!: Markup

  @Prop(TypeRef(tracker.class.IssueStatus), tracker.string.Status, {
    _id: tracker.attribute.IssueStatus,
    iconComponent: tracker.activity.StatusIcon
  })
  @Index(IndexKind.Indexed)
  declare status: Ref<IssueStatus>

  @Prop(TypeIssuePriority(), tracker.string.Priority, {
    iconComponent: tracker.activity.PriorityIcon
  })
  @Index(IndexKind.Indexed)
    priority!: IssuePriority

  @Prop(TypeNumber(), tracker.string.Number)
  @Index(IndexKind.FullText)
  @ReadOnly()
  declare number: number

  @Prop(TypeRef(contact.class.Person), tracker.string.Assignee)
  @Index(IndexKind.Indexed)
  declare assignee: Ref<Person> | null

  @Prop(TypeRef(tracker.class.Component), tracker.string.Component, { icon: tracker.icon.Component })
  @Index(IndexKind.Indexed)
    component!: Ref<Component> | null

  @Prop(Collection(tracker.class.Issue), tracker.string.SubIssues)
    subIssues!: number

  @Prop(ArrOf(TypeRef(core.class.TypeRelatedDocument)), tracker.string.BlockedBy)
    blockedBy!: RelatedDocument[]

  @Prop(ArrOf(TypeRef(core.class.TypeRelatedDocument)), tracker.string.RelatedTo)
  @Index(IndexKind.Indexed)
    relations!: RelatedDocument[]

  parents!: IssueParentInfo[]

  @Prop(Collection(tags.class.TagReference), tracker.string.Labels)
  declare labels: number

  @Prop(TypeRef(task.class.DoneState), task.string.TaskStateDone, { _id: task.attribute.DoneState })
  @Hidden()
  declare doneState: Ref<DoneState> | null

  @Prop(TypeRef(tracker.class.Project), tracker.string.Project, { icon: tracker.icon.Issues })
  @Index(IndexKind.Indexed)
  @ReadOnly()
  declare space: Ref<Project>

  @Prop(TypeDate(DateRangeMode.DATETIME), tracker.string.DueDate)
  declare dueDate: Timestamp | null

  @Prop(TypeString(), tracker.string.Rank)
  @Hidden()
  declare rank: string

  @Prop(TypeRef(tracker.class.Milestone), tracker.string.Milestone, { icon: tracker.icon.Milestone })
  @Index(IndexKind.Indexed)
    milestone!: Ref<Milestone> | null

  @Prop(TypeNumber(), tracker.string.Estimation)
    estimation!: number

  @Prop(TypeReportedTime(), tracker.string.ReportedTime)
  @ReadOnly()
    reportedTime!: number

  // A fully virtual property with calculated content.
  // TODO: Add proper support for this kind of fields
  @Prop(TypeNumber(), tracker.string.RemainingTime)
  @ReadOnly()
  @Hidden()
    remainingTime!: number

  @Prop(Collection(tracker.class.TimeSpendReport), tracker.string.TimeSpendReports)
    reports!: number

  declare childInfo: IssueChildInfo[]
}
/**
 * @public
 */

@Model(tracker.class.IssueTemplate, core.class.Doc, DOMAIN_TRACKER)
@UX(tracker.string.IssueTemplate, tracker.icon.Issue, 'PROCESS')
export class TIssueTemplate extends TDoc implements IssueTemplate {
  @Prop(TypeString(), tracker.string.Title)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeMarkup(), tracker.string.Description)
  @Index(IndexKind.FullText)
    description!: Markup

  @Prop(TypeIssuePriority(), tracker.string.Priority)
    priority!: IssuePriority

  @Prop(TypeRef(contact.class.Person), tracker.string.Assignee)
    assignee!: Ref<Person> | null

  @Prop(TypeRef(tracker.class.Component), tracker.string.Component)
    component!: Ref<Component> | null

  @Prop(ArrOf(TypeRef(tags.class.TagElement)), tracker.string.Labels)
    labels?: Ref<TagElement>[]

  declare space: Ref<Project>

  @Prop(TypeDate(DateRangeMode.DATETIME), tracker.string.DueDate)
    dueDate!: Timestamp | null

  @Prop(TypeRef(tracker.class.Milestone), tracker.string.Milestone)
    milestone!: Ref<Milestone> | null

  @Prop(TypeNumber(), tracker.string.Estimation)
    estimation!: number

  @Prop(ArrOf(TypeRef(tracker.class.IssueTemplate)), tracker.string.IssueTemplate)
    children!: IssueTemplateChild[]

  @Prop(Collection(chunter.class.Comment), tracker.string.Comments)
    comments!: number

  @Prop(Collection(attachment.class.Attachment), tracker.string.Attachments)
    attachments!: number

  @Prop(ArrOf(TypeRef(core.class.TypeRelatedDocument)), tracker.string.RelatedTo)
    relations!: RelatedDocument[]
}
/**
 * @public
 */

@Model(tracker.class.TimeSpendReport, core.class.AttachedDoc, DOMAIN_TRACKER)
@UX(tracker.string.TimeSpendReport, tracker.icon.TimeReport)
export class TTimeSpendReport extends TAttachedDoc implements TimeSpendReport {
  @Prop(TypeRef(tracker.class.Issue), tracker.string.Issue)
  declare attachedTo: Ref<Issue>

  @Prop(TypeRef(contact.mixin.Employee), contact.string.Employee)
    employee!: Ref<Employee>

  @Prop(TypeDate(), tracker.string.TimeSpendReportDate)
    date!: Timestamp | null

  @Prop(TypeNumber(), tracker.string.TimeSpendReportValue)
    value!: number

  @Prop(TypeString(), tracker.string.TimeSpendReportDescription)
    description!: string
}
/**
 * @public
 */

@Model(tracker.class.Component, core.class.Doc, DOMAIN_TRACKER)
@UX(tracker.string.Component, tracker.icon.Component, 'COMPONENT', 'label')
export class TComponent extends TDoc implements Component {
  @Prop(TypeString(), tracker.string.Title)
  @Index(IndexKind.FullText)
    label!: string

  @Prop(TypeMarkup(), tracker.string.Description)
    description?: Markup

  @Prop(TypeRef(contact.mixin.Employee), tracker.string.ComponentLead)
    lead!: Ref<Employee> | null

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments!: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  declare space: Ref<Project>
}

@Mixin(tracker.mixin.ProjectIssueTargetOptions, core.class.Class)
export class TProjectIssueTargetOptions extends TClass implements ProjectIssueTargetOptions {
  headerComponent!: AnyComponent
  bodyComponent!: AnyComponent
  footerComponent!: AnyComponent

  update!: Resource<IssueUpdateFunction>
}
/**
 * @public
 */
@Model(tracker.class.Milestone, core.class.Doc, DOMAIN_TRACKER)
@UX(tracker.string.Milestone, tracker.icon.Milestone, '', 'label')
export class TMilestone extends TDoc implements Milestone {
  @Prop(TypeString(), tracker.string.Title)
  // @Index(IndexKind.FullText)
    label!: string

  @Prop(TypeMarkup(), tracker.string.Description)
    description?: Markup

  @Prop(TypeMilestoneStatus(), tracker.string.Status)
  @Index(IndexKind.Indexed)
    status!: MilestoneStatus

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments!: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(TypeDate(), tracker.string.TargetDate)
    targetDate!: Timestamp

  declare space: Ref<Project>
}

@UX(core.string.Number)
@Model(tracker.class.TypeReportedTime, core.class.Type)
export class TTypeReportedTime extends TType {}
