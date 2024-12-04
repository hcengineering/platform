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

import type { Doc, DocumentQuery, Ref } from '@hcengineering/core'
import { showPopup, showPanel } from '@hcengineering/ui'
import { type TestProject, type TestCase, type TestSuite, type TestResult } from '@hcengineering/test-management'

import CreateTestSuiteComponent from './components/test-suite/CreateTestSuite.svelte'
import EditTestSuiteComponent from './components/test-suite/EditTestSuite.svelte'
import CreateTestCase from './components/test-case/CreateTestCase.svelte'
import CreateProject from './components/project/CreateProject.svelte'
import CreateTestRun from './components/test-run/CreateTestRun.svelte'
import testManagement from '@hcengineering/test-management'
import { getTestRunIdFromLocation } from './navigation'
import { initializeIterator } from './components/test-result/store/testIteratorStore'

export async function showCreateTestSuitePopup (
  space: Ref<TestProject> | undefined,
  parentId: Ref<TestSuite>
): Promise<void> {
  showPopup(CreateTestSuiteComponent, { space, parentId }, 'top')
}

export async function showEditTestSuitePopup (suite: Ref<TestSuite>): Promise<void> {
  showPopup(EditTestSuiteComponent, { _id: suite }, 'top')
}

export async function showCreateTestCasePopup (space: Ref<TestProject>, testSuiteId: Ref<TestSuite>): Promise<void> {
  showPopup(CreateTestCase, { space, testSuiteId }, 'top')
}

export async function showCreateProjectPopup (): Promise<void> {
  showPopup(CreateProject, {}, 'top')
}

export async function showCreateTestRunPopup (options: {
  testCases?: TestCase[]
  query?: DocumentQuery<Doc>
  space: Ref<TestProject>
}): Promise<void> {
  showPopup(CreateTestRun, options, 'top')
}

export async function showTestRunnerPanel (options: {
  query?: DocumentQuery<TestResult>
  space: Ref<TestProject>
}): Promise<void> {
  const { query, space } = options
  await initializeIterator({ ...query, space }, undefined, {
    lookup: {
      testCase: testManagement.class.TestCase
    }
  })
  const testRunId = getTestRunIdFromLocation()
  showPanel(testManagement.component.TestRunner, testRunId, testManagement.class.TestRun, 'content')
}

export async function CreateChildTestSuiteAction (doc: TestSuite): Promise<void> {
  await showCreateTestSuitePopup(doc.space, doc._id)
}

export async function EditTestSuiteAction (doc: TestSuite): Promise<void> {
  await showEditTestSuitePopup(doc._id)
}

export async function RunSelectedTestsAction (docs: TestCase[] | TestCase): Promise<void> {
  const testCases = Array.isArray(docs) ? docs : [docs]
  if (testCases?.length > 0) {
    const space = testCases[0].space
    await showCreateTestRunPopup({ testCases, space })
  } else {
    console.error('No test cases selected')
  }
}
