//
// Copyright © 2026 Hardcore Engineering Inc.
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

import core, { AccountRole, setCurrentAccount, type Account, type Client, type Doc } from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import { type Action } from '@hcengineering/view'
import { createActions } from '../actions'
import tracker from '../plugin'

// Keep UI initialization out of these Node tests; action registration and filtering are real.
jest.mock('@hcengineering/presentation', () => ({
  addRefreshListener: jest.fn(),
  getClient: () => ({ getHierarchy: () => ({}) })
}))
jest.mock('@hcengineering/ui', () => ({}))
jest.mock('../../../../plugins/view-resources/src/components/Menu.svelte', () => ({}))
jest.mock('../../../../plugins/view-resources/src/plugin', () => ({
  __esModule: true,
  default: jest.requireActual('@hcengineering/view').default
}))
jest.mock('../../../../plugins/view-resources/src/utils', () => ({
  restrictionStore: { subscribe: jest.fn() }
}))

// Exercise the UI runtime without including its source files in this model package's compilation.
const { filterAvailableActions } = jest.requireActual<{
  filterAvailableActions: (actions: Action[], client: Client, context: Doc | Doc[]) => Promise<Action[]>
}>('../../../../plugins/view-resources/src/actions')

function copyAction (): Action {
  const createDoc = jest.fn()
  const builder = { createDoc, mixin: jest.fn() } as unknown as Builder
  createActions(builder, 'issues', 'components', 'my-issues')
  const registration = createDoc.mock.calls.find((call) => call[3] === tracker.action.CopyIssueTemplateToProject)
  if (registration === undefined) throw new Error('Copy to project action was not registered')
  const action: Action = { ...registration[2], _id: registration[3] }
  return action
}

// This client supplies only the class hierarchy operations used by action filtering.
function actionClient (): Client {
  const hierarchy = {
    getClass: (id: string) => ({ _id: id }),
    as: () => undefined,
    getAncestors: () => [],
    getDescendants: () => [],
    isDerived: (id: string, parent: string) => id === parent || parent === core.class.Doc,
    isMixin: () => false
  }
  return { getHierarchy: () => hierarchy } as unknown as Client
}

function actionDoc (id: string, _class: Doc['_class'] = tracker.class.IssueTemplate): Doc {
  return {
    _id: id as Doc['_id'],
    _class,
    space: core.space.Model,
    modifiedBy: 'user' as Doc['modifiedBy'],
    modifiedOn: 0
  }
}

describe('Copy to project menu availability', () => {
  beforeAll(() => {
    const account: Account = {
      uuid: 'user' as Account['uuid'],
      role: AccountRole.User,
      primarySocialId: 'user' as Account['primarySocialId'],
      socialIds: [],
      fullSocialIds: []
    }
    setCurrentAccount(account)
  })

  const first = actionDoc('first')
  const second = actionDoc('second')

  it.each([
    ['template panel document', first],
    ['single selected template', [first]],
    ['multiple selected templates', [first, second]]
  ] as Array<[string, Doc | Doc[]]>)('offers the registered model action for %s', async (_name, context) => {
    const action = copyAction()
    expect(await filterAvailableActions([action], actionClient(), context)).toEqual([action])
  })

  it('does not offer the template action for an issue', async () => {
    const issue = actionDoc('issue', tracker.class.Issue)
    expect(await filterAvailableActions([copyAction()], actionClient(), issue)).toEqual([])
  })
})
