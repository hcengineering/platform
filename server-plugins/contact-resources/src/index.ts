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
  Employee,
  Organization,
  Person,
  PersonAccount,
  PersonSpace,
  contactId,
  formatContactName,
  formatName,
  getFirstName,
  getLastName,
  getName
} from '@hcengineering/contact'
import core, {
  Account,
  Class,
  Doc,
  Hierarchy,
  Ref,
  SpaceType,
  Tx,
  TxCUD,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  concatLink
} from '@hcengineering/core'
import notification, { Collaborators } from '@hcengineering/notification'
import { getMetadata } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import { workbenchId } from '@hcengineering/workbench'

export async function OnSpaceTypeMembers (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const ctx = tx as TxUpdateDoc<SpaceType>
  const result: Tx[] = []
  const newMember = ctx.operations.$push?.members as Ref<Account>
  if (newMember !== undefined) {
    const spaces = await control.findAll(control.ctx, core.class.Space, { type: ctx.objectId })
    for (const space of spaces) {
      if (space.members.includes(newMember)) continue
      const pushTx = control.txFactory.createTxUpdateDoc(space._class, space.space, space._id, {
        $push: {
          members: newMember
        }
      })
      result.push(pushTx)
    }
  }
  const oldMember = ctx.operations.$pull?.members as Ref<Account>
  if (ctx.operations.$pull?.members !== undefined) {
    const spaces = await control.findAll(control.ctx, core.class.Space, { type: ctx.objectId })
    for (const space of spaces) {
      if (!space.members.includes(oldMember)) continue
      const pullTx = control.txFactory.createTxUpdateDoc(space._class, space.space, space._id, {
        $pull: {
          members: oldMember
        }
      })
      result.push(pullTx)
    }
  }
  return result
}

export async function OnEmployeeCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const mixinTx = tx as TxMixin<Person, Employee>
  if (mixinTx.attributes.active !== true) return []
  const acc = control.modelDb.getAccountByPersonId(mixinTx.objectId)
  if (acc.length === 0) return []
  const spaces = await control.findAll(control.ctx, core.class.Space, { autoJoin: true })
  const result: Tx[] = []

  const txes = await createPersonSpace(
    acc.map((it) => it._id),
    mixinTx.objectId,
    control
  )
  result.push(...txes)

  for (const space of spaces) {
    const toAdd = acc.filter((it) => !space.members.includes(it._id))
    if (toAdd.length === 0) continue
    for (const a of toAdd) {
      const pushTx = control.txFactory.createTxUpdateDoc(space._class, space.space, space._id, {
        $push: {
          members: a._id
        }
      })
      result.push(pushTx)
    }
  }
  return result
}

async function createPersonSpace (
  account: Ref<Account>[],
  person: Ref<Person>,
  control: TriggerControl
): Promise<TxCUD<PersonSpace>[]> {
  const personSpace = (await control.findAll(control.ctx, contact.class.PersonSpace, { person }, { limit: 1 })).shift()
  if (personSpace !== undefined) {
    const toAdd = account.filter((it) => !personSpace.members.includes(it))
    if (toAdd.length === 0) return []
    return toAdd.map((it) =>
      control.txFactory.createTxUpdateDoc(personSpace._class, personSpace.space, personSpace._id, {
        $push: {
          members: it
        }
      })
    )
  }

  return [
    control.txFactory.createTxCreateDoc(contact.class.PersonSpace, core.space.Space, {
      name: 'Personal space',
      description: '',
      private: true,
      archived: false,
      person,
      members: account
    })
  ]
}

export async function OnPersonAccountCreate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const acc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<PersonAccount>)
  const person = (
    await control.findAll(
      control.ctx,
      contact.mixin.Employee,
      { _id: acc.person as Ref<Employee>, active: true },
      { limit: 1 }
    )
  )[0]
  if (person === undefined) return []
  const spaces = await control.findAll(control.ctx, core.class.Space, { autoJoin: true })

  const result: Tx[] = []
  const txes = await createPersonSpace([acc._id], person._id, control)

  result.push(...txes)

  for (const space of spaces) {
    if (space.members.includes(acc._id)) continue
    const pushTx = control.txFactory.createTxUpdateDoc(space._class, space.space, space._id, {
      $push: {
        members: acc._id
      }
    })
    result.push(pushTx)
  }
  return result
}

/**
 * @public
 */
export async function OnContactDelete (
  tx: Tx,
  { findAll, hierarchy, storageAdapter, workspace, removedMap, txFactory, ctx }: TriggerControl
): Promise<Tx[]> {
  const rmTx = tx as TxRemoveDoc<Contact>

  const removeContact = removedMap.get(rmTx.objectId) as Contact
  if (removeContact === undefined) {
    return []
  }

  const result: Tx[] = []

  const members = await findAll(ctx, contact.class.Member, { contact: removeContact._id })
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

/**
 * @public
 */
export async function OnChannelUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const uTx = tx as TxUpdateDoc<Channel>

  const result: Tx[] = []

  if (uTx.operations.$inc?.items !== undefined) {
    const doc = (await control.findAll(control.ctx, uTx.objectClass, { _id: uTx.objectId }, { limit: 1 }))[0]
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
  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.workspaceUrl}/${contactId}/${doc._id}`
  const link = concatLink(front, path)
  return `<a href="${link}">${getName(control.hierarchy, person, control.branding?.lastNameFirst)}</a>`
}

/**
 * @public
 */
export function personTextPresenter (doc: Doc, control: TriggerControl): string {
  const person = doc as Person
  return `${getName(control.hierarchy, person, control.branding?.lastNameFirst)}`
}

/**
 * @public
 */
export async function organizationHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const organization = doc as Organization
  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.workspaceUrl}/${contactId}/${doc._id}`
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

/**
 * @public
 */
export function contactNameProvider (hierarchy: Hierarchy, props: Record<string, string>): string {
  const _class = props._class !== undefined ? (props._class as Ref<Class<Doc>>) : contact.class.Contact
  return formatContactName(hierarchy, _class, props.name ?? '', props.lastNameFirst)
}

export async function getCurrentEmployeeName (control: TriggerControl, context: Record<string, Doc>): Promise<string> {
  const account = await control.modelDb.findOne(contact.class.PersonAccount, {
    _id: control.txFactory.account as Ref<PersonAccount>
  })
  if (account === undefined) return ''
  const employee = (await control.findAll(control.ctx, contact.class.Person, { _id: account.person }))[0]
  return employee !== undefined ? formatName(employee.name, control.branding?.lastNameFirst) : ''
}

export async function getCurrentEmployeeEmail (control: TriggerControl, context: Record<string, Doc>): Promise<string> {
  const account = await control.modelDb.findOne(contact.class.PersonAccount, {
    _id: control.txFactory.account as Ref<PersonAccount>
  })
  if (account === undefined) return ''
  return account.email
}

export async function getCurrentEmployeePosition (
  control: TriggerControl,
  context: Record<string, Doc>
): Promise<string | undefined> {
  const account = await control.modelDb.findOne(contact.class.PersonAccount, {
    _id: control.txFactory.account as Ref<PersonAccount>
  })
  if (account === undefined) return ''
  const employee = (await control.findAll(control.ctx, contact.class.Person, { _id: account.person }))[0]
  if (employee !== undefined) {
    return control.hierarchy.as(employee, contact.mixin.Employee)?.position ?? ''
  }
}

export async function getContactName (
  control: TriggerControl,
  context: Record<string, Doc>
): Promise<string | undefined> {
  const value = context[contact.class.Contact] as Contact
  if (value === undefined) return
  if (control.hierarchy.isDerived(value._class, contact.class.Person)) {
    return getName(control.hierarchy, value, control.branding?.lastNameFirst)
  } else {
    return value.name
  }
}

export async function getContactLastName (
  control: TriggerControl,
  context: Record<string, Doc>
): Promise<string | undefined> {
  const value = context[contact.class.Contact] as Contact
  if (value === undefined) return
  if (control.hierarchy.isDerived(value._class, contact.class.Person)) {
    return getLastName(value.name)
  } else {
    return ''
  }
}

export async function getContactFirstName (
  control: TriggerControl,
  context: Record<string, Doc>
): Promise<string | undefined> {
  const value = context[contact.class.Contact] as Contact
  if (value === undefined) return
  if (control.hierarchy.isDerived(value._class, contact.class.Person)) {
    return getFirstName(value.name)
  } else {
    return value.name
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnEmployeeCreate,
    OnPersonAccountCreate,
    OnContactDelete,
    OnChannelUpdate,
    OnSpaceTypeMembers
  },
  function: {
    PersonHTMLPresenter: personHTMLPresenter,
    PersonTextPresenter: personTextPresenter,
    OrganizationHTMLPresenter: organizationHTMLPresenter,
    OrganizationTextPresenter: organizationTextPresenter,
    ContactNameProvider: contactNameProvider,
    GetCurrentEmployeeName: getCurrentEmployeeName,
    GetCurrentEmployeeEmail: getCurrentEmployeeEmail,
    GetContactName: getContactName,
    GetCurrentEmployeePosition: getCurrentEmployeePosition,
    GetContactFirstName: getContactFirstName,
    GetContactLastName: getContactLastName
  }
})
