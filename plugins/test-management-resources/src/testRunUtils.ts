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
import { type Ref } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import testManagement, { type TestRun, type TestCase, TestRunStatus } from '@hcengineering/test-management'

export async function getTestCases (objectId: Ref<TestRun>): Promise<TestCase[]> {
  if (objectId === undefined) {
    return []
  }
  const client = getClient()
  const testResults = await client.findAll(testManagement.class.TestResult, { attachedTo: objectId })
  const testCaseIds = testResults.map((testResult) => testResult.testCase)
  return await client.findAll(testManagement.class.TestCase, { _id: { $in: testCaseIds } })
}

export interface TestRunStats {
  readonly done: number
  readonly untested: number
  readonly blocked: number
  readonly completed: number
  readonly failed: number
}

async function getTestResultCount (objectId: Ref<TestRun>, status: TestRunStatus): Promise<number> {
  const client = getClient()
  const testResults = await client.findAll(testManagement.class.TestResult, { 
    attachedTo: objectId,
    status: status
  }, {limit: 0, total: true })
  return testResults.total > 0 ? testResults.total : 0
}

export async function getTestRunStats (objectId: Ref<TestRun>): Promise<TestRunStats> {
  const untested = await getTestResultCount(objectId, TestRunStatus.Untested)
  const blocked = await getTestResultCount(objectId, TestRunStatus.Blocked)
  const completed = await getTestResultCount(objectId, TestRunStatus.Passed)
  const failed = await getTestResultCount(objectId, TestRunStatus.Failed)
  const total = untested + blocked + completed + failed

  const done = total > 0 ? (total - untested) * 100 / total : 0
  return {
    done,
    untested,
    blocked,
    completed,
    failed
  }
}

