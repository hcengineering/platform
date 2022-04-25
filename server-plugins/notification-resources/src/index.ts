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

import contact, { Employee, EmployeeAccount, formatName } from '@anticrm/contact'
import core, { AttachedDoc, Backlink, Class, Data, Doc, generateId, Hierarchy, Obj, Ref, Space, Tx, TxCollectionCUD, TxCreateDoc, TxCUD, TxProcessor } from '@anticrm/core'
import notification, { EmailNotification, Notification, NotificationStatus } from '@anticrm/notification'
import { getResource } from '@anticrm/platform'
import type { TriggerControl } from '@anticrm/server-core'
import { getUpdateLastViewTx } from '@anticrm/server-notification'
import view, { HTMLPresenter, TextPresenter } from '@anticrm/view'

const extractTx = (tx: Tx): Tx => {
  if (tx._class === core.class.TxCollectionCUD) {
    const ctx = (tx as TxCollectionCUD<Doc, AttachedDoc>)
    if (ctx.tx._class === core.class.TxCreateDoc) {
      const create = ctx.tx as TxCreateDoc<AttachedDoc>
      create.attributes.attachedTo = ctx.objectId
      create.attributes.attachedToClass = ctx.objectClass
      create.attributes.collection = ctx.collection
      return create
    }
    return ctx
  }

  return tx
}

/**
 * @public
 */
export async function OnBacklinkCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy
  if (tx._class !== core.class.TxCollectionCUD) {
    return []
  }

  const ptx = tx as TxCollectionCUD<Doc, Backlink>

  if (
    ptx.tx._class !== core.class.TxCreateDoc ||
    !hierarchy.isDerived(ptx.tx.objectClass, core.class.Backlink) ||
    !hierarchy.isDerived(ptx.objectClass, contact.class.Employee)
  ) {
    return []
  }

  const result: Tx[] = []

  const createNotificationTx = await getPlatformNotificationTx(ptx, control)

  if (createNotificationTx !== undefined) {
    result.push(createNotificationTx)
  }

  const emailTx = await getEmailTx(ptx, control)
  if (emailTx !== undefined) {
    result.push(emailTx)
  }
  return result
}

/**
 * @public
 */
export async function UpdateLastView (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = extractTx(tx)
  if (![core.class.TxUpdateDoc, core.class.TxCreateDoc, core.class.TxMixin].includes(actualTx._class)) {
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
        const attachedTx = await getUpdateLastViewTx(control.findAll, doc.attachedTo, doc.attachedToClass, createTx.modifiedOn, createTx.modifiedBy)
        if (attachedTx !== undefined) {
          result.push(attachedTx)
        }
      } else {
        const doc = TxProcessor.createDoc2Doc(createTx)
        const tx = await getUpdateLastViewTx(control.findAll, doc._id, doc._class, createTx.modifiedOn, createTx.modifiedBy)
        if (tx !== undefined) {
          result.push(tx)
        }
      }
      break
    }
    case core.class.TxUpdateDoc:
    case core.class.TxMixin: {
      const tx = actualTx as TxCUD<Doc>
      const doc = (await control.findAll(tx.objectClass, { _id: tx.objectId }, { limit: 1 }))[0]
      if (doc !== undefined && !control.hierarchy.isDerived(doc._class, core.class.AttachedDoc)) {
        const resTx = await getUpdateLastViewTx(control.findAll, doc._id, doc._class, tx.modifiedOn, tx.modifiedBy)
        if (resTx !== undefined) {
          result.push(resTx)
        }
      }
      break
    }
    default:
      break
  }

  return result
}

async function getPlatformNotificationTx (ptx: TxCollectionCUD<Doc, Backlink>, control: TriggerControl): Promise<TxCollectionCUD<Doc, Notification> | undefined> {
  const attached = (await control.modelDb.findAll(contact.class.EmployeeAccount, {
    employee: ptx.objectId as Ref<Employee>
  }, { limit: 1 }))[0]
  if (attached === undefined) return

  const setting = (await control.findAll(notification.class.NotificationSetting, {
    provider: notification.ids.PlatformNotification,
    type: notification.ids.MentionNotification,
    space: attached._id as unknown as Ref<Space>
  }, { limit: 1 }))[0]
  if (setting === undefined) {
    const provider = (await control.modelDb.findAll(notification.class.NotificationProvider, {
      _id: notification.ids.PlatformNotification
    }))[0]
    if (provider === undefined) return
    if (!provider.default) return
  }

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
      status: NotificationStatus.New
    } as unknown as Data<Notification>
  }

  const createNotificationTx: TxCollectionCUD<Doc, Notification> = {
    ...ptx,
    _id: generateId(),
    collection: 'notifications',
    tx: createTx
  }

  return createNotificationTx
}

async function getEmailTx (ptx: TxCollectionCUD<Doc, Backlink>, control: TriggerControl): Promise<TxCreateDoc<EmailNotification> | undefined> {
  const hierarchy = control.hierarchy
  const backlink = TxProcessor.createDoc2Doc(ptx.tx as TxCreateDoc<Backlink>)
  const account = (await control.modelDb.findAll(contact.class.EmployeeAccount, {
    _id: ptx.modifiedBy as Ref<EmployeeAccount>
  }, { limit: 1 }))[0]
  if (account === undefined) return undefined

  const sender = formatName(account.name)
  const attached = (await control.modelDb.findAll(contact.class.EmployeeAccount, {
    employee: ptx.objectId as Ref<Employee>
  }, { limit: 1 }))[0]
  if (attached === undefined) return undefined

  const setting = (await control.findAll(notification.class.NotificationSetting, {
    provider: notification.ids.EmailNotification,
    type: notification.ids.MentionNotification,
    space: attached._id as unknown as Ref<Space>
  }, { limit: 1 }))[0]
  if (setting === undefined) {
    const provider = (await control.modelDb.findAll(notification.class.NotificationProvider, {
      _id: notification.ids.PlatformNotification
    }))[0]
    if (provider === undefined) return
    if (!provider.default) return
  }

  const receiver = attached.email
  const doc = (await control.findAll(backlink.backlinkClass, {
    _id: backlink.backlinkId
  }, { limit: 1 }))[0]
  if (doc === undefined) return undefined

  const TextPresenter = getTextPresenter(doc._class, hierarchy)
  if (TextPresenter === undefined) return

  const HTMLPresenter = getHTMLPresenter(doc._class, hierarchy)
  const htmlPart = HTMLPresenter !== undefined ? (await getResource(HTMLPresenter.presenter))(doc) : undefined
  const textPart = (await getResource(TextPresenter.presenter))(doc)
  const html = `<p><b>${sender}</b> mentioned you in ${htmlPart !== undefined ? htmlPart : textPart}</p> ${backlink.message}`
  const text = `${sender} mentioned you in ${textPart}`
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
      receivers: [receiver],
      subject: `You was mentioned in ${textPart}`,
      text,
      html
    }
  }
}

function getHTMLPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): HTMLPresenter | undefined {
  let clazz: Ref<Class<Obj>> | undefined = _class
  while (clazz !== undefined) {
    const _class = hierarchy.getClass(clazz)
    const presenter = hierarchy.as(_class, view.mixin.HTMLPresenter)
    if (presenter.presenter != null) return presenter
    clazz = _class.extends
  }
}

function getTextPresenter (_class: Ref<Class<Doc>>, hierarchy: Hierarchy): TextPresenter | undefined {
  let clazz: Ref<Class<Obj>> | undefined = _class
  while (clazz !== undefined) {
    const _class = hierarchy.getClass(clazz)
    const presenter = hierarchy.as(_class, view.mixin.TextPresenter)
    if (presenter.presenter != null) return presenter
    clazz = _class.extends
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnBacklinkCreate,
    UpdateLastView
  }
})
