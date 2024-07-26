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

import core, {
  Client,
  Ref,
  systemAccountEmail,
  toWorkspaceString,
  TxOperations,
  WorkspaceId
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import chunter, { Channel } from '@hcengineering/chunter'
import contact, { Person, PersonAccount } from '@hcengineering/contact'
import { AnalyticEvent } from '@hcengineering/analytics-collector'
import { getOrCreateAnalyticsChannel } from '@hcengineering/server-analytics-collector-resources'

import { connectPlatform } from './platform'
import { eventToMarkup } from './format'

export class WorkspaceClient {
  client: Client | undefined
  opClient: TxOperations | undefined

  initializePromise: Promise<void> | undefined = undefined

  channelIdByKey = new Map<string, Ref<Channel>>()

  constructor (readonly workspace: WorkspaceId) {
    this.initializePromise = this.initClient().then(() => {
      this.initializePromise = undefined
    })
  }

  private async initClient (): Promise<void> {
    const token = generateToken(systemAccountEmail, this.workspace)
    this.client = await connectPlatform(token)

    if (this.client === undefined) {
      return
    }

    this.opClient = new TxOperations(this.client, core.account.System)
  }

  async getAccount (email: string): Promise<PersonAccount | undefined> {
    if (this.initializePromise instanceof Promise) {
      await this.initializePromise
    }

    if (this.opClient === undefined) {
      return
    }

    return await this.opClient.findOne(contact.class.PersonAccount, { email })
  }

  async getPerson (account: PersonAccount): Promise<Person | undefined> {
    if (this.initializePromise instanceof Promise) {
      await this.initializePromise
    }

    if (this.opClient === undefined) {
      return
    }

    return await this.opClient.findOne(contact.class.Person, { _id: account.person })
  }

  async pushEvents (events: AnalyticEvent[], email: string, workspace: WorkspaceId, person?: Person): Promise<void> {
    if (this.initializePromise instanceof Promise) {
      await this.initializePromise
    }

    if (this.opClient === undefined) {
      return
    }

    const wsString = toWorkspaceString(workspace)
    const channelKey = `${email}-${wsString}`

    const channel =
      this.channelIdByKey.get(channelKey) ?? (await getOrCreateAnalyticsChannel(this.opClient, email, wsString, person))

    if (channel === undefined) {
      return
    }

    this.channelIdByKey.set(channelKey, channel)

    for (const event of events) {
      const markup = await eventToMarkup(event, this.opClient.getHierarchy())

      if (markup === undefined) {
        continue
      }

      await this.opClient.addCollection(
        chunter.class.ChatMessage,
        channel,
        channel,
        chunter.class.Channel,
        'messages',
        { message: markup },
        undefined,
        event.timestamp
      )
    }
  }

  async close (): Promise<void> {
    if (this.client === undefined) {
      return
    }

    await this.opClient?.close()
    await this.client.close()
  }
}
