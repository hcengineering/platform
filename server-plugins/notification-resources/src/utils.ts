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
import contact, { formatName, PersonAccount, type Person, type PersonSpace } from '@hcengineering/contact'
import core, {
  Account,
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
  toIdMap,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  type IdMap,
  type MeasureContext,
  type WithLookup
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
import serverNotification, {
  getPersonAccountById,
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
  user: Ref<Account>[],
  type: NotificationType,
  control: TriggerControl
): boolean {
  if (type.field === undefined) return false
  const value = (doc as any)[type.field]
  if (value == null) return false
  const employee = control.modelDb.findAllSync(contact.class.PersonAccount, { _id: user[0] as Ref<PersonAccount> })[0]
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
export function isUserInFieldValueTypeMatch (_: Tx, doc: Doc, user: Ref<Account>[], type: NotificationType): boolean {
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
  user: Ref<Account>[],
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
    const allowed = user.some((user) =>
      isAllowed(control, user as Ref<PersonAccount>, type, provider, notificationControl)
    )
    if (allowed) {
      const cur = result.get(provider._id) ?? []
      result.set(provider._id, [...cur, type])
    }
  }

  return result
}

export function isAllowed (
  control: TriggerControl,
  receiver: Ref<PersonAccount>,
  type: BaseNotificationType,
  provider: NotificationProvider,
  notificationControl: NotificationProviderControl
): boolean {
  const providerSetting = (notificationControl.byProvider.get(provider._id) ?? []).find(
    ({ createdBy }) => createdBy === receiver
  )

  if (providerSetting !== undefined && !providerSetting.enabled) {
    return false
  }

  if (providerSetting === undefined && !provider.defaultEnabled) {
    return false
  }

  const providerDefaults = control.modelDb.findAllSync(notification.class.NotificationProviderDefaults, {})

  if (providerDefaults.some((it) => it.provider === provider._id && it.ignoredTypes.includes(type._id))) {
    return false
  }
  const setting = (notificationControl.settingsByProvider.get(provider._id) ?? []).find(
    (it) => it.type === type._id && it.createdBy === receiver
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
  user: PersonAccount[],
  isOwn: boolean,
  isSpace: boolean,
  notificationControl: NotificationProviderControl,
  docUpdateMessage?: DocUpdateMessage
): Promise<NotifyResult> {
  const types = getMatchedTypes(control, tx, originTx, isOwn, isSpace, docUpdateMessage?.attributeUpdates?.attrKey)
  const modifiedAccount = getPersonAccountById(tx.modifiedBy, control)
  const result = new Map<Ref<NotificationProvider>, BaseNotificationType[]>()
  let providers: NotificationProvider[] = control.modelDb.findAllSync(notification.class.NotificationProvider, {})

  if (process.env.NOTIFY_INBOX_ONLY === 'true') {
    providers = providers.filter((it) => it._id === notification.providers.InboxNotificationProvider)
  }

  for (const type of types) {
    if (
      type.allowedForAuthor !== true &&
      (user.some((it) => tx.modifiedBy === it._id) ||
        // Also check if we have different account for same user.
        (user?.[0].person !== undefined && user?.[0]?.person === modifiedAccount?.person))
    ) {
      continue
    }
    if (control.hierarchy.hasMixin(type, serverNotification.mixin.TypeMatch)) {
      const mixin = control.hierarchy.as(type, serverNotification.mixin.TypeMatch)
      if (mixin.func !== undefined) {
        const f = await getResource(mixin.func)
        const res = f(
          tx,
          object,
          user.map((it) => it._id),
          type,
          control
        )
        if (!res) continue
      }
    }
    for (const provider of providers) {
      const allowed = user.some((it) => isAllowed(control, it._id, type, provider, notificationControl))

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
  originTx: TxCUD<Doc>,
  isOwn: boolean,
  isSpace: boolean,
  field?: string
): NotificationType[] {
  const allTypes = control.modelDb
    .findAllSync(notification.class.NotificationType, { ...(field !== undefined ? { field } : {}) })
    .filter((p) => (isSpace ? p.spaceSubscribe === true : p.spaceSubscribe !== true))
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

  return { title, body, intlParams, intlParamsNotLocalized }
}

function getNotificationPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): NotificationPresenter | undefined {
  return hierarchy.classHierarchyMixin(_class, serverNotification.mixin.NotificationPresenter)
}

export async function getNotificationContent (
  originTx: TxCUD<Doc>,
  targetUser: PersonAccount[],
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

  const actualTx = TxProcessor.extractTx(originTx) as TxCUD<Doc>
  const notificationPresenter = getNotificationPresenter(actualTx.objectClass, control.hierarchy)

  if (notificationPresenter !== undefined) {
    const getFuillfillmentParams = await getResource(notificationPresenter.presenter)
    const updateParams = await getFuillfillmentParams(object, originTx, targetUser[0]._id, control)
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
  ids: Ref<PersonAccount>[],
  control: TriggerControl
): Promise<Map<Ref<Account>, ReceiverInfo | SenderInfo>> {
  if (ids.length === 0) return new Map()
  const accounts = control.modelDb.findAllSync(contact.class.PersonAccount, { _id: { $in: ids } })

  const personIds = accounts.map((it) => it.person)
  const personIdsMap = new Set(personIds)
  const accountById = toIdMap(accounts)
  const persons: IdMap<WithLookup<Person>> = new Map()
  const spaces = new Map<Ref<Person>, PersonSpace>()

  const p = await ctx.with('find-persons', {}, async (ctx) =>
    (await control.queryFind(ctx, contact.mixin.Employee, { active: { $in: [true, false] } }, {})).filter((it) =>
      personIdsMap.has(it._id)
    )
  )
  for (const pp of p) {
    persons.set(pp._id, pp)
  }

  const nonEmployee = personIds.filter((it) => !persons.has(it))

  const p2 = await ctx.with('find-persons', {}, async (ctx) =>
    (await control.queryFind(ctx, contact.class.Person, { _id: { $in: Array.from(nonEmployee) } }, {})).filter((it) =>
      personIdsMap.has(it._id)
    )
  )
  for (const pp of p2) {
    persons.set(pp._id, pp)
  }

  const res = await ctx.with('find-person-spaces', {}, async (ctx) =>
    (await control.queryFind(ctx, contact.class.PersonSpace, {}, {})).filter((it) => personIdsMap.has(it.person))
  )
  for (const r of res) {
    spaces.set(r.person, r)
  }

  return new Map(
    ids.map((_id) => {
      const account = accountById.get(_id)
      return [
        _id,
        {
          _id,
          account,
          person: account !== undefined ? persons.get(account.person) : undefined,
          space: account !== undefined ? spaces.get(account.person)?._id : undefined
        }
      ]
    })
  )
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

export function createPushCollaboratorsTx (
  control: TriggerControl,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  space: Ref<Space>,
  collaborators: Ref<Account>[]
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
  collaborators: Ref<Account>[]
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
  const path = [workbenchId, control.workspace.workspaceUrl, notificationId, encodeObjectURI(id, doc._class), thread]
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
