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
import chunter from '@hcengineering/chunter'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import presentation from '@hcengineering/model-presentation'
import task from '@hcengineering/model-task'
import view from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import setting from '@hcengineering/setting'
import { trackerId } from '@hcengineering/tracker'

import { createActions as defineActions } from './actions'
import tracker from './plugin'
import { definePresenters } from './presenters'
import {
  DOMAIN_TRACKER,
  TComponent,
  TIssue,
  TIssueStatus,
  TIssueTemplate,
  TMilestone,
  TProject,
  TProjectTargetPreference,
  TRelatedIssueTarget,
  TTimeSpendReport,
  TTypeEstimation,
  TTypeIssuePriority,
  TTypeMilestoneStatus,
  TTypeRemainingTime,
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

  builder.mixin(tracker.class.IssueStatus, core.class.Class, view.mixin.AllValuesFunc, {
    func: tracker.function.GetAllStates
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
        [notification.providers.BrowserNotification]: true,
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

/**
 * Define filters
 */
function defineFilters (builder: Builder): void {
  //
  // Issue
  //
  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.ClassFilters, {
    filters: [
      'kind',
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

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: tracker.function.IssueIdentifierProvider
  })

  builder.mixin(tracker.class.Issue, core.class.Class, chunter.mixin.ObjectChatPanel, {
    ignoreKeys: [
      'number',
      'createdBy',
      'attachedTo',
      'title',
      'collaborators',
      'description',
      'remainingTime',
      'reportedTime'
    ]
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

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: tracker.function.MilestoneTitleProvider
  })

  builder.mixin(tracker.class.Milestone, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: tracker.function.MilestoneTitleProvider
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

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: tracker.function.ComponentTitleProvider
  })

  builder.mixin(tracker.class.Component, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: tracker.function.ComponentTitleProvider
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
                ['active', tracker.string.Active, {}],
                ['backlog', tracker.string.Backlog, {}],
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
              ],
              allProjectsTypes: true
            }
          },
          {
            id: 'all-projects',
            component: workbench.component.SpecialView,
            icon: view.icon.Archive,
            label: tracker.string.AllProjects,
            position: 'bottom',
            spaceClass: tracker.class.Project,
            componentProps: {
              _class: tracker.class.Project,
              label: tracker.string.AllProjects,
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
    TRelatedIssueTarget,
    TTypeEstimation,
    TTypeRemainingTime,
    TProjectTargetPreference
  )

  builder.mixin(tracker.class.Project, core.class.Class, activity.mixin.ActivityDoc, {})
  builder.mixin(tracker.class.Issue, core.class.Class, activity.mixin.ActivityDoc, {})
  builder.mixin(tracker.class.Milestone, core.class.Class, activity.mixin.ActivityDoc, {})
  builder.mixin(tracker.class.Component, core.class.Class, activity.mixin.ActivityDoc, {})
  builder.mixin(tracker.class.IssueTemplate, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityMessageControl, core.space.Model, {
    objectClass: tracker.class.Issue,
    skip: [
      {
        _class: core.class.TxCollectionCUD,
        collection: 'comments'
      }
    ]
  })

  builder.createDoc(activity.class.ActivityMessageControl, core.space.Model, {
    objectClass: tracker.class.Milestone,
    skip: [
      {
        _class: core.class.TxCollectionCUD,
        collection: 'comments'
      }
    ]
  })

  builder.createDoc(activity.class.ActivityMessageControl, core.space.Model, {
    objectClass: tracker.class.Component,
    skip: [
      {
        _class: core.class.TxCollectionCUD,
        collection: 'comments'
      }
    ]
  })

  builder.createDoc(activity.class.ActivityMessageControl, core.space.Model, {
    objectClass: tracker.class.IssueTemplate,
    skip: [
      {
        _class: core.class.TxCollectionCUD,
        collection: 'comments'
      }
    ]
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: tracker.class.Issue,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: tracker.class.Milestone,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: tracker.class.Component,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: tracker.class.IssueTemplate,
    components: { input: chunter.component.ChatMessageInput }
  })

  defineViewlets(builder)

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

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: tracker.class.Issue,
      action: 'update',
      icon: tracker.icon.Issue,
      config: {
        status: {
          iconPresenter: tracker.component.IssueStatusIcon
        },
        priority: {
          iconPresenter: tracker.component.PriorityIconPresenter
        },
        estimation: {
          icon: tracker.icon.Estimation
        }
      }
    },
    tracker.ids.IssueUpdatedActivityViewlet
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: tracker.class.Issue,
      action: 'create',
      icon: tracker.icon.Issue,
      valueAttr: 'title'
    },
    tracker.ids.IssueCreatedActivityViewlet
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: tracker.class.Issue,
      action: 'remove',
      icon: tracker.icon.Issue,
      valueAttr: 'title'
    },
    tracker.ids.IssueRemovedActivityViewlet
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: tracker.class.Milestone,
      action: 'update',
      config: {
        status: {
          iconPresenter: tracker.component.MilestoneStatusIcon
        }
      }
    },
    tracker.ids.MilestionUpdatedActivityViewlet
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: tracker.class.IssueTemplate,
      action: 'update',
      config: {
        priority: {
          iconPresenter: tracker.component.PriorityIconPresenter
        }
      }
    },
    tracker.ids.IssueTemplateUpdatedActivityViewlet
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
      title: tracker.string.Issues,
      query: tracker.completion.IssueQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: tracker.class.Issue
    },
    tracker.completion.IssueCategory
  )

  defineNotifications(builder)

  builder.createDoc(setting.class.WorkspaceSettingCategory, core.space.Model, {
    name: 'relations',
    label: tracker.string.RelatedIssues,
    icon: tracker.icon.Relations,
    component: tracker.component.SettingsRelatedTargets,
    group: 'settings-editor',
    secured: false,
    order: 4000
  })

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ChatMessage,
      objectClass: tracker.class.Issue,
      label: chunter.string.LeftComment
    },
    tracker.ids.IssueChatMessageViewlet
  )

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ChatMessage,
      objectClass: tracker.class.IssueTemplate,
      label: chunter.string.LeftComment
    },
    tracker.ids.IssueTemplateChatMessageViewlet
  )

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ChatMessage,
      objectClass: tracker.class.Component,
      label: chunter.string.LeftComment
    },
    tracker.ids.ComponentChatMessageViewlet
  )

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ChatMessage,
      objectClass: tracker.class.Milestone,
      label: chunter.string.LeftComment
    },
    tracker.ids.MilestoneChatMessageViewlet
  )

  builder.createDoc(
    task.class.ProjectTypeDescriptor,
    core.space.Model,
    {
      name: tracker.string.TrackerApplication,
      description: tracker.string.ManageWorkflowStatuses,
      icon: task.icon.Task,
      baseClass: tracker.class.Project,
      availablePermissions: [core.permission.ForbidDeleteObject],
      allowedClassic: true,
      allowedTaskTypeDescriptors: [tracker.descriptors.Issue]
    },
    tracker.descriptors.ProjectType
  )

  builder.createDoc(
    task.class.TaskTypeDescriptor,
    core.space.Model,
    {
      baseClass: tracker.class.Issue,
      allowCreate: true,
      description: tracker.string.Issue,
      icon: tracker.icon.Issue,
      name: tracker.string.Issue,
      statusCategoriesFunc: tracker.function.GetIssueStatusCategories
    },
    tracker.descriptors.Issue
  )

  builder.mixin(tracker.class.Issue, core.class.Class, view.mixin.ObjectIcon, {
    component: tracker.component.IssueStatusPresenter
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_TRACKER,
    disabled: [
      { space: 1 },
      { attachedToClass: 1 },
      { status: 1 },
      { project: 1 },
      { priority: 1 },
      { assignee: 1 },
      { sprint: 1 },
      { component: 1 },
      { category: 1 },
      { modifiedOn: 1 },
      { modifiedBy: 1 },
      { createdBy: 1 },
      { relations: 1 },
      { milestone: 1 },
      { createdOn: -1 }
    ]
  })
}
