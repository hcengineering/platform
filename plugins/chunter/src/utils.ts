//
// Copyright © 2024 Hardcore Engineering Inc.
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
import { deepEqual } from 'fast-equals'
import core, { Account, Doc, Markup, Ref, TxOperations } from '@hcengineering/core'
import { PersonAccount, PersonSpace } from '@hcengineering/contact'
import { ActivityMessage } from '@hcengineering/activity'

import chunter, { DirectMessage, PrivateChatMessage, PrivateThreadMessage } from '.'

/**
 * @public
 */
export async function getDirectChannel (
  client: TxOperations,
  me: Ref<PersonAccount>,
  employeeAccount: Ref<PersonAccount>
): Promise<Ref<DirectMessage>> {
  const accIds = [me, employeeAccount].sort()
  const existingDms = await client.findAll(chunter.class.DirectMessage, {})
  for (const dm of existingDms) {
    if (deepEqual(dm.members, accIds)) {
      return dm._id
    }
  }

  return await client.createDoc(chunter.class.DirectMessage, core.space.Space, {
    name: '',
    description: '',
    private: true,
    archived: false,
    members: accIds
  })
}

export async function createPrivateMessage (
  client: TxOperations,
  markup: Markup,
  space: Ref<PersonSpace>,
  context: Pick<Doc, '_id' | '_class'>,
  account: Ref<Account>
): Promise<void> {
  await client.addCollection<Doc, PrivateChatMessage>(
    chunter.class.PrivateChatMessage,
    space,
    context._id,
    context._class,
    'messages',
    { message: markup, attachments: 0 },
    undefined,
    undefined,
    account
  )
}

export async function createPrivateThreadMessage (
  client: TxOperations,
  markup: Markup,
  space: Ref<PersonSpace>,
  context: Pick<ActivityMessage, '_id' | '_class' | 'attachedTo' | 'attachedToClass'>,
  account: Ref<Account>
): Promise<void> {
  await client.addCollection<ActivityMessage, PrivateThreadMessage>(
    chunter.class.PrivateThreadMessage,
    space,
    context._id,
    context._class,
    'replies',
    {
      message: markup,
      attachments: 0,
      objectClass: context.attachedToClass,
      objectId: context.attachedTo
    },
    undefined,
    undefined,
    account
  )
}
