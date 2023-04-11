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
  AnyAttribute,
  ArrOf,
  AttachedDoc,
  Class,
  Doc,
  DocumentUpdate,
  Hierarchy,
  MixinUpdate,
  Ref,
  RefTo,
  Space,
  Timestamp,
  Tx,
  TxCUD,
  TxCollectionCUD,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  generateId
} from '@hcengineering/core'
import notification, {
  ClassCollaborators,
  Collaborators,
  DocUpdates,
  EmailNotification,
  LastView,
  NotificationProvider,
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
  getUpdateLastViewTx
} from '@hcengineering/server-notification'
import { Content } from './types'
import { replaceAll } from './utils'

/**
 * @public
 */
export async function OnBacklinkCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  const ptx = tx as TxCollectionCUD<Doc, Backlink>
  let res: Tx[] = []

  if (!checkTx(ptx, hierarchy)) return []

  const receiver = await getEmployeeAccount(ptx.objectId as Ref<Employee>, control)
  if (receiver === undefined) return []

  const sender = await getEmployeeAccountById(ptx.modifiedBy, control)
  if (sender === undefined) return []
  const backlink = getBacklink(ptx)
  const doc = await getBacklinkDoc(backlink, control)
  if (doc !== undefined) {
    const collab = hierarchy.as(doc, notification.mixin.Collaborators)
    if (!collab.collaborators.includes(receiver._id)) {
      const collabTx = control.txFactory.createTxMixin(
        doc._id,
        doc._class,
        doc.space,
        notification.mixin.Collaborators,
        {
          $push: {
            collaborators: receiver._id
          }
        }
      )
      res.push(collabTx)
    }
  }
  const notifyTx = await createNotificationTxes(
    control,
    ptx,
    notification.ids.MentionNotification,
    doc,
    sender,
    receiver,
    backlink.message
  )
  res = [...res, ...notifyTx]
  return res
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
  return hierarchy.classHierarchyMixin(_class, serverNotification.mixin.HTMLPresenter)
}

function getTextPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): TextPresenter | undefined {
  return hierarchy.classHierarchyMixin(_class, serverNotification.mixin.TextPresenter)
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
  data: string = ''
): Promise<Tx[]> {
  const res: Tx[] = []

  const senderName = formatName(sender.name)

  const content = await getContent(doc, senderName, type, control, data)

  if (content !== undefined && (await isAllowed(control, receiver, notification.ids.EmailNotification))) {
    const emailTx = await getEmailNotificationTx(ptx, senderName, content.text, content.html, content.subject, receiver)
    if (emailTx !== undefined) {
      res.push(emailTx)
    }
  }

  return res
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
  const tx = await getUpdateLastViewTx(control.findAll, _id, modifiedOn, user)
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
        const account = await getEmployeeAccount(employeeId, control)
        if (account !== undefined) {
          if (updatedUsers.has(account._id)) continue
          const assigneeTx = await createLastViewTx(control.findAll, _id, account._id)
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
  if (
    ![core.class.TxUpdateDoc, core.class.TxCreateDoc, core.class.TxMixin, core.class.TxRemoveDoc].includes(
      actualTx._class
    )
  ) {
    return []
  }

  if ((actualTx as TxCUD<Doc>).objectClass === notification.class.LastView) {
    return []
  }

  const result: Tx[] = []

  switch (actualTx._class) {
    case core.class.TxCreateDoc: {
      const createTx = actualTx as TxCreateDoc<Doc>
      if (control.hierarchy.isDerived(createTx.objectClass, core.class.AttachedDoc)) {
        const doc = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<AttachedDoc>)
        if (control.hierarchy.classHierarchyMixin(doc.attachedToClass, notification.mixin.TrackedDoc) !== undefined) {
          const attachedTxes = await getUpdateLastViewTxes(
            doc,
            doc.attachedTo,
            doc.attachedToClass,
            createTx.modifiedOn,
            createTx.modifiedBy,
            control
          )
          result.push(...attachedTxes)
        }
      }
      if (control.hierarchy.classHierarchyMixin(createTx.objectClass, notification.mixin.TrackedDoc) !== undefined) {
        const doc = TxProcessor.createDoc2Doc(createTx)
        const parentTxes = await getUpdateLastViewTxes(
          doc,
          doc._id,
          doc._class,
          createTx.modifiedOn,
          createTx.modifiedBy,
          control
        )
        result.push(...parentTxes)
      }
      return result
    }
    case core.class.TxUpdateDoc:
    case core.class.TxMixin: {
      const tx = actualTx as TxCUD<Doc>
      if (control.hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.TrackedDoc) !== undefined) {
        const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
        if (doc !== undefined) {
          return await getUpdateLastViewTxes(doc, doc._id, doc._class, tx.modifiedOn, tx.modifiedBy, control)
        }
      }
      break
    }
    case core.class.TxRemoveDoc: {
      const tx = actualTx as TxCUD<Doc>
      const lastViews = await control.findAll(notification.class.LastView, { [tx.objectId]: { $exists: true } })
      for (const lastView of lastViews) {
        const clearTx = control.txFactory.createTxUpdateDoc(lastView._class, lastView.space, lastView._id, {
          $unset: {
            [tx.objectId]: ''
          }
        })
        result.push(clearTx)
      }
      return result
    }
    default:
      break
  }

  return result
}

/**
 * @public
 */
export async function OnUpdateLastView (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx) as TxUpdateDoc<LastView>
  if (actualTx._class !== core.class.TxUpdateDoc) return []
  if (actualTx.objectClass !== notification.class.LastView) return []
  const result: Tx[] = []
  const lastView = (await control.findAll(notification.class.LastView, { _id: actualTx.objectId }))[0]
  if (lastView === undefined) return result
  for (const key in actualTx.operations) {
    const docs = await control.findAll(notification.class.DocUpdates, {
      attachedTo: key as Ref<Doc>,
      user: lastView.user
    })
    for (const doc of docs) {
      const txes = doc.txes.filter((p) => p[1] > actualTx.operations[key])
      result.push(
        control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
          txes
        })
      )
    }
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

async function getValueCollaborators (value: any, attr: AnyAttribute, control: TriggerControl): Promise<Ref<Account>[]> {
  const hierarchy = control.hierarchy
  if (attr.type._class === core.class.RefTo) {
    const to = (attr.type as RefTo<Doc>).to
    if (hierarchy.isDerived(to, contact.class.Employee)) {
      const acc = await getEmployeeAccount(value, control)
      return acc !== undefined ? [acc._id] : []
    } else if (hierarchy.isDerived(to, core.class.Account)) {
      const acc = await getEmployeeAccountById(value, control)
      return acc !== undefined ? [acc._id] : []
    }
  } else if (attr.type._class === core.class.ArrOf) {
    const arrOf = (attr.type as ArrOf<RefTo<Doc>>).of
    if (arrOf._class === core.class.RefTo) {
      const to = (arrOf as RefTo<Doc>).to
      if (hierarchy.isDerived(to, contact.class.Employee)) {
        const employeeAccounts = await control.modelDb.findAll(contact.class.EmployeeAccount, {
          employee: { $in: Array.isArray(value) ? value : [value] }
        })
        return employeeAccounts.map((p) => p._id)
      } else if (hierarchy.isDerived(to, core.class.Account)) {
        const employeeAccounts = await control.modelDb.findAll(contact.class.EmployeeAccount, {
          _id: { $in: Array.isArray(value) ? value : [value] }
        })
        return employeeAccounts.map((p) => p._id)
      }
    }
  }
  return []
}

async function getKeyCollaborators (
  doc: Doc,
  value: any,
  field: string,
  control: TriggerControl
): Promise<Ref<Account>[] | undefined> {
  if (value !== undefined && value !== null) {
    const attr = control.hierarchy.findAttribute(doc._class, field)
    if (attr !== undefined) {
      return await getValueCollaborators(value, attr, control)
    }
  }
}

/**
 * @public
 */
export async function getDocCollaborators (
  doc: Doc,
  mixin: ClassCollaborators,
  control: TriggerControl
): Promise<Ref<Account>[]> {
  const collaborators: Set<Ref<Account>> = new Set()
  for (const field of mixin.fields) {
    const value = (doc as any)[field]
    const newCollaborators = await getKeyCollaborators(doc, value, field, control)
    if (newCollaborators !== undefined) {
      for (const newCollaborator of newCollaborators) {
        collaborators.add(newCollaborator)
      }
    }
  }
  return Array.from(collaborators.values())
}

async function createCollabDocInfo (
  collaborators: Ref<Account>[],
  tx: TxCUD<Doc>,
  objectId: Ref<Doc>,
  objectClass: Ref<Class<Doc>>,
  control: TriggerControl,
  txId?: Ref<TxCUD<Doc>>
): Promise<TxCUD<DocUpdates>[]> {
  const res: TxCUD<DocUpdates>[] = []
  const targets = new Set(collaborators)
  const docs = await control.findAll(notification.class.DocUpdates, { attachedTo: objectId })
  for (const doc of docs) {
    if (tx.modifiedBy === doc.user || !targets.delete(doc.user)) continue
    res.push(
      control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
        $push: {
          txes: [txId ?? tx._id, tx.modifiedOn]
        }
      })
    )
    res.push(
      control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
        lastTx: txId ?? tx._id,
        lastTxTime: tx.modifiedOn,
        hidden: false
      })
    )
  }
  for (const target of targets) {
    if (tx.modifiedBy === target) continue
    res.push(
      control.txFactory.createTxCreateDoc(notification.class.DocUpdates, notification.space.Notifications, {
        user: target,
        attachedTo: objectId,
        attachedToClass: objectClass,
        hidden: false,
        lastTx: txId ?? tx._id,
        lastTxTime: tx.modifiedOn,
        txes: [[txId ?? tx._id, tx.modifiedOn]]
      })
    )
  }
  return res
}

/**
 * @public
 */
export function getMixinTx (
  actualTx: TxCUD<Doc>,
  control: TriggerControl,
  collaborators: Ref<Account>[]
): TxMixin<Doc, Collaborators> {
  const tx = control.txFactory.createTxMixin(
    actualTx.objectId,
    actualTx.objectClass,
    actualTx.objectSpace,
    notification.mixin.Collaborators,
    {
      collaborators
    }
  )
  return tx
}

/**
 * @public
 */
export async function createCollaboratorDoc (
  tx: TxCreateDoc<Doc>,
  control: TriggerControl,
  txId?: Ref<TxCUD<Doc>>
): Promise<Tx[]> {
  const res: Tx[] = []
  const hierarchy = control.hierarchy
  const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)
  if (mixin !== undefined) {
    const doc = TxProcessor.createDoc2Doc(tx)
    const collaborators = await getDocCollaborators(doc, mixin, control)

    const mixinTx = getMixinTx(tx, control, collaborators)
    const notificationTxes = await createCollabDocInfo(collaborators, tx, doc._id, doc._class, control, txId)
    res.push(mixinTx)
    res.push(...notificationTxes)
  }
  return res
}

/**
 * @public
 */
export async function collaboratorDocHandler (tx: Tx, control: TriggerControl, txId?: Ref<TxCUD<Doc>>): Promise<Tx[]> {
  switch (tx._class) {
    case core.class.TxCreateDoc:
      if (tx.space === core.space.DerivedTx) return []
      return await createCollaboratorDoc(tx as TxCreateDoc<Doc>, control, txId)
    case core.class.TxUpdateDoc:
    case core.class.TxMixin:
      if (tx.space === core.space.DerivedTx) return []
      return await updateCollaboratorDoc(tx as TxUpdateDoc<Doc>, control, txId)
    case core.class.TxRemoveDoc:
      return await removeCollaboratorDoc(tx as TxRemoveDoc<Doc>, control)
    case core.class.TxCollectionCUD:
      return await collectionCollabDoc(tx as TxCollectionCUD<Doc, AttachedDoc>, control)
  }

  return []
}

async function collectionCollabDoc (tx: TxCollectionCUD<Doc, AttachedDoc>, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)
  let res = await collaboratorDocHandler(actualTx, control, tx._id)
  if ([core.class.TxCreateDoc, core.class.TxRemoveDoc].includes(actualTx._class)) {
    const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
    if (doc !== undefined) {
      if (control.hierarchy.hasMixin(doc, notification.mixin.Collaborators)) {
        const collabMixin = control.hierarchy.as(doc, notification.mixin.Collaborators)
        res = res.concat(
          await createCollabDocInfo(collabMixin.collaborators, tx, tx.objectId, tx.objectClass, control, tx._id)
        )
      }
    }
  }
  return res
}

async function removeCollaboratorDoc (tx: TxRemoveDoc<Doc>, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  const hierarchy = control.hierarchy
  const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)
  if (mixin !== undefined) {
    const docUpdates = await control.findAll(notification.class.DocUpdates, { attachedTo: tx.objectId })
    for (const doc of docUpdates) {
      res.push(control.txFactory.createTxRemoveDoc(doc._class, doc.space, doc._id))
    }
  }
  return res
}

async function getNewCollaborators (
  ops: DocumentUpdate<Doc> | MixinUpdate<Doc, Doc>,
  mixin: ClassCollaborators,
  doc: Doc,
  control: TriggerControl
): Promise<Ref<Account>[]> {
  const newCollaborators: Set<Ref<Account>> = new Set()
  if (ops.$push !== undefined) {
    for (const key in ops.$push) {
      if (mixin.fields.includes(key)) {
        const value = (ops.$push as any)[key]
        const newCollabs = await getKeyCollaborators(doc, value, key, control)
        if (newCollabs !== undefined) {
          for (const newCollab of newCollabs) {
            newCollaborators.add(newCollab)
          }
        }
      }
    }
  }
  for (const key in ops) {
    if (key.startsWith('$')) continue
    if (mixin.fields.includes(key)) {
      const value = (ops as any)[key]
      const newCollabs = await getKeyCollaborators(doc, value, key, control)
      if (newCollabs !== undefined) {
        for (const newCollab of newCollabs) {
          newCollaborators.add(newCollab)
        }
      }
    }
  }
  return Array.from(newCollaborators.values())
}

function isMixinTx (tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>): tx is TxMixin<Doc, Doc> {
  return tx._class === core.class.TxMixin
}

async function updateCollaboratorDoc (
  tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>,
  control: TriggerControl,
  txId?: Ref<TxCUD<Doc>>
): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  let res: Tx[] = []
  const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)
  if (mixin === undefined) return []
  const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
  if (doc === undefined) return []
  if (hierarchy.hasMixin(doc, notification.mixin.Collaborators)) {
    // we should handle change field and subscribe new collaborators
    const collabMixin = hierarchy.as(doc, notification.mixin.Collaborators)
    const collabs = new Set(collabMixin.collaborators)
    const ops = isMixinTx(tx) ? tx.attributes : tx.operations
    const newCollaborators = (await getNewCollaborators(ops, mixin, doc, control)).filter((p) => !collabs.has(p))

    if (newCollaborators.length > 0) {
      res.push(
        control.txFactory.createTxMixin(tx.objectId, tx.objectClass, tx.objectSpace, notification.mixin.Collaborators, {
          $push: {
            collaborators: {
              $each: newCollaborators,
              $position: 0
            }
          }
        })
      )
    }
    res = res.concat(
      await createCollabDocInfo(
        [...collabMixin.collaborators, ...newCollaborators],
        tx,
        doc._id,
        doc._class,
        control,
        txId
      )
    )
  } else {
    const collaborators = await getDocCollaborators(doc, mixin, control)
    res.push(getMixinTx(tx, control, collaborators))
    res = res.concat(await createCollabDocInfo(collaborators, tx, doc._id, doc._class, control, txId))
  }

  return res
}

/**
 * @public
 */
export async function OnAddCollborator (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  const actualTx = TxProcessor.extractTx(tx) as TxMixin<Doc, Collaborators>

  if (actualTx._class !== core.class.TxMixin) return []
  if (actualTx.mixin !== notification.mixin.Collaborators) return []
  if (actualTx.attributes.collaborators !== undefined) {
    for (const collab of actualTx.attributes.collaborators) {
      const resTx = await createLastViewTx(control.findAll, actualTx.objectId, collab)
      if (resTx !== undefined) {
        result.push(resTx)
      }
    }
  }
  if (actualTx.attributes.$push?.collaborators !== undefined) {
    const collab = actualTx.attributes.$push?.collaborators
    if (typeof collab === 'object') {
      if ('$each' in collab) {
        for (const collaborator of collab.$each) {
          const resTx = await createLastViewTx(control.findAll, actualTx.objectId, collaborator)
          if (resTx !== undefined) {
            result.push(resTx)
          }
        }
      }
    } else {
      const resTx = await createLastViewTx(control.findAll, actualTx.objectId, collab)
      if (resTx !== undefined) {
        result.push(resTx)
      }
    }
  }
  return result
}

export * from './types'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnBacklinkCreate,
    CollaboratorDocHandler: collaboratorDocHandler,
    OnUpdateLastView,
    UpdateLastView,
    OnAddCollborator
  }
})
