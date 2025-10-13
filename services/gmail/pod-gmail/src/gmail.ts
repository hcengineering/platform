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
  SocialId,
  SocialIdType,
  TxOperations,
  WorkspaceUuid
} from '@hcengineering/core'
import gmail, { gmailIntegrationKind, type NewMessage } from '@hcengineering/gmail'
import { type StorageAdapter } from '@hcengineering/server-core'
import setting from '@hcengineering/setting'
import type { Credentials, OAuth2Client } from 'google-auth-library'
import { gmail_v1, google } from 'googleapis'
import {
  getClient as getAccountClient,
  Integration,
  WorkspaceLoginInfo,
  isWorkspaceLoginInfo,
  AccountClient
} from '@hcengineering/account-client'
import {
  MailRecipient,
  type SyncOptions,
  getChannel,
  getMailHeaders,
  isSyncedMessage
} from '@hcengineering/mail-common'
import chat from '@hcengineering/chat'

import { encode64 } from './base64'
import config from './config'
import { GmailController } from './gmailController'
import { RateLimiter } from './rateLimiter'
import { type ProjectCredentials, type Token, type User, type SyncState, GmailMessageType } from './types'
import { addFooter, isToken, serviceToken, getKvsClient, createGmailSearchQuery, getSpaceId } from './utils'
import type { WorkspaceClient } from './workspaceClient'
import { getOrCreateSocialId } from './accounts'
import { createIntegrationIfNotExists, disableIntegration, removeIntegration } from './integrations'
import { AttachmentHandler } from './message/attachments'
import { TokenStorage } from './tokens'
import { createMessageManager } from './message/adapter'
import { SyncManager } from './message/sync'
import { getEmail } from './gmail/utils'
import { IMessageManager } from './message/types'
import { CreateMessageEvent } from '@hcengineering/communication-sdk-types'
import { Card } from '@hcengineering/card'
import { makeHTMLBodyV2 } from './message/v2/send'

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

function makeHTMLBody (message: NewMessage, from: string): string {
  const str = [
    'Content-Type: text/html; charset="UTF-8"\n',
    'MIME-Version: 1.0\n',
    'Content-Transfer-Encoding: 7bit\n',
    `To: ${message.to} \n`,
    `From: ${from} \n`,
    ...getMailHeaders(GmailMessageType, message._id)
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
  private readonly account: AccountUuid
  private email: string
  private readonly tokenStorage: TokenStorage
  private readonly client: TxOperations
  private watchTimer: NodeJS.Timeout | undefined = undefined
  private refreshTimer: NodeJS.Timeout | undefined = undefined
  private readonly rateLimiter = new RateLimiter(1000, 200)
  private readonly attachmentHandler: AttachmentHandler
  private readonly messageManager: IMessageManager
  private readonly syncManager: SyncManager
  private readonly integrationToken: string
  private integration: Integration | null | undefined = undefined
  private syncStarted: boolean = false
  private channel: Card | undefined = undefined

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly oAuth2Client: OAuth2Client,
    private readonly gmail: gmail_v1.Resource$Users,
    private readonly user: User,
    client: Client,
    private readonly accountClient: AccountClient,
    wsInfo: WorkspaceLoginInfo,
    storageAdapter: StorageAdapter,
    private readonly workspace: WorkspaceClient,
    email: string,
    private socialId: SocialId,
    private readonly allSocialIds: Set<PersonId>
  ) {
    this.email = email
    this.integrationToken = serviceToken(wsInfo.workspace)
    this.tokenStorage = new TokenStorage(this.ctx, wsInfo.workspace, this.integrationToken)
    this.client = new TxOperations(client, this.socialId._id)
    this.account = this.user.userId
    this.attachmentHandler = new AttachmentHandler(ctx, wsInfo, storageAdapter, this.gmail, this.client)
    const keyValueClient = getKvsClient(this.integrationToken)
    const recipient: MailRecipient = {
      email: this.email,
      socialId: this.socialId._id,
      uuid: this.user.userId
    }
    this.messageManager = createMessageManager(
      ctx,
      this.client,
      keyValueClient,
      accountClient,
      this.attachmentHandler,
      this.workspace,
      this.integrationToken,
      recipient
    )
    this.syncManager = new SyncManager(
      ctx,
      this.messageManager,
      this.gmail,
      this.user.workspace,
      keyValueClient,
      this.rateLimiter
    )
  }

  static async create (
    ctx: MeasureContext,
    credentials: ProjectCredentials,
    user: User | Token,
    client: Client,
    workspace: WorkspaceClient,
    workspaceId: WorkspaceUuid,
    storageAdapter: StorageAdapter,
    authCode?: string
  ): Promise<GmailClient> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { client_secret, client_id, redirect_uris } = credentials.web
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
    const googleClient = google.gmail({ version: 'v1', auth: oAuth2Client }).users
    ctx.info('Google client created:', { client_id, workspace: user.workspace, socialId: user.socialId })

    let token: Credentials | undefined = isToken(user) ? user : undefined
    if (token === undefined && authCode !== undefined) {
      const tokenResponse = await oAuth2Client.getToken(authCode)
      token = {
        ...user,
        ...tokenResponse.tokens
      }
      oAuth2Client.setCredentials(token)
    } else if (token !== undefined) {
      oAuth2Client.setCredentials(token)
    }
    const email = await getEmail(googleClient)
    if (email === undefined) {
      throw new Error('Cannot retrieve user email')
    }
    const isActualSocialId = user.socialId?.type === SocialIdType.EMAIL && user.socialId?.value === email
    const socialId = isActualSocialId ? user.socialId : await getOrCreateSocialId(user.userId, email)
    if (socialId?._id == null) {
      throw new Error(`Cannot create gmail client without social id: ${user.userId}, ${workspaceId}`)
    }
    user.socialId = socialId

    const integrationToken = serviceToken(workspaceId)
    const accountClient = getAccountClient(config.AccountsURL, integrationToken)
    const workspaceInfo = await accountClient.getLoginInfoByToken()
    if (!isWorkspaceLoginInfo(workspaceInfo)) {
      ctx.error('Unable to get workspace info', { workspaceId, email })
      throw new Error('Unable to get workspace info')
    }
    const info = await accountClient.getPersonInfo(user.userId)
    const allSocialIds = new Set(info.socialIds.map((socialId) => socialId._id))

    const gmailClient = new GmailClient(
      ctx,
      oAuth2Client,
      googleClient,
      user,
      client,
      accountClient,
      workspaceInfo,
      storageAdapter,
      workspace,
      email,
      socialId,
      allSocialIds
    )
    await gmailClient.createIntregration()
    if (token !== undefined) {
      ctx.info('Setting token while creating', { workspaceUuid: user.workspace, userId: user.userId })
      await gmailClient.setToken(token)
      await gmailClient.refreshToken()
      await gmailClient.addClient()
    }
    ctx.info('Created gmail client', { workspaceUuid: user.workspace, userId: user.userId })
    void gmailClient.initIntegration()
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

  async initIntegration (): Promise<void> {
    try {
      this.ctx.info('Init integration', { workspaceUuid: this.user.workspace, userId: this.user.userId })

      void this.startSync()
      void this.getNewMessagesAfterAuth()

      const integrations = await this.client.findAll(setting.class.Integration, {
        createdBy: this.socialId._id,
        type: gmail.integrationType.Gmail,
        value: this.email
      })

      const sortedIntegrations = integrations.sort((a, b) => (b.createdOn ?? 0) - (a.createdOn ?? 0))
      const activeIntegration = sortedIntegrations.find((p) => !p.disabled)
      const existingIntegration =
        activeIntegration ?? (sortedIntegrations.length > 0 ? sortedIntegrations[0] : undefined)

      // Disable all other integrations for this social ID except the one we want to keep/update
      for (const integration of sortedIntegrations.filter((p) => p._id !== existingIntegration?._id)) {
        if (!integration.disabled) {
          this.ctx.warn('Found several active integrations for the same email, disabling one', {
            email: this.email,
            integrationId: integration._id
          })
          await this.client.update(integration, {
            disabled: true
          })
        }
      }

      if (existingIntegration !== undefined) {
        this.ctx.info('Found existing integration', {
          integrationId: existingIntegration._id,
          email: existingIntegration.value,
          workspaceUuid: this.user.workspace,
          userId: this.user.userId
        })
        if (existingIntegration.disabled) {
          await this.client.update(existingIntegration, {
            disabled: false
          })
        }
      } else {
        await this.client.createDoc(setting.class.Integration, core.space.Workspace, {
          type: gmail.integrationType.Gmail,
          disabled: false,
          value: this.email ?? this.socialId.value
        })
      }
    } catch (err: any) {
      this.ctx.info('Failed to start message sync', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        error: err.message
      })
    }
  }

  async createIntregration (): Promise<void> {
    try {
      this.integration = await createIntegrationIfNotExists(this.socialId._id, this.user.workspace, this.email)
    } catch (err: any) {
      this.ctx.error('Failed to create integration', { socialId: this.socialId, workspace: this.workspace })
    }
  }

  async refreshIntegration (): Promise<void> {
    try {
      this.integration = await this.accountClient.getIntegration({
        socialId: this.socialId._id,
        workspaceUuid: this.user.workspace,
        kind: gmailIntegrationKind
      })
    } catch (err: any) {
      this.ctx.error('Failed to refresh integration', { socialId: this.socialId, workspace: this.workspace })
    }
  }

  async getNewMessagesAfterAuth (): Promise<void> {
    const newMessages = await this.client.findAll(gmail.class.NewMessage, {
      status: 'new',
      from: this.socialId._id
    })
    await this.workspace.subscribeMessages()
    for (const message of newMessages) {
      await this.createMessage(message as NewMessage)
    }
  }

  async createMessage (message: NewMessage): Promise<void> {
    if (message.status === 'sent') return
    try {
      this.ctx.info('Send gmail message', { id: message._id, from: message.from, to: message.to })
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
      this.ctx.error('Create message error', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        message: err.message
      })
      if (err?.response?.data?.error === 'invalid_grant') {
        await this.refreshToken()
      }
    }
  }

  async handleNewMessage (message: CreateMessageEvent): Promise<void> {
    try {
      const personId = message.socialId
      if (personId !== this.socialId._id && !this.allSocialIds.has(personId)) {
        return
      }

      if (!this.isConfigured()) {
        return
      }

      if (message.date !== undefined) {
        const messageDate = message.date instanceof Date ? message.date : new Date(message.date)
        if (messageDate < config.OutgoingSyncStartDate) {
          return
        }
      }
      const email = await this.getEmail()
      const thread = await this.client.findOne<Card>(chat.masterTag.Thread, { _id: message.cardId })
      const mailChannel = await this.getMailChannel()
      if (mailChannel === undefined) {
        this.ctx.error('Mail channel is not defined', { email, workspace: this.workspace })
      }
      if (thread === undefined || thread?.parent !== mailChannel?._id) {
        return
      }
      const isExisting = await this.isExistingGmailMessage(message, email)
      if (isExisting) {
        this.ctx.info('Skip existing message', { id: message._id, email })
        return
      }

      this.ctx.info('Sending gmail message', { id: message._id, email })
      const gmailBody = await makeHTMLBodyV2(this.ctx, this.accountClient, message, thread, this.socialId._id, email)
      await this.rateLimiter.take(100)
      await this.gmail.messages.send({
        userId: 'me',
        requestBody: {
          raw: gmailBody
        }
      })
    } catch (err: any) {
      this.ctx.error('Send gmail message v2 error', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        message: err.message
      })
      if (err?.response?.data?.error === 'invalid_grant') {
        await this.refreshToken()
      }
    }
  }

  async getMailChannel (): Promise<Card | undefined> {
    if (this.channel === undefined) {
      this.channel = await getChannel(this.client, this.email)
    }
    return this.channel
  }

  async isExistingGmailMessage (message: CreateMessageEvent, from: string): Promise<boolean> {
    try {
      if (isSyncedMessage(message)) {
        return true
      }
      await this.rateLimiter.take(10)

      const rawDate = message.date ?? new Date()
      const messageDate = rawDate instanceof Date ? rawDate : new Date(rawDate)

      const startDate = new Date(messageDate.getTime() - 1000 * 60 * 60) // 1 hour before
      const endDate = new Date(messageDate.getTime() + 1000 * 60 * 60) // 1 hour after

      const query: gmail_v1.Params$Resource$Users$Messages$List = {
        userId: 'me',
        q: createGmailSearchQuery(startDate, endDate, from),
        maxResults: 20 // Limit results for performance
      }

      const existingMessages = await this.gmail.messages.list(query)

      for (const msg of existingMessages.data.messages ?? []) {
        const gmailDate = msg.internalDate != null ? new Date(Number.parseInt(msg.internalDate)) : undefined
        if (gmailDate !== undefined && gmailDate?.getTime() === message.date?.getTime()) {
          return true
        }
      }
      return false
    } catch (err: any) {
      this.ctx.error('Error checking existing Gmail message', {
        messageId: message.messageId,
        error: err.message
      })
      return false
    }
  }

  private checkError (err: any): boolean {
    return err?.response?.data?.error === 'invalid_grant'
  }

  async signout (byError: boolean = false): Promise<void> {
    this.ctx.info('Deactivate gmail client', { socialId: this.socialId, workspace: this.user.workspace })
    try {
      await this.close()
      await this.oAuth2Client.revokeCredentials()
    } catch {}
    await this.tokenStorage.deleteToken(this.socialId._id)
    await this.disableIntegration(byError)
    let integrations = await this.client.findAll(setting.class.Integration, {
      createdBy: this.socialId._id,
      type: gmail.integrationType.Gmail,
      value: this.email
    })
    if (integrations.length === 0) {
      this.ctx.info('No integrations found for the given email', { socialId: this.socialId._id, email: this.email })
      integrations = await this.client.findAll(setting.class.Integration, {
        createdBy: this.socialId._id,
        type: gmail.integrationType.Gmail
      })
    }
    for (const integration of integrations) {
      if (byError) {
        this.ctx.info('Disable integration', { integrationId: integration._id, email: integration.value })
        await this.client.update(integration, { disabled: true })
      } else {
        this.ctx.info('Remove integration', { integrationId: integration._id, email: integration.value })
        await this.client.remove(integration)
      }
    }
  }

  async disableIntegration (byError: boolean = false): Promise<void> {
    if (this.integration != null) {
      if (byError) {
        await disableIntegration(this.integration)
      } else {
        await removeIntegration(this.socialId._id, this.user.workspace)
      }
    }
  }

  async startSync (): Promise<void> {
    if (this.syncStarted) {
      this.ctx.info('Sync already started, skipping duplicate call', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        email: this.email
      })
      return
    }

    // Check for spaceId requirement in v2 configurations
    if (!this.isConfigured()) {
      this.ctx.info('Cannot start sync: spaceId is required for v2 configuration', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        email: this.email,
        integrationVersion: this.integration?.data?.integrationVersion
      })
      return
    }

    try {
      this.syncStarted = true
      this.ctx.info('Start sync', { workspaceUuid: this.user.workspace, userId: this.user.userId, email: this.email })
      await this.syncManager.sync(
        this.socialId._id,
        { noNotify: true, spaceId: getSpaceId(this.integration) },
        this.email
      )
      await this.watch()
      // recall every 24 hours https://developers.google.com/gmail/api/guides/push
      if (this.watchTimer !== undefined) clearInterval(this.watchTimer)
      this.watchTimer = setInterval(() => {
        void this.watch()
      }, 86400000)
    } catch (err: any) {
      this.ctx.error('Failed to start sync', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        email: this.email,
        error: err.message
      })
      this.syncStarted = false
    }
  }

  async sync (options: SyncOptions): Promise<void> {
    if (!this.isConfigured()) {
      return
    }
    this.ctx.info('Sync', { workspaceUuid: this.user.workspace, userId: this.user.userId })
    const syncOptions = {
      ...options,
      spaceId: getSpaceId(this.integration)
    }
    await this.syncManager.sync(this.socialId._id, syncOptions, this.email)
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
      this.email = profile.data.emailAddress ?? this.email
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

  private async addClient (): Promise<void> {
    try {
      this.ctx.info('Register client', { socialId: this.socialId._id, email: this.email })
      const controller = GmailController.getGmailController()
      controller.addClient(this.socialId._id, this.user.workspace, this.email, this)
    } catch (err) {
      this.ctx.error('Add client error', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        message: (err as any).message
      })
    }
  }

  private async setToken (token: Credentials): Promise<void> {
    try {
      this.oAuth2Client.setCredentials(token)
      const email = await this.getEmail()
      await this.syncUserInfo(token)
      await this.updateSocialId(email)
      await this.updateToken(token)
    } catch (err: any) {
      this.ctx.error('Set token error', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        message: err.message
      })
      if (this.checkError(err)) {
        await this.signout(true)
      }
      throw err
    }
  }

  private async updateSocialId (email: string): Promise<void> {
    const existingEmail = this.socialId !== undefined ? this.socialId.value : undefined
    if (existingEmail === email) return
    this.socialId = await getOrCreateSocialId(this.user.userId, email)
  }

  private async updateToken (token: Credentials): Promise<void> {
    try {
      await this.tokenStorage.saveToken(this.socialId._id, token as Token)
    } catch (err) {
      this.ctx.error('update token error', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        message: (err as any).message
      })
    }
  }

  private async fullSync (q?: string): Promise<void> {
    this.ctx.info('Full sync client', {
      workspaceUuid: this.user.workspace,
      userId: this.user.userId,
      email: this.email
    })
    await this.syncManager.fullSync(this.socialId._id, this.email, q)
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
      this.ctx.error("Couldn't refresh token", {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        message: err.message
      })
      if (err?.response?.data?.error === 'invalid_grant') {
        await this.workspace.signoutBySocialId(this.socialId._id, true)
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
      this.ctx.info('Gmail watch established successfully', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        topicName: config.WATCH_TOPIC_NAME
      })
    } catch (err) {
      this.ctx.error('Watch error', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        email: this.email,
        message: (err as any).message
      })
    }
  }

  private async makeAttachmentsBody (message: NewMessage, from: string): Promise<string> {
    try {
      return await this.attachmentHandler.makeAttachmentsBody(message, from)
    } catch (err: any) {
      this.ctx.error('Failed to make attachment body', err)
      return makeHTMLBody(message, from)
    }
  }

  private isConfigured (): boolean {
    if (this.integration?.data?.integrationVersion !== 'v2') return true
    return getSpaceId(this.integration) !== undefined
  }

  async getStateSummary (): Promise<SyncState> {
    let totalMessages: number | null | undefined
    try {
      const query: gmail_v1.Params$Resource$Users$Messages$List = {
        userId: 'me',
        maxResults: 1
      }
      const result = await this.gmail.getProfile(query)
      totalMessages = result.data.messagesTotal
    } catch (err: any) {
      this.ctx.error('Failed to get messages count', err.message)
    }

    const syncStatus = this.syncManager.getSyncStatus()

    return {
      status: this.syncStarted ? 'active' : 'inactive',
      email: this.email,
      totalMessages,
      syncInfo: syncStatus,
      isConfigured: this.isConfigured()
    }
  }

  async close (): Promise<void> {
    if (this.watchTimer !== undefined) clearInterval(this.watchTimer)
    if (this.refreshTimer !== undefined) clearTimeout(this.refreshTimer)
    try {
      if (this.syncManager !== undefined) {
        this.syncManager.close()
      }
      await this.rateLimiter.take(50)
      await this.gmail.stop({
        userId: 'me'
      })
    } catch (err) {
      this.ctx.error('close error', {
        workspaceUuid: this.user.workspace,
        userId: this.user.userId,
        message: (err as any).message
      })
    }
  }
}
