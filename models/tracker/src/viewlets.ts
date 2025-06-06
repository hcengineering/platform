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

import contact from '@hcengineering/contact'
import { SortingOrder } from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import task from '@hcengineering/model-task'
import view, { showColorsViewOption } from '@hcengineering/model-view'
import tags from '@hcengineering/tags'
import { type BuildModelKey, type ViewOptionsModel } from '@hcengineering/view'
import tracker from './plugin'

export const issuesOptions = (kanban: boolean): ViewOptionsModel => ({
  groupBy: [
    'status',
    'kind',
    'assignee',
    'priority',
    'component',
    'milestone',
    'createdBy',
    'modifiedBy',
    'estimation',
    'remainingTime',
    'reportedTime'
  ],
  orderBy: [
    ['modifiedOn', SortingOrder.Descending],
    ['status', SortingOrder.Ascending],
    ['kind', SortingOrder.Ascending],
    ['priority', SortingOrder.Ascending],
    ['createdOn', SortingOrder.Descending],
    ['dueDate', SortingOrder.Ascending],
    ['rank', SortingOrder.Ascending],
    ['estimation', SortingOrder.Descending],
    ['remainingTime', SortingOrder.Descending],
    ['reportedTime', SortingOrder.Descending]
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
    {
      key: 'hideArchived',
      type: 'toggle',
      defaultValue: true,
      actionTarget: 'options',
      action: view.function.HideArchived,
      label: view.string.HideArchived
    },
    ...(!kanban ? [showColorsViewOption] : [])
  ]
})

export function issueConfig (
  key: string = '',
  compact: boolean = false,
  milestone: boolean = true,
  component: boolean = true
): (BuildModelKey | string)[] {
  return [
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
      displayProps: { key: key + 'issue', fixed: 'left' }
    },
    {
      key: '',
      label: tracker.string.Status,
      presenter: tracker.component.StatusEditor,
      props: { kind: 'list', size: 'small', justify: 'center' },
      displayProps: { key: key + 'status' }
    },
    {
      key: 'kind',
      label: task.string.TaskType,
      presenter: task.component.TaskTypeListPresenter,
      props: { kind: 'list', size: 'small', justify: 'center' },
      displayProps: { key: key + 'kind' }
    },
    {
      key: '',
      label: tracker.string.Title,
      presenter: tracker.component.TitlePresenter,
      props: compact ? { shouldUseMargin: true, showParent: false } : {},
      displayProps: { key: key + 'title' }
    },
    {
      key: '',
      label: tracker.string.SubIssues,
      presenter: tracker.component.SubIssuesSelector,
      props: {}
    },
    { key: 'comments', displayProps: { key: key + 'comments', suffix: true } },
    { key: 'attachments', displayProps: { key: key + 'attachments', suffix: true } },
    { key: '', displayProps: { grow: true } },
    {
      key: 'labels',
      presenter: tags.component.LabelsPresenter,
      displayProps: { compression: true },
      props: { kind: 'list', full: false }
    },
    {
      key: '',
      label: tracker.string.Extensions,
      presenter: tracker.component.IssueExtra,
      displayProps: { compression: true },
      props: { kind: 'list', full: false }
    },
    ...(milestone
      ? [
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
              key: key + 'milestone',
              excludeByKey: 'milestone',
              compression: true
            }
          }
        ]
      : []),
    ...(component
      ? [
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
              key: key + 'component',
              excludeByKey: 'component',
              compression: true
            }
          }
        ]
      : []),
    {
      key: '',
      label: tracker.string.DueDate,
      presenter: tracker.component.DueDatePresenter,
      displayProps: { key: key + 'dueDate', compression: true },
      props: { kind: 'list' }
    },
    {
      key: '',
      label: tracker.string.Estimation,
      presenter: tracker.component.EstimationEditor,
      props: { kind: 'list', size: 'small' },
      displayProps: { key: key + 'estimation', fixed: 'left', dividerBefore: true, optional: true }
    },
    {
      key: 'modifiedOn',
      presenter: tracker.component.ModificationDatePresenter,
      displayProps: { key: key + 'modified', fixed: 'left', dividerBefore: true }
    },
    {
      key: 'assignee',
      presenter: tracker.component.AssigneeEditor,
      displayProps: { key: 'assignee', fixed: 'right' },
      props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' }
    }
  ]
}

export function defineViewlets (builder: Builder): void {
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
          'reportedTime',
          'reports',
          'priority',
          'component',
          'milestone',
          'estimation',
          'remainingTime',
          'status',
          'dueDate',
          'attachedTo',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: issueConfig()
    },
    tracker.viewlet.IssueList
  )

  const subIssuesOptions: ViewOptionsModel = {
    groupBy: ['status', 'kind', 'assignee', 'priority', 'milestone', 'createdBy', 'modifiedBy'],
    orderBy: [
      ['rank', SortingOrder.Ascending],
      ['kind', SortingOrder.Ascending],
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
          'remainingTime',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: issueConfig('sub', true, true)
    },
    tracker.viewlet.SubIssues
  )

  const milestoneIssueOptions: ViewOptionsModel = {
    groupBy: ['status', 'assignee', 'priority', 'component', 'createdBy', 'modifiedBy'],
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
      viewOptions: milestoneIssueOptions,
      variant: 'milestone',
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
          'remainingTime',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: issueConfig('sub', true, false, true)
    },
    tracker.viewlet.MilestoneIssuesList
  )

  const componentIssueOptions: ViewOptionsModel = {
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
      viewOptions: componentIssueOptions,
      variant: 'component',
      configOptions: {
        strict: true,
        hiddenKeys: [
          'priority',
          'number',
          'status',
          'title',
          'dueDate',
          'component',
          'estimation',
          'remainingTime',
          'createdBy',
          'modifiedBy'
        ]
      },
      config: issueConfig('sub', true, true, false)
    },
    tracker.viewlet.ComponentIssuesList
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
        hiddenKeys: [
          'milestone',
          'estimation',
          'remainingTime',
          'reportedTime',
          'component',
          'title',
          'description',
          'createdBy',
          'modifiedBy'
        ]
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
      config: [
        'subIssues',
        'priority',
        'component',
        'milestone',
        'dueDate',
        'labels',
        'estimation',
        'attachments',
        'comments'
      ]
    },
    tracker.viewlet.IssueKanban
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
          props: { kind: 'list' },
          displayProps: { key: 'component', fixed: 'left' }
        },
        { key: '', displayProps: { grow: true } },
        {
          key: '$lookup.lead',
          presenter: tracker.component.LeadPresenter,
          displayProps: {
            dividerBefore: true,
            key: 'lead'
          },
          props: { _class: tracker.class.Component, defaultClass: contact.mixin.Employee, shouldShowLabel: false }
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
      descriptor: view.viewlet.Table,
      configOptions: {
        hiddenKeys: ['identifier', 'name', 'description']
      },
      config: [
        {
          key: '',
          presenter: tracker.component.ProjectPresenter,
          props: {
            openIssues: true
          }
        },
        'members',
        {
          key: 'defaultAssignee',
          props: { kind: 'list' }
        },
        {
          key: 'modifiedOn',
          presenter: tracker.component.ModificationDatePresenter,
          displayProps: { fixed: 'right', dividerBefore: true }
        }
      ],
      options: {
        showArchived: true
      }
    },
    tracker.viewlet.ProjectList
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
}
