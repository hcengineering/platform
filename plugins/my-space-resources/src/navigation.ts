//
// Copyright © 2025 Hardcore Engineering Inc.
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

import type { Client, Doc, Ref, Space, TxOperations } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { getPanelURI, type Location, type ResolvedLocation } from '@hcengineering/ui'
import view, { type ObjectPanel } from '@hcengineering/view'
import { accessDeniedStore } from '@hcengineering/view-resources'
import contact, { type Employee, getCurrentEmployee } from '@hcengineering/contact'
import mail from '@hcengineering/mail'
import { mySpaceId } from '@hcengineering/my-space'

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== mySpaceId) {
    return undefined
  }

  if (loc.path[3] === 'mail') {
    const threadId = loc.path[5] as Ref<Doc>
    return await generateMailLocation(loc, threadId)
  }

  return undefined
}

function getPanelFragment<T extends Doc> (object: Pick<T, '_class' | '_id'>): string {
  const hierarchy = getClient().getHierarchy()
  const objectPanelMixin = hierarchy.classHierarchyMixin<Doc, ObjectPanel>(object._class, view.mixin.ObjectPanel)
  const component = objectPanelMixin?.component ?? view.component.EditDoc
  return getPanelURI(component, object._id, object._class, 'content')
}

async function generateMailLocation (loc: Location, id: Ref<Doc>): Promise<ResolvedLocation | undefined> {
  const client = getClient()

  const employee = getCurrentEmployee()
  const personSpace = await getPersonSpace(client, employee)
  if (personSpace === undefined) {
    console.error(`Could not find person space for employee ${employee}.`)
    return undefined
  }

  let doc: Doc | undefined
  if (id !== undefined) {
    doc = await client.findOne(mail.class.MailThread, { _id: id, space: personSpace })
    if (doc === undefined) {
      accessDeniedStore.set(true)
      console.error(`Could not find mail ${id}.`)
      return undefined
    }
  }

  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''

  const fragment = doc !== undefined ? getPanelFragment(doc) : loc.fragment
  return {
    loc: {
      path: [appComponent, workspace, mySpaceId, personSpace, 'mail'],
      fragment
    },
    defaultLocation: {
      path: [appComponent, workspace, mySpaceId, personSpace, 'mail'],
      fragment
    }
  }
}

async function getPersonSpace (client: TxOperations & Client, employee: Ref<Employee>): Promise<Ref<Space> | undefined> {
  if (employee === undefined) {
    return undefined
  }
  const space = await client.findOne(contact.class.PersonSpace, { person: employee }, { projection: { _id: 1 } })
  return space?._id
}
