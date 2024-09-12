//
// Copyright © 2022 Hardcore Engineering Inc.
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

import contact, { type Employee, type PersonAccount, type Channel as PlatformChannel } from '@hcengineering/contact'
import core, {
  type Account,
  type AttachedDoc,
  type Client,
  type Doc,
  MeasureContext,
  type Ref,
  type Tx,
  type TxCollectionCUD,
  type TxCreateDoc,
  TxProcessor,
  type TxRemoveDoc,
  type TxUpdateDoc
} from '@hcengineering/core'
import gmailP, { type NewMessage } from '@hcengineering/gmail'
import type { StorageAdapter } from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import { type Db } from 'mongodb'
import { getClient } from './client'
import config from './config'
import { GmailClient } from './gmail'
import { type Channel, type ProjectCredentials, type User } from './types'

export class WorkspaceClient {
  private messageSubscribed: boolean = false
  private channels: Map<string, Channel> = new Map<string, Channel>()
  private channelsById: Map<Ref<Channel>, Channel> = new Map<Ref<Channel>, Channel>()
  private readonly txHandlers: ((...tx: Tx[]) => Promise<void>)[] = []

  private client!: Client
  private readonly clients: Map<Ref<Account>, GmailClient> = new Map<Ref<Account>, GmailClient>()

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly credentials: ProjectCredentials,
    private readonly mongo: Db,
    private readonly storageAdapter: StorageAdapter,
    private readonly workspace: string
  ) {}

  static async create (
    ctx: MeasureContext,
    credentials: ProjectCredentials,
    mongo: Db,
    storageAdapter: StorageAdapter,
    workspace: string
  ): Promise<WorkspaceClient> {
    const instance = new WorkspaceClient(ctx, credentials, mongo, storageAdapter, workspace)
    await instance.initClient(workspace)
    return instance
  }

  async createGmailClient (user: User): Promise<GmailClient> {
    const current = this.getGmailClient(user.userId)
    if (current !== undefined) return current
    const newClient = await GmailClient.create(
      this.ctx,
      this.credentials,
      user,
      this.mongo,
      this.client,
      this,
      { name: this.workspace },
      this.storageAdapter
    )
    this.clients.set(user.userId, newClient)
    return newClient
  }

  async close (): Promise<void> {
    for (const client of this.clients.values()) {
      await client.close()
    }
    this.clients.clear()
    await this.client?.close()
  }

  async getUserId (email: string): Promise<Ref<Account>> {
    const user = this.client.getModel().getAccountByEmail(email)
    if (user === undefined) {
      throw new Error('User not found')
    }
    return user._id
  }

  async signout (email: string, byError: boolean = false): Promise<number> {
    const userId = await this.getUserId(email)
    const client = this.clients.get(userId)
    if (client !== undefined) {
      await client.signout(byError)
    }
    this.clients.delete(userId)
    return this.clients.size
  }

  async signoutByUserId (userId: Ref<Account>, byError: boolean = false): Promise<number> {
    const client = this.clients.get(userId)
    if (client !== undefined) {
      await client.signout(byError)
    }
    this.clients.delete(userId)
    return this.clients.size
  }

  private getGmailClient (userId: Ref<Account>): GmailClient | undefined {
    return this.clients.get(userId)
  }

  private async initClient (workspace: string): Promise<Client> {
    const token = generateToken(config.SystemEmail, { name: workspace })
    console.log('token', token, workspace)
    const client = await getClient(token)
    client.notify = (...tx: Tx[]) => {
      void this.txHandler(...tx)
    }

    this.client = client
    await this.setChannels()
    return this.client
  }

  private async txHandler (...tx: Tx[]): Promise<void> {
    await Promise.all(
      this.txHandlers.map(async (handler) => {
        await handler(...tx)
      })
    )
  }

  // #region Message

  async subscribeMessages (): Promise<void> {
    if (this.messageSubscribed) return
    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txMessageHandler(tx)
      }
    })
    this.messageSubscribed = true
  }

  async getNewMessages (): Promise<void> {
    const newMessages = await this.client.findAll(gmailP.class.NewMessage, {
      status: 'new'
    })
    await this.subscribeMessages()
    for (const message of newMessages) {
      const client = this.getGmailClient(message.from ?? message.createdBy ?? message.modifiedBy)
      if (client !== undefined) {
        await client.createMessage(message)
      }
    }
  }

  private async txMessageHandler (tx: Tx): Promise<void> {
    switch (tx._class) {
      case core.class.TxCreateDoc: {
        await this.txCreateMessage(tx as TxCreateDoc<Doc>)
        break
      }
      case core.class.TxUpdateDoc: {
        await this.txUpdateMessage(tx as TxUpdateDoc<NewMessage>)
        break
      }
    }
  }

  private async txCreateMessage (tx: TxCreateDoc<Doc>): Promise<void> {
    const hierarchy = this.client.getHierarchy()
    if (hierarchy.isDerived(tx.objectClass, gmailP.class.NewMessage)) {
      const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<NewMessage>)
      await this.prepareAndSendMessage(doc)
    }
  }

  private async txUpdateMessage (tx: TxUpdateDoc<NewMessage>): Promise<void> {
    const hierarchy = this.client.getHierarchy()
    if (hierarchy.isDerived(tx.objectClass, gmailP.class.NewMessage)) {
      if (tx.operations?.status !== 'new') return
      const doc = await this.client.findOne(tx.objectClass, { _id: tx.objectId })
      if (doc === undefined) return
      await this.prepareAndSendMessage(doc)
    }
  }

  private async prepareAndSendMessage (doc: NewMessage): Promise<void> {
    const client = this.getGmailClient(doc.from ?? doc.createdBy ?? doc.modifiedBy)
    if (client === undefined) {
      return
    }
    await client.createMessage(doc)
  }

  // #endregion

  // #region channels

  getChannel (channel: string): Channel | undefined {
    return this.channels.get(normalize(channel))
  }

  private async setChannels (): Promise<void> {
    const channels = await this.getChannels(this.client)
    this.channels = new Map(
      channels.map((p) => {
        return [normalize(p.value), p]
      })
    )
    this.channelsById = new Map(
      channels.map((p) => {
        return [p._id, p]
      })
    )

    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txChannelHandler(tx)
      }
    })
  }

  private async getChannels (client: Client): Promise<Channel[]> {
    return await client.findAll(
      contact.class.Channel,
      {
        provider: contact.channelProvider.Email
      },
      { projection: { _id: 1, _class: 1, space: 1, value: 1 } }
    )
  }

  private async addChannel (channel: Channel): Promise<void> {
    this.channels.set(normalize(channel.value), channel)
    this.channelsById.set(channel._id, channel)
  }

  private async syncChannel (channel: Channel): Promise<void> {
    await Promise.all(
      Array.from(this.clients.values()).map(async (p) => {
        await p.newChannel(channel.value)
      })
    )
  }

  private async removeChannel (channel: Channel): Promise<void> {
    this.channels.delete(normalize(channel.value))
    this.channelsById.delete(channel._id)
  }

  private async txChannelHandler (tx: Tx): Promise<void> {
    switch (tx._class) {
      case core.class.TxCreateDoc: {
        await this.txCreateChannel(tx as TxCreateDoc<Doc>)
        return
      }
      case core.class.TxCollectionCUD: {
        await this.txCollectionCUD(tx as TxCollectionCUD<Doc, AttachedDoc>)
        return
      }
      case core.class.TxUpdateDoc: {
        await this.txUpdateChannel(tx as TxUpdateDoc<Doc>)
        return
      }
      case core.class.TxRemoveDoc: {
        await this.txRemoveChannel(tx as TxRemoveDoc<Doc>)
      }
    }
  }

  private async txCollectionCUD (tx: TxCollectionCUD<Doc, AttachedDoc>): Promise<void> {
    await this.txHandler(tx.tx)
  }

  private async txCreateChannel (tx: TxCreateDoc<Doc>): Promise<void> {
    const hierarhy = this.client.getHierarchy()
    if (hierarhy.isDerived(tx.objectClass, contact.class.Channel)) {
      const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<PlatformChannel>)
      if (doc.provider === contact.channelProvider.Email) {
        await this.addChannel(doc)
        await this.syncChannel(doc)
      }
    }
  }

  private async txUpdateChannel (tx: TxUpdateDoc<Doc>): Promise<void> {
    const hierarhy = this.client.getHierarchy()
    if (hierarhy.isDerived(tx.objectClass, contact.class.Channel)) {
      const ctx = tx as TxUpdateDoc<Channel>
      const channel = this.channelsById.get(ctx.objectId)
      if (channel !== undefined && ctx.operations.value !== undefined) {
        await this.removeChannel(channel)
        channel.value = ctx.operations.value
        await this.addChannel(channel)
        await this.syncChannel(channel)
      }
    }
  }

  private async txRemoveChannel (tx: TxRemoveDoc<Doc>): Promise<void> {
    const hierarhy = this.client.getHierarchy()
    if (hierarhy.isDerived(tx.objectClass, contact.class.Channel)) {
      const ctx = tx as TxRemoveDoc<Channel>
      const channel = this.channelsById.get(ctx.objectId)
      if (channel !== undefined) {
        await this.removeChannel(channel)
      }
    }
  }

  // #endregion

  // #region Users

  async checkUsers (): Promise<void> {
    const removedEmployees = await this.client.findAll(contact.mixin.Employee, {
      active: false
    })
    const accounts = await this.client.findAll(contact.class.PersonAccount, {
      person: { $in: removedEmployees.map((p) => p._id) }
    })
    for (const acc of accounts) {
      await this.deactivateUser(acc)
    }
    this.txHandlers.push(async (...txes: Tx[]) => {
      for (const tx of txes) {
        await this.txEmployeeHandler(tx)
      }
    })
  }

  private async deactivateUser (acc: PersonAccount): Promise<void> {
    await this.signout(acc.email, true)
  }

  private async txEmployeeHandler (tx: Tx): Promise<void> {
    if (tx._class !== core.class.TxUpdateDoc) return
    const ctx = tx as TxUpdateDoc<Employee>
    if (!this.client.getHierarchy().isDerived(ctx.objectClass, contact.mixin.Employee)) return
    if (ctx.operations.active === false) {
      const acc = await this.client.findOne(contact.class.PersonAccount, { person: ctx.objectId })
      if (acc !== undefined) {
        await this.deactivateUser(acc)
      }
    }
  }

  // #endregion
}

function normalize (str: string): string {
  return str.toLowerCase().trim()
}
