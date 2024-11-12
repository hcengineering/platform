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
import { AccountRole, SortingOrder } from '@hcengineering/core'

import { type Builder } from '@hcengineering/model'
import view, { createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import print from '@hcengineering/model-print'
import tracker from '@hcengineering/model-tracker'
import { type ViewOptionsModel } from '@hcengineering/view'

import { testManagementId } from '@hcengineering/test-management'

import {
  DOMAIN_TEST_MANAGEMENT,
  TTypeTestCaseType,
  TTypeTestCasePriority,
  TTypeTestCaseStatus,
  TTestProject,
  TTestSuite,
  TTestCase,
  TDefaultProjectTypeData,
  TTestRun,
  TTypeTestRunResult,
  TTestRunItem
} from './types'

import testManagement from './plugin'
import { definePresenters } from './presenters'

export { testManagementId } from '@hcengineering/test-management/src/index'

function defineApplication (
  builder: Builder,
  opt: {
    allTestCasesId: string
    testCasesId: string
    testSuitesId: string
    testRunsId: string
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
      locationResolver: testManagement.resolver.Location,
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
                id: 'library',
                label: testManagement.string.TestCases,
                icon: testManagement.icon.TestCases,
                component: workbench.component.SpecialView,
                componentProps: {
                  _class: testManagement.class.TestCase,
                  icon: testManagement.icon.TestCases,
                  label: testManagement.string.TestCases,
                  createLabel: testManagement.string.CreateTestCase,
                  createComponent: testManagement.component.CreateTestCase
                },
                navigationModel: {
                  navigationComponent: view.component.FoldersBrowser,
                  navigationComponentLabel: testManagement.string.TestSuites,
                  navigationComponentIcon: testManagement.icon.TestSuites,
                  createComponent: testManagement.component.CreateTestSuite,
                  navigationComponentProps: {
                    _class: testManagement.class.TestSuite,
                    icon: testManagement.icon.TestSuites,
                    title: testManagement.string.TestSuites,
                    createLabel: testManagement.string.CreateTestSuite,
                    createComponent: testManagement.component.CreateTestSuite,
                    titleKey: 'name',
                    parentKey: 'parent',
                    getFolderLink: testManagement.function.GetTestSuiteLink,
                    allObjectsLabel: testManagement.string.AllTestCases,
                    allObjectsIcon: testManagement.icon.TestSuites
                  },
                  syncQueryAndLocation: testManagement.function.SyncQueryAndLocation
                }
              },
              {
                id: opt.testRunsId,
                label: testManagement.string.TestRuns,
                icon: testManagement.icon.TestRuns,
                component: workbench.component.SpecialView,
                componentProps: {
                  _class: testManagement.class.TestRun,
                  icon: testManagement.icon.TestRuns,
                  title: testManagement.string.TestRuns,
                  createLabel: testManagement.string.NewTestRun,
                  createComponent: testManagement.component.CreateTestRun
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
    TTestCase,
    TDefaultProjectTypeData,
    TTestRun,
    TTestRunItem,
    TTypeTestRunResult
  )

  builder.mixin(testManagement.class.TestProject, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: testManagement.class.TestProject,
    components: { input: chunter.component.ChatMessageInput }
  })

  defineTestSuite(builder)
  defineTestCase(builder)
  defineTestRun(builder)

  const testCasesId = 'testCases'
  const allTestCasesId = 'allTestCases'
  const testSuitesId = 'testSuites'
  const testRunsId = 'testRuns'

  definePresenters(builder)

  defineApplication(builder, { allTestCasesId, testCasesId, testSuitesId, testRunsId })

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
  builder.createDoc(
    core.class.SpaceTypeDescriptor,
    core.space.Model,
    {
      name: testManagement.string.TestProject,
      description: testManagement.string.FullDescription,
      icon: testManagement.icon.TestProject,
      baseClass: testManagement.class.TestProject,
      availablePermissions: [
        core.permission.UpdateSpace,
        core.permission.ArchiveSpace,
        core.permission.ForbidDeleteObject
      ]
    },
    testManagement.descriptors.ProjectType
  )

  builder.createDoc(
    core.class.SpaceType,
    core.space.Model,
    {
      name: 'Default project type',
      descriptor: testManagement.descriptors.ProjectType,
      roles: 0,
      targetClass: testManagement.mixin.DefaultProjectTypeData
    },
    testManagement.spaceType.DefaultProject
  )
}

function defineTestSuite (builder: Builder): void {
  builder.mixin(testManagement.class.TestSuite, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: testManagement.class.TestSuite,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.mixin(testManagement.class.TestSuite, core.class.Class, view.mixin.ObjectEditor, {
    editor: testManagement.component.EditTestSuite
  })

  builder.mixin(testManagement.class.TestSuite, core.class.Class, view.mixin.ObjectPanel, {
    component: testManagement.component.EditTestSuite
  })

  builder.mixin(testManagement.class.TestSuite, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: testManagement.component.TestSuitePresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: testManagement.class.TestSuite,
      descriptor: view.viewlet.Table,
      config: ['', 'description'],
      configOptions: {
        strict: true
      }
    },
    testManagement.viewlet.TableTestSuites
  )

  // Actions

  builder.mixin(testManagement.class.TestSuite, core.class.Class, view.mixin.IgnoreActions, {
    actions: [
      view.action.Open,
      view.action.OpenInNewTab,
      print.action.Print,
      tracker.action.EditRelatedTargets,
      tracker.action.NewRelatedIssue
    ]
  })

  createAction(
    builder,
    {
      action: testManagement.actionImpl.CreateChildTestSuite,
      label: testManagement.string.CreateTestSuite,
      icon: testManagement.icon.TestSuite,
      category: testManagement.category.TestSuite,
      input: 'none',
      target: testManagement.class.TestSuite,
      context: {
        mode: ['context', 'browser'],
        application: testManagement.app.TestManagement,
        group: 'create'
      }
    },
    testManagement.action.CreateChildTestSuite
  )
}

function defineTestCase (builder: Builder): void {
  builder.mixin(testManagement.class.TestCase, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: testManagement.class.TestCase,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.mixin(testManagement.class.TestCase, core.class.Class, view.mixin.ObjectEditor, {
    editor: testManagement.component.EditTestCase
  })

  builder.mixin(testManagement.class.TestCase, core.class.Class, view.mixin.ObjectPanel, {
    component: testManagement.component.EditTestCase
  })

  builder.mixin(testManagement.class.TestCase, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: testManagement.component.TestCasePresenter
  })

  builder.mixin(testManagement.class.TypeTestCaseStatus, core.class.Class, view.mixin.AttributeFilter, {
    component: view.component.ValueFilter
  })

  builder.mixin(testManagement.class.TestSuite, core.class.Class, view.mixin.AttributePresenter, {
    presenter: testManagement.component.TestSuiteRefPresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: testManagement.class.TestCase,
      descriptor: view.viewlet.Table,
      config: ['', 'suite', 'status', 'assignee'],
      configOptions: {
        strict: true
      }
    },
    testManagement.viewlet.TableTestCase
  )

  const viewOptions: ViewOptionsModel = {
    groupBy: ['suite'],
    orderBy: [
      ['status', SortingOrder.Ascending],
      ['modifiedOn', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending]
    ],
    other: [
      {
        key: 'shouldShowAll',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'category',
        action: view.function.ShowEmptyGroups,
        label: view.string.ShowEmptyGroups
      }
    ]
  }

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: testManagement.class.TestCase,
      descriptor: view.viewlet.List,
      configOptions: {
        strict: true,
        hiddenKeys: ['title']
      },
      config: [
        { key: '', displayProps: { fixed: 'left', key: 'lead' } },
        {
          key: 'status',
          props: { kind: 'list', size: 'small', shouldShowName: false }
        },
        { key: 'modifiedOn', displayProps: { key: 'modified', fixed: 'right', dividerBefore: true } },
        {
          key: 'assignee',
          props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' },
          displayProps: { key: 'assignee', fixed: 'right' }
        }
      ],
      viewOptions
    },
    testManagement.viewlet.ListTestCase
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: testManagement.class.TestCase,
      descriptor: view.viewlet.Table,
      config: ['', 'assignee', 'modifiedOn'],
      configOptions: {
        sortable: true
      },
      variant: 'short'
    },
    testManagement.viewlet.SuiteTestCases
  )
}

function defineTestRun (builder: Builder): void {
  builder.mixin(testManagement.class.TestRun, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: testManagement.class.TestRun,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.mixin(testManagement.class.TestRun, core.class.Class, view.mixin.ObjectEditor, {
    editor: testManagement.component.EditTestRun
  })

  builder.mixin(testManagement.class.TestRun, core.class.Class, view.mixin.ObjectPanel, {
    component: testManagement.component.EditTestRun
  })

  builder.mixin(testManagement.class.TestRun, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: testManagement.component.TestRunPresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: testManagement.class.TestRun,
      descriptor: view.viewlet.Table,
      config: [''],
      configOptions: {
        strict: true
      }
    },
    testManagement.viewlet.TableTestRun
  )
}

export { testManagementOperation } from './migration'
export { default } from './plugin'
