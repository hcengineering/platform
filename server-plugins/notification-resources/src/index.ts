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
import contact, { Employee, PersonAccount, formatName } from '@hcengineering/contact'
import core, {
  Account,
  AnyAttribute,
  ArrOf,
  AttachedDoc,
  Class,
  Collection,
  Data,
  Doc,
  DocumentUpdate,
  Hierarchy,
  MixinUpdate,
  Ref,
  RefTo,
  Tx,
  TxCUD,
  TxCollectionCUD,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  generateId,
  matchQuery
} from '@hcengineering/core'
import notification, {
  ClassCollaborators,
  Collaborators,
  DocUpdates,
  EmailNotification,
  NotificationProvider,
  NotificationType
} from '@hcengineering/notification'
import { getResource } from '@hcengineering/platform'
import type { TriggerControl } from '@hcengineering/server-core'
import serverNotification, {
  HTMLPresenter,
  TextPresenter,
  getPersonAccount,
  getPersonAccountById
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

  const receiver = await getPersonAccount(ptx.objectId as Ref<Employee>, control)
  if (receiver === undefined) return []

  const sender = await getPersonAccountById(ptx.modifiedBy, control)
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
    res = res.concat(await createCollabDocInfo([receiver._id], control, tx as TxCUD<Doc>, doc))
  }
  return res
}

function checkTx (ptx: TxCollectionCUD<Doc, Backlink>, hierarchy: Hierarchy): boolean {
  if (ptx._class !== core.class.TxCollectionCUD) {
    return false
  }

  if (
    ptx.tx._class !== core.class.TxCreateDoc ||
    !hierarchy.isDerived(ptx.tx.objectClass, chunter.class.Backlink) ||
    !hierarchy.isDerived(ptx.objectClass, contact.mixin.Employee)
  ) {
    return false
  }
  return true
}

/**
 * @public
 */
export async function isAllowed (
  control: TriggerControl,
  receiver: Ref<PersonAccount>,
  typeId: Ref<NotificationType>,
  providerId: Ref<NotificationProvider>
): Promise<boolean> {
  const setting = (
    await control.findAll(
      notification.class.NotificationSetting,
      {
        attachedTo: providerId,
        type: typeId,
        modifiedBy: receiver
      },
      { limit: 1 }
    )
  )[0]
  if (setting !== undefined) {
    return setting.enabled
  }
  const type = (
    await control.modelDb.findAll(notification.class.NotificationType, {
      _id: typeId
    })
  )[0]
  if (type === undefined) return false
  return type.providers[providerId] ?? false
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

/**
 * @public
 */
export function getHTMLPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): HTMLPresenter | undefined {
  return hierarchy.classHierarchyMixin(_class, serverNotification.mixin.HTMLPresenter)
}

/**
 * @public
 */
export function getTextPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): TextPresenter | undefined {
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
  if (notificationType.templates === undefined) return
  const text = fillTemplate(notificationType.templates.textTemplate, sender, textPart, data)
  const htmlPart = await getHtmlPart(doc, control)
  const html = fillTemplate(notificationType.templates.htmlTemplate, sender, htmlPart ?? textPart, data)
  const subject = fillTemplate(notificationType.templates.subjectTemplate, sender, textPart, data)
  return {
    text,
    html,
    subject
  }
}

async function createEmailNotificationTxes (
  control: TriggerControl,
  tx: Tx,
  type: Ref<NotificationType>,
  doc: Doc | undefined,
  senderId: Ref<PersonAccount>,
  receiverId: Ref<PersonAccount>,
  data: string = ''
): Promise<Tx | undefined> {
  const sender = (await control.modelDb.findAll(contact.class.PersonAccount, { _id: senderId }))[0]

  const receiver = (await control.modelDb.findAll(contact.class.PersonAccount, { _id: receiverId }))[0]
  if (receiver === undefined) return

  const senderName = sender !== undefined ? formatName(sender.name) : ''

  const content = await getContent(doc, senderName, type, control, data)

  if (content !== undefined) {
    return await getEmailNotificationTx(tx, senderName, content.text, content.html, content.subject, receiver)
  }
}

async function getEmailNotificationTx (
  tx: Tx,
  sender: string,
  text: string,
  html: string,
  subject: string,
  receiver: PersonAccount
): Promise<TxCreateDoc<EmailNotification> | undefined> {
  return {
    _id: generateId(),
    objectId: generateId(),
    _class: core.class.TxCreateDoc,
    space: core.space.DerivedTx,
    objectClass: notification.class.EmailNotification,
    objectSpace: notification.space.Notifications,
    modifiedOn: tx.modifiedOn,
    modifiedBy: tx.modifiedBy,
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
    if (hierarchy.isDerived(to, contact.mixin.Employee)) {
      const acc = await getPersonAccount(value, control)
      return acc !== undefined ? [acc._id] : []
    } else if (hierarchy.isDerived(to, core.class.Account)) {
      const acc = await getPersonAccountById(value, control)
      return acc !== undefined ? [acc._id] : []
    }
  } else if (attr.type._class === core.class.ArrOf) {
    const arrOf = (attr.type as ArrOf<RefTo<Doc>>).of
    if (arrOf._class === core.class.RefTo) {
      const to = (arrOf as RefTo<Doc>).to
      if (hierarchy.isDerived(to, contact.mixin.Employee)) {
        const employeeAccounts = await control.modelDb.findAll(contact.class.PersonAccount, {
          person: { $in: Array.isArray(value) ? value : [value] }
        })
        return employeeAccounts.map((p) => p._id)
      } else if (hierarchy.isDerived(to, core.class.Account)) {
        const employeeAccounts = await control.modelDb.findAll(contact.class.PersonAccount, {
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

function fieldUpdated (field: string, ops: DocumentUpdate<Doc> | MixinUpdate<Doc, Doc>): boolean {
  if ((ops as any)[field] !== undefined) return true
  if ((ops.$pull as any)?.[field] !== undefined) return true
  if ((ops.$push as any)?.[field] !== undefined) return true
  return false
}

function isTypeMatched (
  control: TriggerControl,
  type: NotificationType,
  tx: TxCUD<Doc>,
  extractedTx: TxCUD<Doc>
): boolean {
  const h = control.hierarchy
  const targetClass = h.getBaseClass(type.objectClass)
  if (!type.txClasses.includes(extractedTx._class)) return false
  if (!control.hierarchy.isDerived(h.getBaseClass(extractedTx.objectClass), targetClass)) return false
  if (tx._class === core.class.TxCollectionCUD && type.attachedToClass !== undefined) {
    if (!control.hierarchy.isDerived(h.getBaseClass(tx.objectClass), h.getBaseClass(type.attachedToClass))) return false
  }
  if (type.field !== undefined) {
    if (extractedTx._class === core.class.TxUpdateDoc) {
      if (!fieldUpdated(type.field, (extractedTx as TxUpdateDoc<Doc>).operations)) return false
    }
    if (extractedTx._class === core.class.TxMixin) {
      if (!fieldUpdated(type.field, (extractedTx as TxMixin<Doc, Doc>).attributes)) return false
    }
  }
  if (type.txMatch !== undefined) {
    const res = matchQuery([extractedTx], type.txMatch, extractedTx._class, control.hierarchy, true)
    if (res.length === 0) return false
  }
  return true
}

async function getMatchedTypes (
  control: TriggerControl,
  tx: TxCUD<Doc>,
  isSpace: boolean = false
): Promise<NotificationType[]> {
  const allTypes = (await control.modelDb.findAll(notification.class.NotificationType, {})).filter((p) =>
    isSpace ? p.spaceSubscribe === true : p.spaceSubscribe !== true
  )
  const extractedTx = TxProcessor.extractTx(tx) as TxCUD<Doc>
  const filtered: NotificationType[] = []
  for (const type of allTypes) {
    if (isTypeMatched(control, type, tx, extractedTx)) {
      filtered.push(type)
    }
  }
  return filtered
}

interface NotifyResult {
  allowed: boolean
  emails: NotificationType[]
}

async function isShouldNotify (
  control: TriggerControl,
  tx: TxCUD<Doc>,
  object: Doc,
  user: Ref<Account>,
  isSpace: boolean
): Promise<NotifyResult> {
  let allowed = false
  const emailTypes: NotificationType[] = []
  const types = await getMatchedTypes(control, tx, isSpace)
  for (const type of types) {
    if (type.allowedForAuthor !== true && tx.modifiedBy === user) continue
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
    if (await isAllowed(control, user as Ref<PersonAccount>, type._id, notification.providers.EmailNotification)) {
      emailTypes.push(type)
    }
  }
  return {
    allowed,
    emails: emailTypes
  }
}

function pushNotification (
  control: TriggerControl,
  res: Tx[],
  target: Ref<Account>,
  object: Doc,
  originTx: TxCUD<Doc>,
  docUpdates: DocUpdates[]
): void {
  const current = docUpdates.find((p) => p.user === target)
  if (current === undefined) {
    res.push(
      control.txFactory.createTxCreateDoc(notification.class.DocUpdates, object.space, {
        user: target,
        attachedTo: object._id,
        attachedToClass: object._class,
        hidden: false,
        lastTxTime: originTx.modifiedOn,
        txes: [{ _id: originTx._id, modifiedOn: originTx.modifiedOn, modifiedBy: originTx.modifiedBy, isNew: true }]
      })
    )
  } else {
    res.push(
      control.txFactory.createTxUpdateDoc(current._class, current.space, current._id, {
        $push: {
          txes: { _id: originTx._id, modifiedOn: originTx.modifiedOn, modifiedBy: originTx.modifiedBy, isNew: true }
        }
      })
    )
    res.push(
      control.txFactory.createTxUpdateDoc(current._class, current.space, current._id, {
        lastTxTime: originTx.modifiedOn,
        hidden: false
      })
    )
  }
}

async function getNotificationTxes (
  control: TriggerControl,
  object: Doc,
  originTx: TxCUD<Doc>,
  target: Ref<Account>,
  docUpdates: DocUpdates[],
  isSpace: boolean
): Promise<Tx[]> {
  const res: Tx[] = []
  const allowed = await isShouldNotify(control, originTx, object, target, isSpace)
  if (allowed.allowed) {
    pushNotification(control, res, target, object, originTx, docUpdates)
  }
  for (const type of allowed.emails) {
    const emailTx = await createEmailNotificationTxes(
      control,
      originTx,
      type._id,
      object,
      originTx.modifiedBy as Ref<PersonAccount>,
      target as Ref<PersonAccount>
    )
    if (emailTx !== undefined) {
      res.push(emailTx)
    }
  }
  return res
}

async function createCollabDocInfo (
  collaborators: Ref<Account>[],
  control: TriggerControl,
  originTx: TxCUD<Doc>,
  object: Doc,
  isSpace: boolean = false
): Promise<Tx[]> {
  let res: Tx[] = []
  if (originTx.space === core.space.DerivedTx) return res
  const targets = new Set(collaborators)
  const docUpdates = await control.findAll(notification.class.DocUpdates, { attachedTo: object._id })
  for (const target of targets) {
    res = res.concat(await getNotificationTxes(control, object, originTx, target, docUpdates, isSpace))
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

async function getSpaceCollabTxes (
  control: TriggerControl,
  doc: Doc,
  tx: TxCUD<Doc>,
  originTx: TxCUD<Doc>
): Promise<Tx[]> {
  const space = (await control.findAll(core.class.Space, { _id: doc.space }))[0]
  if (space === undefined) return []
  const mixin = control.hierarchy.classHierarchyMixin<Doc, ClassCollaborators>(
    space._class,
    notification.mixin.ClassCollaborators
  )
  if (mixin !== undefined) {
    const collabs = control.hierarchy.as<Doc, Collaborators>(space, notification.mixin.Collaborators)
    if (collabs.collaborators !== undefined) {
      return await createCollabDocInfo(collabs.collaborators, control, originTx, doc, true)
    }
  }
  return []
}

/**
 * @public
 */
export async function createCollaboratorDoc (
  tx: TxCreateDoc<Doc>,
  control: TriggerControl,
  originTx: TxCUD<Doc>
): Promise<Tx[]> {
  const res: Tx[] = []
  const hierarchy = control.hierarchy
  const mixin = hierarchy.classHierarchyMixin(tx.objectClass, notification.mixin.ClassCollaborators)
  const doc = TxProcessor.createDoc2Doc(tx)
  if (mixin !== undefined) {
    const collaborators = await getDocCollaborators(doc, mixin, control)

    const mixinTx = getMixinTx(tx, control, collaborators)
    const notificationTxes = await createCollabDocInfo(collaborators, control, originTx, doc)
    res.push(mixinTx)
    res.push(...notificationTxes)
  }
  res.push(...(await getSpaceCollabTxes(control, doc, tx, originTx)))
  return res
}

/**
 * @public
 */
export async function collaboratorDocHandler (
  tx: TxCUD<Doc>,
  control: TriggerControl,
  originTx?: TxCUD<Doc>
): Promise<Tx[]> {
  switch (tx._class) {
    case core.class.TxCreateDoc:
      return await createCollaboratorDoc(tx as TxCreateDoc<Doc>, control, originTx ?? tx)
    case core.class.TxUpdateDoc:
    case core.class.TxMixin: {
      let res = await updateCollaboratorDoc(tx as TxUpdateDoc<Doc>, control, originTx ?? tx)
      res = res.concat(await updateCollaboratorsMixin(tx as TxMixin<Doc, Collaborators>, control, originTx ?? tx))
      return res
    }
    case core.class.TxRemoveDoc:
      return await removeCollaboratorDoc(tx as TxRemoveDoc<Doc>, control)
    case core.class.TxCollectionCUD:
      return await collectionCollabDoc(tx as TxCollectionCUD<Doc, AttachedDoc>, control)
  }

  return []
}

async function updateCollaboratorsMixin (
  tx: TxMixin<Doc, Collaborators>,
  control: TriggerControl,
  originTx: TxCUD<Doc>
): Promise<Tx[]> {
  if (tx._class !== core.class.TxMixin) return []
  if (originTx.space === core.space.DerivedTx) return []
  if (!control.hierarchy.isDerived(tx.mixin, notification.mixin.Collaborators)) return []
  const res: Tx[] = []
  if (tx.attributes.collaborators !== undefined) {
    const createTx = control.hierarchy.isDerived(tx.objectClass, core.class.AttachedDoc)
      ? (
          await control.findAll(core.class.TxCollectionCUD, {
            'tx.objectId': tx.objectId,
            'tx._class': core.class.TxCreateDoc
          })
        )[0]
      : (
          await control.findAll(core.class.TxCreateDoc, {
            objectId: tx.objectId
          })
        )[0]
    const mixinTxes = await control.findAll(core.class.TxMixin, {
      objectId: tx.objectId
    })
    const prevDoc = TxProcessor.buildDoc2Doc([createTx, ...mixinTxes].filter((t) => t._id !== tx._id)) as Collaborators
    const prevDocMixin = control.hierarchy.as(prevDoc, notification.mixin.Collaborators)
    const set = new Set(prevDocMixin?.collaborators ?? [])
    const newCollabs: Ref<Account>[] = []
    for (const collab of tx.attributes.collaborators) {
      if (!set.has(collab)) {
        if (
          await isAllowed(
            control,
            collab as Ref<PersonAccount>,
            notification.ids.CollaboratoAddNotification,
            notification.providers.PlatformNotification
          )
        ) {
          newCollabs.push(collab)
        }
      }
    }
    if (newCollabs.length > 0) {
      const docUpdates = await control.findAll(notification.class.DocUpdates, {
        user: { $in: newCollabs },
        attachedTo: tx.objectId
      })
      for (const collab of newCollabs) {
        pushNotification(control, res, collab, prevDoc, originTx, docUpdates)
      }
    }
  }
  return res
}

async function collectionCollabDoc (tx: TxCollectionCUD<Doc, AttachedDoc>, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)
  let res = await collaboratorDocHandler(actualTx as TxCUD<Doc>, control, tx)
  if ([core.class.TxCreateDoc, core.class.TxRemoveDoc].includes(actualTx._class)) {
    const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
    if (doc !== undefined) {
      if (control.hierarchy.hasMixin(doc, notification.mixin.Collaborators)) {
        const collabMixin = control.hierarchy.as(doc, notification.mixin.Collaborators)
        res = res.concat(await createCollabDocInfo(collabMixin.collaborators, control, tx, doc))
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
        let value = (ops.$push as any)[key]
        if (typeof value !== 'string') {
          value = value.$each
        }
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

async function changeSpaceTxes (control: TriggerControl, tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>): Promise<Tx[]> {
  if (tx._class !== core.class.TxUpdateDoc) return []
  const ctx = tx as TxUpdateDoc<Doc>
  if (ctx.operations.space === undefined) return []
  const docUpdates = await control.findAll(notification.class.DocUpdates, { attachedTo: tx.objectId })

  return docUpdates.map((value) =>
    control.txFactory.createTxUpdateDoc(value._class, value.space, value._id, { space: ctx.operations.space })
  )
}

async function updateCollaboratorDoc (
  tx: TxUpdateDoc<Doc> | TxMixin<Doc, Doc>,
  control: TriggerControl,
  originTx: TxCUD<Doc>
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
      await createCollabDocInfo([...collabMixin.collaborators, ...newCollaborators], control, originTx, doc)
    )
  } else {
    const collaborators = await getDocCollaborators(doc, mixin, control)
    res.push(getMixinTx(tx, control, collaborators))
    res = res.concat(await createCollabDocInfo(collaborators, control, originTx, doc))
  }

  res = res.concat(await getSpaceCollabTxes(control, doc, tx, originTx))

  res = res.concat(await changeSpaceTxes(control, tx))

  return res
}

/**
 * @public
 */
export async function isUserInFieldValue (
  tx: Tx,
  doc: Doc,
  user: Ref<Account>,
  type: NotificationType,
  control: TriggerControl
): Promise<boolean> {
  if (type.field === undefined) return false
  const value = (doc as any)[type.field]
  if (value === undefined) return false
  if (Array.isArray(value)) {
    return value.includes(user)
  } else {
    return value === user
  }
}

/**
 * @public
 */
export async function isUserEmployeeInFieldValue (
  tx: Tx,
  doc: Doc,
  user: Ref<Account>,
  type: NotificationType,
  control: TriggerControl
): Promise<boolean> {
  if (type.field === undefined) return false
  const value = (doc as any)[type.field]
  if (value === undefined) return false
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
export async function OnAttributeCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const attribute = TxProcessor.createDoc2Doc(tx as TxCreateDoc<AnyAttribute>)
  const group = (
    await control.modelDb.findAll(notification.class.NotificationGroup, { objectClass: attribute.attributeOf })
  )[0]
  if (group === undefined) return []
  const isCollection: boolean = core.class.Collection === attribute.type._class
  const objectClass = !isCollection ? attribute.attributeOf : (attribute.type as Collection<AttachedDoc>).of
  const txClasses = !isCollection
    ? [control.hierarchy.isMixin(attribute.attributeOf) ? core.class.TxMixin : core.class.TxUpdateDoc]
    : [core.class.TxCreateDoc, core.class.TxRemoveDoc]
  const data: Data<NotificationType> = {
    attribute: attribute._id,
    group: group._id,
    field: attribute.name,
    generated: true,
    objectClass,
    txClasses,
    hidden: false,
    providers: {
      [notification.providers.PlatformNotification]: false
    },
    label: attribute.label
  }
  if (isCollection) {
    data.attachedToClass = attribute.attributeOf
  }
  const id =
    `${notification.class.NotificationType}_${attribute.attributeOf}_${attribute.name}` as Ref<NotificationType>
  const res = control.txFactory.createTxCreateDoc(notification.class.NotificationType, core.space.Model, data, id)
  return [res]
}

/**
 * @public
 */
export async function OnAttributeUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = tx as TxUpdateDoc<AnyAttribute>
  if (ctx.operations.hidden === undefined) return []
  const type = (await control.findAll(notification.class.NotificationType, { attribute: ctx.objectId }))[0]
  if (type === undefined) return []
  const res = control.txFactory.createTxUpdateDoc(type._class, type.space, type._id, {
    hidden: ctx.operations.hidden
  })
  return [res]
}

export * from './types'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnBacklinkCreate,
    CollaboratorDocHandler: collaboratorDocHandler,
    OnAttributeCreate,
    OnAttributeUpdate
  },
  function: {
    IsUserInFieldValue: isUserInFieldValue,
    IsUserEmployeeInFieldValue: isUserEmployeeInFieldValue
  }
})
