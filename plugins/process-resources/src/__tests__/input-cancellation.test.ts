//
// Copyright © 2026 TraceX SAS.
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

import card from '@hcengineering/card'
import type { Card } from '@hcengineering/card'
import core, { setCurrentAccount, TxFactory } from '@hcengineering/core'
import type { Account, Client, Hierarchy, ModelDb, Ref, Tx, TxApplyIf, TxCreateDoc } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import process, { createContext, ExecutionStatus } from '@hcengineering/process'
import type {
  ContextId,
  Execution,
  Process,
  ProcessCustomEvent,
  ProcessToDo,
  SelectedUserRequest,
  State,
  StepId,
  Transition,
  UserResult
} from '@hcengineering/process'
import { showPopup } from '@hcengineering/ui'
import { ProcessMiddleware } from '../middleware'

jest.mock('@hcengineering/presentation', () => ({
  ...jest.requireActual('../../../../packages/presentation/src/pipeline'),
  getClient: jest.fn()
}))
jest.mock('@hcengineering/contact-resources', () => ({}))
jest.mock('@hcengineering/view-resources', () => ({}))
jest.mock('@hcengineering/ui', () => ({ showPopup: jest.fn() }))
jest.mock('@hcengineering/text-core', () => ({ isEmptyMarkup: jest.fn() }))
jest.mock('svelte/store', () => ({ get: jest.fn() }))
jest.mock('../components/RequestAttachments.svelte', () => ({ default: 'RequestAttachments' }))

const factory = new TxFactory(core.account.System)
const firstInput = 'first-input' as ContextId
const secondInput = 'second-input' as ContextId
const todoResult = 'todo-result' as ContextId
const definition: Partial<Process> = {
  _id: 'process' as Ref<Process>,
  masterTag: card.class.Card,
  context: {}
}
const execution: Execution = {
  _id: 'execution' as Ref<Execution>,
  _class: process.class.Execution,
  space: core.space.Workspace,
  modifiedBy: core.account.System,
  modifiedOn: 0,
  process: definition._id as Ref<Process>,
  card: 'card' as Ref<Card>,
  currentState: 'waiting' as Ref<State>,
  status: ExecutionStatus.Active,
  context: { __contextId: true },
  rollback: []
}
const result: UserResult = {
  _id: todoResult,
  name: 'Result',
  type: { _class: core.class.TypeString, label: core.string.String }
}
const todoData: Partial<ProcessToDo> = {
  _id: 'todo' as Ref<ProcessToDo>,
  _class: process.class.ProcessToDo,
  space: core.space.Workspace,
  execution: execution._id,
  doneOn: null,
  results: [result]
}
const todo = todoData as ProcessToDo
const targetCard: Partial<Card> = { _id: execution.card, _class: card.class.Card, title: 'Saved title' }
const sendTx = jest.fn(async (_tx: Tx) => ({}))
const findOne = jest.fn()
const findAllSync = jest.fn()
const findObject = jest.fn()
const getObject = jest.fn()
const isDerived = jest.fn(() => false)
const clone = jest.fn()
const findAll = jest.fn()
const model: Partial<ModelDb> = {
  findAllSync,
  findObject,
  getObject
}
const hierarchy: Partial<Hierarchy> = {
  isDerived,
  isMixin: jest.fn(() => false),
  findAttribute: jest.fn(),
  clone
}
const client: Partial<Client> = {
  tx: sendTx,
  getModel: () => model as ModelDb,
  getHierarchy: () => hierarchy as Hierarchy,
  findOne,
  findAll
}

function inputAction (id: ContextId): Transition['actions'][number] {
  const request: SelectedUserRequest = { id, type: 'userRequest', _class: card.class.Card, key: 'title' }
  return {
    _id: id as string as StepId,
    methodId: process.method.UpdateCard,
    context: null,
    params: { title: createContext(request) }
  }
}

function setTransition (...inputs: ContextId[]): void {
  const transition: Partial<Transition> = {
    _id: 'transition' as Ref<Transition>,
    process: execution.process,
    from: execution.currentState,
    to: 'next' as Ref<State>,
    trigger: process.trigger.OnEvent,
    actions: inputs.map(inputAction)
  }
  findAllSync.mockImplementation((_class: string, query: Partial<Transition>) =>
    query.trigger === undefined ? [] : [transition]
  )
}

function respond (...responses: Array<Record<string, unknown> | null | undefined>): void {
  jest.mocked(showPopup).mockImplementation((_component, _props, _position, onClose) => {
    void onClose?.(responses.shift())
    return { id: 'popup', close: jest.fn(), update: jest.fn() }
  })
}

function eventTx (): TxCreateDoc<ProcessCustomEvent> {
  return factory.createTxCreateDoc<ProcessCustomEvent>(process.class.ProcessCustomEvent, execution.space, {
    eventType: 'continue',
    execution: execution._id,
    card: execution.card
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  execution.context = { __contextId: true }
  const account: Partial<Account> = { primarySocialId: core.account.System }
  setCurrentAccount(account as Account)
  jest.mocked(getClient).mockReturnValue(client as ReturnType<typeof getClient>)
  findObject.mockImplementation((id: string) => (id === execution.process ? definition : {}))
  getObject.mockReturnValue(definition)
  isDerived.mockReturnValue(false)
  clone.mockImplementation((doc: object) => ({ ...doc }))
  findAll.mockResolvedValue([execution])
  findOne.mockImplementation(async (_class: string) => {
    if (_class === process.class.Execution) return execution
    if (_class === process.class.ProcessToDo) return todo
    if (_class === card.class.Card) return targetCard
  })
  findAllSync.mockReturnValue([])
})

test('cancelling a user request discards the originating transaction', async () => {
  setTransition(firstInput)
  respond(undefined)

  await expect(ProcessMiddleware.create(client as Client).tx(eventTx())).rejects.toMatchObject({
    status: { code: process.error.ResultNotProvided }
  })
  expect(sendTx).not.toHaveBeenCalled()
  expect(execution.context).toEqual({ __contextId: true })
})

test('cancelling a card update preserves the saved document', async () => {
  isDerived.mockReturnValue(true)
  setTransition(firstInput)
  respond(undefined)
  const tx = factory.createTxUpdateDoc(card.class.Card, execution.space, execution.card, { title: 'New title' })
  await expect(ProcessMiddleware.create(client as Client).tx(tx)).rejects.toMatchObject({
    status: { code: process.error.ResultNotProvided }
  })
  expect(targetCard.title).toBe('Saved title')
  expect(sendTx).not.toHaveBeenCalled()
})

test('cancelling a later request discards earlier answers and the entire transaction batch', async () => {
  setTransition(firstInput, secondInput)
  respond({ value: { [firstInput]: 'first answer' } }, undefined)
  const tx = factory.createTxApplyIf(core.space.Tx, 'batch', [], [], [eventTx()], undefined)

  await expect(ProcessMiddleware.create(client as Client).tx(tx)).rejects.toMatchObject({
    status: { code: process.error.ResultNotProvided }
  })
  expect(showPopup).toHaveBeenCalledTimes(2)
  expect(sendTx).not.toHaveBeenCalled()
  expect(execution.context).toEqual({ __contextId: true })
})

test.each([undefined, null])(
  'cancelling a todo result with %s keeps the todo open and sends no transaction',
  async (value) => {
    respond(value)
    const tx = factory.createTxUpdateDoc(todo._class, todo.space, todo._id, { doneOn: 1 })

    await expect(ProcessMiddleware.create(client as Client).tx(tx)).rejects.toMatchObject({
      status: { code: process.error.ResultNotProvided }
    })
    expect(sendTx).not.toHaveBeenCalled()
    expect(todo.doneOn).toBeNull()
    expect(execution.context).toEqual({ __contextId: true })
  }
)

test('closing a todo result asynchronously settles the transaction without throwing in the popup callback', async () => {
  let closePopup: Parameters<typeof showPopup>[3]
  const opened = new Promise<void>((resolve) => {
    jest.mocked(showPopup).mockImplementation((_component, _props, _position, onClose) => {
      closePopup = onClose
      resolve()
      return { id: 'popup', close: jest.fn(), update: jest.fn() }
    })
  })
  const tx = factory.createTxUpdateDoc(todo._class, todo.space, todo._id, { doneOn: 1 })
  const rejected = expect(ProcessMiddleware.create(client as Client).tx(tx)).rejects.toMatchObject({
    status: { code: process.error.ResultNotProvided }
  })

  await opened
  expect(closePopup).toBeDefined()
  expect(() => {
    void closePopup?.(null)
  }).not.toThrow()
  await rejected
  expect(sendTx).not.toHaveBeenCalled()
  expect(todo.doneOn).toBeNull()
})

test('cancelling a request after confirming a todo result discards both inputs', async () => {
  setTransition(firstInput)
  respond({ [todoResult]: 'todo answer' }, undefined)
  const tx = factory.createTxUpdateDoc(todo._class, todo.space, todo._id, { doneOn: 1 })

  await expect(ProcessMiddleware.create(client as Client).tx(tx)).rejects.toMatchObject({
    status: { code: process.error.ResultNotProvided }
  })
  expect(showPopup).toHaveBeenCalledTimes(2)
  expect(sendTx).not.toHaveBeenCalled()
  expect(execution.context).toEqual({ __contextId: true })
})

test('retrying after cancellation submits only the newly confirmed answers', async () => {
  setTransition(firstInput, secondInput)
  respond({ value: { [firstInput]: 'discarded' } }, undefined)
  const middleware = ProcessMiddleware.create(client as Client)
  await expect(middleware.tx(eventTx())).rejects.toThrow()

  respond({ value: { [firstInput]: 'new answer' } }, { value: { [secondInput]: 'second answer' } })
  const tx = eventTx()
  await middleware.tx(tx)

  expect(sendTx).toHaveBeenCalledTimes(1)
  const sent = sendTx.mock.calls[0][0] as TxApplyIf
  expect(sent.txes).toEqual([
    expect.objectContaining({
      objectId: execution._id,
      operations: { context: { __contextId: true, [firstInput]: 'new answer', [secondInput]: 'second answer' } }
    }),
    tx
  ])
  expect(execution.context).toEqual({ __contextId: true })
})

test('confirming a todo result submits the result and completion together', async () => {
  respond({ [todoResult]: 'answer' })
  const tx = factory.createTxUpdateDoc(todo._class, todo.space, todo._id, { doneOn: 1 })
  await ProcessMiddleware.create(client as Client).tx(tx)

  expect(sendTx).toHaveBeenCalledTimes(1)
  const sent = sendTx.mock.calls[0][0] as TxApplyIf
  expect(sent.txes).toEqual([
    expect.objectContaining({
      objectId: execution._id,
      operations: { context: { __contextId: true, [todoResult]: 'answer' } }
    }),
    tx
  ])
  expect(execution.context).toEqual({ __contextId: true })
})
