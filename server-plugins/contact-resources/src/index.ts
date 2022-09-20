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

import core, { Doc, Tx, TxCreateDoc, TxRemoveDoc, TxUpdateDoc } from '@hcengineering/core'
import type { TriggerControl, MinioClient, BucketItem } from '@hcengineering/server-core'
import contact, { Contact, contactId, formatName, Organization, Person } from '@hcengineering/contact'
import { getMetadata } from '@hcengineering/platform'
import login from '@hcengineering/login'
import { workbenchId } from '@hcengineering/workbench'
import view from '@hcengineering/view'

/**
 * @public
 */
export async function OnContactDelete (tx: Tx, { findAll, hierarchy, storageFx }: TriggerControl): Promise<Tx[]> {
  if (tx._class !== core.class.TxRemoveDoc) {
    return []
  }

  const rmTx = tx as TxRemoveDoc<Contact>

  if (!hierarchy.isDerived(rmTx.objectClass, contact.class.Contact)) {
    return []
  }

  const createTx = (await findAll<TxCreateDoc<Contact>>(core.class.TxCreateDoc, { objectId: rmTx.objectId }))[0]
  if (createTx === undefined) {
    return []
  }

  const updateTxes = await findAll<TxUpdateDoc<Contact>>(core.class.TxUpdateDoc, { objectId: rmTx.objectId })
  const avatar: string | undefined = [createTx.attributes.avatar, ...updateTxes.map((x) => x.operations.avatar)]
    .filter((x): x is string => x !== undefined)
    .slice(-1)[0]

  if (avatar === undefined) {
    return []
  }

  storageFx(async (adapter, bucket) => {
    await adapter.removeObject(bucket, avatar)

    const extra = await listMinioObjects(adapter, bucket, avatar)
    if (extra.size > 0) {
      for (const e of extra.entries()) {
        await adapter.removeObject(bucket, e[1].name)
      }
    }
  })

  return []
}

/**
 * @public
 */
export function personHTMLPresenter (doc: Doc): string {
  const person = doc as Person
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbenchId}/${contactId}#${view.component.EditDoc}|${person._id}|${
    person._class
  }">${formatName(person.name)}</a>`
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
export function organizationHTMLPresenter (doc: Doc): string {
  const organization = doc as Organization
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbenchId}/${contactId}#${view.component.EditDoc}|${organization._id}|${organization._class}">${organization.name}</a>`
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

async function listMinioObjects (client: MinioClient, db: string, prefix: string): Promise<Map<string, BucketItem>> {
  const items = new Map<string, BucketItem>()
  const list = await client.listObjects(db, prefix, true)
  await new Promise((resolve) => {
    list.on('data', (data) => {
      items.set(data.name, { ...data })
    })
    list.on('end', () => {
      resolve(null)
    })
  })
  return items
}
