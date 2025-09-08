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

import card from '@hcengineering/card'
import contact, {
  Channel,
  Contact,
  contactId,
  Employee,
  formatContactName,
  formatName,
  getFirstName,
  getLastName,
  getName,
  Organization,
  Person,
  PersonSpace,
  type UserProfile
} from '@hcengineering/contact'
import core, {
  AccountRole,
  AccountUuid,
  concatLink,
  Doc,
  Hierarchy,
  MarkupBlobRef,
  Ref,
  SocialIdType,
  type Space,
  SpaceType,
  systemAccountUuid,
  readOnlyGuestAccountUuid,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxRemoveDoc,
  TxUpdateDoc,
  TypedSpace,
  TxFactory,
  PermissionsGrant
} from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { makeRank } from '@hcengineering/rank'
import { getAccountBySocialId, getCurrentPerson } from '@hcengineering/server-contact'
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

async function getGrantSpaces (control: TriggerControl, grant?: PermissionsGrant): Promise<Space[]> {
  const spacesRefs = grant?.spaces
  if (spacesRefs == null) {
    return []
  }

  const grantSpaces = await control.findAll(control.ctx, core.class.Space, { _id: { $in: spacesRefs } })
  const allowedGrantedSpaces: Space[] = []

  for (const space of grantSpaces) {
    if (!space.private) {
      allowedGrantedSpaces.push(space)
      continue
    }

    const grantedBy = grant?.grantedBy
    if (grantedBy == null) {
      control.ctx.warn('Granted private space access without grantor is not allowed', { space })
      continue
    }

    if (space.members.includes(grantedBy)) {
      allowedGrantedSpaces.push(space)
    } else {
      control.ctx.warn('Granted private space access but the grantor is not a member of the workspace', {
        space,
        grantedBy
      })
    }
  }

  return allowedGrantedSpaces
}

export async function OnEmployeeCreate (_txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []

  const systemTxFactory = new TxFactory(core.account.System, false)
  const systemTxes: Tx[] = []

  for (const tx of _txes) {
    const mixinTx = tx as TxMixin<Person, Employee>
    if (mixinTx.attributes.active !== true) continue

    const person = (await control.findAll(control.ctx, contact.class.Person, { _id: mixinTx.objectId }))[0]
    const account = person?.personUuid as AccountUuid
    if (account === undefined) continue

    const txes = await createPersonSpace(account, mixinTx.objectId, control)
    result.push(...txes)

    const emp = control.hierarchy.as(person, contact.mixin.Employee)
    if (emp.role === 'GUEST') {
      let readOnlyGuestSpaces: Space[] = []
      const readonlyEmployees = await control.findAll(control.ctx, contact.mixin.Employee, {
        personUuid: readOnlyGuestAccountUuid
      })
      if (readonlyEmployees.length !== 0) {
        const readonlyEmployee = readonlyEmployees[0]
        if (readonlyEmployee.active) {
          readOnlyGuestSpaces = await control.findAll(control.ctx, core.class.Space, {
            members: readOnlyGuestAccountUuid
          })
        }
      }

      const grantSpaces = await getGrantSpaces(control, control.ctx.contextData.grant)

      for (const space of [...readOnlyGuestSpaces, ...grantSpaces]) {
        if (space._class === contact.class.PersonSpace || space.members.includes(account)) continue

        const pushTx = systemTxFactory.createTxUpdateDoc(space._class, space.space, space._id, {
          $push: {
            members: account
          }
        })
        systemTxes.push(pushTx)
      }

      const collabs = await control.findAll(control.ctx, core.class.Collaborator, {
        collaborator: readOnlyGuestAccountUuid
      })

      for (const collab of collabs) {
        const pushTx = systemTxFactory.createTxCreateDoc(core.class.Collaborator, collab.space, {
          attachedTo: collab.attachedTo,
          collaborator: account,
          attachedToClass: collab.attachedToClass,
          collection: 'collaborators'
        })
        systemTxes.push(pushTx)
      }

      continue
    }

    const spaces = await control.findAll(control.ctx, core.class.Space, { autoJoin: true })
    const grantSpaces = await getGrantSpaces(control, control.ctx.contextData.grant)

    for (const space of [...spaces, ...grantSpaces]) {
      if (space.members.includes(account)) continue

      const pushTx = systemTxFactory.createTxUpdateDoc(space._class, space.space, space._id, {
        $push: {
          members: account
        }
      })
      systemTxes.push(pushTx)
    }
  }

  await control.apply(control.ctx, systemTxes)

  const account = control.ctx.contextData.account
  if (account.role !== AccountRole.Owner) return result

  const typedSpaces: Space[] = [
    ...(await control.findAll(control.ctx, core.class.TypedSpace, {})),
    ...(await control.findAll(control.ctx, card.class.CardSpace, { space: core.space.Space }))
  ]

  for (const space of typedSpaces) {
    if (space === undefined) continue

    const owners = space.owners ?? []

    if (owners.length === 0 || (owners.length === 1 && owners[0] === systemAccountUuid)) {
      result.push(
        control.txFactory.createTxUpdateDoc(space._class, space.space, space._id, {
          owners: [account.uuid]
        })
      )
    }
  }

  return result
}

export async function OnTypedSpaceCreate (_txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of _txes) {
    const ctx = tx as TxCreateDoc<TypedSpace>
    const owners = ctx.attributes.owners ?? []

    if (owners.length === 0 || (owners.length === 1 && owners[0] === systemAccountUuid)) {
      const members = ctx.attributes.members
      if (members.length === 0) continue
      result.push(
        control.txFactory.createTxUpdateDoc(ctx.objectClass, ctx.space, ctx.objectId, {
          owners: [members[0]]
        })
      )
    }
  }
  return result
}

export async function OnPersonCreate (_txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of _txes) {
    const ctx = tx as TxCreateDoc<Person>
    const userProfileTx = control.txFactory.createTxCreateDoc<UserProfile>(contact.class.UserProfile, ctx.objectSpace, {
      person: ctx.objectId,
      title: formatName(ctx.attributes.name),
      rank: makeRank(undefined, undefined),
      content: '' as MarkupBlobRef,
      parentInfo: [],
      blobs: {}
    })

    result.push(userProfileTx)
    result.push(
      control.txFactory.createTxUpdateDoc<Person>(ctx.objectClass, ctx.objectSpace, ctx.objectId, {
        profile: userProfileTx.objectId
      })
    )
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
        const tx = control.txFactory.createTxCreateDoc(core.class.Collaborator, doc.space, {
          attachedTo: doc._id,
          attachedToClass: doc._class,
          collection: 'collaborators',
          collaborator: account
        })
        result.push(tx)
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
  const person = await getCurrentPerson(control)

  return person !== undefined ? formatName(person.name, control.branding?.lastNameFirst) : ''
}

export async function getCurrentEmployeeEmail (control: TriggerControl, context: Record<string, Doc>): Promise<string> {
  const person = await getCurrentPerson(control)
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
  const person = await getCurrentPerson(control)
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
    OnTypedSpaceCreate,
    OnPersonCreate,
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
