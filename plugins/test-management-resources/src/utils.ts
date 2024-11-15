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

import { type Contact } from '@hcengineering/contact'
import core, { type Doc, type Ref, type TxCreateDoc, type TxUpdateDoc } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { showPopup } from '@hcengineering/ui'
import { type TestProject, type TestCase, type TestSuite } from '@hcengineering/test-management'

import CreateTestSuiteComponent from './components/test-suite/CreateTestSuite.svelte'
import EditTestSuiteComponent from './components/test-suite/EditTestSuite.svelte'
import CreateTestCase from './components/test-case/CreateTestCase.svelte'
import CreateProject from './components/project/CreateProject.svelte'

export async function getPreviousAssignees (objectId: Ref<Doc> | undefined): Promise<Array<Ref<Contact>>> {
  if (objectId === undefined) {
    return []
  }
  const client = getClient()
  const createTx = (
    await client.findAll<TxCreateDoc<TestCase>>(core.class.TxCreateDoc, {
      objectId: objectId as Ref<TestCase>
    })
  )[0]
  const updateTxes = await client.findAll<TxUpdateDoc<TestCase>>(
    core.class.TxUpdateDoc,
    { objectId: objectId as Ref<TestCase>, 'operations.assignee': { $exists: true } },
    { sort: { modifiedOn: -1 } }
  )
  const set = new Set<Ref<Contact>>()
  const createAssignee = createTx?.attributes?.assignee
  for (const tx of updateTxes) {
    const assignee = tx.operations.assignee
    if (assignee == null) continue
    set.add(assignee)
  }
  if (createAssignee != null) {
    set.add(createAssignee)
  }
  return Array.from(set)
}

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

export async function CreateChildTestSuiteAction (doc: TestSuite): Promise<void> {
  await showCreateTestSuitePopup(doc.space, doc._id)
}

export async function EditTestSuiteAction (doc: TestSuite): Promise<void> {
  await showEditTestSuitePopup(doc._id)
}
