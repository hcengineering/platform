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

import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import view from '@hcengineering/model-view'
import testManagement from './plugin'

/**
 * Define presenters
 */
export function definePresenters (builder: Builder): void {
  //
  // Project
  //
  builder.mixin(testManagement.class.TestProject, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: testManagement.component.ProjectPresenter
  })

  builder.mixin(testManagement.class.TestProject, core.class.Class, view.mixin.SpacePresenter, {
    presenter: testManagement.component.ProjectSpacePresenter
  })

  //
  // Test Suite
  //
  builder.mixin(testManagement.class.TestSuite, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: testManagement.component.TestSuitePresenter
  })

  //
  // Test Case
  //
  builder.mixin(testManagement.class.TestCase, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: testManagement.component.TestCasePresenter
  })

  //
  // Type Test Case Status
  //
  builder.mixin(testManagement.class.TypeTestCaseStatus, core.class.Class, view.mixin.AttributePresenter, {
    presenter: testManagement.component.TestCaseStatusPresenter
  })

  builder.mixin(testManagement.class.TypeTestRunStatus, core.class.Class, view.mixin.AttributePresenter, {
    presenter: testManagement.component.TestResultStatusPresenter
  })

  builder.mixin(testManagement.class.TypeTestRunStatus, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: testManagement.component.TestResultStatusEditor
  })
}
