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

import core, {
  AccountUuid,
  Client,
  MeasureContext,
  PersonId,
  TxOperations,
  WorkspaceUuid,
  parseSocialIdString
} from '@hcengineering/core'
import gmail, { type NewMessage } from '@hcengineering/gmail'
import { type StorageAdapter } from '@hcengineering/server-core'
import setting from '@hcengineering/setting'
import type { Credentials, OAuth2Client } from 'google-auth-library'
import { gmail_v1, google } from 'googleapis'
import { encode64 } from './base64'
import config from './config'
import { GmailController } from './gmailController'
import { RateLimiter } from './rateLimiter'
import type { ProjectCredentials, Token, User } from './types'
import { addFooter, isToken } from './utils'
import type { WorkspaceClient } from './workspaceClient'
import { getOrCreateSocialId } from './accounts'
import { AttachmentHandler } from './message/attachments'
import { TokenStorage } from './tokens'
import { MessageManager } from './message/message'
import { SyncManager } from './message/sync'

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

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
  private readonly account: AccountUuid
  private email: string | undefined = undefined
  private socialId: PersonId
  private readonly tokenStorage: TokenStorage
  private readonly client: TxOperations
  private watchTimer: NodeJS.Timeout | undefined = undefined
  private refreshTimer: NodeJS.Timeout | undefined = undefined
  private readonly rateLimiter = new RateLimiter(1000, 200)
  private readonly attachmentHandler: AttachmentHandler
  private readonly messageManager: MessageManager
  private readonly syncManager: SyncManager

  private constructor (
    private readonly ctx: MeasureContext,
    credentials: ProjectCredentials,
    private readonly user: User,
    client: Client,
    workspaceId: WorkspaceUuid,
    storageAdapter: StorageAdapter,
    private readonly workspace: WorkspaceClient
  ) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { client_secret, client_id, redirect_uris } = credentials.web
    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
    this.gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client }).users
    this.tokenStorage = new TokenStorage(workspaceId, user.token)
    this.socialId = this.user.socialId
    this.client = new TxOperations(client, this.socialId)
    this.account = this.user.userId
    this.attachmentHandler = new AttachmentHandler(ctx, workspaceId, storageAdapter, this.gmail, this.client)
    this.messageManager = new MessageManager(ctx, this.client, this.attachmentHandler, this.socialId, this.workspace)
    this.syncManager = new SyncManager(
      ctx,
      this.messageManager,
      this.gmail,
      this.user.workspace,
      workspaceId,
      user.token
    )
  }

  static async create (
    ctx: MeasureContext,
    credentials: ProjectCredentials,
    user: User | Token,
    client: Client,
    workspace: WorkspaceClient,
    workspaceId: WorkspaceUuid,
    storageAdapter: StorageAdapter
  ): Promise<GmailClient> {
    const gmailClient = new GmailClient(ctx, credentials, user, client, workspaceId, storageAdapter, workspace)
    if (isToken(user)) {
      ctx.info('Setting token while creating', { workspaceUuid: user.workspace, userId: user.userId })
      await gmailClient.setToken(user)
      await gmailClient.refreshToken()
      await gmailClient.addClient()
    }
    return gmailClient
  }

  getAuthUrl (redirectURL: string): string {
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
    this.ctx.info('Setting token after authorize', { workspaceUuid: this.user.workspace, userId: this.user.userId })
    await this.setToken(token.tokens)
    await this.refreshToken()
    await this.addClient()
    void this.startSync()
    void this.getNewMessagesAfterAuth()

    const integrations = await this.client.findAll(setting.class.Integration, {
      createdBy: this.socialId,
      type: gmail.integrationType.Gmail
    })
    const updated = integrations.find((p) => p.disabled && p.value === this.email)

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
        value: this.socialId
      })
    }
  }

  async getNewMessagesAfterAuth (): Promise<void> {
    const newMessages = await this.client.findAll(gmail.class.NewMessage, {
      status: 'new',
      from: this.socialId
    })
    await this.workspace.subscribeMessages()
    for (const message of newMessages) {
      await this.createMessage(message as NewMessage)
    }
  }

  async createMessage (message: NewMessage): Promise<void> {
    if (message.status === 'sent') return
    try {
      const email = await this.getEmail()
      const body =
        message.attachments != null && message.attachments > 0
          ? await this.makeAttachmentsBody(message, email)
          : makeHTMLBody(message, email)
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
      this.ctx.error('Create message error', { workspaceUuid: this.user.workspace, userId: this.user.userId, message: err.message })
      if (err?.response?.data?.error === 'invalid_grant') {
        await this.refreshToken()
      }
    }
  }

  private checkError (err: any): boolean {
    return err?.response?.data?.error === 'invalid_grant'
  }

  async signout (byError: boolean = false): Promise<void> {
    try {
      await this.close()
      await this.oAuth2Client.revokeCredentials()
    } catch {}
    await this.tokenStorage.deleteToken(this.socialId)
    const integration = await this.client.findOne(setting.class.Integration, {
      createdBy: this.socialId,
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

  async startSync (): Promise<void> {
    this.ctx.info('Start sync', { workspaceUuid: this.user.workspace, userId: this.user.userId })
    await this.syncManager.sync(this.socialId, this.email)
    await this.watch()
    // recall every 24 hours https://developers.google.com/gmail/api/guides/push
    this.watchTimer = setInterval(() => {
      void this.watch()
    }, 86400000)
  }

  async sync (): Promise<void> {
    this.ctx.info('Sync', { workspaceUuid: this.user.workspace, userId: this.user.userId })
    await this.syncManager.sync(this.socialId, this.email)
  }

  async newChannel (value: string): Promise<void> {
    const query = `{from:${value} to:${value} cc:${value} bcc:${value}}`
    await this.fullSync(query)
  }

  private async getEmail (): Promise<string> {
    if (this.email !== undefined) {
      return this.email
    }
    for (let i = 0; i < 3; i++) {
      await this.rateLimiter.take(1)
      const profile = await this.gmail.getProfile({
        userId: 'me'
      })
      this.email = profile.data.emailAddress ?? undefined
      if (this.email !== undefined) return this.email
      await wait(5)
    }
    throw new Error("Can't get profile email after 3 attempts")
  }

  private async syncUserInfo (credentials: Credentials): Promise<void> {
    if (credentials.access_token == null) return
    if (this.email === undefined) {
      this.ctx.error('User email is missing', { workspaceUuid: this.user.workspace, userId: this.user.userId })
      return
    }
    this.socialId = await getOrCreateSocialId(this.account, this.email)
  }

  private async getCurrentToken (): Promise<Token | null> {
    return await this.tokenStorage.getToken(this.socialId)
  }

  private async addClient (): Promise<void> {
    try {
      const email = await this.getEmail()
      const socialId = await this.initSocialId(email)
      const controller = GmailController.getGmailController()
      controller.addClient(socialId, this)
    } catch (err) {
      this.ctx.error('Add client error', { workspaceUuid: this.user.workspace, userId: this.user.userId, message: (err as any).message })
    }
  }

  private async setToken (token: Credentials): Promise<void> {
    try {
      this.oAuth2Client.setCredentials(token)
      const email = await this.getEmail()
      await this.syncUserInfo(token)
      await this.updateSocialId(email)
    } catch (err: any) {
      this.ctx.error('Set token error', { workspaceUuid: this.user.workspace, userId: this.user.userId, message: err.message })
      if (this.checkError(err)) {
        await this.signout(true)
      }
      throw err
    }
  }

  private async initSocialId (email: string | undefined): Promise<PersonId> {
    if (email === undefined) {
      throw new Error(`User email is missing ${this.user.workspace} ${this.user.userId}`)
    }
    this.socialId = await getOrCreateSocialId(this.user.userId, email)
    return this.socialId
  }

  private async updateSocialId (email: string): Promise<void> {
    const existingEmail = this.socialId !== undefined ? parseSocialIdString(this.socialId).value : undefined
    if (existingEmail === email) return
    this.socialId = await getOrCreateSocialId(this.user.userId, email)
  }

  private async updateToken (token: Credentials): Promise<void> {
    try {
      await this.tokenStorage.saveToken(token as Token)
    } catch (err) {
      this.ctx.error('update token error', { workspaceUuid: this.user.workspace, userId: this.user.userId, message: (err as any).message })
    }
  }

  private async fullSync (q?: string): Promise<void> {
    await this.syncManager.fullSync(this.socialId, this.email, q)
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
      this.ctx.error('Couldn\'t refresh token', { workspaceUuid: this.user.workspace, userId: this.user.userId, message: err.message })
      if (err?.response?.data?.error === 'invalid_grant') {
        await this.workspace.signoutBySocialId(this.socialId, true)
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
      this.ctx.error('Watch error', { workspaceUuid: this.user.workspace, userId: this.user.userId, message: (err as any).message })
    }
  }

  private async makeAttachmentsBody (message: NewMessage, from: string): Promise<string> {
    return await this.attachmentHandler.makeAttachmentsBody(message, from)
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
      this.ctx.error('close error', { workspaceUuid: this.user.workspace, userId: this.user.userId, message: (err as any).message })
    }
  }
}
