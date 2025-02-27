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
  PersonSpace,
  contactId,
  formatContactName,
  formatName,
  getFirstName,
  getLastName,
  getName
} from '@hcengineering/contact'
import core, {
  Doc,
  Hierarchy,
  Ref,
  SpaceType,
  Tx,
  TxCUD,
  TxMixin,
  TxRemoveDoc,
  TxUpdateDoc,
  concatLink,
  type Space,
  SocialIdType,
  AccountUuid
} from '@hcengineering/core'
import notification, { Collaborators } from '@hcengineering/notification'
import { getMetadata } from '@hcengineering/platform'
import { getAccountBySocialId, getTriggerCurrentPerson } from '@hcengineering/server-contact'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import { workbenchId } from '@hcengineering/workbench'

export async function OnSpaceTypeMembers (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const ctx = tx as TxUpdateDoc<SpaceType>
    const newMember = ctx.operations.$push?.members as AccountUuid
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
    const oldMember = ctx.operations.$pull?.members as AccountUuid
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
  }
  return result
}

export async function OnEmployeeCreate (_txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of _txes) {
    const mixinTx = tx as TxMixin<Person, Employee>
    if (mixinTx.attributes.active !== true) continue

    const person = (await control.findAll(control.ctx, contact.class.Person, { _id: mixinTx.objectId }))[0]
    const account = person?.personUuid as AccountUuid
    if (account === undefined) continue

    const spaces = await control.findAll(control.ctx, core.class.Space, { autoJoin: true })

    const txes = await createPersonSpace(account, mixinTx.objectId, control)
    result.push(...txes)

    for (const space of spaces) {
      if (space.members.includes(account)) continue

      const pushTx = control.txFactory.createTxUpdateDoc(space._class, space.space, space._id, {
        $push: {
          members: account
        }
      })
      result.push(pushTx)
    }
  }
  return result
}

async function createPersonSpace (
  account: AccountUuid,
  person: Ref<Person>,
  control: TriggerControl
): Promise<TxCUD<PersonSpace>[]> {
  const personSpace = (await control.findAll(control.ctx, contact.class.PersonSpace, { person }, { limit: 1 }))[0]
  if (personSpace !== undefined) return []

  return [
    control.txFactory.createTxCreateDoc(contact.class.PersonSpace, core.space.Space, {
      name: 'Personal space',
      description: '',
      private: true,
      archived: false,
      person,
      members: [account]
    })
  ]
}

/**
 * @public
 */
export async function OnContactDelete (
  txes: Tx[],
  { findAll, hierarchy, storageAdapter, workspace, removedMap, txFactory, ctx }: TriggerControl
): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const rmTx = tx as TxRemoveDoc<Contact>

    const removeContact = removedMap.get(rmTx.objectId) as Contact
    if (removeContact === undefined) {
      continue
    }

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
  }

  return result
}

/**
 * @public
 */
export async function OnChannelUpdate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []

  for (const tx of txes) {
    const uTx = tx as TxUpdateDoc<Channel>

    if (uTx.operations.$inc?.items !== undefined) {
      const doc = (await control.findAll(control.ctx, uTx.objectClass, { _id: uTx.objectId }, { limit: 1 }))[0]
      const account = await getAccountBySocialId(control, tx.modifiedBy)
      if (doc !== undefined && account != null) {
        if (control.hierarchy.hasMixin(doc, notification.mixin.Collaborators)) {
          const collab = control.hierarchy.as(doc, notification.mixin.Collaborators) as Doc as Collaborators
          if (collab.collaborators.includes(account)) {
            result.push(
              control.txFactory.createTxMixin(doc._id, doc._class, doc.space, notification.mixin.Collaborators, {
                $push: {
                  collaborators: account
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
              collaborators: [account]
            }
          )
          result.push(res)
        }
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
  const path = `${workbenchId}/${control.workspace.url}/${contactId}/${doc._id}`
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
  const path = `${workbenchId}/${control.workspace.url}/${contactId}/${doc._id}`
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
export function contactNameProvider (
  doc: Doc,
  parent: Doc | undefined,
  space: Space | undefined,
  hierarchy: Hierarchy,
  mode: string
): string {
  if (parent !== undefined && hierarchy.isDerived(parent._class, contact.class.Contact)) {
    return formatContactName(hierarchy, parent._class, (parent as Contact).name ?? '', mode)
  }
  return formatContactName(hierarchy, doc._class, (doc as Contact).name ?? '', mode)
}

export async function getCurrentEmployeeName (control: TriggerControl, context: Record<string, Doc>): Promise<string> {
  const person = await getTriggerCurrentPerson(control)

  return person !== undefined ? formatName(person.name, control.branding?.lastNameFirst) : ''
}

export async function getCurrentEmployeeEmail (control: TriggerControl, context: Record<string, Doc>): Promise<string> {
  const person = await getTriggerCurrentPerson(control)
  if (person === undefined) return ''

  const emailSocialId = (
    await control.findAll(control.ctx, contact.class.SocialIdentity, {
      attachedTo: person._id,
      attachedToClass: contact.class.Person,
      type: SocialIdType.EMAIL
    })
  )[0]
  if (emailSocialId === undefined) return ''

  return emailSocialId.value
}

export async function getCurrentEmployeePosition (
  control: TriggerControl,
  context: Record<string, Doc>
): Promise<string | undefined> {
  const person = await getTriggerCurrentPerson(control)
  if (person === undefined) return ''

  return control.hierarchy.as(person, contact.mixin.Employee)?.position ?? ''
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
