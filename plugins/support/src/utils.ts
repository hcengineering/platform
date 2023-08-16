//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { Account, Ref, Space, TxOperations } from '@hcengineering/core'

import support from '.'

/**
 * @public
 */
export async function updateSupportConversation (
  client: TxOperations,
  account: Ref<Account>,
  conversationId: string,
  hasUnreadMessages: boolean
): Promise<void> {
  const space = account as string as Ref<Space>
  const doc = await client.findOne(support.class.SupportConversation, { conversationId, space })
  if (doc !== undefined) {
    await client.update(doc, { hasUnreadMessages }, undefined, undefined, account)
  } else {
    await client.createDoc(
      support.class.SupportConversation,
      space,
      { conversationId, hasUnreadMessages },
      undefined,
      undefined,
      account
    )
  }
}

/**
 * @public
 */
export async function deleteSupportConversation (
  client: TxOperations,
  account: Ref<Account>,
  conversationId: string
): Promise<void> {
  const space = account as string as Ref<Space>
  const doc = await client.findOne(support.class.SupportConversation, { conversationId, space })
  if (doc !== undefined) {
    await client.remove(doc, undefined, account)
  }
}
