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

import core, { createClient, TxFactory, TxOperations } from '@hcengineering/core'
import type { Client, Doc, Ref, TxCUD } from '@hcengineering/core'
import { LiveQuery } from '..'
import { connect } from './connection'
import { test as testModel } from './minmodel'
import type { AttachedComment } from './minmodel'

let storage: Client
let query: LiveQuery
let factory: TxOperations
const txFactory = new TxFactory(core.account.System)
let objectId: Ref<AttachedComment>

beforeEach(async () => {
  storage = await createClient(connect)
  query = new LiveQuery(storage)
  factory = new TxOperations(storage, core.account.System)
  objectId = await factory.addCollection(
    testModel.class.TestComment,
    core.space.Workspace,
    core.space.Workspace,
    core.class.Space,
    'comments',
    { message: 'Saved message' }
  )
})

afterEach(async () => {
  await query.close()
})

async function subscribe (id: Ref<AttachedComment> = objectId): Promise<jest.Mock> {
  const callback = jest.fn()
  await new Promise<void>((resolve) => {
    query.query(testModel.class.TestComment, { _id: id }, (docs) => {
      callback(docs)
      resolve()
    })
  })
  return callback
}

test('reissues saved results even when server values did not change', async () => {
  const callback = await subscribe()
  const original: AttachedComment = callback.mock.calls[0][0][0]
  original.message = 'Locally edited'
  const tx = txFactory.createTxUpdateDoc(testModel.class.TestComment, core.space.Workspace, objectId, {
    message: 'Attempted'
  })

  await query.refreshTransactions(tx)

  expect(callback).toHaveBeenCalledTimes(2)
  expect(callback.mock.calls[1][0][0]).toMatchObject({ _id: objectId, message: 'Saved message' })
  expect(callback.mock.calls[1][0][0]).not.toBe(original)
})

test('replaces optimistic data and document references with authoritative values', async () => {
  const callback = await subscribe()
  const tx = txFactory.createTxUpdateDoc(testModel.class.TestComment, core.space.Workspace, objectId, {
    message: 'Attempted'
  })
  tx.modifiedOn += 1000
  await query.tx(tx)
  expect(callback.mock.calls.at(-1)?.[0][0].message).toBe('Attempted')

  await query.refreshTransactions(tx)

  expect(callback.mock.calls.at(-1)?.[0][0].message).toBe('Saved message')
  expect(await query.findOne(testModel.class.TestComment, { _id: objectId })).toMatchObject({
    message: 'Saved message'
  })
})

test('does not reload subscriptions to another document', async () => {
  const other = await factory.addCollection(
    testModel.class.TestComment,
    core.space.Workspace,
    core.space.Workspace,
    core.class.Space,
    'comments',
    { message: 'Other message' }
  )
  const callback = await subscribe()
  const otherCallback = await subscribe(other)
  const tx = txFactory.createTxUpdateDoc(testModel.class.TestComment, core.space.Workspace, objectId, {
    message: 'Attempted'
  })

  await query.refreshTransactions(tx)

  expect(callback).toHaveBeenCalledTimes(2)
  expect(otherCallback).toHaveBeenCalledTimes(1)
})

test('deduplicates queries affected by nested transaction batches', async () => {
  const callback = await subscribe()
  const tx = txFactory.createTxUpdateDoc(testModel.class.TestComment, core.space.Workspace, objectId, {
    message: 'Attempted'
  })
  const inner = txFactory.createTxApplyIf(core.space.Tx, 'inner', [], [], [tx], undefined)
  const batch = txFactory.createTxApplyIf(
    core.space.Tx,
    'outer',
    [],
    [],
    [tx, inner as unknown as TxCUD<Doc>],
    undefined
  )

  await query.refreshTransactions(batch)

  expect(callback).toHaveBeenCalledTimes(2)
})

test('removes an optimistic creation from the subscribed list', async () => {
  const callback = jest.fn()
  await new Promise<void>((resolve) => {
    query.query(testModel.class.TestComment, {}, (docs) => {
      callback(docs)
      resolve()
    })
  })
  const tx = txFactory.createTxCreateDoc(testModel.class.TestComment, core.space.Workspace, {
    message: 'Not saved',
    attachedTo: core.space.Workspace,
    attachedToClass: core.class.Space,
    collection: 'comments'
  })
  await query.tx(tx)
  expect(callback.mock.calls.at(-1)?.[0]).toHaveLength(2)

  await query.refreshTransactions(tx)

  expect(callback.mock.calls.at(-1)?.[0]).toHaveLength(1)
  expect(callback.mock.calls.at(-1)?.[0][0]._id).toBe(objectId)
})

test('restores a document removed only from the local query', async () => {
  const callback = await subscribe()
  const tx = txFactory.createTxRemoveDoc(testModel.class.TestComment, core.space.Workspace, objectId)
  await query.tx(tx)
  expect(callback.mock.calls.at(-1)?.[0]).toHaveLength(0)

  await query.refreshTransactions(tx)

  expect(callback.mock.calls.at(-1)?.[0][0]).toMatchObject({ _id: objectId, message: 'Saved message' })
})

test('invalidates idle query caches so subsequent reads do not retain optimistic values', async () => {
  const tx = txFactory.createTxUpdateDoc(testModel.class.TestComment, core.space.Workspace, objectId, {
    message: 'Attempted'
  })
  await query.findOne(testModel.class.TestComment, { _id: objectId })
  tx.modifiedOn += 1000
  await query.tx(tx)
  expect(await query.findOne(testModel.class.TestComment, { _id: objectId })).toMatchObject({ message: 'Attempted' })

  await query.refreshTransactions(tx)

  expect(await query.findOne(testModel.class.TestComment, { _id: objectId })).toMatchObject({
    message: 'Saved message'
  })
})

test('refreshes lookup consumers when a referenced document was not updated', async () => {
  const child = await factory.addCollection(
    testModel.class.TestComment,
    core.space.Workspace,
    objectId,
    testModel.class.TestComment,
    'comments',
    { message: 'Child' }
  )
  const callback = jest.fn()
  await new Promise<void>((resolve) => {
    query.query(
      testModel.class.TestComment,
      { _id: child },
      (docs) => {
        callback(docs)
        resolve()
      },
      { lookup: { attachedTo: testModel.class.TestComment } }
    )
  })
  const tx = txFactory.createTxUpdateDoc(testModel.class.TestComment, core.space.Workspace, objectId, {
    message: 'Attempted'
  })
  tx.modifiedOn += 1000
  await query.tx(tx)
  await query.refreshTransactions(tx)

  expect(callback.mock.calls.at(-1)?.[0][0].$lookup.attachedTo.message).toBe('Saved message')
})
