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

import { Account, Ref, Space } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import support from '@hcengineering/support'

export async function markHasUnreadMessages (user: Ref<Account>, hasUnreadMessages: boolean): Promise<void> {
  const client = getClient()

  const doc = await client.findOne(support.class.SupportStatus, { user })
  if (doc !== undefined) {
    await client.update(doc, { hasUnreadMessages })
  } else {
    await client.createDoc(support.class.SupportStatus, user as string as Ref<Space>, { user, hasUnreadMessages })
  }
}
