//
// Copyright © 2024 Hardcore Engineering Inc.
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
import core from '@hcengineering/model-core'
import { AccountRole } from '@hcengineering/core'

import { type Builder } from '@hcengineering/model'
import task from '@hcengineering/model-task'
import view from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'

import { testManagementId } from '@hcengineering/test-management'

import {
  DOMAIN_TEST_MANAGEMENT,
  TTypeTestCaseType,
  TTypeTestCasePriority,
  TTypeTestCaseStatus,
  TTestProject,
  TTestSuite,
  TTestCase
} from './types'

import testManagement from './plugin'
import { definePresenters } from './presenters'

export { testManagementId } from '@hcengineering/test-management/src/index'

function defineApplication (
  builder: Builder,
  opt: {
    allTestCasesId: string
    testCasesId: string
  }
): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: testManagement.string.TestManagementApplication,
      icon: testManagement.icon.TestManagementApplication,
      alias: testManagementId,
      hidden: false,
      // locationResolver: testManagement.resolver.Location,
      navigatorModel: {
        specials: [
          {
            id: opt.allTestCasesId,
            position: 'top',
            label: testManagement.string.AllTestCases,
            icon: testManagement.icon.TestCases,
            component: testManagement.component.TestCases,
            componentProps: {
              space: undefined,
              icon: testManagement.icon.TestCases,
              title: testManagement.string.AllTestCases,
              allProjectsTypes: true
            }
          },
          {
            id: 'all-projects',
            component: workbench.component.SpecialView,
            icon: view.icon.List,
            accessLevel: AccountRole.User,
            label: testManagement.string.AllProjects,
            position: 'bottom',
            spaceClass: testManagement.class.TestProject,
            componentProps: {
              _class: testManagement.class.TestProject,
              icon: view.icon.List,
              label: testManagement.string.AllProjects
            }
          }
        ],
        spaces: [
          {
            id: 'projects',
            label: testManagement.string.Projects,
            spaceClass: testManagement.class.TestProject,
            addSpaceLabel: testManagement.string.CreateProject,
            createComponent: testManagement.component.CreateProject,
            icon: testManagement.icon.Home,
            specials: [
              {
                id: opt.testCasesId,
                label: testManagement.string.TestCases,
                icon: testManagement.icon.TestCases,
                component: testManagement.component.TestCases,
                componentProps: {
                  icon: testManagement.icon.TestCases,
                  title: testManagement.string.TestCases
                }
              }
            ]
          }
        ]
      },
      navHeaderComponent: testManagement.component.NewTestCaseHeader
    },
    testManagement.app.TestManagement
  )
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TTypeTestCaseType,
    TTypeTestCasePriority,
    TTypeTestCaseStatus,
    TTestProject,
    TTestSuite,
    TTestCase
  )

  builder.mixin(testManagement.class.TestProject, core.class.Class, activity.mixin.ActivityDoc, {})
  builder.mixin(testManagement.class.TestSuite, core.class.Class, activity.mixin.ActivityDoc, {})
  builder.mixin(testManagement.class.TestCase, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: testManagement.class.TestProject,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: testManagement.class.TestSuite,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: testManagement.class.TestCase,
    components: { input: chunter.component.ChatMessageInput }
  })

  // defineViewlets(builder)

  const testCasesId = 'testCases'
  const allTestCasesId = 'allTestCases'

  definePresenters(builder)

  /*   builder.mixin(testManagement.class.TestCase, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: testManagement.function.TestCaseTitleProvider
  }) */

  // defineSortAndGrouping(builder)

  // builder.mixin(testManagement.class.TestCase, core.class.Class, notification.mixin.ClassCollaborators, {
  //  fields: ['createdBy', 'assignee']
  // })

  // builder.mixin(testManagement.class.TestCase, core.class.Class, setting.mixin.Editable, {
  //  value: true
  // })

  builder.mixin(testManagement.class.TestCase, core.class.Class, view.mixin.ObjectPanel, {
    component: testManagement.component.TestCase
  })

  /*  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: testManagement.class.TestCase,
      action: 'update',
      icon: testManagement.icon.TestCase,
      config: {
        status: {
          iconPresenter: testManagement.component.TestCaseStatusIcon
        },
        priority: {
          iconPresenter: testManagement.component.PriorityIconPresenter
        },
        estimation: {
          icon: testManagement.icon.Estimation
        }
      }
    },
    testManagement.ids.TestCaseUpdatedActivityViewlet
  )

  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: testManagement.class.TestCase,
      action: 'create',
      icon: testManagement.icon.TestCase,
      valueAttr: 'title'
    },
    testManagement.ids.TestCaseUpdatedActivityViewlet
  ) */

  /*  builder.createDoc(
    activity.class.DocUpdateMessageViewlet,
    core.space.Model,
    {
      objectClass: testManagement.class.TestCase,
      action: 'remove',
      icon: testManagement.icon.TestCase,
      valueAttr: 'title'
    },
    testManagement.ids.TestCaseRemovedViewlet
  ) */

  defineApplication(builder, { allTestCasesId, testCasesId })

  // defineActions(builder, issuesId, componentsId, myIssuesId)

  // defineFilters(builder)

  /*   builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: testManagement.icon.TestManagementApplication,
      label: testManagement.string.SearchIssue,
      title: testManagement.string.TestCases,
      query: testManagement.completion.TestCaseQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: testManagement.class.TestCase,
      priority: 300
    },
    testManagement.completion.TestCaseCategory
  ) */

  // defineNotifications(builder)

  /*   builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ChatMessage,
      objectClass: testManagement.class.TestCase,
      label: chunter.string.LeftComment
    },
    testManagement.ids.TestCaseChatMessageViewlet
  ) */

  builder.mixin(testManagement.class.TestCase, core.class.Class, view.mixin.ObjectIcon, {
    component: testManagement.component.TestCaseStatusPresenter
  })

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_TEST_MANAGEMENT,
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

  defineSpaceType(builder)
}

function defineSpaceType (builder: Builder): void {
  // builder.createModel(TClassicProjectTypeData)
  builder.createDoc(
    task.class.ProjectTypeDescriptor,
    core.space.Model,
    {
      name: testManagement.string.TestManagementApplication,
      description: testManagement.string.TestManagementDescription,
      icon: task.icon.Task,
      baseClass: testManagement.class.TestProject,
      availablePermissions: [
        core.permission.UpdateSpace,
        core.permission.ArchiveSpace,
        core.permission.ForbidDeleteObject
      ],
      allowedClassic: true,
      allowedTaskTypeDescriptors: [testManagement.descriptors.TestCase]
    },
    testManagement.descriptors.ProjectType
  )

  builder.createDoc(
    task.class.TaskTypeDescriptor,
    core.space.Model,
    {
      baseClass: testManagement.class.TestCase,
      allowCreate: true,
      description: testManagement.string.TestCase,
      icon: testManagement.icon.TestCase,
      name: testManagement.string.TestCase
    },
    testManagement.descriptors.TestCase
  )
}

export { testManagementOperation } from './migration'
export { default } from './plugin'
