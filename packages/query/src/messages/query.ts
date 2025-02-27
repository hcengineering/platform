import {
  type FindMessagesParams,
  type Message,
  type MessagesGroup,
  type WorkspaceID,
  type MessageID,
  SortingOrder,
  type Patch,
  type ParsedFile,
  PatchType,
  type CardID
} from '@hcengineering/communication-types'
import {
  ResponseEventType,
  type AttachmentCreatedEvent,
  type AttachmentRemovedEvent,
  type MessageCreatedEvent,
  type MessageRemovedEvent,
  type PatchCreatedEvent,
  type QueryCallback,
  type QueryClient,
  type ReactionCreatedEvent,
  type ReactionRemovedEvent,
  type ResponseEvent,
  type ThreadCreatedEvent
} from '@hcengineering/communication-sdk-types'
import { loadGroupFile, parseMessageId } from '@hcengineering/communication-shared'

import { QueryResult } from '../result'
import { defaultQueryParams, Direction, type QueryId, type PagedQuery } from '../types'
import { WindowImpl } from '../window'
import { addReaction, addReply, removeReaction, removeReply } from './utils'

const GROUPS_LIMIT = 20

export class MessagesQuery implements PagedQuery<Message, FindMessagesParams> {
  protected result: Promise<QueryResult<Message>> | QueryResult<Message>

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

  constructor (
    protected readonly client: QueryClient,
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
        this.result.setHead(true)
        void this.requestLoadNextPage()
      } else {
        this.result.setTail(true)
        void this.requestLoadPrevPage()
      }
    }
  }

  setCallback (callback: QueryCallback<Message>): void {
    this.callback = callback
    void this.notify()
  }

  removeCallback (): void {
    this.callback = () => {}
  }

  async requestLoadNextPage (): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    if (!this.result.isTail()) {
      this.result = this.loadPage(Direction.Forward, this.result)
      void this.result
        .then(() => this.notify())
        .catch((error) => {
          console.error('Failed to load messages', error)
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
        })
    }
  }

  private isInitLoadingForward (): boolean {
    const { order, created, id } = this.params

    if (id != null) {
      return false
    }

    if (created == null) return order === SortingOrder.Ascending
    if (created instanceof Date) return order === SortingOrder.Ascending
    // TODO: fix me
    if (created.less != null) return order !== SortingOrder.Ascending
    if (created.lessOrEqual != null) return order !== SortingOrder.Ascending
    if (created.greater != null) return order === SortingOrder.Ascending
    if (created.greaterOrEqual != null) return order === SortingOrder.Ascending

    return false
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

    result.append(messages)

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
              greater: last?.created
            }
          : undefined,
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

    const first = result.getLast()

    return await this.find({
      ...this.params,
      created:
        first != null
          ? {
              less: first?.created
            }
          : undefined,
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
            direction === Direction.Forward ? this.lastGroup?.fromDate : this.firstGroup?.fromDate
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
          ? parsedFile.messages.map((message) => this.applyPatches(message, patchesMap.get(message.id) ?? []))
          : parsedFile.messages
    }
  }

  private async findGroupByMessage (id: MessageID): Promise<MessagesGroup | undefined> {
    const date = parseMessageId(id)
    const group1 = (await this.client.findMessagesGroups({
      card: this.params.card,
      limit: 1,
      toDate: {
        greaterOrEqual: date
      },
      order: SortingOrder.Descending,
      orderBy: 'fromDate'
    }))[0]

    if (group1 !== undefined) {
      return group1
    }

    return (await this.client.findMessagesGroups({
      card: this.params.card,
      limit: 1,
      fromDate: {
        lessOrEqual: date
      },
      order: SortingOrder.Ascending,
      orderBy: 'fromDate'
    }))[0]
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
        orderBy: 'fromDate'
      })
    }

    return await this.client.findMessagesGroups({
      card: this.params.card,
      limit: GROUPS_LIMIT,
      order: direction === Direction.Forward ? SortingOrder.Ascending : SortingOrder.Descending,
      orderBy: 'fromDate',
      fromDate:
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

  async unsubscribe (): Promise<void> {
    await this.client.unsubscribeQuery(this.id)
  }

  async onEvent (event: ResponseEvent): Promise<void> {
    switch (event.type) {
      case ResponseEventType.MessageCreated: {
        await this.onCreateMessageEvent(event)
        return
      }
      case ResponseEventType.MessageRemoved: {
        await this.onRemoveMessageEvent(event)
        return
      }
      case ResponseEventType.PatchCreated: {
        await this.onCreatePatchEvent(event)
        return
      }
      case ResponseEventType.ReactionCreated: {
        await this.onCreateReactionEvent(event)
        return
      }
      case ResponseEventType.ReactionRemoved: {
        await this.onRemoveReactionEvent(event)
        return
      }
      case ResponseEventType.AttachmentCreated: {
        await this.onCreateAttachmentEvent(event)
        return
      }
      case ResponseEventType.AttachmentRemoved: {
        await this.onRemoveAttachmentEvent(event)
        return
      }
      case ResponseEventType.ThreadCreated: {
        await this.onCreateThreadEvent(event)
      }
    }
  }

  async onCreateThreadEvent (event: ThreadCreatedEvent): Promise<void> {
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

  async onCreateMessageEvent (event: MessageCreatedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    if (this.params.card !== event.message.card) return
    const { message } = event
    const exists = this.result.get(message.id)

    if (exists !== undefined) return
    if (!this.match(message)) return

    if (this.result.isTail()) {
      if (this.params.order === SortingOrder.Ascending) {
        this.result.push(message)
      } else {
        this.result.unshift(message)
      }
      await this.notify()
    }
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

  private async onCreatePatchEvent (event: PatchCreatedEvent): Promise<void> {
    if (this.params.card !== event.card) return
    if (this.result instanceof Promise) this.result = await this.result

    const { patch } = event
    const messageId = BigInt(patch.message)
    const group = this.groupsBuffer.find((it) => BigInt(it.fromId) <= messageId && BigInt(it.toId) >= messageId)

    if (group != null) {
      group.patches.push(patch)
    }

    const message = this.result.get(patch.message)
    if (message === undefined) return

    if (message.created < patch.created) {
      this.result.update(this.applyPatch(message, patch))
      await this.notify()
    }
  }

  private async onRemoveMessageEvent (event: MessageRemovedEvent): Promise<void> {
    if (this.params.card !== event.card) return
    if (this.result instanceof Promise) this.result = await this.result

    const deleted = this.result.delete(event.message)

    if (deleted !== undefined) {
      void this.notify()
    }

    this.messagesFromFiles = this.messagesFromFiles.filter((it) => it.id !== event.message)
  }

  private async onCreateReactionEvent (event: ReactionCreatedEvent): Promise<void> {
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

  private async onRemoveReactionEvent (event: ReactionRemovedEvent): Promise<void> {
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

  private async onCreateAttachmentEvent (event: AttachmentCreatedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    const attachment = {
      ...event.attachment,
      created: event.attachment.created
    }
    const message = this.result.get(attachment.message)
    if (message === undefined) return

    message.attachments.push(attachment)
    this.result.update(message)
    await this.notify()
  }

  private async onRemoveAttachmentEvent (event: AttachmentRemovedEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    const message = this.result.get(event.message)
    if (message === undefined) return

    const attachments = message.attachments.filter((it) => it.card !== event.card)
    if (attachments.length === message.attachments.length) return

    const updated = {
      ...message,
      attachments
    }
    this.result.update(updated)
    await this.notify()
  }

  private applyPatch (message: Message, patch: Patch): Message {
    switch (patch.type) {
      case PatchType.update:
        return {
          ...message,
          edited: patch.created,
          content: patch.content
        }
      case PatchType.addReaction:
        return addReaction(message, {
          message: message.id,
          reaction: patch.content,
          creator: patch.creator,
          created: patch.created
        })
      case PatchType.removeReaction:
        return removeReaction(message, patch.content, patch.creator)
      case PatchType.addReply:
        return addReply(message, patch.content as CardID, patch.created)
      case PatchType.removeReply:
        return removeReply(message, patch.content as CardID)
    }

    return message
  }

  private applyPatches (message: Message, patches: Patch[]): Message {
    if (patches.length === 0) return message

    for (const p of patches) {
      message = this.applyPatch(message, p)
    }
    return message
  }

  copyResult (): QueryResult<Message> | undefined {
    if (this.result instanceof Promise) {
      return undefined
    }

    return this.result.copy()
  }
}
