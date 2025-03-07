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
import activity, { ActivityMessage, DocUpdateMessage } from '@hcengineering/activity'
import { Analytics } from '@hcengineering/analytics'
import chunter, { ChatMessage } from '@hcengineering/chunter'
import contact, { Employee, formatName, includesAny, Person } from '@hcengineering/contact'
import core, {
  PersonId,
  Class,
  concatLink,
  Doc,
  DocumentUpdate,
  groupByArray,
  Hierarchy,
  Markup,
  matchQuery,
  MixinUpdate,
  Ref,
  Space,
  Tx,
  TxCUD,
  TxMixin,
  TxUpdateDoc,
  type MeasureContext,
  AccountUuid
} from '@hcengineering/core'
import notification, {
  BaseNotificationType,
  Collaborators,
  CommonNotificationType,
  NotificationContent,
  notificationId,
  NotificationProvider,
  NotificationType,
  type NotificationProviderSetting,
  type NotificationTypeSetting
} from '@hcengineering/notification'
import { getMetadata, getResource, IntlString, translate } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import {
  getPersonsBySocialIds,
  getEmployeesBySocialIds,
  getSocialStringsByPersons,
  getPerson
} from '@hcengineering/server-contact'
import serverNotification, {
  HTMLPresenter,
  NotificationPresenter,
  ReceiverInfo,
  SenderInfo,
  TextPresenter
} from '@hcengineering/server-notification'
import serverView from '@hcengineering/server-view'
import { encodeObjectURI } from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'

import { NotifyResult } from './types'

/**
 * @public
 */
export function isUserEmployeeInFieldValueTypeMatch (
  _: Tx,
  doc: Doc,
  person: Person,
  socialIds: PersonId[],
  type: NotificationType,
  control: TriggerControl
): boolean {
  // TODO: check field type and compare with Ref<Person> or PersonId based on that
  if (type.field === undefined) return false
  const value = (doc as any)[type.field]
  if (value == null) return false

  if (Array.isArray(value)) {
    return includesAny(value, socialIds)
  } else {
    return socialIds.includes(value)
  }
}

/**
 * @public
 */
export function isUserInFieldValueTypeMatch (_: Tx, doc: Doc, user: PersonId[], type: NotificationType): boolean {
  if (type.field === undefined) {
    return false
  }

  const value = (doc as any)[type.field]

  if (value === undefined) {
    return false
  }

  return Array.isArray(value) ? user.some((it) => value.includes(it)) : user.includes(value)
}

export function replaceAll (str: string, find: string, replace: string): string {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace)
}

function escapeRegExp (str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function shouldNotifyCommon (
  control: TriggerControl,
  user: PersonId[],
  typeId: Ref<CommonNotificationType>,
  notificationControl: NotificationProviderControl
): Promise<NotifyResult> {
  const type = (await control.modelDb.findAll(notification.class.CommonNotificationType, { _id: typeId }))[0]

  if (type === undefined) {
    return new Map()
  }

  const result = new Map<Ref<NotificationProvider>, BaseNotificationType[]>()
  const providers = await control.modelDb.findAll(notification.class.NotificationProvider, {})

  for (const provider of providers) {
    const allowed = isAllowed(control, user, type, provider, notificationControl)

    if (allowed) {
      const cur = result.get(provider._id) ?? []
      result.set(provider._id, [...cur, type])
    }
  }

  return result
}

export function isAllowed (
  control: TriggerControl,
  receiver: PersonId[],
  type: BaseNotificationType,
  provider: NotificationProvider,
  notificationControl: NotificationProviderControl
): boolean {
  const providerSettings = (notificationControl.byProvider.get(provider._id) ?? []).filter(({ createdBy }) =>
    createdBy !== undefined ? receiver.includes(createdBy) : false
  )

  if (providerSettings.length > 0 && providerSettings.every((s) => !s.enabled)) {
    return false
  }

  if (providerSettings.length === 0 && !provider.defaultEnabled) {
    return false
  }

  const providerDefaults = control.modelDb.findAllSync(notification.class.NotificationProviderDefaults, {})

  if (providerDefaults.some((it) => it.provider === provider._id && it.ignoredTypes.includes(type._id))) {
    return false
  }

  const setting = (notificationControl.settingsByProvider.get(provider._id) ?? []).find(
    (it) => it.type === type._id && it.createdBy !== undefined && receiver.includes(it.createdBy)
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
  object: Doc,
  personIds: PersonId[],
  isOwn: boolean,
  isSpace: boolean,
  notificationControl: NotificationProviderControl,
  docUpdateMessage?: DocUpdateMessage
): Promise<NotifyResult> {
  const types = getMatchedTypes(control, tx, isOwn, isSpace, docUpdateMessage?.attributeUpdates?.attrKey)
  const modifiedByPersonId = tx.modifiedBy
  const result = new Map<Ref<NotificationProvider>, BaseNotificationType[]>()
  let providers: NotificationProvider[] = control.modelDb.findAllSync(notification.class.NotificationProvider, {})

  if (getMetadata(serverNotification.metadata.InboxOnlyNotifications) === true) {
    providers = providers.filter((it) => it._id === notification.providers.InboxNotificationProvider)
  }

  for (const type of types) {
    if (type.allowedForAuthor !== true && personIds.includes(modifiedByPersonId)) {
      continue
    }

    if (control.hierarchy.hasMixin(type, serverNotification.mixin.TypeMatch)) {
      const mixin = control.hierarchy.as(type, serverNotification.mixin.TypeMatch)
      if (mixin.func !== undefined) {
        const f = await getResource(mixin.func)
        const person = await getPerson(control, personIds[0])
        if (person === undefined) continue
        let res = f(tx, object, person, personIds, type, control)
        if (res instanceof Promise) {
          res = await res
        }
        if (!res) continue
      }
    }
    for (const provider of providers) {
      const allowed = isAllowed(control, personIds, type, provider, notificationControl)

      if (allowed) {
        const cur = result.get(provider._id) ?? []
        result.set(provider._id, [...cur, type])
      }
    }
  }

  return result
}

function getMatchedTypes (
  control: TriggerControl,
  tx: TxCUD<Doc>,
  isOwn: boolean,
  isSpace: boolean,
  field?: string
): NotificationType[] {
  const allTypes = control.modelDb
    .findAllSync(notification.class.NotificationType, { ...(field !== undefined ? { field } : {}) })
    .filter((p) => (isSpace ? p.spaceSubscribe === true : p.spaceSubscribe !== true))
  const filtered: NotificationType[] = []
  for (const type of allTypes) {
    if (isTypeMatched(control, type, tx, isOwn)) {
      filtered.push(type)
    }
  }

  return filtered
}

function isTypeMatched (control: TriggerControl, type: NotificationType, tx: TxCUD<Doc>, isOwn: boolean): boolean {
  const h = control.hierarchy
  const targetClass = h.getBaseClass(type.objectClass)
  if (type.onlyOwn === true && !isOwn) return false
  if (!type.txClasses.includes(tx._class)) return false
  if (!control.hierarchy.isDerived(h.getBaseClass(tx.objectClass), targetClass)) return false
  if (tx.attachedToClass !== undefined && type.attachedToClass !== undefined) {
    if (!control.hierarchy.isDerived(h.getBaseClass(tx.attachedToClass), h.getBaseClass(type.attachedToClass))) {
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
  ctx: MeasureContext,
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

  const notifyContexts = await control.findAll(ctx, notification.class.DocNotifyContext, { objectId: tx.objectId })

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
  if (sender._id === core.account.System || sender._id === core.account.ConfigUser) {
    return await translate(core.string.System, {})
  }

  const { person } = sender

  if (person === undefined) {
    console.error('Cannot find person', { accountId: sender._id })
    Analytics.handleError(new Error(`Cannot find person ${sender._id}`))

    return ''
  }

  return formatName(person.name, control.branding?.lastNameFirst)
}

async function getFallbackNotificationFullfillment (
  object: Doc,
  originTx: TxCUD<Doc>,
  control: TriggerControl,
  sender: SenderInfo
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

  intlParams.senderName = await getSenderName(control, sender)

  if (originTx._class === core.class.TxUpdateDoc) {
    const updateTx = originTx as TxUpdateDoc<Doc>
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
  } else if (originTx.attachedToClass !== undefined && originTx._class === core.class.TxCreateDoc) {
    const clazz = control.hierarchy.getClass(originTx.objectClass)
    const label = clazz.pluralLabel ?? clazz.label

    if (label !== undefined) {
      intlParamsNotLocalized.collection = clazz.pluralLabel ?? clazz.label
      body = notification.string.CommonNotificationCollectionAdded
    }
  } else if (originTx.attachedToClass !== undefined && originTx._class === core.class.TxRemoveDoc) {
    const clazz = control.hierarchy.getClass(originTx.objectClass)
    const label = clazz.pluralLabel ?? clazz.label

    if (label !== undefined) {
      intlParamsNotLocalized.collection = clazz.pluralLabel ?? clazz.label
      body = notification.string.CommonNotificationCollectionRemoved
    }
  }

  return { title, body, intlParams, intlParamsNotLocalized }
}

function getNotificationPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): NotificationPresenter | undefined {
  return hierarchy.classHierarchyMixin(_class, serverNotification.mixin.NotificationPresenter)
}

export async function getNotificationContent (
  originTx: TxCUD<Doc>,
  socialIds: PersonId[],
  sender: SenderInfo,
  object: Doc,
  control: TriggerControl
): Promise<NotificationContent> {
  let { title, body, intlParams, intlParamsNotLocalized } = await getFallbackNotificationFullfillment(
    object,
    originTx,
    control,
    sender
  )

  let data: Markup | undefined

  const notificationPresenter = getNotificationPresenter(originTx.objectClass, control.hierarchy)

  if (notificationPresenter !== undefined) {
    const getFuillfillmentParams = await getResource(notificationPresenter.presenter)
    const updateParams = await getFuillfillmentParams(object, originTx, socialIds[0], control)
    title = updateParams.title
    body = updateParams.body
    data = updateParams.data
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
  ids: PersonId[],
  control: TriggerControl
): Promise<Map<PersonId, ReceiverInfo | SenderInfo>> {
  if (ids.length === 0) return new Map()

  const employeesBySocialId = await getEmployeesBySocialIds(control, ids)
  const presentEmployeeIds = Object.values(employeesBySocialId)
    .map((it) => it?._id)
    .filter((it) => it !== undefined)
  const missingSocialIds = Object.entries(employeesBySocialId)
    .filter(([, employee]) => employee === undefined)
    .map(([id]) => id as PersonId)
  const personsBySocialId = await getPersonsBySocialIds(control, missingSocialIds)

  const employeesIds = new Set(presentEmployeeIds)
  const spaces = (await control.findAll(ctx, contact.class.PersonSpace, {})).filter((it) =>
    employeesIds.has(it.person as Ref<Employee>)
  )
  const spacesByEmployee = groupByArray(spaces, (it) => it.person)

  const persons = [...presentEmployeeIds, ...Object.values(personsBySocialId).map((it) => it._id)]

  const socialStringsByPersons = await getSocialStringsByPersons(control, persons as Ref<Person>[])

  return new Map(
    ids.map((_id) => {
      const employee = employeesBySocialId[_id]
      const space = employee !== undefined ? spacesByEmployee.get(employee._id)?.[0] : undefined
      const person = employee ?? personsBySocialId[_id]
      const socialStrings = socialStringsByPersons[person?._id] ?? []

      return [
        _id,
        {
          _id,
          person,
          socialStrings,
          space: space?._id,
          account: employee?.personUuid,
          employee
        }
      ]
    })
  )
}

export function toReceiverInfo (hierarchy: Hierarchy, info?: SenderInfo | ReceiverInfo): ReceiverInfo | undefined {
  if (info === undefined) return undefined
  if (info.person === undefined) return undefined
  if (!('space' in info)) return undefined
  if (info.space === undefined) return undefined

  const isEmployee = hierarchy.hasMixin(info.person, contact.mixin.Employee)
  if (!isEmployee) return undefined

  const employee = hierarchy.as(info.person, contact.mixin.Employee)
  if (!employee.active || employee.personUuid == null) return undefined

  return {
    _id: info._id,
    person: employee,
    space: info.space,
    socialStrings: info.socialStrings,
    account: employee.personUuid,
    employee
  }
}

export function createPushCollaboratorsTx (
  control: TriggerControl,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  space: Ref<Space>,
  collaborators: AccountUuid[]
): TxMixin<Doc, Collaborators> {
  return control.txFactory.createTxMixin(objectId, objectClass, space, notification.mixin.Collaborators, {
    $push: {
      collaborators: {
        $each: collaborators,
        $position: 0
      }
    }
  })
}

export function createPullCollaboratorsTx (
  control: TriggerControl,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  space: Ref<Space>,
  collaborators: AccountUuid[]
): TxMixin<Doc, Collaborators> {
  return control.txFactory.createTxMixin(objectId, objectClass, space, notification.mixin.Collaborators, {
    $pull: { collaborators: { $in: collaborators } }
  })
}

export async function getNotificationLink (
  control: TriggerControl,
  doc: Doc,
  message?: Ref<ActivityMessage>
): Promise<string> {
  const linkProviders = control.modelDb.findAllSync(serverView.mixin.ServerLinkIdProvider, {})
  const provider = linkProviders.find(({ _id }) => _id === doc._class)

  let id: string = doc._id

  if (provider !== undefined) {
    const encodeFn = await getResource(provider.encode)

    id = await encodeFn(doc, control)
  }

  let thread: string | undefined

  if (control.hierarchy.isDerived(doc._class, activity.class.ActivityMessage)) {
    const id = (doc as ActivityMessage)._id

    if (message === undefined) {
      message = id
    } else {
      thread = id
    }
  }

  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = [workbenchId, control.workspace.url, notificationId, encodeObjectURI(id, doc._class), thread]
    .filter((x): x is string => x !== undefined)
    .map((p) => encodeURIComponent(p))
    .join('/')

  const link = concatLink(front, path)

  return message !== undefined ? `${link}?message=${message}` : link
}

export async function messageToMarkup (control: TriggerControl, message: ActivityMessage): Promise<string | undefined> {
  const { hierarchy } = control
  if (hierarchy.isDerived(message._class, chunter.class.ChatMessage)) {
    const chatMessage = message as ChatMessage
    return chatMessage.message
  } else {
    const resource = getTextPresenter(message._class, control.hierarchy)

    if (resource !== undefined) {
      const fn = await getResource(resource.presenter)
      const textData = await fn(message, control)
      if (textData !== undefined && textData !== '') {
        return textData
      }
    }
  }

  return undefined
}
export class NotificationProviderControl {
  public byProvider: Map<Ref<NotificationProvider>, NotificationProviderSetting[]>
  public settingsByProvider: Map<Ref<NotificationProvider>, NotificationTypeSetting[]>
  constructor (
    readonly providersSettings: NotificationProviderSetting[],
    readonly typesSettings: NotificationTypeSetting[]
  ) {
    this.byProvider = groupByArray(providersSettings, (it) => it.attachedTo)
    this.settingsByProvider = groupByArray(typesSettings, (it) => it.attachedTo)
  }
}
const notificationProvidersKey = 'notification_provider_settings'
const typesSettingsKey = 'notification_type_settings'
export async function getNotificationProviderControl (
  ctx: MeasureContext,
  control: TriggerControl
): Promise<NotificationProviderControl> {
  let providersSettings: NotificationProviderSetting[] = control.contextCache.get(notificationProvidersKey)
  if (providersSettings === undefined) {
    providersSettings = await control.queryFind(ctx, notification.class.NotificationProviderSetting, {
      space: core.space.Workspace
    })
    control.contextCache.set(notificationProvidersKey, providersSettings)
  }
  let typesSettings: NotificationTypeSetting[] = control.contextCache.get(typesSettingsKey)
  if (typesSettings === undefined) {
    typesSettings = await control.queryFind(ctx, notification.class.NotificationTypeSetting, {
      space: core.space.Workspace
    })
    control.contextCache.set(typesSettingsKey, typesSettings)
  }
  return new NotificationProviderControl(providersSettings, typesSettings)
}

export async function getObjectSpace (control: TriggerControl, doc: Doc, cache: Map<Ref<Doc>, Doc>): Promise<Space> {
  return control.hierarchy.isDerived(doc._class, core.class.Space)
    ? (doc as Space)
    : (cache.get(doc.space) as Space) ??
        (await control.findAll<Space>(control.ctx, core.class.Space, { _id: doc.space }, { limit: 1 }))[0]
}

export function isReactionMessage (message?: ActivityMessage): boolean {
  return (
    message !== undefined &&
    message._class === activity.class.DocUpdateMessage &&
    (message as DocUpdateMessage).objectClass === activity.class.Reaction
  )
}
