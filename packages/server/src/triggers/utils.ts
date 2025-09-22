//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type AccountUuid, type Markdown, type SocialID } from '@hcengineering/communication-types'

import { TriggerCtx } from '../types'

export async function getNameBySocialID (ctx: TriggerCtx, id: SocialID): Promise<string> {
  const account = (await ctx.client.findPersonUuid(ctx, id, true)) as AccountUuid | undefined
  return account != null ? (await ctx.client.db.getNameByAccount(account)) ?? 'System' : 'System'
}

export async function getAddCollaboratorsMessageContent (
  ctx: TriggerCtx,
  sender: AccountUuid | undefined,
  collaborators: AccountUuid[]
): Promise<Markdown> {
  if (sender != null && collaborators.length === 1 && collaborators.includes(sender)) {
    return 'Joined card'
  }

  const collaboratorsNames = (await Promise.all(collaborators.map((it) => ctx.client.db.getNameByAccount(it)))).filter(
    (it): it is string => it != null && it !== ''
  )

  return `Added ${collaboratorsNames.join(', ')}`
}

export async function getRemoveCollaboratorsMessageContent (
  ctx: TriggerCtx,
  sender: AccountUuid | undefined,
  collaborators: AccountUuid[]
): Promise<Markdown> {
  if (sender != null && collaborators.length === 1 && collaborators.includes(sender)) {
    return 'Left card'
  }

  const collaboratorsNames = (await Promise.all(collaborators.map((it) => ctx.client.db.getNameByAccount(it)))).filter(
    (it): it is string => it != null && it !== ''
  )

  return `Removed ${collaboratorsNames.join(', ')}`
}
