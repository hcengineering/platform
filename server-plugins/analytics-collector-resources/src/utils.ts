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
import chunter, { Channel } from '@hcengineering/chunter'
import core, { AccountRole, Ref, TxOperations } from '@hcengineering/core'
import analyticsCollector, { getAnalyticsChannelName } from '@hcengineering/analytics-collector'
import contact, { Person } from '@hcengineering/contact'
import { translate } from '@hcengineering/platform'

export async function getOrCreateAnalyticsChannel (
  client: TxOperations,
  email: string,
  workspace: string,
  person?: Person
): Promise<Ref<Channel> | undefined> {
  const channel = await client.findOne(chunter.class.Channel, {
    [`${analyticsCollector.mixin.AnalyticsChannel}.workspace`]: workspace,
    [`${analyticsCollector.mixin.AnalyticsChannel}.email`]: email
  })

  if (channel !== undefined) {
    return channel._id
  }

  const accounts = await client.findAll(contact.class.PersonAccount, { role: { $ne: AccountRole.Guest } })

  const _id = await client.createDoc(chunter.class.Channel, core.space.Space, {
    name: getAnalyticsChannelName(workspace, email),
    topic: await translate(analyticsCollector.string.AnalyticsChannelDescription, {
      user: person?.name ?? email,
      workspace
    }),
    description: '',
    private: false,
    members: accounts.map(({ _id }) => _id),
    autoJoin: true,
    archived: false
  })

  await client.createMixin(_id, chunter.class.Channel, core.space.Space, analyticsCollector.mixin.AnalyticsChannel, {
    workspace,
    email
  })

  return _id
}
