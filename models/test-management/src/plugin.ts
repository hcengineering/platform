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

import { testManagementId } from '@hcengineering/test-management'
import testManganement from '@hcengineering/test-management-resources/src/plugin'
import type { Doc, Ref, Role } from '@hcengineering/core'
import { mergeIds } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import type { Action } from '@hcengineering/view'

export default mergeIds(testManagementId, testManganement, {
  action: {
    DeleteTestCase: '' as Ref<Action<Doc, any>>
  },
  component: {
    CreateTestCase: '' as AnyComponent,
    TestCasePresenter: '' as AnyComponent,
    ProjectPresenter: '' as AnyComponent,
    ProjectSpacePresenter: '' as AnyComponent,
    TestSuitePresenter: '' as AnyComponent,
    NewProductHeader: '' as AnyComponent,
    EditTestSuite: '' as AnyComponent,
    EditTestCase: '' as AnyComponent,
    CreateTestRun: '' as AnyComponent,
    TestRunPresenter: '' as AnyComponent,
    EditTestRun: '' as AnyComponent,
    TestSuiteRefPresenter: '' as AnyComponent
  },
  function: {},
  role: {
    QARA: '' as Ref<Role>,
    Manager: '' as Ref<Role>,
    QualifiedUser: '' as Ref<Role>
  }
})
