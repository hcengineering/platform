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
  Organization,
  Person,
  PersonAccount,
  contactId,
  formatContactName,
  formatName,
  getFirstName,
  getLastName,
  getName
} from '@hcengineering/contact'
import { Class, Doc, Hierarchy, Ref, Tx, TxRemoveDoc, TxUpdateDoc, concatLink } from '@hcengineering/core'
import notification, { Collaborators } from '@hcengineering/notification'
import { getMetadata } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import { workbenchId } from '@hcengineering/workbench'

/**
 * @public
 */
export async function OnContactDelete (
  tx: Tx,
  { findAll, hierarchy, storageFx, removedMap, txFactory, ctx }: TriggerControl
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
    await adapter.remove(ctx, bucket, [avatar])

    if (avatar != null) {
      const extra = await adapter.list(ctx, bucket, avatar)
      if (extra.length > 0) {
        await adapter.remove(
          ctx,
          bucket,
          Array.from(extra.entries()).map((it) => it[1]._id)
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
  const path = `${workbenchId}/${control.workspace.workspaceUrl}/${contactId}/${doc._id}`
  const link = concatLink(front, path)
  return `<a href="${link}">${getName(control.hierarchy, person)}</a>`
}

/**
 * @public
 */
export function personTextPresenter (doc: Doc, control: TriggerControl): string {
  const person = doc as Person
  return `${getName(control.hierarchy, person)}`
}

/**
 * @public
 */
export async function organizationHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const organization = doc as Organization
  const front = getMetadata(serverCore.metadata.FrontUrl) ?? ''
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
  return formatContactName(hierarchy, _class, props.name ?? '')
}

export async function getCurrentEmployeeName (control: TriggerControl, context: Record<string, Doc>): Promise<string> {
  const account = await control.modelDb.findOne(contact.class.PersonAccount, {
    _id: control.txFactory.account as Ref<PersonAccount>
  })
  if (account === undefined) return ''
  const employee = (await control.findAll(contact.class.Person, { _id: account.person }))[0]
  return employee !== undefined ? formatName(employee.name) : ''
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
  const employee = (await control.findAll(contact.class.Person, { _id: account.person }))[0]
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
    return getName(control.hierarchy, value)
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
    OnContactDelete,
    OnChannelUpdate
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
