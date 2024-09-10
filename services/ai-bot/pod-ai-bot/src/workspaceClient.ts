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

import aiBot, { aiBotAccountEmail, AIBotEvent, AIBotResponseEvent, AIBotTransferEvent } from '@hcengineering/ai-bot'
import chunter, { Channel, ChatMessage, DirectMessage, ThreadMessage, TypingInfo } from '@hcengineering/chunter'
import contact, {
  AvatarType,
  combineName,
  getFirstName,
  getLastName,
  Person,
  PersonAccount
} from '@hcengineering/contact'
import core, {
  Account,
  Blob,
  Class,
  Client,
  Data,
  Doc,
  MeasureContext,
  RateLimiter,
  Ref,
  Space,
  Tx,
  TxCreateDoc,
  TxOperations,
  TxProcessor,
  TxRemoveDoc
} from '@hcengineering/core'
import { countTokens } from '@hcengineering/openai'
import { WorkspaceInfoRecord } from '@hcengineering/server-ai-bot'
import { getOrCreateOnboardingChannel } from '@hcengineering/server-analytics-collector-resources'
import { BlobClient } from '@hcengineering/server-client'
import { jsonToMarkup, MarkdownParser, markupToText } from '@hcengineering/text'
import fs from 'fs'
import { WithId } from 'mongodb'
import OpenAI from 'openai'

import config from './config'
import { AIBotController } from './controller'
import { connectPlatform } from './platform'
import { HistoryRecord } from './types'
import { createChatCompletion, getDirect, login, requestSummary } from './utils'

const MAX_LOGIN_DELAY_MS = 15 * 1000 // 15 ses
const UPDATE_TYPING_TIMEOUT_MS = 1000

export class WorkspaceClient {
  client: Client | undefined
  opClient: Promise<TxOperations> | TxOperations

  blobClient: BlobClient

  loginTimeout: NodeJS.Timeout | undefined
  loginDelayMs = 2 * 1000

  channelByKey = new Map<string, Ref<Channel>>()
  rate = new RateLimiter(1)

  aiAccount: PersonAccount | undefined
  aiPerson: Person | undefined

  typingMap: Map<Ref<Doc>, TypingInfo> = new Map<Ref<Doc>, TypingInfo>()
  typingTimeoutsMap: Map<Ref<Doc>, NodeJS.Timeout> = new Map<Ref<Doc>, NodeJS.Timeout>()
  directByEmail = new Map<string, Ref<DirectMessage>>()

  historyMap = new Map<Ref<Doc>, WithId<HistoryRecord>[]>()

  summarizing = new Set<Ref<Doc>>()

  constructor (
    readonly transactorUrl: string,
    readonly token: string,
    readonly workspace: string,
    readonly controller: AIBotController,
    readonly ctx: MeasureContext,
    readonly info: WorkspaceInfoRecord | undefined
  ) {
    this.blobClient = new BlobClient(transactorUrl, token, { name: this.workspace })
    this.opClient = this.initClient()
    void this.opClient.then((opClient) => {
      this.opClient = opClient
    })
  }

  private async initClient (): Promise<TxOperations> {
    await this.tryLogin()

    this.client = await connectPlatform(this.token, this.transactorUrl)
    const opClient = new TxOperations(this.client, aiBot.account.AIBot)

    await this.uploadAvatarFile(opClient)
    const typing = await opClient.findAll(chunter.class.TypingInfo, { user: aiBot.account.AIBot })
    this.typingMap = new Map(typing.map((t) => [t.objectId, t]))
    const events = await opClient.findAll(aiBot.class.AIBotEvent, {})
    void this.processEvents(events)

    this.client.notify = (...txes: Tx[]) => {
      void this.txHandler(opClient, txes)
    }
    this.ctx.info('Initialized workspace', { workspace: this.workspace })

    return opClient
  }

  private async uploadAvatarFile (client: TxOperations): Promise<void> {
    this.ctx.info('Upload avatar file', { workspace: this.workspace })

    try {
      await this.checkPersonData(client)

      const stat = fs.statSync(config.AvatarPath)
      const lastModified = stat.mtime.getTime()

      if (
        this.info !== undefined &&
        this.info.avatarPath === config.AvatarPath &&
        this.info.avatarLastModified === lastModified
      ) {
        this.ctx.info('Avatar file already uploaded', { workspace: this.workspace, path: config.AvatarPath })
        return
      }
      const data = fs.readFileSync(config.AvatarPath)

      await this.blobClient.upload(this.ctx, config.AvatarName, data.length, config.AvatarContentType, data)
      await this.controller.updateAvatarInfo(this.workspace, config.AvatarPath, lastModified)
      this.ctx.info('Uploaded avatar file', { workspace: this.workspace, path: config.AvatarPath })
    } catch (e) {
      this.ctx.error('Failed to upload avatar file', { e })
    }
  }

  private async tryLogin (): Promise<void> {
    this.ctx.info('Logging in: ', { workspace: this.workspace })
    const token = await login()

    clearTimeout(this.loginTimeout)

    if (token === undefined) {
      this.loginTimeout = setTimeout(() => {
        if (this.loginDelayMs < MAX_LOGIN_DELAY_MS) {
          this.loginDelayMs += 1000
        }
        this.ctx.info(`login delay ${this.loginDelayMs} millisecond`)
        void this.tryLogin()
      }, this.loginDelayMs)
    }
  }

  private async checkPersonData (client: TxOperations): Promise<void> {
    this.aiAccount = await client.getModel().findOne(contact.class.PersonAccount, { email: aiBotAccountEmail })
    if (this.aiAccount === undefined) {
      this.ctx.error('Cannot find AI PersonAccount', { email: aiBotAccountEmail })
      return
    }
    this.aiPerson = await client.findOne(contact.class.Person, { _id: this.aiAccount.person })

    if (this.aiPerson === undefined) {
      this.ctx.error('Cannot find AI Person ', { _id: this.aiAccount.person })
      return
    }

    const firstName = getFirstName(this.aiPerson.name)
    const lastName = getLastName(this.aiPerson.name)

    if (lastName !== config.LastName || firstName !== config.FirstName) {
      await client.update(this.aiPerson, {
        name: combineName(config.FirstName, config.LastName)
      })
    }

    if (this.aiPerson.avatar === config.AvatarName) {
      return
    }

    const exist = await this.blobClient.checkFile(this.ctx, config.AvatarName)

    if (!exist) {
      this.ctx.error('Cannot find file', { file: config.AvatarName, workspace: this.workspace })
      return
    }

    await client.diffUpdate(this.aiPerson, { avatar: config.AvatarName as Ref<Blob>, avatarType: AvatarType.IMAGE })
  }

  async getThreadParent (
    client: TxOperations,
    event: AIBotTransferEvent,
    _id: Ref<Doc>,
    _class: Ref<Class<Doc>>
  ): Promise<ChatMessage | undefined> {
    const parent = await client.findOne(chunter.class.ChatMessage, {
      attachedTo: _id,
      attachedToClass: _class,
      [aiBot.mixin.TransferredMessage]: {
        messageId: event.parentMessageId,
        parentMessageId: undefined
      }
    })

    if (parent !== undefined) {
      return parent
    }

    return await client.findOne(chunter.class.ChatMessage, {
      _id: event.parentMessageId
    })
  }

  async createTransferMessage (
    client: TxOperations,
    event: AIBotTransferEvent,
    _id: Ref<Doc>,
    _class: Ref<Class<Doc>>,
    space: Ref<Space>,
    message: string
  ): Promise<void> {
    const op = client.apply(undefined, 'AIBotTransferEvent')
    if (event.messageClass === chunter.class.ChatMessage) {
      await this.startTyping(client, space, _id, _class)
      const ref = await op.addCollection<Doc, ChatMessage>(
        chunter.class.ChatMessage,
        space,
        _id,
        _class,
        event.collection,
        { message }
      )
      await op.createMixin(ref, chunter.class.ChatMessage, space, aiBot.mixin.TransferredMessage, {
        messageId: event.messageId,
        parentMessageId: event.parentMessageId
      })

      await this.finishTyping(client, _id)
    } else if (event.messageClass === chunter.class.ThreadMessage && event.parentMessageId !== undefined) {
      const parent = await this.getThreadParent(client, event, _id, _class)
      if (parent !== undefined) {
        await this.startTyping(client, space, parent._id, parent._class)
        const ref = await op.addCollection<Doc, ThreadMessage>(
          chunter.class.ThreadMessage,
          parent.space,
          parent._id,
          parent._class,
          event.collection,
          { message, objectId: parent.attachedTo, objectClass: parent.attachedToClass }
        )
        await op.createMixin(
          ref,
          chunter.class.ThreadMessage as Ref<Class<ChatMessage>>,
          space,
          aiBot.mixin.TransferredMessage,
          {
            messageId: event.messageId,
            parentMessageId: event.parentMessageId
          }
        )
        await this.finishTyping(client, parent._id)
      }
    }

    await op.commit()
  }

  clearTypingTimeout (objectId: Ref<Doc>): void {
    const currentTimeout = this.typingTimeoutsMap.get(objectId)

    if (currentTimeout !== undefined) {
      clearTimeout(currentTimeout)
      this.typingTimeoutsMap.delete(objectId)
    }
  }

  async startTyping (
    client: TxOperations,
    space: Ref<Space>,
    objectId: Ref<Doc>,
    objectClass: Ref<Class<Doc>>
  ): Promise<void> {
    if (this.aiPerson === undefined) {
      return
    }

    this.clearTypingTimeout(objectId)
    const typingInfo = this.typingMap.get(objectId)

    if (typingInfo === undefined) {
      const data: Data<TypingInfo> = {
        objectId,
        objectClass,
        person: this.aiPerson._id,
        lastTyping: Date.now()
      }
      const _id = await client.createDoc(chunter.class.TypingInfo, space, data)
      this.typingMap.set(objectId, {
        ...data,
        _id,
        _class: chunter.class.TypingInfo,
        space,
        modifiedOn: Date.now(),
        modifiedBy: aiBot.account.AIBot
      })
    } else {
      await client.update(typingInfo, { lastTyping: Date.now() })
    }

    const timeout = setTimeout(() => {
      void this.startTyping(client, space, objectId, objectClass)
    }, UPDATE_TYPING_TIMEOUT_MS)
    this.typingTimeoutsMap.set(objectId, timeout)
  }

  async finishTyping (client: TxOperations, objectId: Ref<Doc>): Promise<void> {
    this.clearTypingTimeout(objectId)
    const typingInfo = this.typingMap.get(objectId)

    if (typingInfo !== undefined) {
      await client.remove(typingInfo)
      this.typingMap.delete(objectId)
    }
  }

  // TODO: In feature we also should use embeddings
  toOpenAiHistory (history: HistoryRecord[], promptTokens: number): any[] {
    const result: OpenAI.ChatCompletionMessageParam[] = []
    let totalTokens = promptTokens

    for (let i = history.length - 1; i >= 0; i--) {
      const record = history[i]
      const tokens = record.tokens

      if (totalTokens + tokens > config.MaxContentTokens) break

      result.unshift({ content: record.message, role: record.role as 'user' | 'assistant' })
      totalTokens += tokens
    }

    return result
  }

  async getHistory (objectId: Ref<Doc>): Promise<WithId<HistoryRecord>[]> {
    if (this.historyMap.has(objectId)) {
      return this.historyMap.get(objectId) ?? []
    }

    const historyRecords = await this.controller.storage.getHistoryRecords(this.workspace, objectId)
    this.historyMap.set(objectId, historyRecords)
    return historyRecords
  }

  async summarizeHistory (
    toSummarize: WithId<HistoryRecord>[],
    user: Ref<Account>,
    objectId: Ref<Doc>,
    objectClass: Ref<Class<Doc>>
  ): Promise<void> {
    if (this.summarizing.has(objectId)) {
      return
    }

    this.summarizing.add(objectId)
    const { summary, tokens } = await requestSummary(this.controller.aiClient, this.controller.encoding, toSummarize)

    if (summary === undefined) {
      this.ctx.error('Failed to summarize history', { objectId, objectClass, user })
      this.summarizing.delete(objectId)
      return
    }

    const summaryRecord: HistoryRecord = {
      message: summary,
      role: 'assistant',
      timestamp: toSummarize[0].timestamp,
      user,
      objectId,
      objectClass,
      tokens,
      workspace: this.workspace
    }

    await this.controller.storage.addHistoryRecord(summaryRecord)
    await this.controller.storage.removeHistoryRecords(toSummarize.map(({ _id }) => _id))
    const newHistory = await this.controller.storage.getHistoryRecords(this.workspace, objectId)
    this.historyMap.set(objectId, newHistory)
    this.summarizing.delete(objectId)
  }

  async pushHistory (
    message: string,
    role: 'user' | 'assistant',
    tokens: number,
    user: Ref<Account>,
    objectId: Ref<Doc>,
    objectClass: Ref<Class<Doc>>
  ): Promise<void> {
    const currentHistory = (await this.getHistory(objectId)) ?? []
    const newRecord: HistoryRecord = {
      workspace: this.workspace,
      message,
      objectId,
      objectClass,
      role,
      user,
      tokens,
      timestamp: Date.now()
    }
    const _id = await this.controller.storage.addHistoryRecord(newRecord)
    currentHistory.push({ ...newRecord, _id })
    this.historyMap.set(objectId, currentHistory)
  }

  async processResponseEvent (event: AIBotResponseEvent): Promise<void> {
    const client = await this.opClient
    const hierarchy = client.getHierarchy()

    const op = client.apply(undefined, 'AIBotResponseEvent')
    const { user, objectId, objectClass, messageClass } = event
    const space = hierarchy.isDerived(objectClass, core.class.Space) ? (objectId as Ref<Space>) : event.objectSpace

    await this.startTyping(client, space, objectId, objectClass)

    const promptText = markupToText(event.message)
    const prompt: OpenAI.ChatCompletionMessageParam = { content: promptText, role: 'user' }

    const promptTokens = countTokens([prompt], this.controller.encoding)
    const rawHistory = await this.getHistory(objectId)
    const history = this.toOpenAiHistory(rawHistory, promptTokens)

    if (history.length < rawHistory.length || history.length > config.MaxHistoryRecords) {
      void this.summarizeHistory(rawHistory, user, objectId, objectClass)
    }

    void this.pushHistory(promptText, prompt.role, promptTokens, user, objectId, objectClass)

    const start = Date.now()
    const chatCompletion = await createChatCompletion(this.controller.aiClient, prompt, user, history)
    const end = Date.now()
    this.ctx.info('Chat completion time: ', { time: end - start })
    const response = chatCompletion?.choices[0].message.content

    if (response == null) {
      await this.finishTyping(client, objectId)
      return
    }
    const responseTokens =
      chatCompletion?.usage?.completion_tokens ??
      countTokens([{ content: response, role: 'assistant' }], this.controller.encoding)

    void this.pushHistory(response, 'assistant', responseTokens, user, objectId, objectClass)

    const parser = new MarkdownParser([], '', '')
    const parseResponse = jsonToMarkup(parser.parse(response))

    if (messageClass === chunter.class.ChatMessage) {
      await op.addCollection<Doc, ChatMessage>(
        chunter.class.ChatMessage,
        space,
        objectId,
        objectClass,
        event.collection,
        { message: parseResponse }
      )
    } else if (messageClass === chunter.class.ThreadMessage) {
      const parent = await client.findOne<ChatMessage>(chunter.class.ChatMessage, {
        _id: objectId as Ref<ChatMessage>
      })

      if (parent !== undefined) {
        await op.addCollection<Doc, ThreadMessage>(
          chunter.class.ThreadMessage,
          space,
          objectId,
          objectClass,
          event.collection,
          { message: parseResponse, objectId: parent.attachedTo, objectClass: parent.attachedToClass }
        )
      }
    }

    await op.remove(event)
    await this.finishTyping(op, event.objectId)
    await op.commit()
  }

  async processTransferEvent (event: AIBotTransferEvent): Promise<void> {
    const client = await this.opClient

    await this.controller.transfer(event)
    await client.remove(event)
  }

  async transferToSupport (event: AIBotTransferEvent, channelRef?: Ref<Channel>): Promise<void> {
    const client = await this.opClient
    const key = `${event.toEmail}-${event.fromWorkspace}`
    const channel =
      channelRef ??
      this.channelByKey.get(key) ??
      (
        await getOrCreateOnboardingChannel(this.ctx, client, event.toEmail, {
          workspaceId: event.fromWorkspace,
          workspaceName: event.fromWorkspaceName,
          workspaceUrl: event.fromWorkspaceUrl
        })
      )[0]

    if (channel === undefined) {
      return
    }

    this.channelByKey.set(key, channel)

    await this.createTransferMessage(client, event, channel, chunter.class.Channel, channel, event.message)
  }

  async transferToUserDirect (event: AIBotTransferEvent): Promise<void> {
    const client = await this.opClient
    const direct = this.directByEmail.get(event.toEmail) ?? (await getDirect(client, event.toEmail, this.aiAccount))

    if (direct === undefined) {
      return
    }

    this.directByEmail.set(event.toEmail, direct)

    await this.createTransferMessage(client, event, direct, chunter.class.DirectMessage, direct, event.message)
  }

  getChannelRef (email: string, workspace: string): Ref<Channel> | undefined {
    const key = `${email}-${workspace}`

    return this.channelByKey.get(key)
  }

  async transfer (event: AIBotTransferEvent): Promise<void> {
    if (event.toWorkspace === config.SupportWorkspace) {
      const channel = this.getChannelRef(event.toEmail, event.fromWorkspace)

      if (channel !== undefined) {
        await this.transferToSupport(event, channel)
      } else {
        // If we dont have OnboardingChannel we should call it sync to prevent multiple channel for the same user and workspace
        await this.rate.add(async () => {
          await this.transferToSupport(event)
        })
      }
    } else {
      if (this.directByEmail.has(event.toEmail)) {
        await this.transferToUserDirect(event)
      } else {
        // If we dont have Direct with user we should call it sync to prevent multiple directs for the same user
        await this.rate.add(async () => {
          await this.transferToUserDirect(event)
        })
      }
    }
  }

  async processEvents (events: AIBotEvent[]): Promise<void> {
    if (events.length === 0 || this.opClient === undefined) {
      return
    }

    for (const event of events) {
      try {
        if (event._class === aiBot.class.AIBotResponseEvent) {
          void this.processResponseEvent(event as AIBotResponseEvent)
        } else if (event._class === aiBot.class.AIBotTransferEvent) {
          void this.processTransferEvent(event as AIBotTransferEvent)
        }
      } catch (e) {
        this.ctx.error('Error processing event: ', { e })
      }
    }
  }

  async close (): Promise<void> {
    clearTimeout(this.loginTimeout)

    if (this.client !== undefined) {
      await this.client.close()
    }

    if (this.opClient instanceof Promise) {
      void this.opClient.then((opClient) => {
        void opClient.close()
      })
    } else {
      await this.opClient.close()
    }

    this.ctx.info('Closed workspace client: ', { workspace: this.workspace })
  }

  private async handleCreateTx (tx: TxCreateDoc<Doc>): Promise<void> {
    if (tx.objectClass === aiBot.class.AIBotResponseEvent) {
      const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<AIBotResponseEvent>)
      await this.processResponseEvent(doc)
    } else if (tx.objectClass === aiBot.class.AIBotTransferEvent) {
      const doc = TxProcessor.createDoc2Doc(tx as TxCreateDoc<AIBotTransferEvent>)
      await this.processTransferEvent(doc)
    }
  }

  private async handleRemoveTx (tx: TxRemoveDoc<Doc>): Promise<void> {
    if (tx.objectClass === chunter.class.TypingInfo && this.typingMap.has(tx.objectId)) {
      this.typingMap.delete(tx.objectId)
    }
  }

  private async txHandler (_: TxOperations, txes: Tx[]): Promise<void> {
    for (const ttx of txes) {
      const tx = TxProcessor.extractTx(ttx)

      if (tx._class === core.class.TxCreateDoc) {
        await this.handleCreateTx(tx as TxCreateDoc<Doc>)
      } else if (tx._class === core.class.TxRemoveDoc) {
        await this.handleRemoveTx(tx as TxRemoveDoc<Doc>)
      }
    }
  }
}
