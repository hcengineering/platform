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

import activity from '@hcengineering/activity'
import contact, { Employee } from '@hcengineering/contact'
import {
  DOMAIN_MODEL,
  DateRangeMode,
  Domain,
  FindOptions,
  IndexKind,
  Markup,
  Ref,
  RelatedDocument,
  SortingOrder,
  Timestamp,
  Type
} from '@hcengineering/core'
import {
  ArrOf,
  Builder,
  Collection,
  Hidden,
  Index,
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
import { TTask } from '@hcengineering/model-task'
import core, { DOMAIN_SPACE, TAttachedDoc, TDoc, TSpace, TStatus, TType } from '@hcengineering/model-core'
import view, { actionTemplates, classPresenter, createAction, showColorsViewOption } from '@hcengineering/model-view'
import workbench, { createNavigateAction } from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import { IntlString } from '@hcengineering/platform'
import setting from '@hcengineering/setting'
import tags, { TagElement } from '@hcengineering/tags'
import task, { DoneState } from '@hcengineering/task'
import {
  Component,
  Issue,
  IssueChildInfo,
  IssueParentInfo,
  IssuePriority,
  IssueStatus,
  IssueTemplate,
  IssueTemplateChild,
  Milestone,
  MilestoneStatus,
  Project,
  TimeReportDayType,
  TimeSpendReport,
  trackerId
} from '@hcengineering/tracker'
import { KeyBinding, ViewAction, ViewOptionsModel } from '@hcengineering/view'
import tracker from './plugin'

import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import presentation from '@hcengineering/model-presentation'
import { defaultPriorities, issuePriorities } from '@hcengineering/tracker-resources/src/types'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'

export { trackerId } from '@hcengineering/tracker'
export { trackerOperation } from './migration'
export { default } from './plugin'

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
@Model(tracker.class.Project, core.class.Space, DOMAIN_SPACE)
@UX(tracker.string.Project, tracker.icon.Issues, 'Project', 'name')
export class TProject extends TSpace implements Project {
  @Prop(TypeString(), tracker.string.ProjectIdentifier)
  @Index(IndexKind.FullText)
    identifier!: IntlString

  @Prop(TypeNumber(), tracker.string.Number)
  @Hidden()
    sequence!: number

  @Prop(TypeRef(tracker.class.IssueStatus), tracker.string.DefaultIssueStatus)
    defaultIssueStatus!: Ref<IssueStatus>

  @Prop(TypeRef(contact.class.Employee), tracker.string.DefaultAssignee)
    defaultAssignee!: Ref<Employee>

  declare defaultTimeReportDay: TimeReportDayType
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
    status!: Ref<IssueStatus>

  @Prop(TypeIssuePriority(), tracker.string.Priority, {
    iconComponent: tracker.activity.PriorityIcon
  })
  @Index(IndexKind.Indexed)
    priority!: IssuePriority

  @Prop(TypeNumber(), tracker.string.Number)
  @Index(IndexKind.FullText)
  @ReadOnly()
    number!: number

  @Prop(TypeRef(contact.class.Employee), tracker.string.Assignee)
  @Index(IndexKind.Indexed)
    assignee!: Ref<Employee> | null

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
    dueDate!: Timestamp | null

  @Prop(TypeString(), tracker.string.Rank)
  @Hidden()
    rank!: string

  @Prop(TypeRef(tracker.class.Milestone), tracker.string.Milestone, { icon: tracker.icon.Milestone })
  @Index(IndexKind.Indexed)
    milestone!: Ref<Milestone> | null

  @Prop(TypeNumber(), tracker.string.Estimation)
    estimation!: number

  @Prop(TypeReportedTime(), tracker.string.ReportedTime)
  @ReadOnly()
    reportedTime!: number

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

  @Prop(TypeRef(contact.class.Employee), tracker.string.Assignee)
    assignee!: Ref<Employee> | null

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
  @Prop(TypeRef(tracker.class.Issue), tracker.string.Parent)
  declare attachedTo: Ref<Issue>

  @Prop(TypeRef(contact.class.Employee), contact.string.Employee)
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

  @Prop(TypeRef(contact.class.Employee), tracker.string.ComponentLead)
    lead!: Ref<Employee> | null

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments!: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  declare space: Ref<Project>
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

export function createModel (builder: Builder): void {
  builder.createModel(
    TProject,
    TComponent,
    TIssue,
    TIssueTemplate,
    TIssueStatus,
    TTypeIssuePriority,
    TMilestone,
    TTypeMilestoneStatus,
    TTimeSpendReport,
    TTypeReportedTime
  )

  const issuesOptions = (kanban: boolean): ViewOptionsModel => ({
    groupBy: ['status', 'assignee', 'priority', 'component', 'milestone', 'createdBy', 'modifiedBy'],
    orderBy: [
      ['status', SortingOrder.Ascending],
      ['priority', SortingOrder.Descending],
      ['modifiedOn', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending],
      ['dueDate', SortingOrder.Ascending],
      ['rank', SortingOrder.Ascending]
    ],
    other: [
      {
        key: 'shouldShowSubIssues',
        type: 'toggle',
        defaultValue: true,
        actionTarget: 'query',
        action: tracker.function.SubIssueQuery,
        label: tracker.string.SubIssues
      },
      {
        key: 'shouldShowAll',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'category',
        action: view.function.ShowEmptyGroups,
        label: view.string.ShowEmptyGroups
      },
      ...(!kanban ? [showColorsViewOption] : [])
    ]
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Issue,
      descriptor: view.viewlet.List,
      viewOptions: issuesOptions(false),
      configOptions: {
        strict: true,
        hiddenKeys: [
          'title',
          'blockedBy',
          'relations',
          'description',
          'number',
          'titile',
          'reportedTime',
          'reports',
          'priority',
          'component',
          'milestone',
          'estimation',
          'status',
          'dueDate',
          'attachedTo',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: [
        {
          key: '',
          label: tracker.string.Priority,
          presenter: tracker.component.PriorityEditor,
          props: { type: 'priority', kind: 'list', size: 'small' },
          displayProps: { key: 'priority' }
        },
        {
          key: '',
          label: tracker.string.Identifier,
          presenter: tracker.component.IssuePresenter,
          displayProps: { key: 'issue', fixed: 'left' }
        },
        {
          key: '',
          label: tracker.string.Status,
          presenter: tracker.component.StatusEditor,
          props: { kind: 'list', size: 'small', justify: 'center' },
          displayProps: {
            key: 'status'
          }
        },
        {
          key: '',
          label: tracker.string.Title,
          presenter: tracker.component.TitlePresenter,
          props: {},
          displayProps: { key: 'title' }
        },
        {
          key: '',
          label: tracker.string.SubIssues,
          presenter: tracker.component.SubIssuesSelector,
          props: {}
        },
        { key: 'comments', displayProps: { key: 'comments', suffix: true } },
        { key: 'attachments', displayProps: { key: 'attachments', suffix: true } },
        { key: '', displayProps: { grow: true } },
        {
          key: 'labels',
          presenter: tags.component.LabelsPresenter,
          displayProps: { compression: true },
          props: { kind: 'list', full: false }
        },
        {
          key: '',
          label: tracker.string.Milestone,
          presenter: tracker.component.MilestoneEditor,
          props: {
            kind: 'list',
            size: 'small',
            shouldShowPlaceholder: false
          },
          displayProps: {
            key: 'milestone',
            excludeByKey: 'milestone',
            compression: true
          }
        },
        {
          key: '',
          label: tracker.string.Component,
          presenter: tracker.component.ComponentEditor,
          props: {
            kind: 'list',
            size: 'small',
            shouldShowPlaceholder: false
          },
          displayProps: {
            key: 'component',
            excludeByKey: 'component',
            compression: true
          }
        },
        {
          key: '',
          label: tracker.string.DueDate,
          presenter: tracker.component.DueDatePresenter,
          displayProps: { key: 'dueDate', compression: true },
          props: { kind: 'list' }
        },
        {
          key: '',
          label: tracker.string.Estimation,
          presenter: tracker.component.EstimationEditor,
          props: { kind: 'list', size: 'small' },
          displayProps: { key: 'estimation', fixed: 'left', dividerBefore: true, optional: true }
        },
        {
          key: 'modifiedOn',
          presenter: tracker.component.ModificationDatePresenter,
          displayProps: { key: 'modified', fixed: 'left', dividerBefore: true }
        },
        {
          key: 'assignee',
          presenter: tracker.component.AssigneeEditor,
          displayProps: { key: 'assignee', fixed: 'right' },
          props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' }
        }
      ],
      options: {
        lookup: {
          space: tracker.class.Project
        }
      }
    },
    tracker.viewlet.IssueList
  )

  const subIssuesOptions: ViewOptionsModel = {
    groupBy: ['status', 'assignee', 'priority', 'milestone', 'createdBy', 'modifiedBy'],
    orderBy: [
      ['rank', SortingOrder.Ascending],
      ['status', SortingOrder.Ascending],
      ['priority', SortingOrder.Ascending],
      ['modifiedOn', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending],
      ['dueDate', SortingOrder.Ascending]
    ],
    groupDepth: 1,
    other: [showColorsViewOption]
  }

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Issue,
      descriptor: view.viewlet.List,
      viewOptions: subIssuesOptions,
      variant: 'subissue',
      configOptions: {
        strict: true,
        hiddenKeys: [
          'priority',
          'number',
          'status',
          'title',
          'dueDate',
          'milestone',
          'estimation',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: [
        {
          key: '',
          label: tracker.string.Priority,
          presenter: tracker.component.PriorityEditor,
          props: { type: 'priority', kind: 'list', size: 'small' },
          displayProps: { key: 'subpriority' }
        },
        {
          key: '',
          label: tracker.string.Issue,
          presenter: tracker.component.IssuePresenter,
          props: { type: 'issue' },
          displayProps: { key: 'subissue', fixed: 'left' }
        },
        {
          key: '',
          label: tracker.string.Status,
          presenter: tracker.component.StatusEditor,
          props: { kind: 'list', size: 'small', justify: 'center' },
          displayProps: { key: 'substatus' }
        },
        {
          key: '',
          label: tracker.string.Title,
          presenter: tracker.component.TitlePresenter,
          props: { shouldUseMargin: true, showParent: false }
        },
        { key: '', label: tracker.string.SubIssues, presenter: tracker.component.SubIssuesSelector, props: {} },
        { key: '', displayProps: { grow: true } },
        {
          key: '',
          label: tracker.string.Milestone,
          presenter: tracker.component.MilestoneEditor,
          props: {
            kind: 'list',
            size: 'small',
            shouldShowPlaceholder: false
          },
          displayProps: {
            excludeByKey: 'milestone',
            compression: true
          }
        },
        {
          key: '',
          label: tracker.string.DueDate,
          presenter: tracker.component.DueDatePresenter,
          displayProps: { key: 'dueDate', compression: true },
          props: { kind: 'list', size: 'small' }
        },
        {
          key: '',
          label: tracker.string.Estimation,
          presenter: tracker.component.EstimationEditor,
          displayProps: { optional: true },
          props: { kind: 'list', size: 'small' }
        },
        {
          key: 'modifiedOn',
          presenter: tracker.component.ModificationDatePresenter,
          displayProps: { key: 'submodified', fixed: 'right' }
        },
        {
          key: 'assignee',
          presenter: tracker.component.AssigneeEditor,
          displayProps: { key: 'assigee', fixed: 'right' },
          props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' }
        }
      ]
    },
    tracker.viewlet.SubIssues
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.IssueTemplate,
      descriptor: view.viewlet.List,
      viewOptions: {
        groupBy: ['assignee', 'priority', 'component', 'milestone', 'createdBy', 'modifiedBy'],
        orderBy: [
          ['priority', SortingOrder.Ascending],
          ['modifiedOn', SortingOrder.Descending],
          ['dueDate', SortingOrder.Ascending],
          ['rank', SortingOrder.Ascending]
        ],
        other: [showColorsViewOption]
      },
      configOptions: {
        strict: true,
        hiddenKeys: ['milestone', 'estimation', 'component', 'title', 'description', 'createdBy', 'modifiedBy']
      },
      config: [
        // { key: '', presenter: tracker.component.PriorityEditor, props: { kind: 'list', size: 'small' } },
        {
          key: '',
          presenter: tracker.component.IssueTemplatePresenter,
          props: { type: 'issue', shouldUseMargin: true }
        },
        // { key: '', presenter: tracker.component.DueDatePresenter, props: { kind: 'list' } },
        {
          key: '',
          presenter: tracker.component.ComponentEditor,
          label: tracker.string.Component,
          props: {
            kind: 'list',
            size: 'small',
            shouldShowPlaceholder: false
          },
          displayProps: { key: 'component', compression: true }
        },
        {
          key: '',
          label: tracker.string.Milestone,
          presenter: tracker.component.MilestoneEditor,
          props: {
            kind: 'list',
            size: 'small',
            shouldShowPlaceholder: false
          },
          displayProps: { key: 'milestone', compression: true }
        },
        {
          key: '',
          label: tracker.string.Estimation,
          presenter: tracker.component.TemplateEstimationEditor,
          props: {
            kind: 'list',
            size: 'small'
          },
          displayProps: { key: 'estimation', compression: true }
        },
        { key: '', displayProps: { grow: true } },
        {
          key: 'modifiedOn',
          presenter: tracker.component.ModificationDatePresenter,
          displayProps: { fixed: 'right', dividerBefore: true }
        },
        {
          key: 'assignee',
          presenter: tracker.component.AssigneeEditor,
          props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' }
        }
      ]
    },
    tracker.viewlet.IssueTemplateList
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Issue,
      descriptor: tracker.viewlet.Kanban,
      viewOptions: {
        ...issuesOptions(true),
        groupDepth: 1
      },
      configOptions: {
        strict: true
      },
      config: ['subIssues', 'priority', 'component', 'dueDate', 'labels', 'estimation', 'attachments', 'comments']
    },
    tracker.viewlet.IssueKanban
  )

  builder.createDoc(
    view.class.ViewletDescriptor,
    core.space.Model,
    {
      label: tracker.string.Board,
      icon: task.icon.Kanban,
      component: tracker.component.KanbanView
    },
    tracker.viewlet.Kanban
  )

  builder.createDoc(
    core.class.StatusCategory,
    core.space.Model,
    {
      ofAttribute: tracker.attribute.IssueStatus,
      label: tracker.string.CategoryBacklog,
      icon: tracker.icon.CategoryBacklog,
      color: PaletteColorIndexes.Cloud,
      defaultStatusName: 'Backlog',
      order: 0
    },
    tracker.issueStatusCategory.Backlog
  )

  builder.createDoc(
    core.class.StatusCategory,
    core.space.Model,
    {
      ofAttribute: tracker.attribute.IssueStatus,
      label: tracker.string.CategoryUnstarted,
      icon: tracker.icon.CategoryUnstarted,
      color: PaletteColorIndexes.Porpoise,
      defaultStatusName: 'Todo',
      order: 1
    },
    tracker.issueStatusCategory.Unstarted
  )

  builder.createDoc(
    core.class.StatusCategory,
    core.space.Model,
    {
      ofAttribute: tracker.attribute.IssueStatus,
      label: tracker.string.CategoryStarted,
      icon: tracker.icon.CategoryStarted,
      color: PaletteColorIndexes.Cerulean,
      defaultStatusName: 'In Progress',
      order: 2
    },
    tracker.issueStatusCategory.Started
  )

  builder.createDoc(
    core.class.StatusCategory,
    core.space.Model,
    {
      ofAttribute: tracker.attribute.IssueStatus,
      label: tracker.string.CategoryCompleted,
      icon: tracker.icon.CategoryCompleted,
      color: PaletteColorIndexes.Grass,
      defaultStatusName: 'Done',
      order: 3
    },
    tracker.issueStatusCategory.Completed
  )

  builder.createDoc(
    core.class.StatusCategory,
    core.space.Model,
    {
      ofAttribute: tracker.attribute.IssueStatus,
      label: tracker.string.CategoryCanceled,
      icon: tracker.icon.CategoryCanceled,
      color: PaletteColorIndexes.Coin,
      defaultStatusName: 'Canceled',
      order: 4
    },
    tracker.issueStatusCategory.Canceled
  )

  const issuesId = 'issues'
  const componentsId = 'components'
  const milestonesId = 'milestones'
  const templatesId = 'templates'
  const myIssuesId = 'my-issues'
  const allIssuesId = 'all-issues'
  // const scrumsId = 'scrums'

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.IssuePresenter
  })

  builder.mixin(tracker.class.Issue, core.class.Class, notification.mixin.NotificationObjectPresenter, {
    presenter: tracker.component.NotificationIssuePresenter
  })

  builder.mixin(tracker.class.IssueTemplate, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.IssueTemplatePresenter
  })

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.PreviewPresenter, {
    presenter: tracker.component.IssuePreview
  })

  builder.mixin(tracker.class.TimeSpendReport, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.TimeSpendReport
  })

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: tracker.function.IssueTitleProvider
  })

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.ListHeaderExtra, {
    presenters: [tracker.component.IssueStatistics]
  })

  builder.mixin(tracker.class.IssueStatus, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.StatusPresenter
  })

  builder.mixin(tracker.class.IssueStatus, core.class.Class, view.mixin.AttributePresenter, {
    presenter: tracker.component.StatusRefPresenter
  })

  builder.mixin(tracker.class.IssueStatus, core.class.Class, view.mixin.SortFuncs, {
    func: tracker.function.IssueStatusSort
  })

  builder.mixin(tracker.class.TypeIssuePriority, core.class.Class, view.mixin.SortFuncs, {
    func: tracker.function.IssuePrioritySort
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.SortFuncs, {
    func: tracker.function.MilestoneSort
  })

  builder.mixin(tracker.class.TypeIssuePriority, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.PriorityPresenter
  })

  builder.mixin(tracker.class.IssueStatus, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: tracker.component.StatusFilterValuePresenter
  })

  builder.mixin(tracker.class.TypeIssuePriority, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: tracker.component.PriorityFilterValuePresenter
  })

  builder.mixin(tracker.class.Issue, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy', 'assignee']
  })

  builder.mixin(tracker.class.TypeIssuePriority, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })

  builder.mixin(tracker.class.Project, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })

  builder.mixin(tracker.class.Project, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: tracker.component.ProjectFilterValuePresenter
  })

  builder.mixin(tracker.class.TypeIssuePriority, core.class.Class, view.mixin.AttributePresenter, {
    presenter: tracker.component.PriorityRefPresenter
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.ObjectEditor, {
    editor: tracker.component.EditComponent
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.ComponentPresenter
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: tracker.component.ComponentFilterValuePresenter
  })

  builder.mixin(tracker.class.Project, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.ProjectPresenter
  })

  builder.mixin(tracker.class.Project, core.class.Class, view.mixin.SpacePresenter, {
    presenter: tracker.component.ProjectSpacePresenter
  })

  classPresenter(
    builder,
    tracker.class.Component,
    tracker.component.ComponentSelector,
    tracker.component.ComponentSelector
  )

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: tracker.component.ComponentSelector
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.AttributePresenter, {
    presenter: tracker.component.ComponentRefPresenter
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.Aggregation, {
    createAggregationManager: tracker.aggregation.CreateComponentAggregationManager
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.Groupping, {
    grouppingManager: tracker.aggregation.GrouppingComponentManager
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: tracker.component.MilestonePresenter
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.AttributePresenter, {
    presenter: tracker.component.MilestoneRefPresenter
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.ObjectEditor, {
    editor: tracker.component.EditMilestone
  })

  builder.mixin(tracker.class.Issue, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  builder.mixin(tracker.class.TypeIssuePriority, core.class.Class, view.mixin.AllValuesFunc, {
    func: tracker.function.GetAllPriority
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.AllValuesFunc, {
    func: tracker.function.GetAllComponents
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.AllValuesFunc, {
    func: tracker.function.GetAllMilestones
  })

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.LinkProvider, {
    encode: tracker.function.GetIssueLinkFragment
  })

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.ObjectPanel, {
    component: tracker.component.EditIssue
  })

  builder.mixin(tracker.class.IssueTemplate, core.class.Class, view.mixin.ObjectPanel, {
    component: tracker.component.EditIssueTemplate
  })

  builder.createDoc(
    activity.class.TxViewlet,
    core.space.Model,
    {
      objectClass: tracker.class.Issue,
      icon: tracker.icon.Issue,
      txClass: core.class.TxCreateDoc,
      labelComponent: tracker.activity.TxIssueCreated,
      display: 'inline'
    },
    tracker.ids.TxIssueCreated
  )

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: tracker.string.TrackerApplication,
      icon: tracker.icon.TrackerApplication,
      alias: trackerId,
      hidden: false,
      locationResolver: tracker.resolver.Location,
      navigatorModel: {
        specials: [
          {
            id: myIssuesId,
            position: 'top',
            label: tracker.string.MyIssues,
            icon: tracker.icon.MyIssues,
            component: tracker.component.MyIssues,
            componentProps: {
              config: [
                ['assigned', view.string.Assigned, {}],
                ['created', view.string.Created, {}],
                ['subscribed', view.string.Subscribed, {}]
              ]
            }
          },
          {
            id: allIssuesId,
            position: 'top',
            label: tracker.string.AllIssues,
            icon: tracker.icon.Issues,
            component: tracker.component.Issues,
            componentProps: {
              baseQuery: { '$lookup.space.archived': false },
              space: undefined,
              title: tracker.string.AllIssues,
              config: [
                ['all', tracker.string.All, {}],
                ['active', tracker.string.Active, {}],
                ['backlog', tracker.string.Backlog, {}]
              ]
            }
          },
          {
            id: 'all-projects',
            component: workbench.component.SpecialView,
            icon: view.icon.Archive,
            label: tracker.string.AllProjects,
            position: 'bottom',
            visibleIf: workbench.function.IsOwner,
            spaceClass: tracker.class.Project,
            componentProps: {
              _class: tracker.class.Project,
              label: tracker.string.AllIssues,
              icon: tracker.icon.Issues
            }
          }
        ],
        spaces: [
          {
            id: 'projects',
            label: tracker.string.Projects,
            spaceClass: tracker.class.Project,
            addSpaceLabel: tracker.string.CreateProject,
            createComponent: tracker.component.CreateProject,
            visibleIf: tracker.function.IsProjectJoined,
            icon: tracker.icon.Home,
            specials: [
              {
                id: issuesId,
                label: tracker.string.Issues,
                icon: tracker.icon.Issues,
                component: tracker.component.Issues,
                componentProps: {
                  title: tracker.string.Issues,
                  config: [
                    ['all', tracker.string.All, {}],
                    ['active', tracker.string.Active, {}],
                    ['backlog', tracker.string.Backlog, {}]
                  ]
                }
              },
              {
                id: componentsId,
                label: tracker.string.Components,
                icon: tracker.icon.Components,
                component: tracker.component.ProjectComponents
              },
              {
                id: milestonesId,
                label: tracker.string.Milestones,
                icon: tracker.icon.Milestone,
                component: tracker.component.Milestones
              },
              {
                id: templatesId,
                label: tracker.string.IssueTemplates,
                icon: tracker.icon.IssueTemplates,
                component: tracker.component.IssueTemplates
              }
            ]
          }
        ]
      },
      navHeaderComponent: tracker.component.NewIssueHeader
    },
    tracker.app.Tracker
  )

  function createGotoSpecialAction (
    builder: Builder,
    id: string,
    key: KeyBinding,
    label: IntlString,
    query?: Record<string, string | null>
  ): void {
    createNavigateAction(builder, key, label, tracker.app.Tracker, {
      application: trackerId,
      mode: 'space',
      spaceSpecial: id,
      spaceClass: tracker.class.Project,
      query
    })
  }

  createGotoSpecialAction(builder, issuesId, 'keyG->keyE', tracker.string.GotoIssues)
  createGotoSpecialAction(builder, issuesId, 'keyG->keyA', tracker.string.GotoActive, { mode: 'active' })
  createGotoSpecialAction(builder, issuesId, 'keyG->keyB', tracker.string.GotoBacklog, { mode: 'backlog' })
  createGotoSpecialAction(builder, componentsId, 'keyG->keyC', tracker.string.GotoComponents)
  createNavigateAction(builder, 'keyG->keyM', tracker.string.GotoMyIssues, tracker.app.Tracker, {
    application: trackerId,
    mode: 'special',
    special: myIssuesId
  })

  createAction(builder, {
    action: workbench.actionImpl.Navigate,
    actionProps: {
      mode: 'app',
      application: trackerId
    },
    label: tracker.string.GotoTrackerApplication,
    icon: view.icon.ArrowRight,
    input: 'none',
    category: view.category.Navigation,
    target: core.class.Doc,
    context: {
      mode: ['workbench', 'browser', 'editor', 'panel', 'popup']
    }
  })

  createAction(
    builder,
    {
      action: tracker.actionImpl.EditWorkflowStatuses,
      label: tracker.string.EditWorkflowStatuses,
      icon: view.icon.Statuses,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Project,
      query: {},
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      }
    },
    tracker.action.EditWorkflowStatuses
  )

  createAction(
    builder,
    {
      action: tracker.actionImpl.EditProject,
      label: tracker.string.EditProject,
      icon: contact.icon.Edit,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Project,
      query: {},
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      }
    },
    tracker.action.EditProject
  )

  createAction(
    builder,
    {
      action: tracker.actionImpl.DeleteProject,
      label: workbench.string.Archive,
      icon: view.icon.Archive,
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Project,
      query: {
        archived: false
      },
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      },
      override: [view.action.Archive, view.action.Delete]
    },
    tracker.action.DeleteProject
  )
  createAction(builder, {
    label: tracker.string.Unarchive,
    icon: view.icon.Archive,
    action: view.actionImpl.UpdateDocument as ViewAction,
    actionProps: {
      key: 'archived',
      ask: true,
      value: false,
      label: tracker.string.Unarchive,
      message: tracker.string.UnarchiveConfirm
    },
    input: 'any',
    category: tracker.category.Tracker,
    query: {
      archived: true
    },
    context: {
      mode: ['context', 'browser'],
      group: 'tools'
    },
    target: tracker.class.Project
  })

  createAction(
    builder,
    {
      action: tracker.actionImpl.DeleteIssue,
      label: workbench.string.Delete,
      icon: view.icon.Delete,
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      },
      override: [view.action.Delete]
    },
    tracker.action.DeleteIssue
  )

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    { label: tracker.string.TrackerApplication, visible: true },
    tracker.category.Tracker
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.CreateIssue,
        element: 'top'
      },
      label: tracker.string.NewIssue,
      icon: tracker.icon.NewIssue,
      keyBinding: ['keyC'],
      input: 'none',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['browser'],
        application: tracker.app.Tracker,
        group: 'create'
      }
    },
    tracker.action.NewIssue
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.CreateIssue,
        element: 'top',
        fillProps: {
          _object: 'parentIssue',
          space: 'space'
        }
      },
      label: tracker.string.NewSubIssue,
      icon: tracker.icon.Subissue,
      keyBinding: [],
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'associate'
      }
    },
    tracker.action.NewSubIssue
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.SetParentIssueActionPopup,
        element: 'top',
        fillProps: {
          _objects: 'value'
        }
      },
      label: tracker.string.SetParent,
      icon: tracker.icon.Parent,
      keyBinding: [],
      input: 'none',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context'],
        application: tracker.app.Tracker,
        group: 'associate'
      }
    },
    tracker.action.SetParent
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.CreateIssue,
        element: 'top',
        fillProps: {
          _object: 'relatedTo',
          space: 'space'
        }
      },
      label: tracker.string.NewRelatedIssue,
      icon: tracker.icon.NewIssue,
      keyBinding: [],
      input: 'focus',
      category: tracker.category.Tracker,
      target: core.class.Doc,
      context: {
        mode: ['context', 'browser', 'editor'],
        group: 'associate'
      }
    },
    tracker.action.NewRelatedIssue
  )

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionPopup: tracker.component.SetParentIssueActionPopup,
    actionProps: {
      component: tracker.component.SetParentIssueActionPopup,
      element: 'top',
      fillProps: {
        _object: 'value'
      }
    },
    label: tracker.string.SetParent,
    icon: tracker.icon.Parent,
    keyBinding: [],
    input: 'none',
    category: tracker.category.Tracker,
    target: tracker.class.Issue,
    override: [tracker.action.SetParent],
    context: {
      mode: ['browser'],
      application: tracker.app.Tracker,
      group: 'associate'
    }
  })

  createAction(builder, {
    ...actionTemplates.open,
    actionProps: {
      component: tracker.component.EditIssue
    },
    target: tracker.class.Issue,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    },
    override: [view.action.Open]
  })

  createAction(builder, {
    ...actionTemplates.open,
    actionProps: {
      component: tracker.component.EditIssueTemplate
    },
    target: tracker.class.IssueTemplate,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    },
    override: [view.action.Open]
  })

  builder.mixin(tracker.class.Project, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Open]
  })

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.ClassFilters, {
    filters: [
      'status',
      'priority',
      'space',
      'createdBy',
      'assignee',
      {
        _class: tracker.class.Issue,
        key: 'component',
        component: view.component.ObjectFilter,
        showNested: false
      },
      {
        _class: tracker.class.Issue,
        key: 'milestone',
        component: view.component.ObjectFilter,
        showNested: false
      }
    ],
    ignoreKeys: ['number', 'estimation', 'attachedTo'],
    getVisibleFilters: tracker.function.GetVisibleFilters
  })

  builder.mixin(tracker.class.IssueTemplate, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.ClassFilters, {
    filters: ['status'],
    strict: true
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.AttributeFilter, {
    component: tracker.component.MilestoneFilter
  })

  builder.mixin(tracker.class.TypeMilestoneStatus, core.class.Class, view.mixin.AttributePresenter, {
    presenter: tracker.component.MilestoneStatusPresenter
  })

  builder.mixin(tracker.class.TypeMilestoneStatus, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: tracker.component.MilestoneStatusEditor
  })

  builder.mixin(tracker.class.TypeMilestoneStatus, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: tracker.icon.TrackerApplication,
      label: tracker.string.SearchIssue,
      query: tracker.completion.IssueQuery
    },
    tracker.completion.IssueCategory
  )

  const statusOptions: FindOptions<IssueStatus> = {
    lookup: {
      category: core.class.StatusCategory
    },
    sort: { rank: SortingOrder.Ascending }
  }

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: tracker.component.TimeSpendReportPopup,
      fillProps: {
        _object: 'issue'
      }
    },
    label: tracker.string.TimeSpendReportAdd,
    icon: tracker.icon.TimeReport,
    input: 'focus',
    keyBinding: ['keyT'],
    category: tracker.category.Tracker,
    target: tracker.class.Issue,
    context: {
      mode: ['context', 'browser'],
      application: tracker.app.Tracker,
      group: 'edit'
    }
  })

  createAction(
    builder,
    {
      action: view.actionImpl.ValueSelector,
      actionPopup: view.component.ValueSelector,
      actionProps: {
        attribute: 'status',
        _class: tracker.class.IssueStatus,
        placeholder: tracker.string.SetStatus,
        query: {
          ofAttribute: tracker.attribute.IssueStatus
        },
        fillQuery: {
          space: 'space'
        },
        queryOptions: statusOptions
      },
      label: tracker.string.Status,
      icon: tracker.icon.CategoryBacklog,
      keyBinding: ['keyS->keyS'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetStatus
  )
  createAction(
    builder,
    {
      action: view.actionImpl.ValueSelector,
      actionPopup: view.component.ValueSelector,
      actionProps: {
        attribute: 'priority',
        values: defaultPriorities.map((p) => ({ id: p, ...issuePriorities[p] })),
        placeholder: tracker.string.SetPriority
      },
      label: tracker.string.Priority,
      icon: tracker.icon.PriorityHigh,
      keyBinding: ['keyP->keyR'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetPriority
  )
  createAction(
    builder,
    {
      action: view.actionImpl.ValueSelector,
      actionPopup: view.component.ValueSelector,
      actionProps: {
        attribute: 'assignee',
        _class: contact.class.Employee,
        query: {},
        placeholder: tracker.string.AssignTo
      },
      label: tracker.string.Assignee,
      icon: contact.icon.Person,
      keyBinding: ['keyA'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetAssignee
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ValueSelector,
      actionPopup: view.component.ValueSelector,
      actionProps: {
        attribute: 'component',
        _class: tracker.class.Component,
        query: {},
        fillQuery: { space: 'space' },
        docMatches: ['space'],
        searchField: 'label',
        placeholder: tracker.string.Component
      },
      label: tracker.string.Component,
      icon: tracker.icon.Component,
      keyBinding: ['keyM->keyT'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetComponent
  )

  createAction(
    builder,
    {
      action: view.actionImpl.AttributeSelector,
      actionPopup: tracker.component.MilestoneEditor,
      actionProps: {
        attribute: 'milestone',
        isAction: true
      },
      label: tracker.string.Milestone,
      icon: tracker.icon.Milestone,
      keyBinding: ['keyS->keyP'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetMilestone
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tags.component.TagsEditorPopup,
        element: 'top',
        fillProps: {
          _object: 'object'
        }
      },
      label: tracker.string.Labels,
      icon: tags.icon.Tags,
      keyBinding: ['keyL'],
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetLabels
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tags.component.ObjectsTagsEditorPopup,
        element: 'top',
        fillProps: {
          _objects: 'value'
        }
      },
      label: tracker.string.Labels,
      icon: tags.icon.Tags,
      keyBinding: ['keyL'],
      input: 'selection',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetLabels
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.SetDueDateActionPopup,
        props: { mondayStart: true, withTime: false },
        element: 'top',
        fillProps: {
          _objects: 'value'
        }
      },
      label: tracker.string.SetDueDate,
      icon: tracker.icon.DueDate,
      keyBinding: ['keyD'],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'edit'
      }
    },
    tracker.action.SetDueDate
  )
  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: tracker.function.GetIssueId
      },
      label: tracker.string.CopyIssueId,
      icon: view.icon.CopyId,
      keyBinding: [],
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'copy'
      }
    },
    tracker.action.CopyIssueId
  )
  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: tracker.function.GetIssueTitle
      },
      label: tracker.string.CopyIssueTitle,
      icon: tracker.icon.CopyBranch,
      keyBinding: [],
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'copy'
      }
    },
    tracker.action.CopyIssueTitle
  )
  createAction(
    builder,
    {
      action: view.actionImpl.CopyTextToClipboard,
      actionProps: {
        textProvider: tracker.function.GetIssueLink
      },
      label: tracker.string.CopyIssueUrl,
      icon: view.icon.CopyLink,
      keyBinding: [],
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'copy'
      }
    },
    tracker.action.CopyIssueLink
  )
  createAction(
    builder,
    {
      action: tracker.actionImpl.Move,
      label: tracker.string.MoveToProject,
      icon: view.icon.Move,
      keyBinding: [],
      input: 'any',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'associate'
      }
    },
    tracker.action.MoveToProject
  )
  createAction(
    builder,
    {
      action: view.actionImpl.ValueSelector,
      actionPopup: tracker.component.RelationsPopup,
      actionProps: {
        attribute: ''
      },
      label: tracker.string.Relations,
      icon: tracker.icon.Relations,
      keyBinding: [],
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'associate'
      }
    },
    tracker.action.Relations
  )
  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: tracker.component.CreateIssue,
        element: 'top',
        fillProps: {
          _object: 'originalIssue',
          space: 'space'
        }
      },
      label: tracker.string.Duplicate,
      icon: tracker.icon.Duplicate,
      keyBinding: [],
      input: 'focus',
      category: tracker.category.Tracker,
      target: tracker.class.Issue,
      context: {
        mode: ['context', 'browser'],
        application: tracker.app.Tracker,
        group: 'associate'
      }
    },
    tracker.action.Duplicate
  )

  createAction(
    builder,
    {
      action: tracker.actionImpl.DeleteMilestone,
      label: view.string.Delete,
      icon: view.icon.Delete,
      keyBinding: ['Meta + Backspace'],
      category: tracker.category.Tracker,
      input: 'any',
      target: tracker.class.Milestone,
      context: { mode: ['context', 'browser'], group: 'tools' }
    },
    tracker.action.DeleteMilestone
  )

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })

  classPresenter(
    builder,
    tracker.class.TypeReportedTime,
    view.component.NumberPresenter,
    tracker.component.ReportedTimeEditor
  )

  const milestoneOptions: ViewOptionsModel = {
    groupBy: ['status', 'createdBy', 'modifiedBy'],
    orderBy: [
      ['modifiedOn', SortingOrder.Descending],
      ['targetDate', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending]
    ],
    other: [showColorsViewOption]
  }

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Milestone,
      descriptor: view.viewlet.List,
      viewOptions: milestoneOptions,
      configOptions: {
        strict: true,
        hiddenKeys: ['targetDate', 'label', 'description']
      },
      config: [
        {
          key: 'status',
          props: { width: '1rem', kind: 'list', size: 'small', justify: 'center' }
        },
        { key: '', presenter: tracker.component.MilestonePresenter, props: { shouldUseMargin: true } },
        { key: '', displayProps: { grow: true } },
        {
          key: '',
          label: tracker.string.TargetDate,
          presenter: tracker.component.MilestoneDatePresenter,
          props: { field: 'targetDate' }
        }
      ]
    },
    tracker.viewlet.MilestoneList
  )

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: tracker.string.Issues,
      icon: tracker.icon.Issues,
      objectClass: tracker.class.Issue
    },
    tracker.ids.TrackerNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: task.string.AssignedToMe,
      group: tracker.ids.TrackerNotificationGroup,
      field: 'assignee',
      txClasses: [core.class.TxCreateDoc, core.class.TxUpdateDoc],
      objectClass: tracker.class.Issue,
      templates: {
        textTemplate: '{doc} was assigned to you by {sender}',
        htmlTemplate: '<p>{doc} was assigned to you by {sender}</p>',
        subjectTemplate: '{doc} was assigned to you'
      },
      providers: {
        [notification.providers.PlatformNotification]: true,
        [notification.providers.EmailNotification]: true
      }
    },
    tracker.ids.AssigneeNotification
  )

  generateClassNotificationTypes(
    builder,
    tracker.class.Issue,
    tracker.ids.TrackerNotificationGroup,
    [],
    ['comments', 'status', 'priority', 'assignee', 'subIssues', 'blockedBy', 'milestone', 'dueDate']
  )

  const componentListViewOptions: ViewOptionsModel = {
    groupBy: ['lead', 'createdBy', 'modifiedBy'],
    orderBy: [
      ['modifiedOn', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending]
    ],
    other: [showColorsViewOption]
  }

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Component,
      descriptor: view.viewlet.List,
      viewOptions: componentListViewOptions,
      configOptions: {
        strict: true,
        hiddenKeys: ['label', 'description']
      },
      config: [
        {
          key: '',
          presenter: tracker.component.ComponentPresenter,
          props: { kind: 'list' }
        },
        { key: '', displayProps: { grow: true } },
        {
          key: '$lookup.lead',
          presenter: tracker.component.LeadPresenter,
          displayProps: {
            dividerBefore: true,
            key: 'lead'
          },
          props: { _class: tracker.class.Component, defaultClass: contact.class.Employee, shouldShowLabel: false }
        }
      ]
    },
    tracker.viewlet.ComponentList
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: tracker.class.Project,
      descriptor: view.viewlet.List,
      viewOptions: {
        groupBy: ['createdBy'],
        orderBy: [
          ['modifiedOn', SortingOrder.Descending],
          ['createdOn', SortingOrder.Descending]
        ],
        other: [showColorsViewOption]
      },
      configOptions: {
        strict: true,
        hiddenKeys: ['label', 'description']
      },
      config: [
        {
          key: '',
          props: { kind: 'list' }
        },
        { key: '', displayProps: { grow: true } }
      ]
    },
    tracker.viewlet.ProjectList
  )
}
