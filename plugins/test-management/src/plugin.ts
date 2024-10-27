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

import { Mixin, type Class, type Doc, type Ref, Type } from '@hcengineering/core'
import type { Asset, IntlString, Plugin } from '@hcengineering/platform'

import { ProjectTypeDescriptor, TaskTypeDescriptor } from '@hcengineering/task'
import { plugin } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui'
import { ActionCategory, Viewlet } from '@hcengineering/view'
import type { DocumentSpaceType, DocumentSpaceTypeDescriptor } from '@hcengineering/controlled-documents'
import { TestSuite, TestCase, TestProject, TestCaseType, TestCasePriority, TestCaseStatus } from './types'

/** @public */
export const testManagementId = 'testManagement' as Plugin

/** @public */
export const testManagementPlugin = plugin(testManagementId, {
  app: {
    TestManagement: '' as Ref<Doc>
  },
  icon: {
    TestManagement: '' as Asset,
    TestManagementVersion: '' as Asset,
    TestManagementApplication: '' as Asset,
    TestCase: '' as Asset,
	TestCases: '' as Asset,
	Home: '' as Asset,
	Estimation: '' as Asset,
  },
  class: {
    TestCase: '' as Ref<Class<TestCase>>,
    TestSuite: '' as Ref<Class<TestSuite>>,
    TestProject: '' as Ref<Class<TestProject>>,
    TypeTestCaseType: '' as Ref<Class<Type<TestCaseType>>>,
    TypeTestCasePriority: '' as Ref<Class<Type<TestCasePriority>>>,
    TypeTestCaseStatus: '' as Ref<Class<Type<TestCaseStatus>>>,
  },
  descriptors: {
    ProjectType: '' as Ref<ProjectTypeDescriptor>,
	TestCase: '' as Ref<TaskTypeDescriptor>,
  },
  mixin: {
    TestCaseTypeData: '' as Ref<Mixin<TestCase>>,
    TestProject: '' as Ref<Mixin<TestProject>>
  },
  string: {
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString,
    TestCaseType: '' as IntlString,
    TestCasePriority: '' as IntlString,
    TestCaseStatus: '' as IntlString,
    TestSuite: '' as IntlString,
    SuiteName: '' as IntlString,
    SuiteDescription: '' as IntlString,
    Suite: '' as IntlString,
    TestName: '' as IntlString,
    TestDescription: '' as IntlString,
    TestType: '' as IntlString,
    TestPriority: '' as IntlString,
    TestStatus: '' as IntlString,
    TestEstimatedTime: '' as IntlString,
    TestPreconditions: '' as IntlString,
    TestSteps: '' as IntlString,
    TestAssignee: '' as IntlString,
    TestCase: '' as IntlString,
	TestProject: '' as IntlString,
	TestManagementApplication: '' as IntlString,
	AllTestCases: '' as IntlString,
	AllProjects: '' as IntlString,
	Projects: '' as IntlString,
	CreateProject: '' as IntlString,
	TestCases: '' as IntlString,
	TestManagementDescription: '' as IntlString,
  },
  category: {
    TestManagement: '' as Ref<ActionCategory>
  },
  component: {
    TestCaseSearchIcon: '' as AnyComponent,
	TestCases: '' as AnyComponent,
	CreateProject: '' as AnyComponent,
	NewTestCaseHeader: '' as AnyComponent,
	TestCase: '' as AnyComponent,
	TestCaseStatusIcon: '' as AnyComponent,
	PriorityIconPresenter: '' as AnyComponent,
	TestCaseStatusPresenter: '' as AnyComponent,
  },
  ids: {
    NoParent: '' as Ref<TestSuite>,
	TestCaseUpdatedActivityViewlet: '' as Ref<TestCase>,
  },
  spaceType: {
    TestCaseType: '' as Ref<DocumentSpaceType>
  },
  spaceTypeDescriptor: {
    TestCaseType: '' as Ref<DocumentSpaceTypeDescriptor>
  },
  viewlet: {
    TableTestCase: '' as Ref<Viewlet>,
  }
})

/**
 * @public
 */
export default testManagementPlugin
