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
  type Account,
  AccountRole,
  Blob,
  Class,
  Client,
  Doc,
  MeasureContext,
  PersonId,
  PersonUuid,
  RateLimiter,
  Ref,
  SocialId,
  Space,
  Tx,
  TxCUD,
  TxOperations,
  type WorkspaceUuid,
  type WorkspaceIds,
  AccountUuid,
  pickPrimarySocialId
} from '@hcengineering/core'
import { Room } from '@hcengineering/love'
import { WorkspaceInfoRecord } from '@hcengineering/server-ai-bot'
import fs from 'fs'
import { WithId } from 'mongodb'
import OpenAI from 'openai'
import { Tiktoken } from 'js-tiktoken'

import { StorageAdapter } from '@hcengineering/server-core'
import config from '../config'
import { HistoryRecord } from '../types'
import { createChatCompletionWithTools, requestSummary } from '../utils/openai'
import { connectPlatform } from '../utils/platform'
import { LoveController } from './love'
import { DbStorage } from '../storage'
import { jsonToMarkup, markupToText } from '@hcengineering/text'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import { countTokens } from '@hcengineering/openai'
import { getAccountClient } from '@hcengineering/server-client'
import { getGlobalPerson } from '../utils/account'

export class WorkspaceClient {
  client: Client | undefined
  opClient: Promise<TxOperations> | TxOperations

  rate = new RateLimiter(1)

  primarySocialId: SocialId
  aiPerson: Person | undefined
  personUuidBySocialId = new Map<PersonId, PersonUuid>()

  historyMap = new Map<Ref<Doc>, WithId<HistoryRecord>[]>()

  summarizing = new Set<Ref<Doc>>()

  love: LoveController | undefined

  constructor (
    readonly storage: StorageAdapter,
    readonly dbStorage: DbStorage,
    readonly transactorUrl: string,
    readonly token: string,
    readonly wsIds: WorkspaceIds,
    readonly personUuid: AccountUuid,
    readonly socialIds: SocialId[],
    readonly ctx: MeasureContext,
    readonly openai: OpenAI | undefined,
    readonly openaiEncoding: Tiktoken,
    readonly info: WorkspaceInfoRecord | undefined
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

      const isAlreadyUploaded =
        this.info !== undefined &&
        this.info.avatarPath === config.AvatarPath &&
        this.info.avatarLastModified === lastModified
      if (!isAlreadyUploaded) {
        const data = fs.readFileSync(config.AvatarPath)

        await this.storage.put(this.ctx, this.wsIds, config.AvatarName, data, config.AvatarContentType, data.length)
        await this.updateAvatarInfo(this.wsIds.uuid, config.AvatarPath, lastModified)
        this.ctx.info('Avatar file uploaded successfully', { workspace: this.wsIds, path: config.AvatarPath })
      }
    } catch (e) {
      this.ctx.error('Failed to upload avatar file', { e })
    }

    await this.checkPersonData(client)
  }

  private async updateAvatarInfo (workspace: WorkspaceUuid, path: string, lastModified: number): Promise<void> {
    const record = await this.dbStorage.getWorkspace(workspace)

    if (record === undefined) {
      await this.dbStorage.addWorkspace({ workspace, avatarPath: path, avatarLastModified: lastModified })
    } else {
      await this.dbStorage.updateWorkspace(workspace, { $set: { avatarPath: path, avatarLastModified: lastModified } })
    }
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
  private toOpenAiHistory (history: HistoryRecord[], promptTokens: number): any[] {
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

  private async getHistory (objectId: Ref<Doc>): Promise<WithId<HistoryRecord>[]> {
    if (this.historyMap.has(objectId)) {
      return this.historyMap.get(objectId) ?? []
    }

    const historyRecords = await this.dbStorage.getHistoryRecords(this.wsIds.uuid, objectId)
    this.historyMap.set(objectId, historyRecords)
    return historyRecords
  }

  private async summarizeHistory (
    toSummarize: WithId<HistoryRecord>[],
    user: PersonUuid,
    objectId: Ref<Doc>,
    objectClass: Ref<Class<Doc>>
  ): Promise<void> {
    if (this.openai === undefined) return
    if (this.summarizing.has(objectId)) {
      return
    }

    this.summarizing.add(objectId)
    const { summary, tokens } = await requestSummary(this.openai, this.openaiEncoding, toSummarize)

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
      workspace: this.wsIds.uuid
    }

    await this.dbStorage.addHistoryRecord(summaryRecord)
    await this.dbStorage.removeHistoryRecords(toSummarize.map(({ _id }) => _id))
    const newHistory = await this.dbStorage.getHistoryRecords(this.wsIds.uuid, objectId)
    this.historyMap.set(objectId, newHistory)
    this.summarizing.delete(objectId)
  }

  private async pushHistory (
    message: string,
    role: 'user' | 'assistant',
    tokens: number,
    user: PersonUuid,
    objectId: Ref<Doc>,
    objectClass: Ref<Class<Doc>>
  ): Promise<void> {
    const currentHistory = (await this.getHistory(objectId)) ?? []
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
    const _id = await this.dbStorage.addHistoryRecord(newRecord)
    currentHistory.push({ ...newRecord, _id })
    this.historyMap.set(objectId, currentHistory)
  }

  private async getAttachments (client: TxOperations, objectId: Ref<Doc>): Promise<Attachment[]> {
    return await client.findAll(attachment.class.Attachment, { attachedTo: objectId })
  }

  async processMessageEvent (event: AIEventRequest): Promise<void> {
    if (this.openai === undefined) return

    const { user, objectId, objectClass, messageClass } = event
    const client = await this.opClient
    const accountClient = getAccountClient(this.token)
    const personUuid = this.personUuidBySocialId.get(user) ?? (await accountClient.findPersonBySocialId(user))

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

    const rawHistory = await this.getHistory(objectId)
    const history = this.toOpenAiHistory(rawHistory, promptTokens)

    if (history.length < rawHistory.length || history.length > config.MaxHistoryRecords) {
      void this.summarizeHistory(rawHistory, personUuid, objectId, objectClass)
    }

    void this.pushHistory(promptText, prompt.role, promptTokens, personUuid, objectId, objectClass)

    const chatCompletion = await createChatCompletionWithTools(
      this,
      this.openai,
      prompt,
      personUuid as AccountUuid,
      history
    )
    const response = chatCompletion?.completion

    if (response == null) {
      return
    }
    const responseTokens =
      chatCompletion?.usage ?? countTokens([{ content: response, role: 'assistant' }], this.openaiEncoding)

    void this.pushHistory(response, 'assistant', responseTokens, personUuid, objectId, objectClass)

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
