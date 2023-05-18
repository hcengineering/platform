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

import contact, {
  Channel,
  Contact,
  contactId,
  Employee,
  EmployeeAccount,
  getName,
  Organization,
  Person
} from '@hcengineering/contact'
import core, {
  Account,
  AttachedDoc,
  Collection,
  concatLink,
  Doc,
  Ref,
  RefTo,
  Timestamp,
  Tx,
  TxBuilder,
  TxRemoveDoc,
  TxUpdateDoc,
  updateAttribute
} from '@hcengineering/core'
import notification, { Collaborators } from '@hcengineering/notification'
import { getMetadata } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import { workbenchId } from '@hcengineering/workbench'

/**
 * @public
 */
export async function OnContactDelete (
  tx: Tx,
  { findAll, hierarchy, storageFx, removedMap, txFactory }: TriggerControl
): Promise<Tx[]> {
  const rmTx = tx as TxRemoveDoc<Contact>

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
  if (avatar === '') {
    return []
  }

  storageFx(async (adapter, bucket) => {
    await adapter.remove(bucket, [avatar])

    if (avatar != null) {
      const extra = await adapter.list(bucket, avatar)
      if (extra.length > 0) {
        await adapter.remove(
          bucket,
          Array.from(extra.entries()).map((it) => it[1].name)
        )
      }
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

async function updateAllRefs (
  control: TriggerControl,
  sourceAccount: EmployeeAccount,
  targetAccount: EmployeeAccount,
  modifiedOn: Timestamp,
  modifiedBy: Ref<Account>
): Promise<Tx[]> {
  console.log('merge employee:', sourceAccount.name, 'to', targetAccount.name)
  // Move all possible references to Account and Employee and replace to target one.
  const reftos = (await control.modelDb.findAll(core.class.Attribute, { 'type._class': core.class.RefTo })).filter(
    (it) => {
      const to = it.type as RefTo<Doc>
      return to.to === contact.class.Employee || to.to === core.class.Account || to.to === contact.class.EmployeeAccount
    }
  )

  for (const attr of reftos) {
    if (attr.name === '_id') {
      continue
    }
    const to = attr.type as RefTo<Doc>
    if (to.to === contact.class.Employee) {
      const descendants = control.hierarchy.getDescendants(attr.attributeOf)
      for (const d of descendants) {
        if (control.hierarchy.isDerived(d, core.class.Tx)) {
          continue
        }
        if (control.hierarchy.findDomain(d) !== undefined) {
          while (true) {
            const values = await control.findAll(d, { [attr.name]: sourceAccount.employee }, { limit: 100 })
            if (values.length === 0) {
              break
            }

            const builder = new TxBuilder(control.hierarchy, control.modelDb, modifiedBy)
            for (const v of values) {
              await updateAttribute(builder, v, d, { key: attr.name, attr }, targetAccount.employee, targetAccount._id)
            }
            if (builder.txes.length > 0) {
              console.log('merge employee:', sourceAccount.name, 'to', targetAccount.name, d, builder.txes.length)
              await control.apply(builder.txes, false)
            }
          }
        }
      }
    }
    if (
      (to.to === contact.class.EmployeeAccount || to.to === core.class.Account) &&
      sourceAccount !== undefined &&
      targetAccount !== undefined
    ) {
      const descendants = control.hierarchy.getDescendants(attr.attributeOf)
      for (const d of descendants) {
        if (control.hierarchy.isDerived(d, core.class.Tx)) {
          continue
        }
        if (control.hierarchy.findDomain(d) !== undefined) {
          while (true) {
            const values = await control.findAll(d, { [attr.name]: sourceAccount._id }, { limit: 100 })
            if (values.length === 0) {
              break
            }
            const builder = new TxBuilder(control.hierarchy, control.modelDb, modifiedBy)
            for (const v of values) {
              await updateAttribute(builder, v, d, { key: attr.name, attr }, targetAccount._id, targetAccount._id)
            }
            if (builder.txes.length > 0) {
              console.log('merge employee:', sourceAccount.name, 'to', targetAccount.name, d, builder.txes.length)
              await control.apply(builder.txes, false)
            }
          }
        }
      }
    }
  }
  const arrs = await control.findAll(core.class.Attribute, { 'type._class': core.class.ArrOf })
  for (const attr of arrs) {
    if (attr.name === '_id') {
      continue
    }
    const to = attr.type as RefTo<Doc>
    if (to.to === contact.class.Employee) {
      const descendants = control.hierarchy.getDescendants(attr.attributeOf)
      for (const d of descendants) {
        if (control.hierarchy.isDerived(d, core.class.Tx)) {
          continue
        }
        if (control.hierarchy.findDomain(d) !== undefined) {
          while (true) {
            const values = await control.findAll(
              attr.attributeOf,
              { [attr.name]: sourceAccount.employee },
              { limit: 100 }
            )
            if (values.length === 0) {
              break
            }
            const builder = new TxBuilder(control.hierarchy, control.modelDb, modifiedBy)
            for (const v of values) {
              await updateAttribute(builder, v, d, { key: attr.name, attr }, targetAccount.employee, targetAccount._id)
            }
            if (builder.txes.length > 0) {
              console.log('merge employee:', sourceAccount.name, 'to', targetAccount.name, d, builder.txes.length)
              await control.apply(builder.txes, false)
            }
          }
        }
      }
    }
    if (
      (to.to === contact.class.EmployeeAccount || to.to === core.class.Account) &&
      sourceAccount !== undefined &&
      targetAccount !== undefined
    ) {
      const descendants = control.hierarchy.getDescendants(attr.attributeOf)
      for (const d of descendants) {
        if (control.hierarchy.isDerived(d, core.class.Tx)) {
          continue
        }
        if (control.hierarchy.findDomain(d) !== undefined) {
          while (true) {
            const values = await control.findAll(d, { [attr.name]: sourceAccount._id }, { limit: 100 })
            if (values.length === 0) {
              break
            }
            const builder = new TxBuilder(control.hierarchy, control.modelDb, modifiedBy)
            for (const v of values) {
              await updateAttribute(builder, v, d, { key: attr.name, attr }, targetAccount._id, targetAccount._id)
            }
            if (builder.txes.length > 0) {
              console.log('merge employee:', sourceAccount.name, 'to', targetAccount.name, d, builder.txes.length)
              await control.apply(builder.txes, false)
            }
          }
        }
      }
    }
  }
  const employee = (await control.findAll(contact.class.Employee, { _id: sourceAccount.employee })).shift()

  const builder = new TxBuilder(control.hierarchy, control.modelDb, modifiedBy)
  if (employee !== undefined) {
    await builder.remove(employee)
  }
  await builder.update(sourceAccount, { mergedTo: targetAccount._id })
  await control.apply(builder.txes, true)

  return []
}

async function mergeEmployee (control: TriggerControl, uTx: TxUpdateDoc<Employee>): Promise<Tx[]> {
  if (uTx.operations.mergedTo === undefined) return []
  const target = uTx.operations.mergedTo

  const attributes = control.hierarchy.getAllAttributes(contact.class.Employee)

  for (const attribute of attributes) {
    if (control.hierarchy.isDerived(attribute[1].type._class, core.class.Collection)) {
      if (attribute[1]._id === contact.class.Contact + '_channels') continue
      const collection = attribute[1].type as Collection<AttachedDoc>
      const res: Tx[] = []
      while (true) {
        const allAttached = await control.findAll(collection.of, { attachedTo: uTx.objectId }, { limit: 100 })
        if (allAttached.length === 0) {
          break
        }
        for (const attached of allAttached) {
          const tx = control.txFactory.createTxUpdateDoc(attached._class, attached.space, attached._id, {
            attachedTo: target
          })
          const parent = control.txFactory.createTxCollectionCUD(
            attached.attachedToClass,
            target,
            attached.space,
            attached.collection,
            tx
          )
          res.push(parent)
        }
        await control.apply(res, false)
      }
    }
  }

  const oldEmployeeAccount = (
    await control.modelDb.findAll(contact.class.EmployeeAccount, { employee: uTx.objectId })
  )[0]
  const newEmployeeAccount = (await control.modelDb.findAll(contact.class.EmployeeAccount, { employee: target }))[0]

  if (oldEmployeeAccount === undefined || newEmployeeAccount === undefined) {
    return []
  }
  return await updateAllRefs(control, oldEmployeeAccount, newEmployeeAccount, uTx.modifiedOn, uTx.modifiedBy)
}

/**
 * @public
 */
export async function OnEmployeeUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const uTx = tx as TxUpdateDoc<Employee>

  const result: Tx[] = []

  const txes = await mergeEmployee(control, uTx)
  result.push(...txes)

  return result
}

/**
 * @public
 */
export async function OnChannelUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const uTx = tx as TxUpdateDoc<Channel>

  const result: Tx[] = []

  if (uTx.operations.$inc?.items !== undefined) {
    const doc = (await control.findAll(uTx.objectClass, { _id: uTx.objectId }, { limit: 1 }))[0]
    if (doc !== undefined) {
      if (control.hierarchy.hasMixin(doc, notification.mixin.Collaborators)) {
        const collab = control.hierarchy.as(doc, notification.mixin.Collaborators) as Doc as Collaborators
        if (collab.collaborators.includes(tx.modifiedBy)) {
          result.push(
            control.txFactory.createTxMixin(doc._id, doc._class, doc.space, notification.mixin.Collaborators, {
              $push: {
                collaborators: tx.modifiedBy
              }
            })
          )
        }
      } else {
        const res = control.txFactory.createTxMixin<Doc, Collaborators>(
          doc._id,
          doc._class,
          doc.space,
          notification.mixin.Collaborators,
          {
            collaborators: [tx.modifiedBy]
          }
        )
        result.push(res)
      }
    }
  }

  return result
}

/**
 * @public
 */
export async function personHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const person = doc as Person
  const front = getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.name}/${contactId}/${doc._id}`
  const link = concatLink(front, path)
  return `<a href="${link}">${getName(person)}</a>`
}

/**
 * @public
 */
export function personTextPresenter (doc: Doc): string {
  const person = doc as Person
  return `${getName(person)}`
}

/**
 * @public
 */
export async function organizationHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const organization = doc as Organization
  const front = getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.name}/${contactId}/${doc._id}`
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
    OnEmployeeUpdate,
    OnChannelUpdate
  },
  function: {
    PersonHTMLPresenter: personHTMLPresenter,
    PersonTextPresenter: personTextPresenter,
    OrganizationHTMLPresenter: organizationHTMLPresenter,
    OrganizationTextPresenter: organizationTextPresenter
  }
})
