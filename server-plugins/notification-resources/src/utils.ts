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
import notification, {
  BaseNotificationType,
  CommonNotificationType,
  NotificationContent,
  NotificationProvider,
  NotificationType
} from '@hcengineering/notification'
import type { TriggerControl } from '@hcengineering/server-core'
import core, {
  Account,
  Class,
  Doc,
  DocumentUpdate,
  Hierarchy,
  matchQuery,
  MixinUpdate,
  Ref,
  Tx,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxUpdateDoc
} from '@hcengineering/core'
import serverNotification, {
  getPersonAccountById,
  HTMLPresenter,
  NotificationPresenter,
  TextPresenter
} from '@hcengineering/server-notification'
import { getResource, IntlString } from '@hcengineering/platform'
import contact, { formatName, Person, PersonAccount } from '@hcengineering/contact'
import { DocUpdateMessage } from '@hcengineering/activity'
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

async function findPersonForAccount (control: TriggerControl, personId: Ref<Person>): Promise<Person | undefined> {
  const persons = await control.findAll(contact.class.Person, { _id: personId })
  if (persons !== undefined && persons.length > 0) {
    return persons[0]
  }
  return undefined
}

export async function shouldNotifyCommon (
  control: TriggerControl,
  user: Ref<Account>,
  typeId: Ref<CommonNotificationType>
): Promise<NotifyResult> {
  const type = (await control.modelDb.findAll(notification.class.CommonNotificationType, { _id: typeId }))[0]

  const emailTypes: BaseNotificationType[] = []
  let allowed = false
  let push = false

  if (type === undefined) {
    return { allowed, emails: emailTypes, push }
  }

  if (await isAllowed(control, user as Ref<PersonAccount>, type._id, notification.providers.PlatformNotification)) {
    allowed = true
  }
  if (await isAllowed(control, user as Ref<PersonAccount>, type._id, notification.providers.BrowserNotification)) {
    push = true
  }
  if (await isAllowed(control, user as Ref<PersonAccount>, type._id, notification.providers.EmailNotification)) {
    emailTypes.push(type)
  }

  return { allowed, push, emails: emailTypes }
}

export async function isAllowed (
  control: TriggerControl,
  receiver: Ref<PersonAccount>,
  typeId: Ref<BaseNotificationType>,
  providerId: Ref<NotificationProvider>
): Promise<boolean> {
  const settings = await control.queryFind(notification.class.NotificationSetting, {})
  const setting = settings.find((p) => p.attachedTo === providerId && p.type === typeId && p.modifiedBy === receiver)
  if (setting !== undefined) {
    return setting.enabled
  }
  const type = (
    await control.modelDb.findAll(notification.class.BaseNotificationType, {
      _id: typeId
    })
  )[0]
  if (type === undefined) return false
  return type.providers[providerId] ?? false
}

export async function isShouldNotifyTx (
  control: TriggerControl,
  tx: TxCUD<Doc>,
  originTx: TxCUD<Doc>,
  object: Doc,
  user: Ref<Account>,
  isOwn: boolean,
  isSpace: boolean,
  docUpdateMessage?: DocUpdateMessage
): Promise<NotifyResult> {
  let allowed = false
  let push = false

  const emailTypes: NotificationType[] = []
  const types = await getMatchedTypes(
    control,
    tx,
    originTx,
    isOwn,
    isSpace,
    docUpdateMessage?.attributeUpdates?.attrKey
  )

  const personAccount = await getPersonAccountById(user, control)
  const modifiedAccount = await getPersonAccountById(tx.modifiedBy, control)

  for (const type of types) {
    if (
      type.allowedForAuthor !== true &&
      (tx.modifiedBy === user ||
        // Also check if we have different account for same user.
        (personAccount?.person !== undefined && personAccount?.person === modifiedAccount?.person))
    ) {
      continue
    }
    if (control.hierarchy.hasMixin(type, serverNotification.mixin.TypeMatch)) {
      const mixin = control.hierarchy.as(type, serverNotification.mixin.TypeMatch)
      if (mixin.func !== undefined) {
        const f = await getResource(mixin.func)
        const res = await f(tx, object, user, type, control)
        if (!res) continue
      }
    }
    if (await isAllowed(control, user as Ref<PersonAccount>, type._id, notification.providers.PlatformNotification)) {
      allowed = true
    }
    if (await isAllowed(control, user as Ref<PersonAccount>, type._id, notification.providers.BrowserNotification)) {
      push = true
    }
    if (await isAllowed(control, user as Ref<PersonAccount>, type._id, notification.providers.EmailNotification)) {
      emailTypes.push(type)
    }
  }
  return {
    allowed,
    push,
    emails: emailTypes
  }
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

  const notifyContexts = await control.findAll(notification.class.DocNotifyContext, { attachedTo: tx.objectId })

  return notifyContexts.map((value) =>
    control.txFactory.createTxUpdateDoc(value._class, value.space, value._id, { space: updateTx.operations.space })
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

async function getFallbackNotificationFullfillment (
  object: Doc,
  originTx: TxCUD<Doc>,
  control: TriggerControl,
  cache: Map<Ref<Doc>, Doc>
): Promise<NotificationContent> {
  const title: IntlString = notification.string.CommonNotificationTitle
  let body: IntlString = notification.string.CommonNotificationBody
  const intlParams: Record<string, string | number> = {}
  const intlParamsNotLocalized: Record<string, IntlString> = {}

  const textPresenter = getTextPresenter(object._class, control.hierarchy)
  if (textPresenter !== undefined) {
    const textPresenterFunc = await getResource(textPresenter.presenter)
    intlParams.title = await textPresenterFunc(object, control)
  }

  const account = control.modelDb.getObject(originTx.modifiedBy) as PersonAccount
  if (account !== undefined) {
    const senderPerson = (cache.get(account.person) as Person) ?? (await findPersonForAccount(control, account.person))
    if (senderPerson !== undefined) {
      intlParams.senderName = formatName(senderPerson.name, control.branding?.lastNameFirst)
      cache.set(senderPerson._id, senderPerson)
    }
  }

  const actualTx = TxProcessor.extractTx(originTx)
  if (actualTx._class === core.class.TxUpdateDoc) {
    const updateTx = actualTx as TxUpdateDoc<Doc>
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
  }

  return { title, body, intlParams, intlParamsNotLocalized }
}

function getNotificationPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): NotificationPresenter | undefined {
  return hierarchy.classHierarchyMixin(_class, serverNotification.mixin.NotificationPresenter)
}

export async function getNotificationContent (
  originTx: TxCUD<Doc>,
  targetUser: Ref<Account>,
  object: Doc,
  control: TriggerControl,
  cache: Map<Ref<Doc>, Doc> = new Map<Ref<Doc>, Doc>()
): Promise<NotificationContent> {
  let { title, body, intlParams, intlParamsNotLocalized } = await getFallbackNotificationFullfillment(
    object,
    originTx,
    control,
    cache
  )

  const actualTx = TxProcessor.extractTx(originTx)
  const notificationPresenter = getNotificationPresenter((actualTx as TxCUD<Doc>).objectClass, control.hierarchy)
  if (notificationPresenter !== undefined) {
    const getFuillfillmentParams = await getResource(notificationPresenter.presenter)
    const updateIntlParams = await getFuillfillmentParams(object, originTx, targetUser, control)
    title = updateIntlParams.title
    body = updateIntlParams.body
    intlParams = {
      ...intlParams,
      ...updateIntlParams.intlParams
    }
    if (updateIntlParams.intlParamsNotLocalized != null) {
      intlParamsNotLocalized = {
        ...intlParamsNotLocalized,
        ...updateIntlParams.intlParamsNotLocalized
      }
    }
  }

  const content: NotificationContent = {
    title,
    body,
    intlParams
  }

  if (intlParamsNotLocalized !== undefined) {
    content.intlParamsNotLocalized = intlParamsNotLocalized
  }

  return content
}
