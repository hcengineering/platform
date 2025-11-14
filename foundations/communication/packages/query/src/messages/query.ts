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
  BlobID,
  FindMessagesParams,
  type Message,
  type MessageID,
  type MessagesGroup,
  MessagesGroupsDoc,
  SortingOrder
} from '@hcengineering/communication-types'
import {
  CardEventType,
  type CreateMessageEvent,
  type CreateMessageResult,
  type Event,
  type EventResult,
  type FindClient,
  MessageEventType,
  type PagedQueryCallback,
  PatchEvent,
  RemoveCardEvent,
  TranslateMessageEvent
} from '@hcengineering/communication-sdk-types'
import { MessageProcessor } from '@hcengineering/communication-shared'
import { v4 as uuid } from 'uuid'
import { type HulylakeWorkspaceClient } from '@hcengineering/hulylake-client'

import { QueryResult } from '../result'
import {
  defaultQueryParams,
  Direction,
  MessageQueryOptions,
  type MessageQueryParams,
  type OneMessageQueryParams,
  type PagedQuery,
  type QueryId
} from '../types'
import { WindowImpl } from '../window'
import { loadMessages, loadTranslatedMessages } from '../utils'

export class MessagesQuery implements PagedQuery<Message, MessageQueryParams> {
  private result: Promise<QueryResult<Message>> | QueryResult<Message>

  private groups: MessagesGroup[] = []
  private areGroupsLoaded = false
  private groupsPromise: Promise<MessagesGroup[]> | undefined

  private initialized = false

  nexLoadedPagesCount = 0
  prevLoadedPagesCount = 0

  private readonly next = {
    done: false,
    buffer: [] as Message[],
    lastGroupIndex: -1
  }

  private readonly prev = {
    done: false,
    buffer: [] as Message[],
    lastGroupIndex: -1
  }

  private readonly tmpMessages = new Map<string, MessageID>()
  private isCardRemoved = false

  private readonly translateBlobs: BlobID[] = []
  private translatePromise: Promise<void> | undefined = undefined

  constructor (
    private readonly client: FindClient,
    private readonly hulylake: HulylakeWorkspaceClient,
    public readonly id: QueryId,
    public readonly params: MessageQueryParams,
    public readonly options: MessageQueryOptions | undefined,
    private callback: PagedQueryCallback<Message> | undefined,
    initialResult: QueryResult<Message> | undefined
  ) {
    const limit = params.limit ?? defaultQueryParams.limit
    this.params = {
      ...params,
      limit,
      order: params.order ?? defaultQueryParams.order
    }
    void this.subscribe()

    if (initialResult !== undefined) {
      const messages = initialResult.getResult()
      const count = messages.length

      if (count < limit) {
        this.result = initialResult
      } else {
        if (this.params.order === SortingOrder.Ascending) {
          this.result = new QueryResult(messages.slice(0, limit), (x) => x.id)
          this.result.setHead(this.params.from == null)
          this.result.setTail(false)
        } else {
          this.result = new QueryResult(messages.slice(0, limit), (x) => x.id)
          this.result.setHead(false)
          this.result.setTail(this.params.from == null)
        }
      }

      this.initialized = true
      void this.notify()
    } else {
      this.result = new QueryResult([] as Message[], (x) => x.id)

      if (this.isInitLoadingForward()) {
        this.result.setHead(this.params.from == null)
        void this.requestLoadNextPage()
      } else {
        this.result.setTail(this.params.from == null)
        void this.requestLoadPrevPage()
      }
    }
  }

  private findGroupIndex (groups: MessagesGroup[], from: Date): number {
    const match = groups.findIndex(
      (it) => it.fromDate.getTime() <= from.getTime() && it.toDate.getTime() >= from.getTime()
    )

    if (match !== -1) return match
    return groups.findIndex((it) => it.fromDate.getTime() >= from.getTime())
  }

  private async loadGroups (): Promise<void> {
    if (this.areGroupsLoaded) return
    if (this.groupsPromise instanceof Promise) {
      await this.groupsPromise
      this.groupsPromise = undefined
      return
    }

    const promise = (async (): Promise<MessagesGroup[]> => {
      try {
        const res = await this.hulylake.getJson<MessagesGroupsDoc>(`${this.params.cardId}/messages/groups`, {
          maxRetries: 3,
          isRetryable: () => true,
          delayStrategy: {
            getDelay: () => 500
          }
        })
        let groups = Object.values(res?.body ?? {})
          .map((it) => ({
            cardId: this.params.cardId,
            count: it.count,
            blobId: it.blobId,
            fromDate: new Date(it.fromDate),
            toDate: new Date(it.toDate)
          }))
          .sort((a, b) => a.fromDate.getTime() - b.fromDate.getTime())

        if (this.isOneMessageQuery(this.params)) {
          const blobId =
            this.params.blobId ??
            (await this.client.findMessagesMeta({ cardId: this.params.cardId, id: this.params.id }))[0]?.blobId
          if (blobId != null) {
            groups = groups.filter((it) => it.blobId === blobId)
          } else {
            groups = []
          }
        }

        this.prev.lastGroupIndex = groups.length
        const from = this.params.from
        const fromGroupIndex = from != null ? this.findGroupIndex(groups, from) : null

        if (fromGroupIndex != null) {
          if (this.params.order === SortingOrder.Ascending) {
            this.next.lastGroupIndex = Math.max(-1, fromGroupIndex - 1)
            this.prev.lastGroupIndex = Math.max(-1, fromGroupIndex)
          } else {
            this.next.lastGroupIndex = Math.max(-1, fromGroupIndex)
            this.prev.lastGroupIndex = Math.max(-1, fromGroupIndex + 1)
          }

          if (fromGroupIndex === 0) {
            if (this.params.order === SortingOrder.Ascending) {
              this.prev.done = true
            }
          }

          if (fromGroupIndex === -1) {
            this.next.done = true
            this.prev.lastGroupIndex = groups.length
          }
        }

        this.areGroupsLoaded = true
        return groups
      } catch (e) {
        console.error(e)
      }

      return []
    })()

    this.groupsPromise = promise
    this.groups = await promise
  }

  async onEvent (event: Event): Promise<void> {
    if (this.isCardRemoved) return

    switch (event.type) {
      case MessageEventType.CreateMessage: {
        await this.onMessageCreatedEvent(event)
        break
      }
      case MessageEventType.TranslateMessage:
        await this.onMessageTranslatedEvent(event)
        break
      case MessageEventType.UpdatePatch:
      case MessageEventType.RemovePatch:
      case MessageEventType.ThreadPatch:
      case MessageEventType.BlobPatch:
      case MessageEventType.AttachmentPatch:
      case MessageEventType.ReactionPatch: {
        await this.onPatchEvent(event)
        break
      }
      case CardEventType.RemoveCard:
        await this.onCardRemoved(event)
        break
    }
  }

  async onCardRemoved (event: RemoveCardEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    if (this.params.cardId === event.cardId) {
      this.isCardRemoved = true
      this.result.deleteAll()
      this.result.setHead(true)
      this.result.setTail(true)
      this.groups = []
      void this.notify()
      return
    }

    if (this.options?.threads === true) {
      const result = this.result.getResult()
      let isUpdated = false
      for (const message of result) {
        if (message.threads.length > 0 && message.threads.some((it) => it.threadId === event.cardId)) {
          this.result.update({
            ...message,
            threads: message.threads.filter((it) => it.threadId !== event.cardId)
          })

          isUpdated = true
        }
      }

      if (isUpdated) {
        void this.notify()
      }
    }
  }

  async onRequest (event: Event, promise: Promise<EventResult>): Promise<void> {
    if (this.isCardRemoved) return
    switch (event.type) {
      case MessageEventType.CreateMessage: {
        await this.onCreateMessageRequest(event, promise as Promise<CreateMessageResult>)
        break
      }
    }
  }

  async onCreateMessageRequest (event: CreateMessageEvent, promise: Promise<CreateMessageResult>): Promise<void> {
    if (this.params.cardId !== event.cardId) return
    if (this.options?.autoExpand !== true) return

    const eventId = event._id
    if (eventId == null) return

    const tmpId = event.messageId ?? (uuid() as MessageID)
    const tmpMessage = MessageProcessor.create(event, tmpId)

    let resultId: MessageID | undefined

    if (!this.match(tmpMessage)) return

    promise
      .then(async (result) => {
        if (tmpId === result.messageId) return
        this.tmpMessages.delete(eventId)
        resultId = result.messageId
        if (this.result instanceof Promise) this.result = await this.result

        if (this.result.get(resultId) != null) {
          if (this.result.delete(tmpId) != null) {
            await this.notify()
          }
        } else {
          const updatedMessage = { ...tmpMessage, id: resultId }
          this.result.delete(tmpId)
          this.insertMessage(this.result, updatedMessage)
          this.resort(this.result)
          void this.notify()
        }
      })
      .catch(async () => {
        if (this.result instanceof Promise) this.result = await this.result
        this.tmpMessages.delete(eventId)
        if (this.result.delete(tmpId) != null) {
          void this.notify()
        }
      })

    if (this.result instanceof Promise) this.result = await this.result

    if (resultId === undefined && this.result.isTail()) {
      this.tmpMessages.set(eventId, tmpId)
      this.insertMessage(this.result, tmpMessage)
      this.resort(this.result)
      void this.notify()
    }
  }

  private insertMessage (result: QueryResult<Message>, message: Message): void {
    if (this.params.order === SortingOrder.Ascending) {
      result.push(message)
    } else {
      result.unshift(message)
    }
  }

  async subscribe (): Promise<void> {
    await this.client.subscribeCard(this.params.cardId, this.id)
  }

  async unsubscribe (): Promise<void> {
    await this.client.unsubscribeCard(this.params.cardId, this.id)
  }

  async requestLoadNextPage (notify = true): Promise<{ isDone: boolean }> {
    if (this.isCardRemoved) return { isDone: true }
    if (this.result instanceof Promise) this.result = await this.result

    if (this.result.isTail()) return { isDone: true }

    const pagePromise = this.loadPage(Direction.Forward, this.result)
    this.nexLoadedPagesCount++
    this.result = pagePromise

    const r = await pagePromise

    if (notify) {
      await this.notify()
    }
    void this.translate()
    return { isDone: r.isTail() }
  }

  async requestLoadPrevPage (notify = true): Promise<{ isDone: boolean }> {
    if (this.isCardRemoved) return { isDone: true }
    if (this.result instanceof Promise) this.result = await this.result
    if (this.result.isHead()) return { isDone: true }

    const pagePromise = this.loadPage(Direction.Backward, this.result)
    this.prevLoadedPagesCount++
    this.result = pagePromise
    const r = await pagePromise

    if (notify) {
      await this.notify()
    }

    void this.translate()
    return { isDone: r.isHead() }
  }

  async translate (): Promise<void> {
    if (this.translateBlobs.length === 0) return
    if (this.translatePromise instanceof Promise) await this.translatePromise
    const lang = this.options?.language
    if (lang == null) return

    const promise = async (): Promise<void> => {
      while (this.translateBlobs.length > 0) {
        const [blob] = this.translateBlobs.splice(0, 1)
        const translates = await loadTranslatedMessages(this.hulylake, this.params.cardId, blob, lang)
        if (translates.length === 0) continue
        if (this.result instanceof Promise) this.result = await this.result
        for (const translate of translates) {
          const msg = this.result.get(translate.id)
          if (msg == null) continue
          this.result.update({
            ...msg,
            translates: Object.assign(msg.translates ?? {}, { [lang]: translate.content })
          })
        }
        void this.notify()
      }
    }

    this.translatePromise = promise()
    await promise()
  }

  removeCallback (): void {
    this.callback = () => {}
  }

  setCallback (callback: PagedQueryCallback<Message>): void {
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
    const { order } = this.params

    if (this.isOneMessageQuery(this.params)) {
      return true
    }

    return order === SortingOrder.Ascending
  }

  private async loadPage (direction: Direction, result: QueryResult<Message>): Promise<QueryResult<Message>> {
    if (!this.areGroupsLoaded) {
      await this.loadGroups()
    }

    const limit = this.getLimit()
    const messages =
      direction === Direction.Forward ? await this.loadNextMessages(result) : await this.loadPrevMessages(result)

    if (!result.isHead() && direction === Direction.Backward) {
      result.setHead(messages.length < limit)
    }
    if (!result.isTail() && direction === Direction.Forward) {
      result.setTail(messages.length < limit)
    }

    if (this.next.done && this.next.buffer.length === 0) {
      result.setTail(true)
    }

    if (this.prev.done && this.prev.buffer.length === 0) {
      result.setHead(true)
    }

    if (this.params.order === SortingOrder.Ascending && direction === Direction.Backward) {
      result.prepend(messages.reverse())
    } else if (this.params.order === SortingOrder.Descending && direction === Direction.Forward) {
      result.prepend(messages.reverse())
    } else {
      result.append(messages)
    }

    return result
  }

  private getLimit (): number {
    return this.params.limit ?? defaultQueryParams.limit
  }

  // Load next
  private async loadNextMessages (result: QueryResult<Message>): Promise<Message[]> {
    const limit = this.getLimit()
    const messages: Message[] = this.next.buffer.splice(0, limit)
    if (messages.length >= limit) return messages

    while (!this.next.done) {
      await this.fillMessagesBuffer(Direction.Forward, result)

      const restLimit = limit - messages.length
      if (restLimit <= 0) break

      const fromBuffer = this.next.buffer.splice(0, restLimit)
      messages.push(...fromBuffer)

      if (messages.length >= limit) return messages
    }

    return messages
  }

  // Load prev
  private async loadPrevMessages (result: QueryResult<Message>): Promise<Message[]> {
    const limit = this.getLimit()
    const messages: Message[] = this.prev.buffer.splice(-limit).reverse()

    if (messages.length >= limit) return messages
    while (!this.prev.done) {
      await this.fillMessagesBuffer(Direction.Backward, result)

      const restLimit = limit - messages.length
      if (restLimit <= 0) break

      const fromBuffer = this.prev.buffer.splice(-restLimit).reverse()
      messages.push(...fromBuffer)

      if (messages.length >= limit) return messages
    }

    return messages
  }

  private getNextGroupsToLoad (last: Message | undefined): MessagesGroup[] {
    const limit = this.getLimit()
    const groupsToLoad: MessagesGroup[] = []

    let count = 0
    let i = this.next.lastGroupIndex + 1

    if (i >= this.groups.length) {
      this.next.done = true
      return groupsToLoad
    }

    for (; i < this.groups.length; i++) {
      if (count >= limit) break
      const group = this.groups[i]
      if (last != null && group.toDate.getTime() < last.created.getTime()) continue

      groupsToLoad.push(group)
      count += group.count
    }

    this.next.lastGroupIndex = i - 1
    this.next.done = this.next.lastGroupIndex >= this.groups.length - 1

    return groupsToLoad
  }

  private getPrevGroupsToLoad (first: Message | undefined): MessagesGroup[] {
    const limit = this.getLimit()
    let count = 0

    const groupsToLoad: MessagesGroup[] = []
    let i = this.prev.lastGroupIndex - 1

    if (i < 0) {
      this.prev.done = true
      return groupsToLoad
    }

    for (; i >= 0; i--) {
      if (count >= limit) break
      const group = this.groups[i]
      if (first != null && group.fromDate.getTime() > first.created.getTime()) continue

      groupsToLoad.push(group)
      count += group.count
    }

    this.prev.lastGroupIndex = i + 1
    this.prev.done = this.prev.lastGroupIndex <= 0

    return groupsToLoad
  }

  private async fillMessagesBuffer (direction: Direction, result: QueryResult<Message>): Promise<void> {
    const groups =
      direction === Direction.Forward
        ? this.getNextGroupsToLoad(result.getLast())
        : this.getPrevGroupsToLoad(result.getFirst()).reverse()

    const messages = await Promise.all(groups.map((group) => this.loadMessagesFromBlob(group.blobId)))
    const matched = this.matchMessages(
      messages.flat(),
      direction,
      this.params.order === SortingOrder.Ascending ? result.getFirst() : result.getLast()
    )

    if (this.options?.language != null) {
      groups.forEach((group) => {
        this.translateBlobs.push(group.blobId)
      })
    }

    if (direction === Direction.Forward) {
      this.next.buffer.push(...matched.next)
      this.prev.buffer.push(...matched.prev)
    } else {
      this.prev.buffer.unshift(...matched.prev)
      this.next.buffer.push(...matched.next)
    }
  }

  private matchMessages (
    messages: Message[],
    direction: Direction,
    currentFirst?: Message
  ): {
      prev: Message[]
      next: Message[]
    } {
    const params = this.params
    const _messages: Message[] = this.isOneMessageQuery(params)
      ? [messages.find((it) => it.id === params.id)].filter((it): it is Message => it != null)
      : messages

    let prev: Message[] = []
    let next: Message[] = []

    const from = this.initialized ? undefined : this.params.from
    const lastMessage = _messages[_messages.length - 1]

    if (from instanceof Date) {
      for (const message of _messages) {
        const isNext = params.order === SortingOrder.Ascending ? message.created >= from : message.created > from

        if (isNext) {
          next.push(message)
        } else {
          prev.push(message)
        }
      }
    } else if (
      direction === Direction.Backward &&
      (currentFirst == null || lastMessage.created < currentFirst.created)
    ) {
      prev = _messages
    } else {
      next = _messages
    }

    return { next, prev }
  }

  private async loadMessagesFromBlob (blobId: BlobID): Promise<Message[]> {
    const params: FindMessagesParams = this.isOneMessageQuery(this.params)
      ? { cardId: this.params.cardId, id: this.params.id, order: SortingOrder.Ascending }
      : { cardId: this.params.cardId, order: SortingOrder.Ascending }
    return await loadMessages(this.hulylake, this.params.cardId, blobId, params, this.options)
  }

  private isOneMessageQuery (params: MessageQueryParams): params is OneMessageQueryParams {
    return 'id' in this.params && this.params.id != null
  }

  private async notify (): Promise<void> {
    this.initialized = true
    if (this.callback == null) return
    if (this.result instanceof Promise) this.result = await this.result
    const result = this.result.getResult()
    this.callback(new WindowImpl(result, this.result.getTotal(), this.result.isTail(), this.result.isHead(), this))
  }

  private match (message: Message): boolean {
    if (this.params.cardId !== message.cardId) {
      return false
    }

    if (this.isOneMessageQuery(this.params) && this.params.id !== message.id) {
      return false
    }

    return true
  }

  private resort (result: QueryResult<Message>): void {
    result.sort((a, b) =>
      this.params.order === SortingOrder.Ascending
        ? a.created.getTime() - b.created.getTime()
        : b.created.getTime() - a.created.getTime()
    )
  }

  private async onMessageCreatedEvent (event: CreateMessageEvent): Promise<void> {
    if (this.params.cardId !== event.cardId || event.messageId == null) return
    if (this.result instanceof Promise) this.result = await this.result

    const limit = this.getLimit()
    const count = this.result.length

    const message = MessageProcessor.create(event)
    const exists = this.result.get(message.id)

    if (exists !== undefined) return
    if (!this.match(message)) return

    const autoExpand = this.options?.autoExpand ?? false
    const last = this.params.order === SortingOrder.Ascending ? this.result.getLast() : this.result.getFirst()

    const fromTail = message.created.getTime() >= (last?.created.getTime() ?? 0)

    if (!autoExpand) {
      this.result.unshift(message)
      this.resort(this.result)
      if (count >= limit && this.params.order === SortingOrder.Descending) {
        this.result.pop()
      } else if (count >= limit && this.params.order === SortingOrder.Ascending) {
        this.result.shift()
      }

      await this.notify()
      return
    }

    const eventId = event._id

    if (eventId != null) {
      const tmp = this.tmpMessages.get(eventId)
      if (tmp != null) this.result.delete(tmp)
      this.tmpMessages.delete(eventId)
    }

    if (this.result.isTail() && fromTail) {
      if (this.params.order === SortingOrder.Ascending) {
        this.result.push(message)
      } else {
        this.result.unshift(message)
      }
      this.resort(this.result)
      await this.notify()
    } else if (!fromTail) {
      this.result.push(message)
      this.resort(this.result)

      if (!this.result.isTail() && this.params.order === SortingOrder.Descending) {
        this.result.pop()
      } else if (!this.result.isTail() && this.params.order === SortingOrder.Ascending) {
        this.result.shift()
      }

      await this.notify()
    }
  }

  private async onMessageTranslatedEvent (event: TranslateMessageEvent): Promise<void> {
    if (this.options?.language == null) return
    if (this.params.cardId !== event.cardId || event.language !== this.options.language) return
    if (this.result instanceof Promise) this.result = await this.result

    const { messageId } = event

    const message = this.result.get(messageId)
    if (message != null) {
      const updatedMessage = {
        ...message,
        translates: Object.assign(message.translates ?? {}, { [event.language]: event.content })
      }
      this.result.update(updatedMessage)
      await this.notify()
    } else {
      this.next.buffer = this.next.buffer
        .map((it) => {
          if (it.id === event.messageId) {
            return {
              ...it,
              translates: Object.assign(it.translates ?? {}, { [event.language]: event.content })
            }
          }
          return it
        })
        .filter((it): it is Message => it != null)
      this.prev.buffer = this.next.buffer
        .map((it) => {
          if (it.id === event.messageId) {
            return {
              ...it,
              translates: Object.assign(it.translates ?? {}, { [event.language]: event.content })
            }
          }
          return it
        })
        .filter((it): it is Message => it != null)
    }
  }

  private async onPatchEvent (event: PatchEvent): Promise<void> {
    if (this.params.cardId !== event.cardId) return

    const allowedPatchEvents = this.allowedPatchEvents()
    if (!allowedPatchEvents.includes(event.type)) return

    if (this.result instanceof Promise) this.result = await this.result

    const { messageId } = event

    const message = this.result.get(messageId)
    const count = this.result.length
    const limit = this.getLimit()

    if (message !== undefined) {
      const updatedMessage = MessageProcessor.applyPatch(message, event)

      if (updatedMessage != null) {
        this.result.update(updatedMessage)
      } else {
        this.result.delete(messageId)

        if (this.options?.autoExpand !== true && count === limit) {
          await this.refresh()
          return
        }
      }
      await this.notify()
    } else {
      this.next.buffer = this.next.buffer
        .map((it) => {
          if (it.id === event.messageId) {
            return MessageProcessor.applyPatch(it, event)
          }
          return it
        })
        .filter((it): it is Message => it != null)
      this.prev.buffer = this.next.buffer
        .map((it) => {
          if (it.id === event.messageId) {
            return MessageProcessor.applyPatch(it, event)
          }
          return it
        })
        .filter((it): it is Message => it != null)
    }
  }

  private allowedPatchEvents (): MessageEventType[] {
    const result = [MessageEventType.UpdatePatch, MessageEventType.RemovePatch]

    if (this.options?.reactions === true) {
      result.push(MessageEventType.ReactionPatch)
    }
    if (this.options?.attachments === true) {
      result.push(MessageEventType.AttachmentPatch)
      result.push(MessageEventType.BlobPatch)
    }
    if (this.options?.threads === true) {
      result.push(MessageEventType.ThreadPatch)
    }

    return result
  }

  async refresh (): Promise<void> {
    const nextPagesCount = this.nexLoadedPagesCount
    const prevPagesCount = this.prevLoadedPagesCount

    this.areGroupsLoaded = false
    this.groups = []
    this.groupsPromise = undefined

    this.nexLoadedPagesCount = 0
    this.prevLoadedPagesCount = 0

    this.next.done = false
    this.next.buffer = []
    this.prev.lastGroupIndex = -1
    this.prev.done = false
    this.prev.buffer = []
    this.prev.lastGroupIndex = -1

    this.tmpMessages.clear()

    this.result = new QueryResult([] as Message[], (x) => x.id)
    this.initialized = false

    void this.subscribe()

    if (this.isInitLoadingForward()) {
      this.result.setHead(this.params.from == null)
    } else {
      this.result.setTail(this.params.from == null)
    }

    for (let i = 0; i < nextPagesCount; i++) {
      const { isDone } = await this.requestLoadNextPage(false)
      this.initialized = true
      if (!isDone) break
    }

    for (let i = 0; i < prevPagesCount; i++) {
      const { isDone } = await this.requestLoadPrevPage(false)
      this.initialized = true
      if (!isDone) break
    }

    await this.notify()
  }
}
