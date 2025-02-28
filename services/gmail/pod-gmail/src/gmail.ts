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

import attachment, { Attachment } from '@hcengineering/attachment'
import core, {
  AttachedData,
  Blob,
  Client,
  Data,
  MeasureContext,
  Ref,
  Timestamp,
  TxCreateDoc,
  TxCUD,
  TxFactory,
  TxOperations,
  TxProcessor,
  TxUpdateDoc,
  WorkspaceUuid
} from '@hcengineering/core'
import gmail, { type Message, type NewMessage } from '@hcengineering/gmail'
import { type StorageAdapter } from '@hcengineering/server-core'
import setting from '@hcengineering/setting'
import type { GaxiosResponse } from 'gaxios'
import type { Credentials, OAuth2Client } from 'google-auth-library'
import { gmail_v1, google } from 'googleapis'
import type { Collection, Db } from 'mongodb'
import { v4 as uuid } from 'uuid'
import { arrayBufferToBase64, decode64, encode64 } from './base64'
import config from './config'
import { GmailController } from './gmailController'
import { RateLimiter } from './rateLimiter'
import type { AttachedFile, Channel, History, ProjectCredentials, Token, User } from './types'
import { diffAttributes, isToken } from './utils'
import type { WorkspaceClient } from './workspaceClient'

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/

function makeHTMLBody (message: NewMessage, from: string): string {
  const str = [
    'Content-Type: text/html; charset="UTF-8"\n',
    'MIME-Version: 1.0\n',
    'Content-Transfer-Encoding: 7bit\n',
    `To: ${message.to} \n`,
    `From: ${from} \n`
  ]

  if (message.replyTo != null) {
    str.push(`In-Reply-To: ${message.replyTo}  \n`)
  }

  if (message.copy != null && message.copy.length > 0) {
    str.push(`Cc: ${message.copy.join(', ')}  \n`)
  }

  if (message.subject != null) {
    str.push(`Subject: =?UTF-8?B?${encode64(message.subject)}?= \n`)
  }

  str.push('\n\n')
  str.push(addFooter(message.content))
  const res = str.join('')
  return encode64(res).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function addFooter (message: string): string {
  if (config.FooterMessage === undefined || config.FooterMessage.trim() === '') return message
  return message + config.FooterMessage.trim()
}

function convertMessage (
  message: GaxiosResponse<gmail_v1.Schema$Message>,
  me: string
): AttachedData<Message> & { modifiedOn: Timestamp } {
  const date = message.data.internalDate != null ? new Date(Number.parseInt(message.data.internalDate)) : new Date()
  const from = getHeaderValue(message.data.payload, 'From') ?? ''
  const to = getHeaderValue(message.data.payload, 'To') ?? ''
  const copy =
    getHeaderValue(message.data.payload, 'Cc')
      ?.split(',')
      .map((p) => p.trim()) ?? undefined
  const incoming = !from.includes(me)
  return {
    modifiedOn: date.getTime(),
    messageId: getHeaderValue(message.data.payload, 'Message-ID') ?? '',
    replyTo: getHeaderValue(message.data.payload, 'In-Reply-To'),
    copy,
    content: getPartMessage(message.data.payload, 'text/html'),
    textContent: getPartMessage(message.data.payload, 'text/plain').replace(/<[^>]*>/g, ''),
    from,
    to,
    incoming,
    subject: getHeaderValue(message.data.payload, 'Subject') ?? '',
    sendOn: date.getTime()
  }
}

function getHeaderValue (payload: gmail_v1.Schema$MessagePart | undefined, name: string): string | undefined {
  if (payload === undefined) return undefined
  const headers = payload.headers

  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined
}

function getPartsMessage (parts: gmail_v1.Schema$MessagePart[] | undefined, mime: string): string {
  let result = ''
  if (parts !== undefined) {
    const htmlPart = parts.find((part) => part.mimeType === mime)
    const filtredParts = htmlPart !== undefined ? parts.filter((part) => part.mimeType === mime) : parts
    for (const part of filtredParts ?? []) {
      result += getPartMessage(part, mime)
    }
  }
  return result
}

function getPartMessage (part: gmail_v1.Schema$MessagePart | undefined, mime: string): string {
  if (part === undefined) return ''
  if (part.body?.data != null) {
    return decode64(part.body.data)
  }
  return getPartsMessage(part.parts, mime)
}

async function wait (sec: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, sec * 1000)
  })
}

export class GmailClient {
  private readonly oAuth2Client: OAuth2Client
  private readonly gmail: gmail_v1.Resource$Users
  private me: string | undefined = undefined
  private readonly tokens: Collection<Token>
  private readonly histories: Collection<History>
  private readonly client: TxOperations
  private watchTimer: NodeJS.Timeout | undefined = undefined
  private refreshTimer: NodeJS.Timeout | undefined = undefined
  private syncPromise: Promise<void> | undefined = undefined
  private readonly rateLimiter = new RateLimiter(1000, 200) // in fact 250, but let's make reserve

  private constructor (
    private readonly ctx: MeasureContext,
    credentials: ProjectCredentials,
    private readonly user: User,
    mongo: Db,
    client: Client,
    private readonly workspaceId: WorkspaceUuid,
    private readonly storageAdapter: StorageAdapter,
    private readonly workspace: WorkspaceClient
  ) {
    const { client_secret, client_id, redirect_uris } = credentials.web // eslint-disable-line
    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]) // eslint-disable-line
    this.gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client }).users
    this.tokens = mongo.collection<Token>('tokens')
    this.histories = mongo.collection<History>('histories')
    this.client = new TxOperations(client, this.user.userId)
  }

  static async create (
    ctx: MeasureContext,
    credentials: ProjectCredentials,
    user: User | Token,
    mongo: Db,
    client: Client,
    workspace: WorkspaceClient,
    workspaceId: WorkspaceUuid,
    storageAdapter: StorageAdapter
  ): Promise<GmailClient> {
    const gmailClient = new GmailClient(ctx, credentials, user, mongo, client, workspaceId, storageAdapter, workspace)
    if (isToken(user)) {
      console.log('Setting token while creating', user.workspace, user.userId, user)
      await gmailClient.setToken(user)
      await gmailClient.refreshToken()
      await gmailClient.addClient()
    }
    return gmailClient
  }

  getAutUrl (redirectURL: string): string {
    const { workspace, userId } = this.user
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: encode64(JSON.stringify({ workspace, userId, redirectURL }))
    })
    return authUrl
  }

  async authorize (code: string): Promise<void> {
    const token = await this.oAuth2Client.getToken(code)
    console.log('Setting token after authorize', this.user.workspace, this.user.userId, token)
    await this.setToken(token.tokens)
    await this.refreshToken()
    await this.addClient()
    void this.startSync()
    void this.getNewMessagesAfterAuth()

    const me = await this.getMe()
    const integrations = await this.client.findAll(setting.class.Integration, {
      createdBy: this.user.userId,
      type: gmail.integrationType.Gmail
    })
    const updated = integrations.find((p) => p.disabled && p.value === me)

    for (const integration of integrations.filter((p) => p._id !== updated?._id)) {
      await this.client.remove(integration)
    }
    if (updated !== undefined) {
      await this.client.update(updated, {
        disabled: false
      })
    } else {
      await this.client.createDoc(setting.class.Integration, core.space.Workspace, {
        type: gmail.integrationType.Gmail,
        disabled: false,
        value: me
      })
    }
  }

  async getNewMessagesAfterAuth (): Promise<void> {
    const newMessages = await this.client.findAll(gmail.class.NewMessage, {
      status: 'new',
      from: this.user.userId
    })
    await this.workspace.subscribeMessages()
    for (const message of newMessages) {
      await this.createMessage(message as NewMessage)
    }
  }

  async createMessage (message: NewMessage): Promise<void> {
    if (message.status === 'sent') return
    try {
      const me = await this.getMe()
      const body =
        message.attachments != null && message.attachments > 0
          ? await this.makeAttachmentsBody(message, me)
          : makeHTMLBody(message, me)
      await this.rateLimiter.take(100)
      await this.gmail.messages.send({
        userId: 'me',
        requestBody: {
          raw: body
        }
      })

      await this.client.updateDoc(message._class, message.space, message._id, {
        status: 'sent'
      })
    } catch (err: any) {
      await this.client.updateDoc(message._class, message.space, message._id, {
        status: 'error',
        error: JSON.stringify(err)
      })
      console.log('Create message error', this.user.workspace, this.user.userId, err.message)
      if (err?.response?.data?.error === 'invalid_grant') {
        await this.refreshToken()
      }
    }
  }

  private async checkErrorWithSignout (err: any): Promise<boolean> {
    if (this.checkError(err)) {
      console.log('Invalid grant error', this.user.workspace, this.user.userId)
      await this.workspace.signoutByUserId(this.user.userId, true)
      return true
    }
    return false
  }

  private checkError (err: any): boolean {
    return err?.response?.data?.error === 'invalid_grant'
  }

  async signout (byError: boolean = false): Promise<void> {
    try {
      await this.close()
      await this.oAuth2Client.revokeCredentials()
    } catch {}
    await this.tokens.deleteOne({
      userId: this.user.userId,
      workspace: this.user.workspace
    })
    const integration = await this.client.findOne(setting.class.Integration, {
      createdBy: this.user.userId,
      type: gmail.integrationType.Gmail
    })
    if (integration !== undefined) {
      if (byError) {
        await this.client.update(integration, { disabled: true })
      } else {
        await this.client.remove(integration)
      }
    }
  }

  async sync (): Promise<void> {
    if (this.syncPromise !== undefined) {
      await this.syncPromise
    }
    const history = await this.getHistory()
    try {
      if (history != null) {
        this.syncPromise = this.partSync(history.historyId)
        await this.syncPromise
      } else {
        this.syncPromise = this.fullSync()
        await this.syncPromise
      }
    } finally {
      this.syncPromise = undefined
    }
  }

  async startSync (): Promise<void> {
    await this.sync()
    await this.watch()
    // recall every 24 hours https://developers.google.com/gmail/api/guides/push
    this.watchTimer = setInterval(() => {
      void this.watch()
    }, 86400000)
  }

  async newChannel (value: string): Promise<void> {
    const query = `{from:${value} to:${value} cc:${value} bcc:${value}}`
    await this.fullSync(query)
  }

  private async getMe (): Promise<string> {
    if (this.me !== undefined) {
      return this.me
    }
    for (let i = 0; i < 3; i++) {
      await this.rateLimiter.take(1)
      const profile = await this.gmail.getProfile({
        userId: 'me'
      })
      this.me = profile.data.emailAddress ?? undefined
      if (this.me !== undefined) return this.me
      await wait(5)
    }
    throw new Error("Can't get profile email after 3 attempts")
  }

  private async getCurrentToken (): Promise<Token | null> {
    return await this.tokens.findOne({
      userId: this.user.userId,
      workspace: this.user.workspace
    })
  }

  private async updateCurrentToken (token: Credentials): Promise<void> {
    await this.tokens.updateOne(
      {
        userId: this.user.userId,
        workspace: this.user.workspace
      },
      {
        $set: {
          ...token
        }
      }
    )
  }

  private async addClient (): Promise<void> {
    try {
      const me = await this.getMe()
      const controller = GmailController.getGmailController()
      controller.addClient(me, this)
    } catch (err) {
      console.log('Add client error', this.user.workspace, this.user.userId, (err as any).message)
    }
  }

  private async setToken (token: Credentials): Promise<void> {
    try {
      this.oAuth2Client.setCredentials(token)
      await this.getMe()
    } catch (err: any) {
      console.log('Set token error', this.user.workspace, this.user.userId, err.message)
      if (this.checkError(err)) {
        await this.signout(true)
      }
      throw err
    }
  }

  private async updateToken (token: Credentials): Promise<void> {
    try {
      const currentToken = await this.getCurrentToken()
      if (currentToken != null) {
        await this.updateCurrentToken(token)
      } else {
        await this.tokens.insertOne({
          userId: this.user.userId,
          workspace: this.user.workspace,
          token: this.user.token,
          ...token
        })
      }
    } catch (err) {
      console.log('update token error', this.user.workspace, this.user.userId, (err as any).message)
    }
  }

  private async getHistory (): Promise<History | null> {
    return await this.histories.findOne({
      userId: this.user.userId,
      workspace: this.user.workspace
    })
  }

  private async clearHistory (): Promise<void> {
    await this.histories.deleteOne({
      userId: this.user.userId,
      workspace: this.user.workspace
    })
  }

  private async setHistoryId (historyId: string): Promise<void> {
    await this.histories.updateOne(
      {
        userId: this.user.userId,
        workspace: this.user.workspace
      },
      {
        $set: {
          historyId
        }
      },
      { upsert: true }
    )
  }

  private async partSync (historyId: string): Promise<void> {
    let pageToken: string | undefined
    let histories: GaxiosResponse<gmail_v1.Schema$ListHistoryResponse>
    while (true) {
      try {
        await this.rateLimiter.take(2)
        histories = await this.gmail.history.list({
          userId: 'me',
          historyTypes: ['messageAdded'],
          startHistoryId: historyId,
          pageToken
        })
      } catch (err) {
        console.log('Part sync get history error', this.user.workspace, this.user.userId, err)
        const signout = await this.checkErrorWithSignout(err)
        if (signout) return
        await this.clearHistory()
        await this.sync()
        return
      }
      const nextPageToken = histories.data.nextPageToken
      const array = histories.data.history ?? []
      try {
        for (const history of array) {
          for (const message of history.messagesAdded ?? []) {
            if (message.message?.id == null || (message.message.labelIds?.includes('DRAFT') ?? false)) {
              continue
            }
            try {
              const res = await this.getMessage(message.message.id)
              await this.saveMessage(res)
            } catch (err) {
              console.log('Part sync message error', this.user.workspace, this.user.userId, message.message.id, err)
              const signout = await this.checkErrorWithSignout(err)
              if (signout) return
            }
          }
          if (history.id != null) {
            await this.setHistoryId(history.id)
          }
        }
        if (nextPageToken == null) {
          return
        } else {
          pageToken = nextPageToken
        }
      } catch (err) {
        console.log('Part sync error', this.user.workspace, this.user.userId, err)
        return
      }
    }
  }

  private async fullSync (q?: string): Promise<void> {
    const pageToken: string | undefined = undefined
    const query: gmail_v1.Params$Resource$Users$Messages$List = {
      userId: 'me',
      pageToken
    }
    if (q !== undefined) {
      query.q = q
    }
    let currentHistoryId: string | undefined
    console.log('start full sync', this.user.workspace, this.user.userId, q)
    try {
      const messagesIds: string[] = []
      while (true) {
        await this.rateLimiter.take(5)
        const messages = await this.gmail.messages.list(query)
        if (query.pageToken == null) {
          console.log('Total messages', this.user.workspace, this.user.userId, messages.data.resultSizeEstimate)
        }
        const ids = messages.data.messages?.map((p) => p.id) ?? []
        for (let index = 0; index < ids.length; index++) {
          const id = ids[index]
          if (id == null) continue
          messagesIds.push(id)
        }
        if (messages.data.nextPageToken == null) {
          console.log('Break, total new messages: ', messagesIds.length)
          break
        }
        query.pageToken = messages.data.nextPageToken
      }
      for (let index = messagesIds.length - 1; index >= 0; index--) {
        const id = messagesIds[index]
        try {
          const message = await this.getMessage(id)
          const historyId = message.data.historyId
          await this.saveMessage(message)
          if (historyId != null && q === undefined) {
            if (currentHistoryId == null || Number(currentHistoryId) < Number(historyId)) {
              await this.setHistoryId(historyId)
              currentHistoryId = historyId
            }
          }
        } catch (err: any) {
          console.log('Full sync message error', this.user.workspace, this.user.userId, err)
          const signout = await this.checkErrorWithSignout(err)
          if (signout) return
        }
      }
    } catch (err) {
      console.log('Full sync error', this.user.workspace, this.user.userId, err)
      await this.checkErrorWithSignout(err)
    }
  }

  private async getMessage (id: string): Promise<GaxiosResponse<gmail_v1.Schema$Message>> {
    await this.rateLimiter.take(5)
    return await this.gmail.messages.get({
      id,
      userId: 'me',
      format: 'FULL'
    })
  }

  private findChannels (res: AttachedData<Message>): Channel[] {
    const recievers = res.copy != null ? [res.to, ...res.copy] : [res.to]
    const values = res.incoming ? [res.from] : recievers
    const result: Channel[] = []
    for (const value of values) {
      const res = value.match(EMAIL_REGEX)
      if (res !== null) {
        const email = res[0]
        const channel = this.workspace.getChannel(email)
        if (channel !== undefined) result.push(channel)
      }
    }
    return result
  }

  private async saveMessage (message: GaxiosResponse<gmail_v1.Schema$Message>): Promise<void> {
    const me = await this.getMe()
    const res = convertMessage(message, me)
    const channels = this.findChannels(res)
    if (channels.length === 0) return
    const attachments = await this.getPartFiles(message.data.payload, message.data.id ?? '')
    const factory = new TxFactory(this.user.userId)
    for (const channel of channels) {
      const current = await this.client.findOne(gmail.class.Message, {
        messageId: res.messageId,
        attachedTo: channel._id
      })
      const tx = current != null ? this.updateTx(res, current, factory, channel) : this.createTx(res, factory, channel)
      if (tx !== undefined) {
        const resultMessage =
          current != null
            ? TxProcessor.updateDoc2Doc(current, tx as TxUpdateDoc<Message>)
            : TxProcessor.createDoc2Doc(tx as TxCreateDoc<Message>)
        await this.client.tx(tx)
        if (attachments.length > 0) {
          const currentAttachemtns: Attachment[] =
            current !== undefined
              ? await this.client.findAll(attachment.class.Attachment, { attachedTo: current._id })
              : []
          for (const attachment of attachments) {
            await this.addAttachement(attachment, resultMessage, currentAttachemtns)
          }
        }
      }
    }
  }

  private async addAttachement (file: AttachedFile, message: Message, currentAttachemtns: Attachment[]): Promise<void> {
    try {
      if (currentAttachemtns.findIndex((p) => p.name === file.name && p.lastModified === file.lastModified) !== -1) {
        return
      }
      const id = uuid()
      const data: AttachedData<Attachment> = {
        name: file.name,
        file: id as Ref<Blob>,
        type: file.type ?? 'undefined',
        size: file.size ?? Buffer.from(file.file, 'base64').length,
        lastModified: file.lastModified
      }
      await this.storageAdapter.put(this.ctx, this.workspaceId as any, id, file.file, data.type, data.size) // TODO: FIXME
      await this.client.addCollection(
        attachment.class.Attachment,
        message.space,
        message._id,
        message._class,
        'attachments',
        data
      )
    } catch (err: any) {
      console.log('Add attachment error', this.user.workspace, this.user.userId, err.message)
    }
  }

  private async getPartFiles (
    part: gmail_v1.Schema$MessagePart | undefined,
    messageId: string
  ): Promise<AttachedFile[]> {
    if (part === undefined) return []
    if (part.filename != null && part.filename.length > 0) {
      if (part.body?.attachmentId != null) {
        const attachment = await this.getAttachmentById(part.body?.attachmentId, messageId)
        if (attachment.data == null) return []
        return [
          {
            file: attachment.data,
            name: part.filename,
            type: part.mimeType ?? undefined,
            size: attachment.size ?? undefined,
            lastModified: new Date().getTime()
          }
        ]
      }
      if (part.body?.data == null) return []
      return [
        {
          file: part.body.data,
          name: part.filename,
          type: part.mimeType ?? undefined,
          size: part.body.size ?? undefined,
          lastModified: new Date().getTime()
        }
      ]
    }
    return await this.getPartsFiles(part.parts, messageId)
  }

  private async getAttachmentById (attachmentId: string, messageId: string): Promise<gmail_v1.Schema$MessagePartBody> {
    await this.rateLimiter.take(5)
    const res = await this.gmail.messages.attachments.get({ id: attachmentId, userId: 'me', messageId })
    return res.data
  }

  private async getPartsFiles (
    parts: gmail_v1.Schema$MessagePart[] | undefined,
    messageId: string
  ): Promise<AttachedFile[]> {
    const result: AttachedFile[] = []
    if (parts !== undefined) {
      const filtredParts = parts.filter((part) => part.filename != null && part.filename.length > 0)
      for (const part of filtredParts ?? []) {
        const res = await this.getPartFiles(part, messageId)
        if (res.length > 0) {
          result.push(...res)
        }
      }
    }
    return result
  }

  private createTx (
    message: AttachedData<Message> & { modifiedOn: Timestamp },
    factory: TxFactory,
    channel: Channel
  ): TxCUD<Message> {
    const tx = factory.createTxCollectionCUD<Channel, Message>(
      channel._class,
      channel._id,
      channel.space,
      'items',
      factory.createTxCreateDoc<Message>(
        gmail.class.Message,
        core.space.Workspace,
        message as unknown as Data<Message>,
        undefined,
        message.modifiedOn
      ),
      message.modifiedOn
    )
    return tx
  }

  private updateTx (
    message: AttachedData<Message> & { modifiedOn: Timestamp },
    current: Message,
    factory: TxFactory,
    channel: Channel
  ): TxCUD<Message> | undefined {
    const operations = diffAttributes(current, message)
    if (Object.keys(operations).length === 0) return undefined
    const tx = factory.createTxCollectionCUD<Channel, Message>(
      channel._class,
      channel._id,
      channel.space,
      'items',
      factory.createTxUpdateDoc<Message>(current._class, current.space, current._id, operations)
    )
    return tx
  }

  private async refreshToken (): Promise<void> {
    try {
      clearTimeout(this.refreshTimer)
      const res = await this.oAuth2Client.refreshAccessToken()
      await this.updateToken(res.credentials)
      this.refreshTimer = setTimeout(
        () => {
          void this.refreshToken()
        },
        30 * 60 * 1000
      )
    } catch (err: any) {
      console.log("Couldn't refresh token, error:", err.message)
      if (err?.response?.data?.error === 'invalid_grant') {
        await this.workspace.signoutByUserId(this.user.userId, true)
      } else {
        this.refreshTimer = setTimeout(
          () => {
            void this.refreshToken()
          },
          15 * 60 * 1000
        )
      }
      throw err
    }
  }

  private async watch (): Promise<void> {
    try {
      await this.rateLimiter.take(100)
      await this.gmail.watch({
        userId: 'me',
        requestBody: {
          topicName: config.WATCH_TOPIC_NAME
        }
      })
    } catch (err) {
      console.log('Watch error', (err as any).message)
    }
  }

  private async makeAttachmentsBody (message: NewMessage, from: string): Promise<string> {
    const str = [
      'Content-Type: multipart/mixed; boundary="mail"\n',
      'MIME-Version: 1.0\n',
      `To: ${message.to} \n`,
      `From: ${from} \n`
    ]

    if (message.replyTo != null) {
      str.push(`In-Reply-To: ${message.replyTo} \n`)
    }

    if (message.copy != null && message.copy.length > 0) {
      str.push(`Cc: ${message.copy.join(', ')} \n`)
    }

    if (message.subject != null) {
      str.push(`Subject: =?UTF-8?B?${encode64(message.subject)}?= \n`)
    }

    str.push('\n\n')
    str.push('--mail\n')
    str.push('Content-Type: text/html; charset="UTF-8"\n')
    str.push('MIME-Version: 1.0\n')
    str.push('Content-Transfer-Encoding: 7bit\n\n')
    str.push(addFooter(message.content))
    str.push('\n\n')

    const attachments = await this.client.findAll(attachment.class.Attachment, { attachedTo: message._id })

    for (const attachment of attachments) {
      const attachmentStrings = await this.makeAttachmentPart(attachment)
      str.push(...attachmentStrings)
    }

    str.push('--mail--')

    return encode64(str.join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  private async makeAttachmentPart (attachment: Attachment): Promise<string[]> {
    const buffer = await this.storageAdapter.read(this.ctx, this.workspaceId as any, attachment.file) // TODO: FIXME
    const data = arrayBufferToBase64(buffer)
    const res: string[] = []
    res.push('--mail\n')
    res.push(`Content-Type: ${attachment.type}\n`)
    res.push('MIME-Version: 1.0\n')
    res.push('Content-Transfer-Encoding: base64\n')
    res.push(`Content-Disposition: attachment; filename="${attachment.name}"\n\n`)
    res.push(data)
    res.push('\n\n')
    return res
  }

  async close (): Promise<void> {
    if (this.watchTimer !== undefined) clearInterval(this.watchTimer)
    if (this.refreshTimer !== undefined) clearTimeout(this.refreshTimer)
    try {
      await this.rateLimiter.take(50)
      await this.gmail.stop({
        userId: 'me'
      })
    } catch (err) {
      console.log('close error', (err as any).message)
    }
  }
}
