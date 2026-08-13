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

import { type Employee, type PersonSpace } from '@hcengineering/contact'
import core, {
  TxFactory,
  type AccountUuid,
  type Class,
  type Doc,
  type PersonId,
  type Ref,
  type Space,
  type Tx,
  type TxCreateDoc,
  type TxCUD
} from '@hcengineering/core'
import notification, {
  type CommonInboxNotification,
  type DocNotifyContext,
  type InboxNotification,
  type NotificationProvider,
  type NotificationType
} from '@hcengineering/notification'
import { type TriggerControl } from '@hcengineering/server-core'
import { type ReceiverInfo, type SenderInfo } from '@hcengineering/server-notification'

import { getCommonNotificationTxes, pushInboxNotifications } from '../index'
import { AvailableProvidersCacheKey, type AvailableProvidersCache, type NotifyResult } from '../types'
import { NotificationProviderControl, isShouldNotifyTx } from '../utils'

// Wire ids, not imported symbols: this package depends on neither
// @hcengineering/time nor the fork's model-matrix, and adding a package
// dependency to a test is a worse trade than a literal. Same convention the
// fork's `_huly/models/matrix/src/notificationTypes.ts` documents.
const TODO_CREATED = 'time:ids:ToDoCreated' as Ref<NotificationType>
const PROJECT_TODO = 'time:class:ProjectToDo' as Ref<Class<Doc>>
const DM_NOTIFICATION = 'chunter:ids:DMNotification' as Ref<NotificationType>
const MATRIX_PROVIDER = 'matrix:providers:MatrixNotificationProvider' as Ref<NotificationProvider>
const MATRIX_NEW_MESSAGE = 'matrix:ids:NewMessageNotification' as Ref<NotificationType>

const RECEIVER: ReceiverInfo = {
  account: 'account-clay' as AccountUuid,
  employee: 'employee-clay' as Ref<Employee>,
  role: 'USER',
  socialIds: ['social-clay' as PersonId],
  space: 'personspace-clay' as Ref<PersonSpace>
}

const SENDER: SenderInfo = { socialId: 'social-bot' as PersonId }

const OBJECT_ID = 'todo-parent-issue' as Ref<Doc>
const OBJECT_CLASS = 'tracker:class:Issue' as Ref<Class<Doc>>
const OBJECT_SPACE = 'space-project' as Ref<Space>

/** A pre-existing context, so the writer never takes the create-context branch. */
const CONTEXT: DocNotifyContext = {
  _id: 'ctx-1' as Ref<DocNotifyContext>,
  _class: notification.class.DocNotifyContext,
  space: RECEIVER.space,
  objectId: OBJECT_ID,
  objectClass: OBJECT_CLASS,
  objectSpace: OBJECT_SPACE,
  user: RECEIVER.account,
  isPinned: false,
  hidden: false,
  modifiedOn: 1,
  modifiedBy: SENDER.socialId
} as unknown as DocNotifyContext

interface Harness {
  control: TriggerControl
  contextCache: Map<string, any>
}

function harness (): Harness {
  const contextCache = new Map<string, any>()
  const control = {
    ctx: { contextData: { broadcast: { txes: [] } } },
    txes: [],
    txFactory: new TxFactory(SENDER.socialId),
    contextCache,
    cache: new Map(),
    removedMap: new Map(),
    findAll: async () => [CONTEXT],
    apply: async () => {}
  } as unknown as TriggerControl

  return { control, contextCache }
}

const measure = { contextData: { broadcast: { txes: [] } } } as any

async function commonTxes (control: TriggerControl, notifyResult: NotifyResult): Promise<Tx[]> {
  return await getCommonNotificationTxes(
    measure,
    control,
    { _id: OBJECT_ID, _class: OBJECT_CLASS, space: OBJECT_SPACE } as unknown as Doc,
    { header: 'time:string:ToDo' as any },
    RECEIVER,
    SENDER,
    OBJECT_ID,
    OBJECT_CLASS,
    OBJECT_SPACE,
    1,
    notifyResult,
    notification.class.CommonInboxNotification
  )
}

function created (txes: Tx[]): TxCreateDoc<CommonInboxNotification> {
  const tx = txes.find(
    (it) =>
      it._class === core.class.TxCreateDoc &&
      (it as TxCreateDoc<Doc>).objectClass === notification.class.CommonInboxNotification
  )
  expect(tx).toBeDefined()
  return tx as TxCreateDoc<CommonInboxNotification>
}

function cacheOf (h: Harness): AvailableProvidersCache {
  return h.contextCache.get(AvailableProvidersCacheKey) ?? new Map()
}

describe('getCommonNotificationTxes carries the matched types', () => {
  it('stamps the ToDo type onto the notification it creates', async () => {
    const h = harness()
    const notifyResult: NotifyResult = new Map([
      [notification.providers.InboxNotificationProvider, [{ _id: TODO_CREATED } as NotificationType]],
      [MATRIX_PROVIDER, [{ _id: TODO_CREATED } as NotificationType]]
    ])

    const txes = await commonTxes(h.control, notifyResult)

    expect(created(txes).attributes.types).toEqual([TODO_CREATED])
  })

  it('publishes the allowed providers so the messenger triggers can see the notification', async () => {
    const h = harness()
    const notifyResult: NotifyResult = new Map([
      [notification.providers.InboxNotificationProvider, [{ _id: TODO_CREATED } as NotificationType]],
      [MATRIX_PROVIDER, [{ _id: TODO_CREATED } as NotificationType]]
    ])

    const txes = await commonTxes(h.control, notifyResult)
    const notificationTx = created(txes)

    // Consumers look the entry up by the notification's own _id, which is the
    // create tx's objectId — the same key `getNotificationTxes` writes.
    expect(cacheOf(h).get(notificationTx.objectId as Ref<InboxNotification>)).toEqual([
      notification.providers.InboxNotificationProvider,
      MATRIX_PROVIDER
    ])
  })

  it('does not invent a type for a genuinely typeless notification', async () => {
    const h = harness()
    const notifyResult: NotifyResult = new Map([[notification.providers.InboxNotificationProvider, []]])

    const txes = await commonTxes(h.control, notifyResult)

    expect(created(txes).attributes.types).toEqual([])
  })

  it('leaves a type out of the cache for a provider that did not allow it', async () => {
    // The §16.2.2 loop-breaker shape: matrix's own NewMessageNotification is in
    // the matrix provider's ignoredTypes, so isAllowed drops the provider and
    // it must not reappear in the cache.
    const h = harness()
    const notifyResult: NotifyResult = new Map([
      [notification.providers.InboxNotificationProvider, [{ _id: MATRIX_NEW_MESSAGE } as NotificationType]]
    ])

    const txes = await commonTxes(h.control, notifyResult)
    const providers = cacheOf(h).get(created(txes).objectId as Ref<InboxNotification>)

    expect(providers).toEqual([notification.providers.InboxNotificationProvider])
    expect(providers).not.toContain(MATRIX_PROVIDER)
  })

  it('still writes nothing at all when the inbox provider is absent', async () => {
    const h = harness()
    const notifyResult: NotifyResult = new Map([[MATRIX_PROVIDER, [{ _id: TODO_CREATED } as NotificationType]]])

    const txes = await commonTxes(h.control, notifyResult)

    expect(txes).toEqual([])
    expect(h.contextCache.get(AvailableProvidersCacheKey)).toBeUndefined()
  })
})

describe('the activity path is unchanged', () => {
  it('keeps writing the types it is handed', async () => {
    // The shape pushActivityInboxNotifications passes through for the
    // issue-activity and DM/Thread paths that already worked.
    const h = harness()
    const res: Tx[] = []

    await pushInboxNotifications(
      measure,
      h.control,
      res,
      RECEIVER,
      SENDER,
      OBJECT_ID,
      OBJECT_CLASS,
      OBJECT_SPACE,
      [CONTEXT],
      {},
      notification.class.ActivityInboxNotification,
      1,
      [DM_NOTIFICATION],
      true
    )

    expect((res[0] as TxCreateDoc<InboxNotification>).attributes.types).toEqual([DM_NOTIFICATION])
  })
})

// ————— the hypothesis this fix had to disprove —————
//
// The 2026-08-13 report blamed `getMatchedTypes` for attributing no type to a
// ToDo's bare TxCreateDoc. It does attribute one; the type was being dropped
// afterwards. These cases pin the matcher so the wrong suspect stays ruled out.

interface ModelStub {
  types: NotificationType[]
  providers: NotificationProvider[]
  defaults: Array<{
    provider: Ref<NotificationProvider>
    ignoredTypes: Array<Ref<NotificationType>>
    enabledTypes: Array<Ref<NotificationType>>
  }>
}

function matcherControl (model: ModelStub): TriggerControl {
  return {
    modelDb: {
      findAllSync: (_class: Ref<Class<Doc>>) => {
        if (_class === notification.class.NotificationType) return model.types
        if (_class === notification.class.NotificationProvider) return model.providers
        if (_class === notification.class.NotificationProviderDefaults) return model.defaults
        return []
      }
    },
    hierarchy: {
      getBaseClass: (c: Ref<Class<Doc>>) => c,
      isDerived: (a: Ref<Class<Doc>>, b: Ref<Class<Doc>>) => a === b,
      hasMixin: () => false
    }
  } as unknown as TriggerControl
}

const todoCreatedType = {
  _id: TODO_CREATED,
  _class: notification.class.NotificationType,
  txClasses: [core.class.TxCreateDoc],
  objectClass: PROJECT_TODO,
  onlyOwn: true,
  allowedForAuthor: true,
  defaultEnabled: false
} as unknown as NotificationType

const matrixProvider = {
  _id: MATRIX_PROVIDER,
  _class: notification.class.NotificationProvider,
  defaultEnabled: true
} as unknown as NotificationProvider

const todoCreateTx = {
  _class: core.class.TxCreateDoc,
  objectClass: PROJECT_TODO,
  objectId: 'todo-1' as Ref<Doc>,
  modifiedBy: SENDER.socialId
} as unknown as TxCUD<Doc>

describe('getMatchedTypes on a bare ToDo TxCreateDoc', () => {
  it('matches the ToDo type when the matrix provider enables it', async () => {
    const control = matcherControl({
      types: [todoCreatedType],
      providers: [matrixProvider],
      defaults: [{ provider: MATRIX_PROVIDER, ignoredTypes: [], enabledTypes: [TODO_CREATED] }]
    })

    const result = await isShouldNotifyTx(
      control,
      todoCreateTx,
      { _id: 'todo-1' } as unknown as Doc,
      RECEIVER,
      true,
      false,
      new NotificationProviderControl([], [])
    )

    expect(result.get(MATRIX_PROVIDER)?.map((it) => it._id)).toEqual([TODO_CREATED])
  })

  it('drops the type when the provider ignores it, so filtering still governs delivery', async () => {
    const control = matcherControl({
      types: [todoCreatedType],
      providers: [matrixProvider],
      defaults: [{ provider: MATRIX_PROVIDER, ignoredTypes: [TODO_CREATED], enabledTypes: [] }]
    })

    const result = await isShouldNotifyTx(
      control,
      todoCreateTx,
      { _id: 'todo-1' } as unknown as Doc,
      RECEIVER,
      true,
      false,
      new NotificationProviderControl([], [])
    )

    expect(result.has(MATRIX_PROVIDER)).toBe(false)
  })

  it('drops the type when it is neither enabled nor defaultEnabled', async () => {
    const control = matcherControl({
      types: [todoCreatedType],
      providers: [matrixProvider],
      defaults: [{ provider: MATRIX_PROVIDER, ignoredTypes: [], enabledTypes: [] }]
    })

    const result = await isShouldNotifyTx(
      control,
      todoCreateTx,
      { _id: 'todo-1' } as unknown as Doc,
      RECEIVER,
      true,
      false,
      new NotificationProviderControl([], [])
    )

    expect(result.has(MATRIX_PROVIDER)).toBe(false)
  })
})
