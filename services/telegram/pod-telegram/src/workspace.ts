import attachment, { Attachment } from '@hcengineering/attachment'
import contact, { Channel, getFirstName, getLastName, Contact as PContact } from '@hcengineering/contact'
import core, {
  Blob,
  Client,
  Doc,
  Hierarchy,
  MeasureContext,
  PersonId,
  Ref,
  systemAccountUuid,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxFactory,
  TxOperations,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  WorkspaceDataId
} from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import settingP from '@hcengineering/setting'
import telegramP, { NewTelegramMessage } from '@hcengineering/telegram'
import type { Collection } from 'mongodb'
import { Api } from 'telegram'
import { v4 as uuid } from 'uuid'
import { platformToTelegram, telegramToPlatform } from './markup'
import { MsgQueue } from './queue'
import type { TelegramConnectionInterface } from './telegram'
import { telegram } from './telegram'
import { Event, LastMsgRecord, TelegramMessage, TgUser, UserRecord, WorkspaceChannel } from './types'
import { createPlatformClient, getFiles, normalizeValue } from './utils'

export class WorkspaceWorker {
  private readonly clients = new Map<
  string,
  {
    conn: TelegramConnectionInterface
    queue?: MsgQueue
  }
  >()

  private channels: Map<string, Channel[]> = new Map<string, Channel[]>()
  private channelsById: Map<Ref<Channel>, Channel> = new Map<Ref<Channel>, Channel>()
  private readonly hierarchy: Hierarchy

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly client: Client,
    private readonly storageAdapter: StorageAdapter,
    private readonly workspace: WorkspaceDataId,
    private readonly userStorage: Collection<UserRecord>,
    private readonly lastMsgStorage: Collection<LastMsgRecord>,
    private readonly channelsStorage: Collection<WorkspaceChannel>
  ) {
    // eslint-disable-next-line
    this.client.notify = (...tx) => void this.txHandler(...tx)
    this.hierarchy = this.client.getHierarchy()
  }

  private async init (): Promise<void> {
    await this.initChannels()
    const recs = await this.userStorage.find({ workspace: this.workspace }).toArray()

    await Promise.all(
      recs.map(async (r) => {
        await this.initClient(r)
      })
    )

    recs.forEach((rec) => {
      void this.gatherMessages(rec)
      void this.sendNewMsgs(rec)
    })
  }

  private async initClient (rec: UserRecord): Promise<void> {
    const conn = await telegram.create(rec.phone, rec.token ?? '')
    this.clients.set(rec.phone, { conn })
  }

  private async txHandler (...txes: Tx[]): Promise<void> {
    for (const tx of txes) {
      switch (tx._class) {
        case core.class.TxCreateDoc: {
          await this.txCreateDoc(tx as TxCreateDoc<Doc>)
          return
        }
        case core.class.TxUpdateDoc: {
          await this.txUpdateDoc(tx as TxUpdateDoc<Doc>)
          return
        }
        case core.class.TxRemoveDoc: {
          await this.txRemoveDoc(tx as TxRemoveDoc<Doc>)
        }
      }
    }
  }

  private async txCreateDoc (tx: TxCreateDoc<Doc>): Promise<void> {
    if (this.hierarchy.isDerived(tx.objectClass, contact.class.Channel)) {
      await this.createChannelHandler(tx)
    }
    if (this.hierarchy.isDerived(tx.objectClass, telegramP.class.NewMessage)) {
      const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<NewTelegramMessage>)
      try {
        await this.sendMsg(doc)
      } catch (err: any) {
        console.log(err)
      }
    }
  }

  private async txUpdateDoc (tx: TxUpdateDoc<Doc>): Promise<void> {
    if (this.hierarchy.isDerived(tx.objectClass, contact.class.Channel)) {
      await this.updateChannelHandler(tx)
    }
    if (this.hierarchy.isDerived(tx.objectClass, contact.mixin.Employee)) {
      await this.handleEmployeeUpdate(tx)
    }
  }

  private async txRemoveDoc (tx: TxRemoveDoc<Doc>): Promise<void> {
    if (this.hierarchy.isDerived(tx.objectClass, contact.class.Channel)) {
      await this.removeChannelHandler(tx)
    }
  }

  async close (): Promise<void> {
    await Promise.all(
      [...this.clients.values()].map(async (client) => {
        await client.conn.close()
      })
    )
    this.clients.clear()
  }

  static async create (
    ctx: MeasureContext,
    storageAdapter: StorageAdapter,
    workspace: WorkspaceDataId,
    userStorage: Collection<UserRecord>,
    lastMsgStorage: Collection<LastMsgRecord>,
    channelsStorage: Collection<WorkspaceChannel>
  ): Promise<WorkspaceWorker> {
    const token = generateToken(systemAccountUuid, workspace as any, { service: 'telegram' }) // TODO: FIXME
    const client = await createPlatformClient(token)

    const worker = new WorkspaceWorker(
      ctx,
      client,
      storageAdapter,
      workspace,
      userStorage,
      lastMsgStorage,
      channelsStorage
    )
    await worker.init()
    return worker
  }

  // #region Users

  async addUser ({ email, phone, conn }: TgUser): Promise<void> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const user = this.client.getModel().getAccountByEmail(email)

    // if (user === undefined) {
    //   throw Error(`Unable to find user by email: ${email}`)
    // }

    // const token = conn.getToken()

    // if (token === undefined) {
    //   throw Error('Unable to get telegram token')
    // }

    // const res = await this.userStorage.insertOne({
    //   userId: user._id,
    //   email,
    //   workspace: this.workspace,
    //   phone,
    //   token
    // })

    // const rec = await this.userStorage.findOne({ _id: res.insertedId })

    // if (rec === null) {
    //   console.error(
    //     `Something went wrong, failed to get inserted obj: ${
    //       this.userStorage.collectionName
    //     }/${res.insertedId.toString()}`
    //   )
    //   return
    // }

    // this.clients.set(phone, { conn })

    // void this.gatherMessages(rec)
  }

  async checkUsers (): Promise<void> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const employees = await this.client.findAll(contact.mixin.Employee, { active: false })
    // const accounts = await this.client.findAll(contact.class.PersonAccount, {
    //   person: { $in: employees.map((p) => p._id) }
    // })
    // for (const acc of accounts) {
    //   await this.deactivateUser(acc._id)
    // }
  }

  private async deactivateUser (acc: PersonId): Promise<void> {
    const res = await this.userStorage.findOne({ userId: acc, workspace: this.workspace })

    if (res !== null) {
      const client = this.clients.get(res.phone)

      if (client === undefined) {
        return
      }

      await client.conn.signOut()
      await this.clearOutdatedConnection(res.phone)
    }
  }

  private filterUsers (users: Api.User[]): Api.User[] {
    return users.filter((p) => this.getChannel(p) !== undefined)
  }

  private async handleEmployeeUpdate (tx: TxUpdateDoc<Doc>): Promise<void> {
    // TODO: FIXME
    throw new Error('Not implemented')
    // const ctx = tx as TxUpdateDoc<Employee>
    // if (ctx.operations.active === false) {
    //   const acc = await this.client.findOne(contact.class.PersonAccount, { person: ctx.objectId })
    //   if (acc !== undefined) {
    //     await this.deactivateUser(acc._id)
    //   }
    // }
  }

  async removeUser ({ phone }: Pick<TgUser, 'phone'>): Promise<void> {
    const client = this.clients.get(phone)

    if (client === undefined) {
      return
    }

    await client.conn.signOut()
    await this.clearOutdatedConnection(phone, true)
  }

  private async clearOutdatedConnection (phone: string, signOut: boolean = false): Promise<void> {
    const client = this.clients.get(phone)

    if (client === undefined) {
      return
    }

    await client.conn.close()
    this.clients.delete(phone)
    const rec = await this.userStorage.findOne({
      workspace: this.workspace,
      phone
    })

    if (rec === null) {
      return
    }

    await this.userStorage.deleteOne({ _id: rec._id })

    const integration = await this.client.findOne(settingP.class.Integration, {
      type: telegramP.integrationType.Telegram,
      createdBy: rec.userId as any // TODO: FIXME
    })

    if (integration === undefined) {
      return
    }

    const txOp = new TxOperations(this.client, core.account.System)

    if (signOut) {
      console.log('Signout', this.workspace, phone)
      await txOp.remove(integration)
    } else {
      console.log('Disable', this.workspace, phone)
      await txOp.update(integration, { disabled: true })
    }
  }

  // #endregion

  // #region Messages

  async sendMsg (msg: NewTelegramMessage): Promise<void> {
    const rec = await this.userStorage.findOne({ userId: msg.modifiedBy })
    if (rec === undefined || rec?.phone === undefined) return
    const client = this.clients.get(rec.phone)

    if (client === undefined) {
      throw Error('Failed to find connection')
    }

    const channel = this.channelsById.get(msg.attachedTo as Ref<Channel>)
    if (channel === undefined) return
    const target = normalizeValue(channel.value)

    const importRequired = await client.conn.isContactImportRequired(target)

    if (importRequired) {
      const contact = await this.client.findOne<PContact>(channel.attachedToClass, {
        _id: channel.attachedTo as Ref<PContact>
      })
      if (contact === undefined) {
        throw new Error("Couldn't find contact by id" + channel.attachedTo)
      }

      await client.conn.addContact({
        lastName: getLastName(contact.name),
        firstName: getFirstName(contact.name),
        phone: target
      })
    }

    const { message, entities } = platformToTelegram(msg.content)
    const files = await this.getFiles(msg)
    if (files.length < 2) {
      const res = await client.conn.sendMsg(target, message, entities, files.shift())
      const user = await res.getChat()

      if (user?.className !== 'User') {
        return
      }

      client.queue?.add({ msg: res, user })
    } else {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const res =
          i === 0
            ? await client.conn.sendMsg(target, message, entities, file)
            : await client.conn.sendMsg(target, '', [], file)
        const user = await res.getChat()

        if (user?.className !== 'User') {
          return
        }

        client.queue?.add({ msg: res, user })
      }
    }

    const factory = new TxFactory(msg.modifiedBy)
    const tx = factory.createTxUpdateDoc(msg._class, msg.space, msg._id, {
      status: 'sent'
    })
    await this.client.tx(tx)
  }

  private async getUserOlderMsgs (user: Api.User, record: UserRecord, conn: TelegramConnectionInterface): Promise<void> {
    const channels = this.getChannel(user)
    if (channels === undefined) return
    for (const channel of channels) {
      await this.getUserOlderChannelMsgs(user, record, conn, channel)
    }
  }

  private async getLastMsg (user: Api.User, record: UserRecord, channelID: string): Promise<LastMsgRecord | null> {
    try {
      let res = await this.lastMsgStorage.findOne({
        workspace: this.workspace,
        phone: record.phone,
        channelID,
        participantID: user.id.toString()
      })

      if (res === null) {
        const lastMsgId = (
          await this.lastMsgStorage.insertOne({
            maxMsgId: 0,
            minMsgId: 0,
            participantID: user.id.toString(),
            phone: record.phone,
            channelID,
            workspace: this.workspace
          })
        ).insertedId

        res = await this.lastMsgStorage.findOne({
          _id: lastMsgId
        })
      }

      return res
    } catch (e) {
      console.error(e)
      return null
    }
  }

  async loadChannelUserMsgs (
    user: Api.User,
    record: UserRecord,
    conn: TelegramConnectionInterface,
    channel: Channel
  ): Promise<number> {
    const lastMsg = await this.getLastMsg(user, record, channel._id)

    if (lastMsg === null) {
      console.error("Couldn't create last message record")
      return 0
    }
    try {
      const msgs = conn.getMsgs(user, undefined, lastMsg.maxMsgId, 500)
      for await (const msg of msgs) {
        await this.savePlatformMessage(msg, user, record, channel, lastMsg)
      }
    } catch (e) {
      console.error(e)
    }
    await this.lastMsgStorage.updateOne(
      {
        _id: lastMsg._id
      },
      {
        $set: {
          minMsgId: lastMsg.minMsgId,
          maxMsgId: lastMsg.maxMsgId
        }
      }
    )
    return lastMsg.maxMsgId
  }

  private async savePlatformMessage (
    msg: Api.Message,
    user: Api.User,
    record: UserRecord,
    channel: Channel,
    lastMsg: LastMsgRecord
  ): Promise<void> {
    try {
      const tx = this.makePlatformMsg({ msg, user }, record, channel)
      await this.client.tx(tx)
      void this.makePlatformAttachments({ msg, user }, record, tx)
      lastMsg.maxMsgId = Math.max(lastMsg.maxMsgId, msg.id)
      lastMsg.minMsgId = Math.min(lastMsg.minMsgId, msg.id)
      if (lastMsg.minMsgId === 0) {
        lastMsg.minMsgId = msg.id
      }
    } catch (e) {
      console.error(e)
    }
  }

  async loadUserMsgs (user: Api.User, record: UserRecord, conn: TelegramConnectionInterface): Promise<number> {
    const channels = this.getChannel(user)
    if (channels === undefined) return 0
    const ids: number[] = []
    for (const channel of channels) {
      const id = await this.loadChannelUserMsgs(user, record, conn, channel)
      ids.push(id)
    }
    let maxID = 0
    for (const id of ids) {
      maxID = Math.max(id, maxID)
    }
    return maxID
  }

  async getUserOlderChannelMsgs (
    user: Api.User,
    record: UserRecord,
    conn: TelegramConnectionInterface,
    channel: Channel
  ): Promise<void> {
    const lastMsg = await this.getLastMsg(user, record, channel._id)

    if (lastMsg === null) {
      console.error("Couldn't create last message record")
      return
    }

    let userMinID: number = lastMsg.minMsgId
    try {
      const msgs = conn.getMsgs(user, lastMsg.minMsgId)

      for await (const msg of msgs) {
        try {
          const tx = this.makePlatformMsg({ msg, user }, record, channel)
          await this.client.tx(tx)
          await this.makePlatformAttachments({ msg, user }, record, tx)
          if (msg.id < userMinID || userMinID === 0) {
            userMinID = msg.id
            await this.lastMsgStorage.updateOne(
              {
                _id: lastMsg._id
              },
              {
                $set: { minMsgId: userMinID }
              }
            )
          }
        } catch (e) {
          console.error(e)
          continue
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      await this.lastMsgStorage.updateOne(
        {
          _id: lastMsg._id
        },
        {
          $set: { minMsgId: userMinID }
        }
      )
    }
  }

  private async sendNewMsgs (record: UserRecord): Promise<void> {
    const newMessages = await this.client.findAll(telegramP.class.NewMessage, {
      modifiedBy: record.userId as any, // TODO: FIXME
      status: 'new'
    })
    for (const message of newMessages) {
      try {
        await this.sendMsg(message)
      } catch (err: any) {
        console.log('Error while sending new message', record.workspace, record.userId, JSON.stringify(err))
      }
    }
  }

  private makePlatformMsg (event: Event, record: UserRecord, channel: Channel): TxCUD<TelegramMessage> {
    const factory = new TxFactory(record.userId as any) // TODO: FIXME
    const modifiedOn = event.msg.date * 1000
    const tx = factory.createTxCollectionCUD<Channel, TelegramMessage>(
      channel._class,
      channel._id,
      channel.space,
      'items',
      factory.createTxCreateDoc<TelegramMessage>(
        telegramP.class.Message,
        core.space.Workspace,
        {
          attachedTo: channel._id,
          attachedToClass: channel._class,
          collection: 'items',
          sendOn: event.msg.date * 1000,
          content: telegramToPlatform(event.msg),
          incoming: event.msg.out !== true
        },
        undefined,
        modifiedOn
      ),
      modifiedOn
    )
    return tx
  }

  private async gatherMessages (record: UserRecord): Promise<void> {
    const client = this.clients.get(record.phone)

    if (client === undefined) {
      return
    }

    const allUsers = await client.conn.getUsers().catch(() => [])
    const users = this.filterUsers(allUsers)

    const queue = new MsgQueue(true, async (event: Event) => {
      try {
        const channels = this.getChannel(event.user)
        if (channels === undefined) return
        for (const channel of channels) {
          const lastMsg = await this.getLastMsg(event.user, record, channel._id)

          if (lastMsg === null) {
            console.error("Couldn't create last message record")
            continue
          }
          await this.savePlatformMessage(event.msg, event.user, record, channel, lastMsg)
          await this.lastMsgStorage.updateOne(
            {
              _id: lastMsg._id
            },
            {
              $set: {
                minMsgId: lastMsg.minMsgId,
                maxMsgId: lastMsg.maxMsgId
              }
            }
          )
        }
      } catch (e) {
        console.error(e)
      }
    })
    client.queue = queue

    client.conn.sub((user, msg) => {
      queue.add({
        user,
        msg
      })
    })
    const promises: Array<Promise<number>> = []
    for (const user of users) {
      promises.push(this.loadUserMsgs(user, record, client.conn))
    }
    const ids = await Promise.all(promises)
    let maxID = 0
    for (const id of ids) {
      maxID = Math.max(id, maxID)
    }

    queue.dropBefore(maxID)
    queue.unpause()
    for (const user of users) {
      void this.getUserOlderMsgs(user, record, client.conn)
    }
  }

  // #region Attachments

  private async getFiles (msg: NewTelegramMessage): Promise<Buffer[]> {
    const attachments = await this.client.findAll(attachment.class.Attachment, { attachedTo: msg._id })
    const res: Buffer[] = []
    for (const attachment of attachments) {
      const buffer = await this.storageAdapter.read(this.ctx, this.workspace as any, attachment.file) // TODO: FIXME <--WorkspaceIds
      if (buffer.length > 0) {
        res.push(
          Object.assign(buffer, {
            name: attachment.name
          })
        )
      }
    }
    return res
  }

  private async makePlatformAttachments (
    event: Event,
    record: UserRecord,
    createTx: TxCUD<TelegramMessage>
  ): Promise<void> {
    const msg = TxProcessor.createDoc2Doc(createTx as TxCreateDoc<TelegramMessage>)
    const factory = new TxFactory(record.userId as any) // TODO: FIXME
    const files = await getFiles(event.msg)
    for (const file of files) {
      try {
        const id = uuid()
        file.size = file.size ?? file.file.length
        await this.storageAdapter.put(this.ctx, this.workspace as any, id, file.file, file.type, file.size) // TODO: FIXME <--WorkspaceIds
        const modifiedOn = event.msg.date * 1000
        const tx = factory.createTxCollectionCUD<TelegramMessage, Attachment>(
          msg._class,
          msg._id,
          msg.space,
          'attachments',
          factory.createTxCreateDoc<Attachment>(
            attachment.class.Attachment,
            msg.space,
            {
              name: file.name,
              file: id as Ref<Blob>,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
              collection: 'attachments',
              attachedTo: msg._id,
              attachedToClass: msg._class
            },
            undefined,
            modifiedOn
          ),
          modifiedOn
        )
        await this.client.tx(tx)
      } catch (e) {
        console.error(e)
        continue
      }
    }
  }

  // #endregion

  // #endregion

  // #region Channels

  private async initChannels (): Promise<void> {
    const oldChannels = await this.channelsStorage
      .find({
        workspace: this.workspace
      })
      .toArray()
    const oldChannelsSet = new Set(oldChannels.map((p) => p.value))
    const channels = await this.getChannels()
    this.channels = new Map<string, Channel[]>()
    for (const channel of channels) {
      this.setChannel(channel)
    }
    this.channelsById = new Map(
      channels.map((p) => {
        return [p._id, p]
      })
    )
    for (const channel of channels) {
      if (!oldChannelsSet.has(channel.value)) {
        void this.addChannel(channel)
      }
    }
    for (const oldChannel of Array.from(oldChannelsSet)) {
      const value = normalizeValue(oldChannel)
      if (!this.channels.has(value)) {
        await this.channelsStorage.deleteOne({
          workspace: this.workspace,
          value: oldChannel
        })
      }
    }
  }

  private getChannel (user: Api.User): Channel[] | undefined {
    let result: Channel[] | undefined
    if (user.username != null) {
      result = this.channels.get(`@${user.username}`)
    }
    if (result === undefined && user.phone != null) {
      result = this.channels.get(`+${user.phone}`)
    }
    return result
  }

  private async getChannels (): Promise<Channel[]> {
    return await this.client.findAll(contact.class.Channel, {
      provider: contact.channelProvider.Telegram
    })
  }

  private async addChannel (channel: Channel): Promise<void> {
    this.setChannel(channel)
    this.channelsById.set(channel._id, channel)
    await this.newChannel(channel)
    await this.channelsStorage.insertOne({
      workspace: this.workspace,
      value: channel.value
    })
  }

  private async removeChannel (channel: Channel): Promise<void> {
    const value = normalizeValue(channel.value)
    const currentChannels = this.channels.get(value)
    if (currentChannels !== undefined) {
      const index = currentChannels.findIndex((p) => p._id === channel._id)
      if (index > -1) {
        currentChannels.splice(index, 1)
      }
      if (currentChannels.length === 0) {
        this.channels.delete(value)
      }
    }
    this.channelsById.delete(channel._id)
    await this.lastMsgStorage.deleteMany({
      channelID: channel._id
    })
    await this.channelsStorage.deleteOne({
      workspace: this.workspace,
      value: channel.value
    })
  }

  private setChannel (channel: Channel): void {
    const value = normalizeValue(channel.value)
    const current = this.channels.get(value)
    if (current === undefined) {
      this.channels.set(value, [channel])
    } else {
      const index = current.findIndex((p) => p._id === channel._id)
      if (index === -1) {
        current.push(channel)
      }
    }
  }

  private async newChannel (channel: Channel): Promise<void> {
    const recs = await this.userStorage.find({ workspace: this.workspace }).toArray()
    for (const record of recs) {
      const client = this.clients.get(record.phone)

      if (client === undefined) {
        return
      }

      const user = await client.conn.getUser(channel.value)
      if (user === undefined) continue

      await this.loadChannelUserMsgs(user, record, client.conn, channel)

      await this.getUserOlderChannelMsgs(user, record, client.conn, channel)
    }
  }

  // #region TxHandlers

  private async createChannelHandler (tx: TxCreateDoc<Doc>): Promise<void> {
    const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<Channel>)
    if (doc.provider === contact.channelProvider.Telegram) {
      await this.addChannel(doc)
    }
  }

  private async updateChannelHandler (tx: TxUpdateDoc<Doc>): Promise<void> {
    const ctx = tx as TxUpdateDoc<Channel>
    const channel = this.channelsById.get(ctx.objectId)
    if (channel !== undefined && ctx.operations.value !== undefined) {
      await this.removeChannel(channel)
      channel.value = ctx.operations.value
      await this.addChannel(channel)
    }
  }

  private async removeChannelHandler (tx: TxRemoveDoc<Doc>): Promise<void> {
    const ctx = tx as TxRemoveDoc<Channel>
    const channel = this.channelsById.get(ctx.objectId)
    if (channel !== undefined) {
      await this.removeChannel(channel)
    }
  }

  // #endregion

  // #endregion
}
