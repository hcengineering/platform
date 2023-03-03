//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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

import contact, { Contact, contactId, Employee, formatName, Organization, Person } from '@hcengineering/contact'
import core, {
  AnyAttribute,
  ArrOf,
  AttachedDoc,
  Class,
  Collection,
  concatLink,
  Doc,
  Obj,
  Ref,
  RefTo,
  Tx,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import login from '@hcengineering/login'
import { getMetadata } from '@hcengineering/platform'
import type { TriggerControl } from '@hcengineering/server-core'
import view from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'

/**
 * @public
 */
export async function OnContactDelete (
  tx: Tx,
  { findAll, hierarchy, storageFx, removedMap, txFactory }: TriggerControl
): Promise<Tx[]> {
  if (tx._class !== core.class.TxRemoveDoc) {
    return []
  }

  const rmTx = tx as TxRemoveDoc<Contact>

  if (!hierarchy.isDerived(rmTx.objectClass, contact.class.Contact)) {
    return []
  }

  const removeContact = removedMap.get(rmTx.objectId) as Contact
  if (removeContact === undefined) {
    return []
  }

  const avatar: string | undefined = [removeContact.avatar].filter((x): x is string => x !== undefined).slice(-1)[0]

  if (avatar === undefined) {
    return []
  }

  if (avatar?.includes('://') && !avatar?.startsWith('image://')) {
    return []
  }

  storageFx(async (adapter, bucket) => {
    await adapter.remove(bucket, [avatar])

    const extra = await adapter.list(bucket, avatar)
    if (extra.length > 0) {
      await adapter.remove(
        bucket,
        Array.from(extra.entries()).map((it) => it[1].name)
      )
    }
  })

  const result: Tx[] = []

  const members = await findAll(contact.class.Member, { contact: removeContact._id })
  for (const member of members) {
    const removeTx = txFactory.createTxRemoveDoc(member._class, member.space, member._id)
    const tx = txFactory.createTxCollectionCUD(
      member.attachedToClass,
      member.attachedTo,
      member.space,
      member.collection,
      removeTx
    )
    result.push(tx)
  }

  return result
}

async function mergeCollectionAttributes<T extends Doc> (
  control: TriggerControl,
  attributes: Map<string, AnyAttribute>,
  oldValue: Ref<T>,
  newValue: Ref<T>
): Promise<Tx[]> {
  const res: Tx[] = []
  for (const attribute of attributes) {
    if (control.hierarchy.isDerived(attribute[1].type._class, core.class.Collection)) {
      if (attribute[1]._id === contact.class.Contact + '_channels') continue
      const collection = attribute[1].type as Collection<AttachedDoc>
      const allAttached = await control.findAll(collection.of, { attachedTo: oldValue })
      for (const attached of allAttached) {
        const tx = control.txFactory.createTxUpdateDoc(attached._class, attached.space, attached._id, {
          attachedTo: newValue
        })
        const parent = control.txFactory.createTxCollectionCUD(
          attached.attachedToClass,
          newValue,
          attached.space,
          attached.collection,
          tx
        )
        res.push(parent)
      }
    }
  }
  return res
}

async function processRefAttribute<T extends Doc> (
  control: TriggerControl,
  clazz: Ref<Class<Obj>>,
  attr: AnyAttribute,
  key: string,
  targetClasses: Ref<Class<Obj>>[],
  oldValue: Ref<T>,
  newValue: Ref<T>
): Promise<Tx[]> {
  const res: Tx[] = []
  if (attr.type._class === core.class.RefTo) {
    if (targetClasses.includes((attr.type as RefTo<Doc>).to)) {
      const isMixin = control.hierarchy.isMixin(clazz)
      const docs = await control.findAll(clazz, { [key]: oldValue })
      for (const doc of docs) {
        if (isMixin) {
          const tx = control.txFactory.createTxMixin(doc._id, doc._class, doc.space, clazz, { [key]: newValue })
          res.push(tx)
        } else {
          const tx = control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, { [key]: newValue })
          res.push(tx)
        }
      }
    }
  }
  return res
}

async function processRefArrAttribute<T extends Doc> (
  control: TriggerControl,
  clazz: Ref<Class<Obj>>,
  attr: AnyAttribute,
  key: string,
  targetClasses: Ref<Class<Obj>>[],
  oldValue: Ref<T>,
  newValue: Ref<T>
): Promise<Tx[]> {
  const res: Tx[] = []
  if (attr.type._class === core.class.ArrOf) {
    const arrOf = (attr.type as ArrOf<RefTo<Doc>>).of
    if (arrOf._class === core.class.ArrOf) {
      if (targetClasses.includes((arrOf as RefTo<Doc>).to)) {
        const docs = await control.findAll(clazz, { [key]: oldValue })
        for (const doc of docs) {
          const push = control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
            $push: {
              [key]: newValue
            }
          })
          const pull = control.txFactory.createTxUpdateDoc(doc._class, doc.space, doc._id, {
            $pull: {
              [key]: oldValue
            }
          })
          res.push(pull)
          res.push(push)
        }
      }
    }
  }
  return res
}

async function updateAllRefs<T extends Doc> (
  control: TriggerControl,
  _class: Ref<Class<T>>,
  oldValue: Ref<T>,
  newValue: Ref<T>
): Promise<Tx[]> {
  const res: Tx[] = []
  const attributes = control.hierarchy.getAllAttributes(_class)
  const parent = control.hierarchy.getParentClass(_class)
  const mixins = control.hierarchy.getDescendants(parent).filter((p) => control.hierarchy.isMixin(p))
  const colTxes = await mergeCollectionAttributes(control, attributes, oldValue, newValue)
  res.push(...colTxes)
  for (const mixin of mixins) {
    const attributes = control.hierarchy.getOwnAttributes(mixin)
    const txes = await mergeCollectionAttributes(control, attributes, oldValue, newValue)
    res.push(...txes)
  }

  const skip: Ref<AnyAttribute>[] = []
  const allClasses = control.hierarchy.getDescendants(core.class.Doc)
  const targetClasses = control.hierarchy.getDescendants(parent)
  for (const clazz of allClasses) {
    const domain = control.hierarchy.findDomain(clazz)
    if (domain === undefined) continue
    const attributes = control.hierarchy.getOwnAttributes(clazz)
    for (const attribute of attributes) {
      const key = attribute[0]
      const attr = attribute[1]
      if (key === '_id') continue
      if (skip.includes(attr._id)) continue
      const refs = await processRefAttribute(control, clazz, attr, key, targetClasses, oldValue, newValue)
      res.push(...refs)
      const arrRef = await processRefArrAttribute(control, clazz, attr, key, targetClasses, oldValue, newValue)
      res.push(...arrRef)
    }
  }
  return res
}

async function mergeEmployee (control: TriggerControl, uTx: TxUpdateDoc<Employee>): Promise<Tx[]> {
  if (uTx.operations.mergedTo === undefined) return []
  const target = uTx.operations.mergedTo
  const res: Tx[] = []
  const employeeTxes = await updateAllRefs(control, contact.class.Employee, uTx.objectId, target)
  res.push(...employeeTxes)
  const oldEmployeeAccount = (await control.findAll(contact.class.EmployeeAccount, { employee: uTx.objectId }))[0]
  const newEmployeeAccount = (await control.findAll(contact.class.EmployeeAccount, { employee: target }))[0]
  if (oldEmployeeAccount === undefined || newEmployeeAccount === undefined) return res
  const accountTxes = await updateAllRefs(
    control,
    contact.class.EmployeeAccount,
    oldEmployeeAccount._id,
    newEmployeeAccount._id
  )
  res.push(...accountTxes)
  return res
}

/**
 * @public
 */
export async function OnEmployeeUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  if (tx._class !== core.class.TxUpdateDoc) {
    return []
  }

  const uTx = tx as TxUpdateDoc<Employee>

  if (!control.hierarchy.isDerived(uTx.objectClass, contact.class.Employee)) {
    return []
  }

  const result: Tx[] = []

  const txes = await mergeEmployee(control, uTx)
  result.push(...txes)

  return result
}

/**
 * @public
 */
export function personHTMLPresenter (doc: Doc, control: TriggerControl): string {
  const person = doc as Person
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.name}/${contactId}#${view.component.EditDoc}|${person._id}|${person._class}|content`
  const link = concatLink(front, path)
  return `<a href="${link}">${formatName(person.name)}</a>`
}

/**
 * @public
 */
export function personTextPresenter (doc: Doc): string {
  const person = doc as Person
  return `${formatName(person.name)}`
}

/**
 * @public
 */
export function organizationHTMLPresenter (doc: Doc, control: TriggerControl): string {
  const organization = doc as Organization
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.name}/${contactId}#${view.component.EditDoc}|${organization._id}|${organization._class}|content`
  const link = concatLink(front, path)
  return `<a href="${link}">${organization.name}</a>`
}

/**
 * @public
 */
export function organizationTextPresenter (doc: Doc): string {
  const organization = doc as Organization
  return `${organization.name}`
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnContactDelete,
    OnEmployeeUpdate
  },
  function: {
    PersonHTMLPresenter: personHTMLPresenter,
    PersonTextPresenter: personTextPresenter,
    OrganizationHTMLPresenter: organizationHTMLPresenter,
    OrganizationTextPresenter: organizationTextPresenter
  }
})
