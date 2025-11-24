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
import {
  AIEventRequest,
  ConnectMeetingRequest,
  DisconnectMeetingRequest,
  IdentityResponse
} from '@hcengineering/ai-bot'
import attachment, { Attachment } from '@hcengineering/attachment'
import chunter, { ChatMessage, ThreadMessage } from '@hcengineering/chunter'
import contact, {
  AvatarType,
  combineName,
  ensureEmployee,
  getFirstName,
  getLastName,
  Person
} from '@hcengineering/contact'
import core, {
  AccountRole,
  AccountUuid,
  Blob,
  Class,
  Client,
  Doc,
  MeasureContext,
  PersonId,
  PersonUuid,
  pickPrimarySocialId,
  RateLimiter,
  Ref,
  SocialId,
  SortingOrder,
  Space,
  toIdMap,
  Tx,
  TxCUD,
  TxOperations,
  type Account,
  type WorkspaceIds
} from '@hcengineering/core'
import { Room } from '@hcengineering/love'
import fs from 'fs'
import { Tiktoken } from 'js-tiktoken'
import OpenAI from 'openai'

import { countTokens } from '@hcengineering/openai'
import { getAccountClient } from '@hcengineering/server-client'
import { ConsumerControl, StorageAdapter } from '@hcengineering/server-core'
import { jsonToMarkup, markupToText } from '@hcengineering/text'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import tracker, { Issue } from '@hcengineering/tracker'
import config from '../config'
import { HistoryRecord } from '../types'
import { getGlobalPerson } from '../utils/account'
import { createChatCompletionWithTools, requestSummary } from '../utils/openai'
import { connectPlatform } from '../utils/platform'
import { LoveController } from './love'

interface PersonHistoryRecord {
  assistantMemory: string // Info about assistant: name, behavior style, how to address user
  userMemory: string // Info about user: preferences, context, personal info
  sharedContext: string // Shared context: language, timezone, non-personal preferences
  history: HistoryRecord[]
}

export class WorkspaceClient {
  client: Client | undefined
  opClient: Promise<TxOperations> | TxOperations

  rate = new RateLimiter(1)

  primarySocialId: SocialId
  aiPerson: Person | undefined
  personUuidBySocialId = new Map<PersonId, PersonUuid>()

  love: LoveController | undefined
  historyMap = new Map<PersonUuid, PersonHistoryRecord>()

  constructor (
    readonly storage: StorageAdapter,
    readonly transactorUrl: string,
    readonly token: string,
    readonly wsIds: WorkspaceIds,
    readonly personUuid: AccountUuid,
    readonly socialIds: SocialId[],
    readonly ctx: MeasureContext,
    readonly openai: OpenAI | undefined,
    readonly openaiEncoding: Tiktoken
  ) {
    this.opClient = this.initClient()
    void this.opClient.then((opClient) => {
      this.opClient = opClient
    })
    this.primarySocialId = pickPrimarySocialId(this.socialIds)
  }

  private async ensureEmployee (client: Client): Promise<void> {
    const me: Account = {
      uuid: this.personUuid,
      role: AccountRole.User,
      primarySocialId: this.primarySocialId._id,
      socialIds: this.socialIds.map((it) => it._id),
      fullSocialIds: this.socialIds
    }
    await ensureEmployee(this.ctx, me, client, this.socialIds, async () => await getGlobalPerson(this.token))
  }

  private async initClient (): Promise<TxOperations> {
    this.client = await connectPlatform(this.token, this.transactorUrl)
    const opClient = new TxOperations(this.client, this.primarySocialId._id)

    await this.ensureEmployee(this.client)
    await this.checkEmployeeInfo(opClient)

    if (this.aiPerson !== undefined && config.LoveEndpoint !== '') {
      this.love = new LoveController(
        this.wsIds.uuid,
        this.ctx.newChild('love', {}, { span: false }),
        this.token,
        opClient,
        this.aiPerson
      )
    }

    this.client.notify = (...txes: Tx[]) => {
      void this.txHandler(opClient, txes as TxCUD<Doc>[])
    }
    this.ctx.info('Initialized workspace', { workspace: this.wsIds })

    return opClient
  }

  private async checkEmployeeInfo (client: TxOperations): Promise<void> {
    this.ctx.info('Upload avatar file', { workspace: this.wsIds })

    try {
      const stat = fs.statSync(config.AvatarPath)
      const lastModified = stat.mtime.getTime()

      const uploadInfo = await this.storage.stat(this.ctx, this.wsIds, config.AvatarName)

      const isAlreadyUploaded = uploadInfo !== undefined && uploadInfo.modifiedOn !== lastModified
      if (!isAlreadyUploaded) {
        const data = fs.readFileSync(config.AvatarPath)

        await this.storage.put(this.ctx, this.wsIds, config.AvatarName, data, config.AvatarContentType, data.length)
        this.ctx.info('Avatar file uploaded successfully', { workspace: this.wsIds, path: config.AvatarPath })
      }
    } catch (e) {
      this.ctx.error('Failed to upload avatar file', { e })
    }

    await this.checkPersonData(client)
  }

  private async checkPersonData (client: TxOperations): Promise<void> {
    this.aiPerson = this.aiPerson ?? (await client.findOne(contact.class.Person, { personUuid: this.personUuid }))

    if (this.aiPerson === undefined) {
      this.ctx.error('Cannot find AI Person ', { personUuid: this.personUuid })
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

    const exist = await this.storage.stat(this.ctx, this.wsIds, config.AvatarName)

    if (exist === undefined) {
      this.ctx.error('Cannot find file', { file: config.AvatarName, workspace: this.wsIds })
      return
    }

    await client.diffUpdate(this.aiPerson, { avatar: config.AvatarName as Ref<Blob>, avatarType: AvatarType.IMAGE })
  }

  // TODO: In feature we also should use embeddings
  private toOpenAiHistory (history: PersonHistoryRecord, promptTokens: number): OpenAI.ChatCompletionMessageParam[] {
    const result: OpenAI.ChatCompletionMessageParam[] = []
    let totalTokens = promptTokens
    const maxRecentMessages = 20 // Keep last 20 messages in full detail

    // Only use recent messages for context
    const recentMessages = history.history.slice(-maxRecentMessages)

    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const record = recentMessages[i]
      const tokens = record.tokens

      if (totalTokens + tokens > config.MaxContentTokens) break

      result.unshift({ content: record.message, role: record.role as 'user' | 'assistant' })
      totalTokens += tokens
    }

    return result
  }

  private async getHistory (personUuid: PersonUuid): Promise<PersonHistoryRecord> {
    if (this.historyMap.has(personUuid)) {
      return (
        this.historyMap.get(personUuid) ?? {
          assistantMemory: '',
          userMemory: '',
          sharedContext: '',
          history: []
        }
      )
    }

    // Try to read a person summary and history.
    try {
      const personHistory: PersonHistoryRecord = JSON.parse(
        Buffer.concat(await this.storage.read(this.ctx, this.wsIds, 'ai-bot-phr-' + personUuid)).toString()
      )

      // Migration: add sharedContext if missing
      if (personHistory.sharedContext === undefined) {
        personHistory.sharedContext = ''
      }

      this.historyMap.set(personUuid, personHistory)
      return personHistory
    } catch (err: any) {
      // Ignore, no history available
    }

    // We need to load person info

    const personData = await this.client?.findOne(contact.mixin.Employee, { personUuid: personUuid as AccountUuid })

    const v = {
      assistantMemory: '',
      userMemory: personData !== undefined ? `User name: ${personData.name}` : '',
      sharedContext: '',
      history: []
    }
    this.historyMap.set(personUuid, v)
    return v
  }

  async updateAssistantMemory (user: PersonUuid | undefined, args: Record<string, any>): Promise<void> {
    if (user === undefined) return

    const currentHistory = await this.getHistory(user)
    currentHistory.assistantMemory = args.memory ?? currentHistory.assistantMemory

    await this.saveHistory(user, currentHistory)
  }

  async updateUserMemory (user: PersonUuid | undefined, args: Record<string, any>): Promise<void> {
    if (user === undefined) return

    const currentHistory = await this.getHistory(user)
    currentHistory.userMemory = args.memory ?? currentHistory.userMemory

    await this.saveHistory(user, currentHistory)
  }

  async updateSharedContext (user: PersonUuid | undefined, args: Record<string, any>): Promise<void> {
    if (user === undefined) return

    const currentHistory = await this.getHistory(user)
    currentHistory.sharedContext = args.context ?? currentHistory.sharedContext

    await this.saveHistory(user, currentHistory)
  }

  async getHistoryForUser (user: PersonUuid): Promise<PersonHistoryRecord> {
    return await this.getHistory(user)
  }

  async clearHistory (user: PersonUuid | undefined): Promise<void> {
    if (user === undefined) return

    const currentHistory = await this.getHistory(user)
    currentHistory.history = []

    await this.saveHistory(user, currentHistory)
  }

  async getHistorySummary (user: PersonUuid | undefined): Promise<string> {
    if (user === undefined) return 'No user context available'
    if (this.openai === undefined) return 'Summary service not available'

    const currentHistory = await this.getHistory(user)

    if (currentHistory.history.length === 0) {
      return 'No conversation history available yet.'
    }

    const { summary } = await requestSummary(
      this.ctx,
      this.wsIds.uuid,
      this.openai,
      this.openaiEncoding,
      currentHistory.assistantMemory + '\n' + currentHistory.userMemory,
      currentHistory.history
    )

    return summary ?? 'Failed to generate summary'
  }

  async saveHistory (personUuid: PersonUuid, history: PersonHistoryRecord): Promise<void> {
    await this.storage.put(
      this.ctx,
      this.wsIds,
      'ai-bot-phr-' + personUuid,
      JSON.stringify(history),
      'application/json'
    )
  }

  private async pushHistory (
    personUuid: PersonUuid,
    message: string,
    role: 'user' | 'assistant',
    tokens: number,
    user: PersonUuid,
    objectId: Ref<Doc>,
    objectClass: Ref<Class<Doc>>
  ): Promise<void> {
    const currentHistory = (await this.getHistory(personUuid)) ?? []
    const newRecord: HistoryRecord = {
      workspace: this.wsIds.uuid,
      message,
      objectId,
      objectClass,
      role,
      user,
      tokens,
      timestamp: Date.now()
    }
    currentHistory.history.push({ ...newRecord })
    this.historyMap.set(personUuid, currentHistory)
  }

  private async getAttachments (client: TxOperations, objectId: Ref<Doc>): Promise<Attachment[]> {
    return await client.findAll(attachment.class.Attachment, { attachedTo: objectId })
  }

  async processMessageEvent (event: AIEventRequest, control?: ConsumerControl): Promise<void> {
    if (this.openai === undefined) return

    const { user, objectId, objectClass, messageClass } = event
    const client = await this.opClient
    const accountClient = getAccountClient(this.token)
    const personUuid = this.personUuidBySocialId.get(user) ?? (await accountClient.findPersonBySocialId(user))

    const contextMode = objectClass === chunter.class.DirectMessage ? 'direct' : 'thread'

    if (personUuid === undefined) {
      return
    }

    this.personUuidBySocialId.set(user, personUuid)

    let promptText = markupToText(event.message)
    const files = await this.getAttachments(client, event.messageId)
    if (files.length > 0) {
      promptText += '\n\nAttachments:'
      for (const file of files) {
        promptText += `\nName:${file.name} FileId:${file.file} Type:${file.type}`
      }
    }
    const prompt: OpenAI.ChatCompletionMessageParam = { content: promptText, role: 'user' }
    const promptTokens = countTokens([prompt], this.openaiEncoding)

    const op = client.apply(undefined, 'AIMessageRequestEvent')
    const hierarchy = client.getHierarchy()

    const space = hierarchy.isDerived(objectClass, core.class.Space) ? (objectId as Ref<Space>) : event.objectSpace

    const rawHistory = await this.getHistory(personUuid)
    const history = this.toOpenAiHistory(rawHistory, promptTokens)

    await this.pushHistory(personUuid, promptText, prompt.role, promptTokens, personUuid, objectId, objectClass)

    let useHistory = history

    if (contextMode !== 'direct') {
      // Load a message itself
      const msg = await this.client?.findOne<Doc>(objectClass, { _id: objectId })
      if (msg !== undefined) {
        useHistory = [
          {
            role: 'system',
            content: 'Document type:' + msg?._class
          }
        ]
        if (msg._class === chunter.class.ThreadMessage || msg._class === chunter.class.ChatMessage) {
          useHistory.push({
            role: 'system',
            content: 'Content:' + markupToText((msg as ChatMessage).message)
          })
        }
        if (msg._class === tracker.class.Issue) {
          let _msg = ''
          const is: Issue = msg as Issue

          _msg += 'Issue title: ' + is.title + '\n'

          if (is.description != null && is.description !== '') {
            try {
              const readable = await this.storage.read(this.ctx, this.wsIds, is.description)
              const markup = Buffer.concat(readable as any).toString()
              let textContent = markupToText(markup)
              textContent = textContent
                .split(/ +|\t+|\f+/)
                .filter((it) => it)
                .join(' ')
                .split(/\n\n+/)
                .join('\n')

              _msg += 'Content:``` \n' + textContent + '\n ```'
            } catch (err: any) {
              this.ctx.error('failed to handle description', { _id: is.description, workspace: this.wsIds.uuid })
            }

            useHistory.push({
              role: 'system',
              content: _msg
            })
          }
        }
      }

      const lastMessages =
        (await this.client?.findAll(
          chunter.class.ChatMessage,
          { attachedTo: objectId, attachedToClass: objectClass },
          { limit: 500, sort: { modifiedOn: SortingOrder.Descending } }
        )) ?? []

      lastMessages.sort((a, b) => a.modifiedOn - b.modifiedOn)

      const personIds = new Set(lastMessages.map((it) => it.modifiedBy))

      const socialIds = toIdMap(
        (await this.client?.findAll(contact.class.SocialIdentity, { _id: { $in: Array.from(personIds) as any } })) ?? []
      )

      const employeesInChannel =
        (await this.client?.findAll(contact.class.Person, {
          _id: { $in: Array.from(socialIds.values()).map((it) => it.attachedTo) }
        })) ?? []
      const empAsMap = toIdMap(employeesInChannel.filter((it) => it.personUuid !== undefined))

      for (const msg of lastMessages) {
        let emp: Person | undefined
        const sid = socialIds.get(msg.modifiedBy as any)
        if (sid !== undefined) {
          emp = empAsMap.get(sid.attachedTo)
        }
        useHistory.push({
          role: this.aiPerson?.personUuid === emp?.personUuid ? 'assistant' : 'user',
          content: markupToText(msg.message),
          name: emp?.name ?? 'Unknown'
        })
      }
    }

    const chatCompletion = await createChatCompletionWithTools(
      this,
      this.openai,
      prompt,
      contextMode,
      rawHistory.assistantMemory,
      rawHistory.userMemory,
      rawHistory.sharedContext,
      personUuid as AccountUuid,
      useHistory
    )
    const response = chatCompletion?.completion

    if (response == null) {
      return
    }
    const responseTokens =
      chatCompletion?.usage ?? countTokens([{ content: response, role: 'assistant' }], this.openaiEncoding)

    await this.pushHistory(personUuid, response, 'assistant', responseTokens, personUuid, objectId, objectClass)

    const parseResponse = jsonToMarkup(markdownToMarkup(response, { refUrl: '', imageUrl: '' }))

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
    await op.commit()
  }

  async close (): Promise<void> {
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

    this.ctx.info('Closed workspace client: ', { workspace: this.wsIds })
  }

  private async txHandler (_: TxOperations, txes: TxCUD<Doc>[]): Promise<void> {
    if (this.love !== undefined) {
      this.love.txHandler(txes)
    }
  }

  async loveConnect (request: ConnectMeetingRequest): Promise<void> {
    await this.opClient
    if (this.love === undefined) {
      this.ctx.error('Love controller is not initialized')
      return
    }
    await this.love.connect(request)
  }

  async loveDisconnect (request: DisconnectMeetingRequest): Promise<void> {
    // Just wait initialization
    await this.opClient

    if (this.love === undefined) {
      this.ctx.error('Love controller is not initialized')
      return
    }

    await this.love.disconnect(request.roomId)
  }

  async processLoveTranscript (text: string, participant: Ref<Person>, room: Ref<Room>): Promise<void> {
    // Just wait initialization
    await this.opClient

    if (this.love === undefined) {
      this.ctx.error('Love controller is not initialized')
      return
    }

    await this.love.processTranscript(text, participant, room)
  }

  async getLoveIdentity (): Promise<IdentityResponse | undefined> {
    // Just wait initialization
    await this.opClient

    if (this.love === undefined) {
      this.ctx.error('Love is not initialized')
      return
    }

    return this.love.getIdentity()
  }

  canClose (): boolean {
    if (this.love === undefined) return true

    return !this.love.hasActiveConnections()
  }
}
