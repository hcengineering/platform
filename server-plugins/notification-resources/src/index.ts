//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import chunter, { Backlink } from '@hcengineering/chunter'
import contact, { Employee, EmployeeAccount, formatName } from '@hcengineering/contact'
import core, {
  Account,
  AttachedDoc,
  Class,
  Data,
  Doc,
  generateId,
  Hierarchy,
  Obj,
  Ref,
  Space,
  Timestamp,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxFactory,
  TxProcessor
} from '@hcengineering/core'
import notification, {
  EmailNotification,
  NotificationAction,
  Notification,
  NotificationProvider,
  NotificationStatus,
  NotificationType
} from '@hcengineering/notification'
import { getResource } from '@hcengineering/platform'
import type { TriggerControl } from '@hcengineering/server-core'
import serverNotification, {
  HTMLPresenter,
  TextPresenter,
  createLastViewTx,
  getEmployeeAccount,
  getEmployeeAccountById,
  getUpdateLastViewTx,
  getEmployee
} from '@hcengineering/server-notification'
import { replaceAll } from './utils'
import { Content } from './types'

/**
 * @public
 */
export async function OnBacklinkCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const ptx = tx as TxCollectionCUD<Doc, Backlink>

  if (!checkTx(ptx, hierarchy)) return []

  const receiver = await getEmployeeAccount(ptx.objectId as Ref<Employee>, control)
  if (receiver === undefined) return []
  const sender = await getEmployeeAccountById(ptx.modifiedBy, control)
  if (sender === undefined) return []
  const backlink = getBacklink(ptx)
  const doc = await getBacklinkDoc(backlink, control)
  return await createNotificationTxes(
    control,
    ptx,
    notification.ids.MentionNotification,
    doc,
    sender,
    receiver,
    backlink.message
  )
}

function checkTx (ptx: TxCollectionCUD<Doc, Backlink>, hierarchy: Hierarchy): boolean {
  if (ptx._class !== core.class.TxCollectionCUD) {
    return false
  }

  if (
    ptx.tx._class !== core.class.TxCreateDoc ||
    !hierarchy.isDerived(ptx.tx.objectClass, chunter.class.Backlink) ||
    !hierarchy.isDerived(ptx.objectClass, contact.class.Employee)
  ) {
    return false
  }
  return true
}

async function isAllowed (
  control: TriggerControl,
  receiver: EmployeeAccount,
  providerId: Ref<NotificationProvider>
): Promise<boolean> {
  const setting = (
    await control.findAll(
      notification.class.NotificationSetting,
      {
        provider: providerId,
        type: notification.ids.MentionNotification,
        space: receiver._id as unknown as Ref<Space>
      },
      { limit: 1 }
    )
  )[0]
  if (setting !== undefined) {
    return setting.enabled
  }
  const provider = (
    await control.modelDb.findAll(notification.class.NotificationProvider, {
      _id: providerId
    })
  )[0]
  if (provider === undefined) return false
  return provider.default
}

async function getTextPart (doc: Doc, control: TriggerControl): Promise<string | undefined> {
  const TextPresenter = getTextPresenter(doc._class, control.hierarchy)
  if (TextPresenter === undefined) return
  return await (
    await getResource(TextPresenter.presenter)
  )(doc, control)
}

async function getHtmlPart (doc: Doc, control: TriggerControl): Promise<string | undefined> {
  const HTMLPresenter = getHTMLPresenter(doc._class, control.hierarchy)
  const htmlPart =
    HTMLPresenter !== undefined ? await (await getResource(HTMLPresenter.presenter))(doc, control) : undefined
  return htmlPart
}

function getHTMLPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): HTMLPresenter | undefined {
  let clazz: Ref<Class<Obj>> | undefined = _class
  while (clazz !== undefined) {
    const _class = hierarchy.getClass(clazz)
    const presenter = hierarchy.as(_class, serverNotification.mixin.HTMLPresenter)
    if (presenter.presenter != null) return presenter
    clazz = _class.extends
  }
}

function getTextPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): TextPresenter | undefined {
  let clazz: Ref<Class<Obj>> | undefined = _class
  while (clazz !== undefined) {
    const _class = hierarchy.getClass(clazz)
    const presenter = hierarchy.as(_class, serverNotification.mixin.TextPresenter)
    if (presenter.presenter != null) return presenter
    clazz = _class.extends
  }
}

function fillTemplate (template: string, sender: string, doc: string, data: string): string {
  let res = replaceAll(template, '{sender}', sender)
  res = replaceAll(res, '{doc}', doc)
  res = replaceAll(res, '{data}', data)
  return res
}

/**
 * @public
 */
export async function getContent (
  doc: Doc | undefined,
  sender: string,
  type: Ref<NotificationType>,
  control: TriggerControl,
  data: string
): Promise<Content | undefined> {
  if (doc === undefined) return
  const notificationType = control.modelDb.getObject(type)

  const textPart = await getTextPart(doc, control)
  if (textPart === undefined) return
  const text = fillTemplate(notificationType.textTemplate, sender, textPart, data)
  const htmlPart = await getHtmlPart(doc, control)
  const html = fillTemplate(notificationType.htmlTemplate, sender, htmlPart ?? textPart, data)
  const subject = fillTemplate(notificationType.subjectTemplate, sender, textPart, data)
  return {
    text,
    html,
    subject
  }
}

/**
 * @public
 */
export async function createNotificationTxes (
  control: TriggerControl,
  ptx: TxCollectionCUD<Doc, AttachedDoc>,
  type: Ref<NotificationType>,
  doc: Doc | undefined,
  sender: EmployeeAccount,
  receiver: EmployeeAccount,
  data: string = '',
  action?: NotificationAction
): Promise<Tx[]> {
  const res: Tx[] = []

  const senderName = formatName(sender.name)

  const content = await getContent(doc, senderName, type, control, data)

  if (await isAllowed(control, receiver, notification.ids.PlatformNotification)) {
    const target = await getEmployee(receiver.employee, control)
    if (target !== undefined) {
      const createNotificationTx = await getPlatformNotificationTx(
        ptx,
        type,
        control.txFactory,
        target,
        content?.text,
        action
      )

      res.push(createNotificationTx)
    }
  }

  if (content !== undefined && (await isAllowed(control, receiver, notification.ids.EmailNotification))) {
    const emailTx = await getEmailNotificationTx(ptx, senderName, content.text, content.html, content.subject, receiver)
    if (emailTx !== undefined) {
      res.push(emailTx)
    }
  }

  return res
}

async function getPlatformNotificationTx (
  ptx: TxCollectionCUD<Doc, AttachedDoc>,
  type: Ref<NotificationType>,
  txFactory: TxFactory,
  target: Employee,
  text?: string,
  action?: NotificationAction
): Promise<TxCollectionCUD<Doc, Notification>> {
  const createTx: TxCreateDoc<Notification> = {
    objectClass: notification.class.Notification,
    objectSpace: notification.space.Notifications,
    objectId: generateId(),
    modifiedOn: ptx.modifiedOn,
    modifiedBy: ptx.modifiedBy,
    space: ptx.space,
    _id: generateId(),
    _class: core.class.TxCreateDoc,
    attributes: {
      tx: ptx._id,
      status: NotificationStatus.New,
      type
    } as unknown as Data<Notification>
  }

  if (text !== undefined) {
    createTx.attributes.text = text
  }

  if (action !== undefined) {
    createTx.attributes.action = action
  }

  return txFactory.createTxCollectionCUD(target._class, target._id, target.space, 'notifications', createTx)
}

async function getEmailNotificationTx (
  ptx: TxCollectionCUD<Doc, AttachedDoc>,
  sender: string,
  text: string,
  html: string,
  subject: string,
  receiver: EmployeeAccount
): Promise<TxCreateDoc<EmailNotification> | undefined> {
  return {
    _id: generateId(),
    objectId: generateId(),
    _class: core.class.TxCreateDoc,
    space: core.space.DerivedTx,
    objectClass: notification.class.EmailNotification,
    objectSpace: notification.space.Notifications,
    modifiedOn: ptx.modifiedOn,
    modifiedBy: ptx.modifiedBy,
    attributes: {
      status: 'new',
      sender,
      receivers: [receiver.email],
      subject,
      text,
      html
    }
  }
}

async function getUpdateLastViewTxes (
  doc: Doc,
  _id: Ref<Doc>,
  _class: Ref<Class<Doc>>,
  modifiedOn: Timestamp,
  user: Ref<Account>,
  control: TriggerControl
): Promise<Tx[]> {
  const updatedUsers: Set<Ref<Account>> = new Set<Ref<Account>>()
  const result: Tx[] = []
  const tx = await getUpdateLastViewTx(control.findAll, _id, _class, modifiedOn, user)
  if (tx !== undefined) {
    updatedUsers.add(user)
    result.push(tx)
  }
  const docClass = control.hierarchy.getClass(doc._class)
  const anotherUserNotifications = control.hierarchy.as(docClass, notification.mixin.AnotherUserNotifications)
  for (const field of anotherUserNotifications?.fields ?? []) {
    const value = (doc as any)[field]
    if (value != null) {
      for (const employeeId of Array.isArray(value) ? value : [value]) {
        const account = (await control.modelDb.findAll(core.class.Account, { employee: employeeId }, { limit: 1 }))[0]
        if (account !== undefined) {
          if (updatedUsers.has(account._id)) continue
          const assigneeTx = await createLastViewTx(control.findAll, _id, _class, account._id)
          if (assigneeTx !== undefined) {
            updatedUsers.add(account._id)
            result.push(assigneeTx)
          }
        }
      }
    }
  }
  return result
}

/**
 * @public
 */
export async function UpdateLastView (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)
  if (![core.class.TxUpdateDoc, core.class.TxCreateDoc, core.class.TxMixin].includes(actualTx._class)) {
    return []
  }

  if ((actualTx as TxCUD<Doc>).objectClass === notification.class.LastView) {
    return []
  }

  const result: Tx[] = []

  switch (actualTx._class) {
    case core.class.TxCreateDoc: {
      const createTx = actualTx as TxCreateDoc<Doc>
      if (control.hierarchy.isDerived(createTx.objectClass, notification.class.LastView)) {
        return []
      }
      if (control.hierarchy.isDerived(createTx.objectClass, core.class.AttachedDoc)) {
        const doc = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<AttachedDoc>)
        const attachedTxes = await getUpdateLastViewTxes(
          doc,
          doc.attachedTo,
          doc.attachedToClass,
          createTx.modifiedOn,
          createTx.modifiedBy,
          control
        )
        const docClass = control.hierarchy.getClass(doc._class)
        if (!control.hierarchy.hasMixin(docClass, notification.mixin.LastViewAttached)) return attachedTxes
        const parentTxes = await getUpdateLastViewTxes(
          doc,
          doc._id,
          doc._class,
          createTx.modifiedOn,
          createTx.modifiedBy,
          control
        )
        return [...attachedTxes, ...parentTxes]
      } else {
        const doc = TxProcessor.createDoc2Doc(createTx)
        return await getUpdateLastViewTxes(doc, doc._id, doc._class, createTx.modifiedOn, createTx.modifiedBy, control)
      }
    }
    case core.class.TxUpdateDoc:
    case core.class.TxMixin: {
      const tx = actualTx as TxCUD<Doc>
      const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
      if (doc !== undefined) {
        return await getUpdateLastViewTxes(doc, doc._id, doc._class, tx.modifiedOn, tx.modifiedBy, control)
      }
      break
    }
    default:
      break
  }

  return result
}

function getBacklink (ptx: TxCollectionCUD<Doc, Backlink>): Backlink {
  return TxProcessor.createDoc2Doc(ptx.tx as TxCreateDoc<Backlink>)
}

async function getBacklinkDoc (backlink: Backlink, control: TriggerControl): Promise<Doc | undefined> {
  return (
    await control.findAll(
      backlink.backlinkClass,
      {
        _id: backlink.backlinkId
      },
      { limit: 1 }
    )
  )[0]
}

export * from './types'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnBacklinkCreate,
    UpdateLastView
  }
})
