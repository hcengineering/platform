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
import { SortingOrder } from '@hcengineering/core'

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
  TTypeTestRunStatus,
  TTestRunItem
} from './types'

import testManagement from './plugin'
import { definePresenters } from './presenters'

export { testManagementId } from '@hcengineering/test-management/src/index'

function defineApplication (builder: Builder): void {
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
                label: testManagement.string.TestLibrary,
                icon: testManagement.icon.TestLibrary,
                component: workbench.component.SpecialView,
                componentProps: {
                  _class: testManagement.class.TestCase,
                  icon: testManagement.icon.TestLibrary,
                  label: testManagement.string.TestLibrary,
                  createLabel: testManagement.string.CreateTestCase,
                  createComponent: testManagement.component.CreateTestCase
                },
                navigationModel: {
                  navigationComponent: view.component.FoldersBrowser,
                  navigationComponentLabel: testManagement.string.TestSuites,
                  navigationComponentIcon: testManagement.icon.TestSuites,
                  mainComponentLabel: testManagement.string.TestCases,
                  mainComponentIcon: testManagement.icon.TestCases,
                  createComponent: testManagement.component.CreateTestSuite,
                  mainHeaderComponent: testManagement.component.RunSelectedTestsButton,
                  navigationComponentProps: {
                    _class: testManagement.class.TestSuite,
                    icon: testManagement.icon.TestSuites,
                    title: testManagement.string.TestSuites,
                    createLabel: testManagement.string.CreateTestSuite,
                    createComponent: testManagement.component.CreateTestSuite,
                    titleKey: 'name',
                    parentKey: 'parent',
                    noParentId: testManagement.ids.NoParent,
                    getFolderLink: testManagement.function.GetTestSuiteLink,
                    allObjectsLabel: testManagement.string.AllTestCases,
                    allObjectsIcon: testManagement.icon.TestSuites
                  },
                  syncWithLocationQuery: true
                }
              },
              {
                id: 'testRuns',
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
      navHeaderComponent: testManagement.component.TestManagementSpaceHeader
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
    TTypeTestRunStatus
  )

  builder.mixin(testManagement.class.TestProject, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: testManagement.class.TestProject,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  defineTestSuite(builder)
  defineTestCase(builder)
  defineTestRun(builder)

  definePresenters(builder)

  defineApplication(builder)

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
    components: { input: { component: chunter.component.ChatMessageInput } }
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

  createAction(
    builder,
    {
      action: testManagement.actionImpl.RunSelectedTests,
      label: testManagement.string.CreateTestRun,
      icon: testManagement.icon.TestRuns,
      category: testManagement.category.TestCase,
      input: 'selection',
      target: testManagement.class.TestCase,
      context: {
        mode: ['context'],
        application: testManagement.app.TestManagement,
        group: 'create'
      }
    },
    testManagement.action.RunSelectedTests
  )
}

function defineTestCase (builder: Builder): void {
  builder.mixin(testManagement.class.TestCase, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: testManagement.class.TestCase,
    components: { input: { component: chunter.component.ChatMessageInput } }
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
      config: ['', { key: 'attachedTo', label: testManagement.string.TestSuite }, 'status', 'assignee'],
      configOptions: {
        strict: true
      }
    },
    testManagement.viewlet.TableTestCase
  )

  const viewOptions: ViewOptionsModel = {
    groupBy: ['attachedTo'],
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
}

function defineTestRun (builder: Builder): void {
  builder.mixin(testManagement.class.TestRun, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: testManagement.class.TestRun,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.mixin(testManagement.class.TestRun, core.class.Class, view.mixin.ObjectPanel, {
    component: testManagement.component.EditTestRun
  })

  builder.mixin(testManagement.class.TestRun, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: testManagement.component.TestRunPresenter
  })

  builder.mixin(testManagement.class.TestRun, core.class.Class, view.mixin.ObjectIcon, {
    component: testManagement.component.TestRunStatusPresenter
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

  const viewOptions: ViewOptionsModel = {
    groupBy: ['testSuite'],
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
      attachTo: testManagement.class.TestRunItem,
      descriptor: view.viewlet.List,
      configOptions: {
        strict: true,
        hiddenKeys: ['title', 'status', 'modifiedOn']
      },
      config: [
        {
          key: '$lookup.testCase',
          presenter: testManagement.component.TestCaseNavPresenter,
          label: testManagement.string.TestCase,
          sortingKey: '$lookup.testCase.name'
        },
        {
          key: 'status',
          props: { kind: 'list', size: 'small', shouldShowName: false }
        }
      ],
      viewOptions
    },
    testManagement.viewlet.TestRunList
  )
}

export { testManagementOperation } from './migration'
export { default } from './plugin'
