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
import testManagement, { type TestRun, type TestCase } from '@hcengineering/test-management'

export async function getTestCases (objectId: Ref<TestRun>): Promise<Array<TestCase>> {
  if (objectId === undefined) {
    return []
  }
  const client = getClient()
  const testRunItems = await client.findAll(testManagement.class.TestRunItem, {attachedTo: objectId})
  const testCaseIds = testRunItems.map(testRun => testRun.testCase)
  return client.findAll(testManagement.class.TestCase, {_id: { $in: testCaseIds}})
}


