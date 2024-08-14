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
  MeasureContext,
  RateLimiter,
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

  rate = new RateLimiter(1)

  constructor (
    readonly ctx: MeasureContext,
    readonly workspace: WorkspaceId
  ) {
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

  async getChannel (
    client: TxOperations,
    workspace: string,
    workspaceName: string,
    email: string,
    person?: Person
  ): Promise<Ref<Channel> | undefined> {
    const key = `${email}-${workspace}`
    if (this.channelIdByKey.has(key)) {
      return this.channelIdByKey.get(key)
    }

    const channel = await getOrCreateAnalyticsChannel(this.ctx, client, email, workspace, workspaceName, person)

    if (channel !== undefined) {
      this.channelIdByKey.set(key, channel)
    }

    return channel
  }

  async processEvents (
    client: TxOperations,
    events: AnalyticEvent[],
    email: string,
    workspace: WorkspaceId,
    person?: Person,
    wsUrl?: string,
    channelRef?: Ref<Channel>
  ): Promise<void> {
    const wsString = toWorkspaceString(workspace)
    const channel = channelRef ?? (await this.getChannel(client, wsString, wsUrl ?? wsString, email, person))

    if (channel === undefined) {
      return
    }

    for (const event of events) {
      const markup = await eventToMarkup(event, client.getHierarchy())

      if (markup === undefined) {
        continue
      }

      await client.addCollection(
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

  async pushEvents (
    events: AnalyticEvent[],
    email: string,
    workspace: WorkspaceId,
    person?: Person,
    wsUrl?: string
  ): Promise<void> {
    if (this.initializePromise instanceof Promise) {
      await this.initializePromise
    }

    if (this.opClient === undefined) {
      return
    }

    const wsString = toWorkspaceString(workspace)
    const channelKey = `${email}-${wsString}`

    if (this.channelIdByKey.has(channelKey)) {
      const channel = this.channelIdByKey.get(channelKey)
      await this.processEvents(this.opClient, events, email, workspace, person, wsUrl, channel)
    } else {
      // If we dont have AnalyticsChannel we should call it sync to prevent multiple channels for the same user and workspace
      await this.rate.add(async () => {
        if (this.opClient === undefined) return
        await this.processEvents(this.opClient, events, email, workspace, person, wsUrl)
      })
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
