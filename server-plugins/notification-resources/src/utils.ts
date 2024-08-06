//
// Copyright © 2023 Hardcore Engineering Inc.
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
import { Analytics } from '@hcengineering/analytics'
import contact, { formatName, PersonAccount } from '@hcengineering/contact'
import core, {
  Account,
  Class,
  Doc,
  DocumentUpdate,
  Hierarchy,
  matchQuery,
  MixinUpdate,
  Ref,
  toIdMap,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  type MeasureContext
} from '@hcengineering/core'
import notification, {
  BaseNotificationType,
  CommonNotificationType,
  NotificationContent,
  NotificationProvider,
  NotificationType
} from '@hcengineering/notification'
import { getResource, IntlString, translate } from '@hcengineering/platform'
import type { TriggerControl } from '@hcengineering/server-core'
import serverNotification, {
  getPersonAccountById,
  HTMLPresenter,
  NotificationPresenter,
  ReceiverInfo,
  SenderInfo,
  TextPresenter
} from '@hcengineering/server-notification'
import { ActivityMessage, DocUpdateMessage } from '@hcengineering/activity'

import { NotifyResult } from './types'

/**
 * @public
 */
export async function isUserEmployeeInFieldValue (
  _: Tx,
  doc: Doc,
  user: Ref<Account>,
  type: NotificationType,
  control: TriggerControl
): Promise<boolean> {
  if (type.field === undefined) return false
  const value = (doc as any)[type.field]
  if (value == null) return false
  const employee = (await control.modelDb.findAll(contact.class.PersonAccount, { _id: user as Ref<PersonAccount> }))[0]
  if (employee === undefined) return false
  if (Array.isArray(value)) {
    return value.includes(employee.person)
  } else {
    return value === employee.person
  }
}

/**
 * @public
 */
export async function isUserInFieldValue (
  _: Tx,
  doc: Doc,
  user: Ref<Account>,
  type: NotificationType
): Promise<boolean> {
  if (type.field === undefined) {
    return false
  }

  const value = (doc as any)[type.field]

  if (value === undefined) {
    return false
  }

  return Array.isArray(value) ? value.includes(user) : value === user
}

export function replaceAll (str: string, find: string, replace: string): string {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace)
}

function escapeRegExp (str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function shouldNotifyCommon (
  control: TriggerControl,
  user: Ref<Account>,
  typeId: Ref<CommonNotificationType>
): Promise<NotifyResult> {
  const type = (await control.modelDb.findAll(notification.class.CommonNotificationType, { _id: typeId }))[0]

  if (type === undefined) {
    return new Map()
  }

  const result = new Map<Ref<NotificationProvider>, BaseNotificationType[]>()
  const providers = await control.modelDb.findAll(notification.class.NotificationProvider, {})

  for (const provider of providers) {
    const allowed = await isAllowed(control, user as Ref<PersonAccount>, type, provider)
    if (allowed) {
      const cur = result.get(provider._id) ?? []
      result.set(provider._id, [...cur, type])
    }
  }

  return result
}

export async function isAllowed (
  control: TriggerControl,
  receiver: Ref<PersonAccount>,
  type: BaseNotificationType,
  provider: NotificationProvider
): Promise<boolean> {
  const providersSettings = await control.queryFind(notification.class.NotificationProviderSetting, {
    space: core.space.Workspace
  })
  const providerSetting = providersSettings.find(
    ({ attachedTo, modifiedBy }) => attachedTo === provider._id && modifiedBy === receiver
  )

  if (providerSetting !== undefined && !providerSetting.enabled) {
    return false
  }

  if (providerSetting === undefined && !provider.defaultEnabled) {
    return false
  }

  const providerDefaults = await control.modelDb.findAll(notification.class.NotificationProviderDefaults, {})

  if (providerDefaults.some((it) => it.provider === provider._id && it.ignoredTypes.includes(type._id))) {
    return false
  }

  const typesSettings = await control.queryFind(notification.class.NotificationTypeSetting, {})
  const setting = typesSettings.find(
    (it) => it.attachedTo === provider._id && it.type === type._id && it.modifiedBy === receiver
  )

  if (setting !== undefined) {
    return setting.enabled
  }

  if (providerDefaults.some((it) => it.provider === provider._id && it.enabledTypes.includes(type._id))) {
    return true
  }

  if (type === undefined) return false

  return type.defaultEnabled
}

export async function isShouldNotifyTx (
  control: TriggerControl,
  tx: TxCUD<Doc>,
  originTx: TxCUD<Doc>,
  object: Doc,
  user: PersonAccount,
  isOwn: boolean,
  isSpace: boolean,
  docUpdateMessage?: DocUpdateMessage
): Promise<NotifyResult> {
  const types = await getMatchedTypes(
    control,
    tx,
    originTx,
    isOwn,
    isSpace,
    docUpdateMessage?.attributeUpdates?.attrKey
  )
  const modifiedAccount = await getPersonAccountById(tx.modifiedBy, control)
  const result = new Map<Ref<NotificationProvider>, BaseNotificationType[]>()
  const providers = await control.modelDb.findAll(notification.class.NotificationProvider, {})

  for (const type of types) {
    if (
      type.allowedForAuthor !== true &&
      (tx.modifiedBy === user._id ||
        // Also check if we have different account for same user.
        (user?.person !== undefined && user?.person === modifiedAccount?.person))
    ) {
      continue
    }
    if (control.hierarchy.hasMixin(type, serverNotification.mixin.TypeMatch)) {
      const mixin = control.hierarchy.as(type, serverNotification.mixin.TypeMatch)
      if (mixin.func !== undefined) {
        const f = await getResource(mixin.func)
        const res = await f(tx, object, user._id, type, control)
        if (!res) continue
      }
    }
    for (const provider of providers) {
      const allowed = await isAllowed(control, user._id, type, provider)

      if (allowed) {
        const cur = result.get(provider._id) ?? []
        result.set(provider._id, [...cur, type])
      }
    }
  }

  return result
}

async function getMatchedTypes (
  control: TriggerControl,
  tx: TxCUD<Doc>,
  originTx: TxCUD<Doc>,
  isOwn: boolean,
  isSpace: boolean,
  field?: string
): Promise<NotificationType[]> {
  const allTypes = (
    await control.modelDb.findAll(notification.class.NotificationType, { ...(field !== undefined ? { field } : {}) })
  ).filter((p) => (isSpace ? p.spaceSubscribe === true : p.spaceSubscribe !== true))
  const filtered: NotificationType[] = []
  for (const type of allTypes) {
    if (isTypeMatched(control, type, tx, originTx, isOwn)) {
      filtered.push(type)
    }
  }

  return filtered
}

function isTypeMatched (
  control: TriggerControl,
  type: NotificationType,
  tx: TxCUD<Doc>,
  originTx: TxCUD<Doc>,
  isOwn: boolean
): boolean {
  const h = control.hierarchy
  const targetClass = h.getBaseClass(type.objectClass)
  if (type.onlyOwn === true && !isOwn) return false
  if (!type.txClasses.includes(tx._class)) return false
  if (!control.hierarchy.isDerived(h.getBaseClass(tx.objectClass), targetClass)) return false
  if (originTx._class === core.class.TxCollectionCUD && type.attachedToClass !== undefined) {
    if (!control.hierarchy.isDerived(h.getBaseClass(originTx.objectClass), h.getBaseClass(type.attachedToClass))) {
      return false
    }
  }
  if (type.field !== undefined) {
    if (tx._class === core.class.TxUpdateDoc) {
      if (!fieldUpdated(type.field, (tx as TxUpdateDoc<Doc>).operations)) return false
    }
    if (tx._class === core.class.TxMixin) {
      if (!fieldUpdated(type.field, (tx as TxMixin<Doc, Doc>).attributes)) return false
    }
  }
  if (type.txMatch !== undefined) {
    const res = matchQuery([tx], type.txMatch, tx._class, control.hierarchy, true)
    if (res.length === 0) return false
  }
  return true
}

function fieldUpdated (field: string, ops: DocumentUpdate<Doc> | MixinUpdate<Doc, Doc>): boolean {
  if ((ops as any)[field] !== undefined) return true
  if ((ops.$pull as any)?.[field] !== undefined) return true
  if ((ops.$push as any)?.[field] !== undefined) return true
  return false
}

export async function updateNotifyContextsSpace (
  control: TriggerControl,
  tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>
): Promise<Tx[]> {
  if (tx._class !== core.class.TxUpdateDoc) {
    return []
  }
  const updateTx = tx as TxUpdateDoc<Doc>

  if (updateTx.operations.space === undefined) {
    return []
  }

  const notifyContexts = await control.findAll(notification.class.DocNotifyContext, { objectId: tx.objectId })

  return notifyContexts.map((value) =>
    control.txFactory.createTxUpdateDoc(value._class, value.space, value._id, {
      objectSpace: updateTx.operations.space
    })
  )
}

export function isMixinTx (tx: TxCUD<Doc>): tx is TxMixin<Doc, Doc> {
  return tx._class === core.class.TxMixin
}

export function getHTMLPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): HTMLPresenter | undefined {
  return hierarchy.classHierarchyMixin(_class, serverNotification.mixin.HTMLPresenter)
}

export function getTextPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): TextPresenter | undefined {
  return hierarchy.classHierarchyMixin(_class, serverNotification.mixin.TextPresenter)
}

async function getSenderName (control: TriggerControl, sender: SenderInfo): Promise<string> {
  if (sender._id === core.account.System) {
    return await translate(core.string.System, {})
  }

  const { person } = sender

  if (person === undefined) {
    console.error('Cannot find person', { accountId: sender._id, person: sender.account?.person })
    Analytics.handleError(new Error(`Cannot find person ${sender.account?.person}`))

    return ''
  }

  return formatName(person.name, control.branding?.lastNameFirst)
}

async function getFallbackNotificationFullfillment (
  object: Doc,
  originTx: TxCUD<Doc>,
  control: TriggerControl,
  sender: SenderInfo,
  message?: ActivityMessage
): Promise<NotificationContent> {
  const title: IntlString = notification.string.CommonNotificationTitle
  let body: IntlString = notification.string.CommonNotificationBody
  let data: string | undefined

  const intlParams: Record<string, string | number> = {}
  const intlParamsNotLocalized: Record<string, IntlString> = {}

  const textPresenter = getTextPresenter(object._class, control.hierarchy)
  if (textPresenter !== undefined) {
    const textPresenterFunc = await getResource(textPresenter.presenter)
    intlParams.title = await textPresenterFunc(object, control)
  }

  if (message !== undefined) {
    const dataPresenter = getTextPresenter(message._class, control.hierarchy)

    if (dataPresenter !== undefined) {
      const textPresenterFunc = await getResource(dataPresenter.presenter)
      data = await textPresenterFunc(message, control)
    }
  }

  const tx = TxProcessor.extractTx(originTx)

  intlParams.senderName = await getSenderName(control, sender)

  if (tx._class === core.class.TxUpdateDoc) {
    const updateTx = tx as TxUpdateDoc<Doc>
    const attributes = control.hierarchy.getAllAttributes(object._class)
    for (const attrName in updateTx.operations) {
      if (!Object.prototype.hasOwnProperty.call(updateTx.operations, attrName)) {
        continue
      }

      const attr = attributes.get(attrName)
      if (attr !== null && attr !== undefined) {
        intlParamsNotLocalized.property = attr.label
        if (attr.type._class === core.class.TypeString) {
          body = notification.string.CommonNotificationChangedProperty
          intlParams.newValue = (updateTx.operations as any)[attrName]?.toString()
        } else {
          body = notification.string.CommonNotificationChanged
        }
      }
      break
    }
  } else if (originTx._class === core.class.TxCollectionCUD && tx._class === core.class.TxCreateDoc) {
    const createTx = tx as TxCreateDoc<Doc>
    const clazz = control.hierarchy.getClass(createTx.objectClass)
    const label = clazz.pluralLabel ?? clazz.label

    if (label !== undefined) {
      intlParamsNotLocalized.collection = clazz.pluralLabel ?? clazz.label
      body = notification.string.CommonNotificationCollectionAdded
    }
  } else if (originTx._class === core.class.TxCollectionCUD && tx._class === core.class.TxRemoveDoc) {
    const createTx = tx as TxRemoveDoc<Doc>
    const clazz = control.hierarchy.getClass(createTx.objectClass)
    const label = clazz.pluralLabel ?? clazz.label

    if (label !== undefined) {
      intlParamsNotLocalized.collection = clazz.pluralLabel ?? clazz.label
      body = notification.string.CommonNotificationCollectionRemoved
    }
  }

  return { title, body, data, intlParams, intlParamsNotLocalized }
}

function getNotificationPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): NotificationPresenter | undefined {
  return hierarchy.classHierarchyMixin(_class, serverNotification.mixin.NotificationPresenter)
}

export async function getNotificationContent (
  originTx: TxCUD<Doc>,
  targetUser: PersonAccount,
  sender: SenderInfo,
  object: Doc,
  control: TriggerControl,
  message?: ActivityMessage
): Promise<NotificationContent> {
  let { title, body, data, intlParams, intlParamsNotLocalized } = await getFallbackNotificationFullfillment(
    object,
    originTx,
    control,
    sender,
    message
  )

  const actualTx = TxProcessor.extractTx(originTx) as TxCUD<Doc>
  const notificationPresenter = getNotificationPresenter(actualTx.objectClass, control.hierarchy)

  if (notificationPresenter !== undefined) {
    const getFuillfillmentParams = await getResource(notificationPresenter.presenter)
    const updateParams = await getFuillfillmentParams(object, originTx, targetUser._id, control)
    title = updateParams.title
    body = updateParams.body
    data = updateParams?.data ?? data
    intlParams = {
      ...intlParams,
      ...updateParams.intlParams
    }
    if (updateParams.intlParamsNotLocalized != null) {
      intlParamsNotLocalized = {
        ...intlParamsNotLocalized,
        ...updateParams.intlParamsNotLocalized
      }
    }
  }

  const content: NotificationContent = {
    title,
    body,
    data,
    intlParams
  }

  if (intlParamsNotLocalized !== undefined) {
    content.intlParamsNotLocalized = intlParamsNotLocalized
  }

  return content
}

export async function getUsersInfo (
  ctx: MeasureContext,
  ids: Ref<PersonAccount>[],
  control: TriggerControl
): Promise<(ReceiverInfo | SenderInfo)[]> {
  const accounts = await control.modelDb.findAll(contact.class.PersonAccount, { _id: { $in: ids } })
  const personIds = accounts.map((it) => it.person)
  const accountById = toIdMap(accounts)
  const persons = toIdMap(
    await ctx.with(
      'find-persons',
      {},
      async () => await control.findAll(contact.class.Person, { _id: { $in: personIds } })
    )
  )
  const spaces = await ctx.with('find-person-spaces', {}, async () => {
    const res = await control.findAll(contact.class.PersonSpace, { person: { $in: personIds } })

    return new Map(res.map((s) => [s.person, s]))
  })

  return ids.map((_id) => {
    const account = accountById.get(_id)
    return {
      _id,
      account,
      person: account !== undefined ? persons.get(account.person) : undefined,
      space: account !== undefined ? spaces.get(account.person)?._id : undefined
    }
  })
}

export function toReceiverInfo (hierarchy: Hierarchy, info?: SenderInfo | ReceiverInfo): ReceiverInfo | undefined {
  if (info === undefined) return undefined
  if (info.person === undefined) return undefined
  if (info.account === undefined) return undefined
  if (!('space' in info)) return undefined
  if (info.space === undefined) return undefined

  const isEmployee = hierarchy.hasMixin(info.person, contact.mixin.Employee)
  if (!isEmployee) return undefined

  const employee = hierarchy.as(info.person, contact.mixin.Employee)
  if (!employee.active) return undefined

  return {
    _id: info._id,
    account: info.account,
    person: employee,
    space: info.space
  }
}
