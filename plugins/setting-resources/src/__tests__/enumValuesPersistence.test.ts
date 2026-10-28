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

import core, {
  type AccountUuid,
  AccountRole,
  ClassifierKind,
  type ClientConnection,
  createClient,
  DOMAIN_MODEL,
  type Enum,
  getCurrentAccount,
  setCurrentAccount,
  type Tx,
  TxFactory,
  TxOperations,
  type TxResult,
  type TxUpdateDoc
} from '@hcengineering/core'
import platform, {
  addEventListener,
  type IntlString,
  PlatformError,
  PlatformEvent,
  removeEventListener,
  Severity,
  Status
} from '@hcengineering/platform'
// Import the production boundary without loading unrelated Svelte components from the barrel.
import {
  OptimizeQueryMiddleware,
  PresentationPipelineImpl,
  updateDocWithError
} from '@hcengineering/presentation/src/pipeline'
import { addNotification } from '@hcengineering/ui'
import { ReadOnlyAccessMiddleware } from '@hcengineering/view-resources/src/middleware'
import { EnumValuesDraft } from '../enumValuesUtils'

// Keep the production pipeline and permission middleware. Only presentation/UI
// barrels, notification rendering and translation are isolated for the Node environment.
jest.mock('@hcengineering/presentation', () =>
  jest.requireActual<Record<string, unknown>>('@hcengineering/presentation/src/pipeline')
)
jest.mock('@hcengineering/platform', () => ({
  ...jest.requireActual<Record<string, unknown>>('@hcengineering/platform'),
  __esModule: true,
  translate: jest.fn(async (): Promise<string> => 'Permission warning')
}))
jest.mock('@hcengineering/ui', () => ({
  ...jest.requireActual<Record<string, unknown>>('@hcengineering/ui/src/components/notifications/NotificationSeverity'),
  addNotification: jest.fn()
}))
jest.mock('@hcengineering/theme', () => ({ getCurrentLanguage: (): string => 'en' }))
jest.mock('@hcengineering/view-resources/src/components/ReadOnlyNotification.svelte', () => ({}))
jest.mock('@hcengineering/view-resources/src/components/ForbiddenNotification.svelte', () => ({}))

function deferred (): {
  promise: Promise<TxResult>
  resolve: (value: TxResult) => void
  reject: (error: Error) => void
} {
  let complete: ((value: TxResult) => void) | undefined
  let fail: ((error: Error) => void) | undefined
  const promise = new Promise<TxResult>((resolve, reject) => {
    complete = resolve
    fail = reject
  })
  return {
    promise,
    resolve: (value) => {
      if (complete === undefined) throw new Error('Missing deferred resolver')
      complete(value)
    },
    reject: (error) => {
      if (fail === undefined) throw new Error('Missing deferred rejecter')
      fail(error)
    }
  }
}

async function persistenceFixture (
  transport: (tx: Tx) => Promise<TxResult>
): Promise<{ operations: TxOperations, value: Enum, modelValue: () => Enum }> {
  // Synthetic enum/class fixtures and controlled transport/query delivery, with
  // real core model application before transport and real middleware/pipeline errors.
  const connection = {
    tx: transport,
    loadModel: async (): Promise<Tx[]> => []
  } as unknown as ClientConnection
  const client = await createClient(async () => connection)
  const hierarchy = client.getHierarchy()
  const factory = new TxFactory(core.account.System)
  for (const ref of [core.class.Obj, core.class.Doc, core.class.Enum]) {
    hierarchy.tx(
      factory.createTxCreateDoc(
        core.class.Class,
        core.space.Model,
        {
          label: 'Test' as IntlString,
          kind: ClassifierKind.CLASS,
          extends: ref === core.class.Enum ? core.class.Doc : ref === core.class.Doc ? core.class.Obj : undefined,
          domain: DOMAIN_MODEL
        },
        ref
      )
    )
  }
  const value: Enum = {
    _id: 'enum' as Enum['_id'],
    _class: core.class.Enum,
    space: core.space.Model,
    modifiedBy: core.account.System,
    modifiedOn: 0,
    name: 'Example',
    enumValues: ['a', 'b']
  }
  client.getModel().addDoc(value)
  const pipeline = PresentationPipelineImpl.create(client, [
    (client, next) => OptimizeQueryMiddleware.create(client, next),
    (client, next) => ReadOnlyAccessMiddleware.create(client, next)
  ])
  const operations = new TxOperations(pipeline, core.account.System)
  return {
    operations,
    value: { ...value, enumValues: [...value.enumValues] },
    modelValue: () => {
      const stored = client.getModel().findObject<Enum>(value._id)
      if (stored === undefined) throw new Error('Missing enum in model')
      return stored
    }
  }
}

describe('enum persistence through the presentation failure boundary', () => {
  const statuses = jest.fn<Promise<void>, [string, Status]>().mockResolvedValue(undefined)
  const notifications = jest.mocked(addNotification)
  const previousAccount = getCurrentAccount()
  beforeEach(() => {
    statuses.mockClear()
    notifications.mockClear()
    // Synthetic account; changing its role exercises the real local permission branch.
    setCurrentAccount({
      uuid: 'test-account' as AccountUuid,
      primarySocialId: core.account.System,
      role: AccountRole.User,
      socialIds: [],
      fullSocialIds: []
    })
    addEventListener(PlatformEvent, statuses)
  })
  afterEach(() => {
    removeEventListener(PlatformEvent, statuses)
    setCurrentAccount(previousAccount)
  })

  it.each([
    ['transport', 'before'],
    ['transport', 'after'],
    ['transport', 'none'],
    ['connection closed', 'before'],
    ['connection closed', 'after'],
    ['connection closed', 'none'],
    ['permission', 'before'],
    ['permission', 'after'],
    ['permission', 'none']
  ])('retries an unchanged edit after %s failure with query echo=%s', async (failure, echo) => {
    const entered = deferred()
    const response = deferred()
    const transport = jest
      .fn<Promise<TxResult>, [Tx]>()
      .mockImplementationOnce(async () => {
        entered.resolve({})
        return await response.promise
      })
      .mockResolvedValue({})
    const { operations, value, modelValue } = await persistenceFixture(transport)
    const update = async (value: Enum, changes: { enumValues: string[] }): Promise<TxResult> =>
      await updateDocWithError(operations, value, changes)
    const draft = new EnumValuesDraft()
    draft.sync(value.enumValues)
    draft.beginEdit()
    draft.values[1] = 'renamed'
    const saving = draft.save({ update }, value)
    const error =
      failure === 'transport'
        ? new Error('Write failed')
        : new PlatformError(
          new Status(
            Severity.ERROR,
            failure === 'permission' ? platform.status.Forbidden : platform.status.ConnectionClosed,
            {}
          )
        )
    const rejected = expect(saving).rejects.toBe(error)
    await entered.promise
    // The real core model has changed even though transport has not succeeded.
    expect(modelValue().enumValues).toEqual(['a', 'renamed'])
    if (echo === 'before') {
      value.enumValues = [...modelValue().enumValues]
      draft.sync(value.enumValues)
    }
    response.reject(error)
    await rejected
    expect(draft.needsRetry).toBe(true)
    // Permission denials are reported by the notification and the inline alert, not the status bar.
    expect(statuses).toHaveBeenCalledTimes(failure === 'transport' ? 1 : 0)
    expect(notifications).toHaveBeenCalledTimes(failure === 'permission' ? 1 : 0)
    if (echo === 'after') {
      value.enumValues = [...modelValue().enumValues]
      draft.sync(value.enumValues)
    }
    expect(draft.values).toEqual(['a', 'renamed'])

    // No different label, model rollback, or reload is needed to retry.
    // The controlled transport accepts the next attempt, simulating restored server access.
    await draft.save({ update }, value)
    expect(draft.needsRetry).toBe(false)
    expect(transport).toHaveBeenCalledTimes(2)
    for (const [tx] of transport.mock.calls) {
      expect((tx as TxUpdateDoc<Enum>).operations).toEqual({ enumValues: ['a', 'renamed'] })
    }
    value.enumValues = [...modelValue().enumValues]
    draft.sync(value.enumValues)
    await draft.save({ update }, value)
    expect(transport).toHaveBeenCalledTimes(2)
  })

  it('retries unchanged text after a local read-only denial and role restoration', async () => {
    const transport = jest.fn<Promise<TxResult>, [Tx]>().mockResolvedValue({})
    const { operations, value, modelValue } = await persistenceFixture(transport)
    const update = async (value: Enum, changes: { enumValues: string[] }): Promise<TxResult> =>
      await updateDocWithError(operations, value, changes)
    setCurrentAccount({ ...getCurrentAccount(), role: AccountRole.ReadOnlyGuest })
    const draft = new EnumValuesDraft()
    draft.sync(value.enumValues)
    draft.beginEdit()
    draft.values[1] = 'renamed'
    await expect(draft.save({ update }, value)).rejects.toMatchObject({
      status: { code: platform.status.Forbidden }
    })
    expect(draft.needsRetry).toBe(true)
    expect(draft.values).toEqual(['a', 'renamed'])
    expect(transport).not.toHaveBeenCalled()
    // Local denial precedes the core model; there is no optimistic query echo here.
    expect(modelValue().enumValues).toEqual(['a', 'b'])
    expect(notifications).toHaveBeenCalledTimes(1)
    expect(notifications.mock.calls[0]?.[5]).toBe('readOnlyNotification')
    expect(statuses).not.toHaveBeenCalled()

    setCurrentAccount({ ...getCurrentAccount(), role: AccountRole.User })
    await draft.save({ update }, value)
    expect(draft.needsRetry).toBe(false)
    expect(transport).toHaveBeenCalledTimes(1)
    expect((transport.mock.calls[0]?.[0] as TxUpdateDoc<Enum>).operations).toEqual({
      enumValues: ['a', 'renamed']
    })
    value.enumValues = [...modelValue().enumValues]
    draft.sync(value.enumValues)
    await draft.save({ update }, value)
    expect(transport).toHaveBeenCalledTimes(1)
    expect(notifications).toHaveBeenCalledTimes(1)
  })

  it('keeps a failed later edit across an earlier acknowledgement and active typing', async () => {
    const firstEntered = deferred()
    const secondEntered = deferred()
    const firstResponse = deferred()
    const secondResponse = deferred()
    const transport = jest
      .fn<Promise<TxResult>, [Tx]>()
      .mockImplementationOnce(async () => {
        firstEntered.resolve({})
        return await firstResponse.promise
      })
      .mockImplementationOnce(async () => {
        secondEntered.resolve({})
        return await secondResponse.promise
      })
      .mockResolvedValue({})
    const { operations, value } = await persistenceFixture(transport)
    const update = async (value: Enum, changes: { enumValues: string[] }): Promise<TxResult> =>
      await updateDocWithError(operations, value, changes)
    const draft = new EnumValuesDraft()
    draft.sync(value.enumValues)
    draft.beginEdit()
    draft.values[1] = 'first'
    const first = draft.save({ update }, value)
    await firstEntered.promise
    draft.beginEdit()
    draft.values[1] = 'second'
    const second = draft.save({ update }, value)
    const rejected = expect(second).rejects.toThrow('Write failed')
    await secondEntered.promise
    draft.beginEdit()
    draft.values[0] = 'typing'
    secondResponse.reject(new Error('Write failed'))
    await rejected
    value.enumValues = ['a', 'first']
    draft.sync(value.enumValues)
    firstResponse.resolve({})
    await first
    expect(draft.needsRetry).toBe(true)
    expect(draft.values).toEqual(['typing', 'second'])

    // Cancel only the unsubmitted typing, retaining the failed later save for retry.
    draft.endEdit(value.enumValues)
    expect(draft.values).toEqual(['a', 'second'])
    await draft.save({ update }, value)
    expect(transport).toHaveBeenCalledTimes(3)
    expect((transport.mock.calls[2]?.[0] as TxUpdateDoc<Enum>).operations).toEqual({ enumValues: ['a', 'second'] })
  })

  it('adopts a divergent delivered update after failure rather than retrying stale values', async () => {
    const transport = jest.fn<Promise<TxResult>, [Tx]>().mockRejectedValue(new Error('Write failed'))
    const { operations, value } = await persistenceFixture(transport)
    const update = async (value: Enum, changes: { enumValues: string[] }): Promise<TxResult> =>
      await updateDocWithError(operations, value, changes)
    const draft = new EnumValuesDraft()
    draft.sync(value.enumValues)
    draft.beginEdit()
    draft.values[1] = 'renamed'
    await expect(draft.save({ update }, value)).rejects.toThrow('Write failed')
    value.enumValues = ['a', 'remote']
    draft.sync(value.enumValues)
    expect(draft.values).toEqual(['a', 'remote'])
    expect(draft.needsRetry).toBe(false)
    await draft.save({ update }, value)
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['before', 'submit'],
    ['after', 'submit'],
    ['before', 'cancel'],
    ['after', 'cancel']
  ])('discards superseded retry state with delivery %s rejection and %s', async (delivery, finish) => {
    const entered = deferred()
    const response = deferred()
    const transport = jest.fn<Promise<TxResult>, [Tx]>().mockImplementation(async () => {
      entered.resolve({})
      return await response.promise
    })
    const { operations, value } = await persistenceFixture(transport)
    const update = async (value: Enum, changes: { enumValues: string[] }): Promise<TxResult> =>
      await updateDocWithError(operations, value, changes)
    const draft = new EnumValuesDraft()
    draft.sync(value.enumValues)
    draft.beginEdit()
    draft.values[1] = 'local'
    const saving = draft.save({ update }, value)
    const rejected = expect(saving).rejects.toThrow('Write failed')
    await entered.promise
    draft.beginEdit()
    draft.values[0] = 'typing'
    if (delivery === 'before') {
      value.enumValues = ['a', 'remote']
      draft.sync(value.enumValues)
    }
    response.reject(new Error('Write failed'))
    await rejected
    expect(draft.needsRetry).toBe(delivery === 'after')
    if (delivery === 'after') {
      value.enumValues = ['a', 'remote']
      draft.sync(value.enumValues)
    }
    expect(draft.values).toEqual(['typing', 'local'])
    if (finish === 'submit') {
      expect(draft.finishEdit(value.enumValues)).toEqual({ error: 'conflict' })
    } else {
      draft.endEdit(value.enumValues)
    }
    expect(draft.values).toEqual(['a', 'remote'])
    expect(draft.needsRetry).toBe(false)
    expect(await draft.save({ update }, value)).toEqual({ values: ['a', 'remote'] })
    expect(draft.needsRetry).toBe(false)
    expect(transport).toHaveBeenCalledTimes(1)
    expect((transport.mock.calls[0]?.[0] as TxUpdateDoc<Enum>).operations).toEqual({ enumValues: ['a', 'local'] })
  })

  it.each(['transport', 'connection closed', 'permission'])(
    'preserves ordinary presentation handling for %s errors',
    async (failure) => {
      const error =
        failure === 'transport'
          ? new Error('Write failed')
          : new PlatformError(
            new Status(
              Severity.ERROR,
              failure === 'permission' ? platform.status.Forbidden : platform.status.ConnectionClosed,
              {}
            )
          )
      const transport = jest.fn<Promise<TxResult>, [Tx]>().mockRejectedValue(error)
      const { operations, value } = await persistenceFixture(transport)
      await expect(operations.update(value, { enumValues: ['a', 'renamed'] })).resolves.toEqual({})
      expect(statuses).toHaveBeenCalledTimes(failure === 'transport' ? 1 : 0)
      expect(notifications).toHaveBeenCalledTimes(failure === 'permission' ? 1 : 0)
      expect(transport).toHaveBeenCalledTimes(1)
    }
  )

  it('preserves ordinary notification/resolve behavior for local read-only denial', async () => {
    const transport = jest.fn<Promise<TxResult>, [Tx]>().mockResolvedValue({})
    const { operations, value, modelValue } = await persistenceFixture(transport)
    setCurrentAccount({ ...getCurrentAccount(), role: AccountRole.ReadOnlyGuest })
    await expect(operations.update(value, { enumValues: ['a', 'renamed'] })).resolves.toEqual({})
    expect(transport).not.toHaveBeenCalled()
    expect(modelValue().enumValues).toEqual(['a', 'b'])
    expect(notifications).toHaveBeenCalledTimes(1)
    expect(notifications.mock.calls[0]?.[5]).toBe('readOnlyNotification')
    expect(statuses).not.toHaveBeenCalled()
  })
})
