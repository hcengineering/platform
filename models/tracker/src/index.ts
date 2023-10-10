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
import { Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import task from '@hcengineering/model-task'
import view from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import setting from '@hcengineering/setting'
import { trackerId } from '@hcengineering/tracker'
import tracker from './plugin'

import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import presentation from '@hcengineering/model-presentation'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'
import { createActions as defineActions } from './actions'
import { definePresenters } from './presenters'
import {
  TComponent,
  TIssue,
  TIssueStatus,
  TIssueTemplate,
  TMilestone,
  TProject,
  TProjectIssueTargetOptions,
  TRelatedIssueTarget,
  TTimeSpendReport,
  TTypeIssuePriority,
  TTypeMilestoneStatus,
  TTypeReportedTime
} from './types'
import { defineViewlets } from './viewlets'

export * from './types'
export { issuesOptions } from './viewlets'

export { trackerId } from '@hcengineering/tracker'
export { trackerOperation } from './migration'
export { default } from './plugin'

function defineSortAndGrouping (builder: Builder): void {
  builder.mixin(tracker.class.IssueStatus, core.class.Class, view.mixin.SortFuncs, {
    func: tracker.function.IssueStatusSort
  })

  builder.mixin(tracker.class.TypeIssuePriority, core.class.Class, view.mixin.SortFuncs, {
    func: tracker.function.IssuePrioritySort
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.SortFuncs, {
    func: tracker.function.MilestoneSort
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.Aggregation, {
    createAggregationManager: tracker.aggregation.CreateComponentAggregationManager
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
}

function defineNotifications (builder: Builder): void {
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
      onlyOwn: true,
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
}

function defineStatusCategories (builder: Builder): void {
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
}

/**
 * Define filters
 */
function defineFilters (builder: Builder): void {
  //
  // Issue
  //
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

  //
  // Issue Status
  //
  builder.mixin(tracker.class.IssueStatus, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: tracker.component.StatusFilterValuePresenter
  })

  //
  // Issue Template
  //
  builder.mixin(tracker.class.IssueTemplate, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })

  //
  // Milestone
  //
  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.ClassFilters, {
    filters: ['status'],
    strict: true
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.AttributeFilter, {
    component: tracker.component.MilestoneFilter
  })

  //
  // Project
  //
  builder.mixin(tracker.class.Project, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })
  builder.mixin(tracker.class.Project, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: tracker.component.ProjectFilterValuePresenter
  })

  //
  // Component
  //
  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: tracker.component.ComponentFilterValuePresenter
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })

  //
  // Type Milestone Status
  //

  builder.mixin(tracker.class.TypeMilestoneStatus, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })

  //
  // Type Issue Priority
  //
  builder.mixin(tracker.class.TypeIssuePriority, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: tracker.component.PriorityFilterValuePresenter
  })

  builder.mixin(tracker.class.TypeIssuePriority, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })
}

function defineApplication (
  builder: Builder,
  opt: {
    myIssuesId: string
    allIssuesId: string
    issuesId: string
    componentsId: string
    milestonesId: string
    templatesId: string
  }
): void {
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
            id: opt.myIssuesId,
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
            id: opt.allIssuesId,
            position: 'top',
            label: tracker.string.AllIssues,
            icon: tracker.icon.Issues,
            component: tracker.component.Issues,
            componentProps: {
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
                id: opt.issuesId,
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
                id: opt.componentsId,
                label: tracker.string.Components,
                icon: tracker.icon.Components,
                component: tracker.component.ProjectComponents
              },
              {
                id: opt.milestonesId,
                label: tracker.string.Milestones,
                icon: tracker.icon.Milestone,
                component: tracker.component.Milestones
              },
              {
                id: opt.templatesId,
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
}

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
    TTypeReportedTime,
    TProjectIssueTargetOptions,
    TRelatedIssueTarget
  )

  defineViewlets(builder)

  defineStatusCategories(builder)

  const issuesId = 'issues'
  const componentsId = 'components'
  const milestonesId = 'milestones'
  const templatesId = 'templates'
  const myIssuesId = 'my-issues'
  const allIssuesId = 'all-issues'
  // const scrumsId = 'scrums'

  definePresenters(builder)

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: tracker.function.IssueTitleProvider
  })

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.ListHeaderExtra, {
    presenters: [tracker.component.IssueStatistics]
  })

  defineSortAndGrouping(builder)

  builder.mixin(tracker.class.Issue, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy', 'assignee']
  })

  builder.mixin(tracker.class.Issue, core.class.Class, setting.mixin.Editable, {
    value: true
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

  defineApplication(builder, { myIssuesId, allIssuesId, issuesId, componentsId, milestonesId, templatesId })

  defineActions(builder, issuesId, componentsId, myIssuesId)

  defineFilters(builder)

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

  defineNotifications(builder)

  builder.createDoc(setting.class.WorkspaceSettingCategory, core.space.Model, {
    name: 'relations',
    label: tracker.string.RelatedIssues,
    icon: tracker.icon.Relations,
    component: tracker.component.EditRelatedTargets,
    group: 'settings-editor',
    secured: false,
    order: 4000
  })
}
