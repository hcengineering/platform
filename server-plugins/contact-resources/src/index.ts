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

import contact, { Contact, contactId, formatName, Organization, Person } from '@hcengineering/contact'
import core, { concatLink, Doc, Tx, TxRemoveDoc } from '@hcengineering/core'
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
    OnContactDelete
  },
  function: {
    PersonHTMLPresenter: personHTMLPresenter,
    PersonTextPresenter: personTextPresenter,
    OrganizationHTMLPresenter: organizationHTMLPresenter,
    OrganizationTextPresenter: organizationTextPresenter
  }
})
