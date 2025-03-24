//
// Copyright © 2025 Hardcore Engineering Inc.
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
  type FindMessagesParams,
  type Message,
  type MessageID,
  type MessagesGroup,
  type ParsedFile,
  type Patch,
  PatchType,
  type Reaction,
  type SocialID,
  SortingOrder,
  type WorkspaceID,
  type File,
  type BlobID,
  MessageType
} from '@hcengineering/communication-types'
import {
  type FileCreatedEvent,
  type FileRemovedEvent,
  type MessageCreatedEvent,
  type MessagesRemovedEvent,
  type PatchCreatedEvent,
  type QueryCallback,
  type ReactionCreatedEvent,
  type ReactionRemovedEvent,
  type CreateMessageEvent,
  type RequestEvent,
  RequestEventType,
  type ResponseEvent,
  ResponseEventType,
  type ThreadCreatedEvent,
  type EventResult,
  type CreateMessageResult
} from '@hcengineering/communication-sdk-types'
import { applyPatch, applyPatches, generateMessageId, parseMessageId } from '@hcengineering/communication-shared'
import { loadGroupFile } from '@hcengineering/communication-yaml'

import { QueryResult } from '../result'
import { defaultQueryParams, Direction, type PagedQuery, type QueryId, type QueryClient } from '../types'
import { WindowImpl } from '../window'

const GROUPS_LIMIT = 20

export class MessagesQuery implements PagedQuery<Message, FindMessagesParams> {
  private result: Promise<QueryResult<Message>> | QueryResult<Message>

  private messagesFromFiles: Message[] = []

  private readonly groupsBuffer: MessagesGroup[] = []

  private firstGroup?: MessagesGroup
  private lastGroup?: MessagesGroup

  private readonly limit: number

  private readonly next = {
    hasMessages: true,
    hasGroups: true
  }

  private readonly prev = {
    hasMessages: true,
    hasGroups: true
  }

  private tmpMessages: Map<string, MessageID> = new Map()

  constructor (
    private readonly client: QueryClient,
    private readonly workspace: WorkspaceID,
    private readonly filesUrl: string,
    public readonly id: QueryId,
    public readonly params: FindMessagesParams,
    private callback?: QueryCallback<Message>,
    initialResult?: QueryResult<Message>
  ) {
    const baseLimit = params.id != null ? 1 : this.params.limit ?? defaultQueryParams.limit
    this.limit = baseLimit + 1
    this.params = {
      ...params,
      order: params.order ?? defaultQueryParams.order
    }
    if (initialResult !== undefined) {
      const messages = initialResult.getResult()
      const count = messages.length

      if (count < this.limit) {
        this.result = initialResult
      } else {
        if (this.params.order === SortingOrder.Ascending) {
          this.result = new QueryResult(messages.slice(0, baseLimit), (x) => x.id)
          this.result.setHead(true)
          this.result.setTail(false)
        } else {
          this.result = new QueryResult(messages.slice(0, baseLimit), (x) => x.id)
          this.result.setHead(false)
          this.result.setTail(true)
        }
      }
      void this.notify()
    } else {
      this.result = new QueryResult([] as Message[], (x) => x.id)

      if (this.isInitLoadingForward()) {
        this.result.setHead(this.params.created == null)
        void this.requestLoadNextPage()
      } else {
        this.result.setTail(this.params.created == null)
        void this.requestLoadPrevPage()
      }
    }
  }

  async onEvent (event: ResponseEvent): Promise<void> {
    switch (event.type) {
      case ResponseEventType.MessageCreated: {
        await this.onMessageCreatedEvent(event)
        break
      }
      case ResponseEventType.MessagesRemoved: {
        await this.onMessagesRemovedEvent(event)
        break
      }
      case ResponseEventType.PatchCreated: {
        await this.onPatchCreatedEvent(event)
        break
      }
      case ResponseEventType.ReactionCreated: {
        await this.onReactionCreatedEvent(event)
        break
      }
      case ResponseEventType.ReactionRemoved: {
        await this.onReactionRemovedEvent(event)
        break
      }
      case ResponseEventType.FileCreated: {
        await this.onFileCreatedEvent(event)
        break
      }
      case ResponseEventType.FileRemoved: {
        await this.onFileRemovedEvent(event)
        break
      }
      case ResponseEventType.ThreadCreated: {
        await this.onThreadCreatedEvent(event)
      }
    }
  }

  async onRequest (event: RequestEvent, promise: Promise<EventResult>): Promise<void> {
    switch (event.type) {
      case RequestEventType.CreateMessage: {
        await this.onCreateMessageRequest(event, promise as Promise<CreateMessageResult>)
        break
      }
    }
  }

  async onCreateMessageRequest(
    event: CreateMessageEvent,
    promise: Promise<CreateMessageResult>
  ): Promise<void> {
    if (this.params.card !== event.card) return;
    const eventId = event._id
    if(eventId == null) return

    const tmpId = generateMessageId();
    let resultId: MessageID | undefined;
    const tmpMessage: Message = {
      id: tmpId,
      type: MessageType.Message,
      card: event.card,
      content: event.content,
      creator: event.creator,
      created: new Date(),
      data: event.data,
      edited: undefined,
      thread: undefined,
      reactions: [],
      files: []
    };

    if (!this.match(tmpMessage)) return;

    promise
      .then(async (result) => {
        this.tmpMessages.delete(eventId)
        resultId = result.id;
        if (this.result instanceof Promise) this.result = await this.result

        if (this.result.get(resultId)) {
          if (this.result.delete(tmpId)) {
            await this.notify();
          }
        } else {
          const updatedMessage = { ...tmpMessage, id: resultId };
          this.result.delete(tmpId);

          this.insertMessage(this.result, updatedMessage);

          void this.notify();
        }
      })
      .catch(async () => {
        if (this.result instanceof Promise) this.result = await this.result
        this.tmpMessages.delete(eventId)
        if (this.result.delete(tmpId)) {
          void this.notify();
        }
      });

    if (this.result instanceof Promise) this.result = await this.result;

    if (resultId === undefined && this.result.isTail()) {
      this.tmpMessages.set(eventId, tmpId)
      this.insertMessage(this.result, tmpMessage);
      void this.notify();
    }
  }

  private insertMessage(result: QueryResult<Message>, message: Message): void {
    if (this.params.order === SortingOrder.Ascending) {
      result.push(message);
    } else {
      result.unshift(message);
    }
  }

  async unsubscribe (): Promise<void> {
    await this.client.unsubscribeQuery(this.id)
  }

  async requestLoadNextPage (): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    if (!this.result.isTail()) {
      this.result = this.loadPage(Direction.Forward, this.result)
      void this.result
        .then(() => this.notify())
        .catch((error) => {
          console.error('Failed to load messages', error)
          void this.notify()
        })
    }
  }

  async requestLoadPrevPage (): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    if (!this.result.isHead()) {
      this.result = this.loadPage(Direction.Backward, this.result)
      void this.result
        .then(() => this.notify())
        .catch((error) => {
          console.error('Failed to load messages', error)
          void this.notify()
        })
    }
  }

  removeCallback (): void {
    this.callback = () => {}
  }

  setCallback (callback: QueryCallback<Message>): void {
    this.callback = callback
    void this.notify()
  }

  copyResult (): QueryResult<Message> | undefined {
    if (this.result instanceof Promise) {
      return undefined
    }

    return this.result.copy()
  }

  private isInitLoadingForward (): boolean {
    const { order, id } = this.params

    if (id != null) {
      return true
    }

    return order === SortingOrder.Ascending
  }

  private async loadPage (direction: Direction, result: QueryResult<Message>): Promise<QueryResult<Message>> {
    const { messages, fromDb } =
      direction === Direction.Forward ? await this.loadNextMessages(result) : await this.loadPrevMessages(result)

    if (!result.isHead() && direction === Direction.Backward) {
      result.setHead(messages.length < this.limit)
    }
    if (!result.isTail() && direction === Direction.Forward) {
      result.setTail(messages.length < this.limit)
    }

    if (messages.length === this.limit && this.limit > 1) {
      const lastMessage = messages.pop()
      if (lastMessage != null && !fromDb) {
        direction === Direction.Forward
          ? this.messagesFromFiles.unshift(lastMessage)
          : this.messagesFromFiles.push(lastMessage)
      }
    }

    if (this.params.order === SortingOrder.Ascending && direction === Direction.Backward) {
      result.prepend(messages.reverse())
    } else {
      result.append(messages)
    }

    return result
  }

  // Load next
  private async loadNextMessages (result: QueryResult<Message>): Promise<{ messages: Message[], fromDb: boolean }> {
    const messages: Message[] = this.messagesFromFiles.splice(0, this.limit)

    if (messages.length >= this.limit) return { messages, fromDb: false }

    while (this.next.hasGroups || this.groupsBuffer.length > 0) {
      await this.loadGroups(Direction.Forward, result)

      messages.push(...this.messagesFromFiles.splice(0, this.limit - messages.length))

      if (messages.length >= this.limit) return { messages, fromDb: false }
    }

    const dbMessages = await this.findNextMessages(this.limit - messages.length, result)
    this.next.hasMessages = dbMessages.length > 0
    messages.push(...dbMessages)
    return { messages, fromDb: dbMessages.length > 0 }
  }

  private async findNextMessages (limit: number, result: QueryResult<Message>): Promise<Message[]> {
    if (this.next.hasGroups) {
      return []
    }

    if (result.isTail()) return []

    const last = result.getLast()

    return await this.find({
      ...this.params,
      created:
        last != null
          ? {
            greater: last.created
          }
          : this.params.created,
      limit,
      order: SortingOrder.Ascending
    })
  }

  // Load prev
  private async loadPrevMessages (result: QueryResult<Message>): Promise<{ messages: Message[], fromDb: boolean }> {
    const messages: Message[] = []

    if (this.prev.hasMessages) {
      const prevMessages = await this.findPrevMessages(this.limit, result)
      this.prev.hasMessages = prevMessages.length > 0
      messages.push(...prevMessages)
    }

    if (messages.length >= this.limit) return { messages, fromDb: true }

    const restLimit = this.limit - messages.length
    const fromBuffer = this.messagesFromFiles.splice(-restLimit, restLimit).reverse()
    messages.push(...fromBuffer)

    if (messages.length >= this.limit) return { messages, fromDb: false }

    while (this.prev.hasGroups || this.groupsBuffer.length > 0) {
      await this.loadGroups(Direction.Backward, result)

      const rest = this.limit - messages.length
      const fromBuffer2 = this.messagesFromFiles.splice(-rest, rest).reverse()

      messages.push(...fromBuffer2)
      if (messages.length >= this.limit) return { messages, fromDb: false }
    }

    return { messages, fromDb: false }
  }

  private async findPrevMessages (limit: number, result: QueryResult<Message>): Promise<Message[]> {
    if (!this.prev.hasMessages || result.isHead()) return []

    const first = this.params.order === SortingOrder.Ascending ? result.getFirst() : result.getLast()

    return await this.find({
      ...this.params,
      created:
        first != null
          ? {
            less: first?.created
          }
          : this.params.created,
      limit,
      order: SortingOrder.Descending
    })
  }

  private async loadGroups (direction: Direction, result: QueryResult<Message>): Promise<void> {
    let messagesCount = 0
    const lastResult = result.getLast()
    const toLoad: MessagesGroup[] = []
    const toBuffer: MessagesGroup[] = []

    while (messagesCount < this.limit) {
      const currentGroups = this.groupsBuffer.splice(direction === Direction.Forward ? 0 : -GROUPS_LIMIT, GROUPS_LIMIT)
      const hasGroups = direction === Direction.Forward ? this.next.hasGroups : this.prev.hasGroups
      if (currentGroups.length === 0 && !hasGroups) break

      const groups =
        currentGroups.length > 0
          ? currentGroups
          : await this.findGroups(
            direction,
            direction === Direction.Forward ? this.lastGroup?.fromSec : this.firstGroup?.fromSec
          )

      if (currentGroups.length === 0) {
        this.firstGroup = direction === Direction.Forward ? this.firstGroup ?? groups[0] : groups[groups.length - 1]
        this.lastGroup =
          direction === Direction.Forward ? groups[groups.length - 1] ?? this.lastGroup : this.lastGroup ?? groups[0]

        if (direction === Direction.Forward) {
          this.next.hasGroups = groups.length >= GROUPS_LIMIT
        } else {
          this.prev.hasGroups = groups.length >= GROUPS_LIMIT
        }
        if (this.params.id != null) {
          this.next.hasGroups = false
          this.prev.hasGroups = false
        }
      }

      const orderedGroups = direction === Direction.Forward ? groups : groups.reverse()
      while (messagesCount < this.limit && orderedGroups.length > 0) {
        const group = direction === Direction.Forward ? orderedGroups.shift() : orderedGroups.pop()
        if (group == null) break
        toLoad.push(group)
        messagesCount += group.count
      }

      while (orderedGroups.length > 0) {
        const group = direction === Direction.Forward ? orderedGroups.shift() : orderedGroups.pop()
        if (group == null) break
        toBuffer.push(group)
        messagesCount += group.count
      }
    }

    if (direction === Direction.Forward) {
      this.groupsBuffer.push(...toBuffer)
    } else {
      this.groupsBuffer.unshift(...toBuffer)
    }

    const parsedFiles = await Promise.all(toLoad.map((group) => this.loadMessagesFromFiles(group)))

    for (const file of parsedFiles) {
      if (file.messages.length === 0) continue
      if (direction === Direction.Forward) {
        const firstInFile = file.messages[0]
        const queryDate =
          lastResult != null && firstInFile.created < lastResult?.created ? lastResult?.created : undefined
        this.messagesFromFiles.push(...this.matchFileMessages(file, queryDate))
      } else {
        const lastInFile = file.messages[file.messages.length - 1]
        const queryDate =
          lastResult != null && lastInFile.created > lastResult?.created ? lastResult?.created : undefined
        this.messagesFromFiles.unshift(...this.matchFileMessages(file, queryDate))
      }
    }
  }

  private matchFileMessages (file: ParsedFile, created?: Date): Message[] {
    let result: Message[] = file.messages
    if (this.params.id != null) {
      const msg = file.messages.find((it) => it.id === this.params.id)
      result = msg != null ? [msg] : []
    }

    if (created != null) {
      result =
        this.params.order === SortingOrder.Ascending
          ? result.filter((it) => it.created > created)
          : result.filter((it) => it.created < created)
    }

    return result
  }

  private async loadMessagesFromFiles (group: MessagesGroup): Promise<ParsedFile> {
    const parsedFile = await loadGroupFile(this.workspace, this.filesUrl, group, { retries: 5 })
    const patches = group.patches ?? []

    const patchesMap = new Map<MessageID, Patch[]>()
    for (const patch of patches) {
      patchesMap.set(patch.message, [...(patchesMap.get(patch.message) ?? []), patch])
    }

    return {
      metadata: parsedFile.metadata,
      messages:
        patches.length > 0
          ? parsedFile.messages.map((message) => applyPatches(message, patchesMap.get(message.id) ?? [], this.allowedPatches()))
          : parsedFile.messages
    }
  }

  private async findGroupByMessage(id: MessageID): Promise<MessagesGroup | undefined> {
    const date = parseMessageId(id);

    const groups = await this.client.findMessagesGroups({
      card: this.params.card,
      fromSec: { lessOrEqual: date },
      toSec: { greaterOrEqual: date },
      limit: 1,
      order: SortingOrder.Ascending,
      orderBy: 'fromSec'
    });

    return groups[0];
  }

  private async findGroups (direction: Direction, fromDate?: Date): Promise<MessagesGroup[]> {
    if (this.params.id != null) {
      const group = await this.findGroupByMessage(this.params.id)
      return group !== undefined ? [group] : []
    }

    if (fromDate == null) {
      return await this.client.findMessagesGroups({
        card: this.params.card,
        limit: GROUPS_LIMIT,
        order: direction === Direction.Forward ? SortingOrder.Ascending : SortingOrder.Descending,
        orderBy: 'fromSec'
      })
    }

    return await this.client.findMessagesGroups({
      card: this.params.card,
      limit: GROUPS_LIMIT,
      order: direction === Direction.Forward ? SortingOrder.Ascending : SortingOrder.Descending,
      orderBy: 'fromSec',
      fromSec:
        direction === Direction.Forward
          ? {
            greater: fromDate
          }
          : {
            less: fromDate
          }
    })
  }

  private async find (params: FindMessagesParams): Promise<Message[]> {
    return await this.client.findMessages(params, this.id)
  }

  private async notify (): Promise<void> {
    if (this.callback == null) return
    if (this.result instanceof Promise) this.result = await this.result
    const result = this.result.getResult()
    this.callback(new WindowImpl(result, this.result.isTail(), this.result.isHead(), this))
  }

  private match (message: Message): boolean {
    if (this.params.id != null && this.params.id !== message.id) {
      return false
    }
    if (this.params.card !== message.card) {
      return false
    }
    return true
  }

  private async onThreadCreatedEvent (event: ThreadCreatedEvent): Promise<void> {
    if(this.params.replies !== true) return
    if (this.params.card !== event.thread.card) return
    if (this.result instanceof Promise) this.result = await this.result

    const message = this.result.get(event.thread.message)
    if (message !== undefined) {
      const updated: Message = {
        ...message,
        thread: event.thread
      }

      this.result.update(updated)
      void this.notify()
    }

    this.messagesFromFiles = this.messagesFromFiles.map((it) => {
      if (it.id === event.thread.message) {
        return {
          ...it,
          thread: event.thread
        }
      }
      return it
    })
  }

  private async onMessageCreatedEvent (event: MessageCreatedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    if (this.params.card !== event.message.card) return
    const { message } = event
    const exists = this.result.get(message.id)

    if (exists !== undefined) return
    if (!this.match(message)) return

    if (this.result.isTail()) {
      const eventId = event._id
      if(eventId != null) {
        const tmp = this.tmpMessages.get(eventId)
        if (tmp) this.result.delete(tmp)
        this.tmpMessages.delete(eventId)
      }
      if (this.params.order === SortingOrder.Ascending) {
        this.result.push(message)
      } else {
        this.result.unshift(message)
      }
      await this.notify()
    }
  }

  private async onPatchCreatedEvent (event: PatchCreatedEvent): Promise<void> {
    if (this.params.card !== event.card) return
    if (!this.isAllowedPatch(event.patch.type)) return
    if (this.result instanceof Promise) this.result = await this.result

    const { patch } = event
    const created = parseMessageId(patch.message)
    const groups = this.groupsBuffer.filter((it) => it.fromSec <= created && it.toSec >= created)

    for (const group of groups) {
      if (group.patches != null) {
        group.patches.push(patch)
      }
    }

    const message = this.result.get(patch.message)
    if (message === undefined) return

    if (message.created < patch.created) {
      this.result.update(applyPatch(message, patch, this.allowedPatches()))
      await this.notify()
    }
  }

  private async onMessagesRemovedEvent (event: MessagesRemovedEvent): Promise<void> {
    if (this.params.card !== event.card) return
    if (this.result instanceof Promise) this.result = await this.result

    let isDeleted = false

    for (const message of event.messages) {
      const deleted = this.result.delete(message)
      isDeleted = isDeleted || deleted !== undefined
    }

    if (isDeleted) {
      void this.notify()
    }

    this.messagesFromFiles = this.messagesFromFiles.filter((it) => !event.messages.includes(it.id))
  }

  private async onReactionCreatedEvent (event: ReactionCreatedEvent): Promise<void> {
    if(this.params.reactions !== true) return
    if (this.result instanceof Promise) this.result = await this.result
    if (this.params.card !== event.card) return

    const reaction = {
      ...event.reaction,
      created: event.reaction.created
    }

    const message = this.result.get(reaction.message)
    if (message !== undefined) {
      this.result.update(addReaction(message, reaction))
      void this.notify()
    }

    const fromBuffer = this.messagesFromFiles.find((it) => it.id === reaction.message)
    if (fromBuffer !== undefined) {
      addReaction(fromBuffer, reaction)
    }
  }

  private async onReactionRemovedEvent (event: ReactionRemovedEvent): Promise<void> {
    if(this.params.reactions !== true) return
    if (this.result instanceof Promise) this.result = await this.result
    if (this.params.card !== event.card) return

    const message = this.result.get(event.message)
    if (message !== undefined) {
      const updated = removeReaction(message, event.reaction, event.creator)
      if (updated.reactions.length !== message.reactions.length) {
        this.result.update(updated)
        void this.notify()
      }
    }
    this.messagesFromFiles = this.messagesFromFiles.map((it) =>
      it.id === event.message ? removeReaction(it, event.reaction, event.creator) : it
    )
  }

  private async onFileCreatedEvent (event: FileCreatedEvent): Promise<void> {
    if(this.params.files !== true) return
    if (this.result instanceof Promise) this.result = await this.result

    const { file } = event
    const message = this.result.get(file.message)
    if (message !== undefined) {
      message.files.push(file)
      this.result.update(message)
      await this.notify()
    }

    const fromBuffer = this.messagesFromFiles.find((it) => it.id === file.message)
    if (fromBuffer !== undefined) {
      addFile(fromBuffer, file)
    }
  }

  private async onFileRemovedEvent (event: FileRemovedEvent): Promise<void> {
    if(this.params.files !== true) return
    if(this.params.card !== event.card) return
    if (this.result instanceof Promise) this.result = await this.result

    const message = this.result.get(event.message)
    if (message !== undefined) {

      const files = message.files.filter((it) => it.blobId !== event.blobId)
      if (files.length === message.files.length) return

      const updated = {
        ...message,
        files
      }
      this.result.update(updated)
      await this.notify()
    }

    this.messagesFromFiles = this.messagesFromFiles.map((it) =>
      it.id === event.message ? removeFile(it, event.blobId) : it
    )
  }

  private allowedPatches (): PatchType[] {
    const result = [PatchType.update]

    if(this.params.reactions === true) {
      result.push(PatchType.addReaction, PatchType.removeReaction)
    }
    if(this.params.files === true) {
      result.push(PatchType.addFile, PatchType.removeFile)
    }
    if(this.params.replies === true) {
      result.push(PatchType.addReply, PatchType.removeReply)
    }
    return result
  }

  private isAllowedPatch (type: PatchType): boolean {
    return this.allowedPatches().includes(type)
  }
}


function addFile (message: Message, file:File): Message {
  message.files.push(file)
  return message
}

function removeFile (message: Message, blobId: BlobID): Message {
  const files = message.files.filter((it) => it.blobId !== blobId)
  if (files.length === message.files.length) return message

  return {
    ...message,
    files
  }
}

function addReaction (message: Message, reaction: Reaction): Message {
  message.reactions.push(reaction)
  return message
}


function removeReaction (message: Message, emoji: string, creator: SocialID): Message {
  const reactions = message.reactions.filter((it) => it.reaction !== emoji || it.creator !== creator)
  if (reactions.length === message.reactions.length) return message

  return {
    ...message,
    reactions
  }
}
