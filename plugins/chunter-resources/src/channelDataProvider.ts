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
import { createQuery, getClient } from '@hcengineering/presentation'
import {
  type Account,
  type Class,
  type Doc,
  getCurrentAccount,
  isOtherDay,
  type Ref,
  SortingOrder,
  type Timestamp
} from '@hcengineering/core'

import { derived, get, type Readable, writable } from 'svelte/store'
import { onDestroy } from 'svelte'
import { type ActivityMessage } from '@hcengineering/activity'
import attachment from '@hcengineering/attachment'
import { combineActivityMessages } from '@hcengineering/activity-resources'

import chunter from './plugin'

export type LoadMode = 'forward' | 'backward'

interface MessageMetadata {
  _id: Ref<ActivityMessage>
  createdOn?: Timestamp
  createdBy?: Ref<Account>
}

interface Chunk {
  from: Timestamp
  to: Timestamp
  data: ActivityMessage[]
}

interface IChannelDataProvider {
  limit: number

  isLoadingStore: Readable<boolean>
  isLoadingMoreStore: Readable<boolean>
  messagesStore: Readable<ActivityMessage[]>
  newTimestampStore: Readable<Timestamp | undefined>
  datesStore: Readable<Timestamp[]>

  loadMore: (mode: LoadMode, loadAfter: Timestamp) => Promise<void>
  canLoadMore: (mode: LoadMode, loadAfter: Timestamp) => boolean
  jumpToDate: (date: Timestamp) => Promise<void>
}

export class ChannelDataProvider implements IChannelDataProvider {
  public readonly limit = 30

  private readonly metadataQuery = createQuery(true)
  private readonly tailQuery = createQuery(true)

  private chatId: Ref<Doc> | undefined = undefined
  private readonly lastViewedTimestamp: Timestamp | undefined = undefined
  private readonly msgClass: Ref<Class<ActivityMessage>>
  private selectedMsgId: Ref<ActivityMessage> | undefined = undefined
  private tailStart: Timestamp | undefined = undefined

  private readonly metadataStore = writable<MessageMetadata[]>([])
  private readonly tailStore = writable<ActivityMessage[]>([])
  private readonly chunksStore = writable<Chunk[]>([])

  private readonly isInitialLoadingStore = writable(false)
  private readonly isInitialLoadedStore = writable(false)
  private readonly isTailLoading = writable(false)

  public datesStore = writable<Timestamp[]>([])
  public newTimestampStore = writable<Timestamp | undefined>(undefined)

  public isLoadingMoreStore = writable(false)

  public isLoadingStore = derived(
    [this.isInitialLoadedStore, this.isTailLoading],
    ([initialLoaded, tailLoading]) => !initialLoaded || tailLoading
  )

  public messagesStore = derived([this.chunksStore, this.tailStore], ([chunks, tail]) => {
    return [...chunks.map(({ data }) => data).flat(), ...tail]
  })

  constructor (
    chatId: Ref<Doc>,
    _class: Ref<Class<ActivityMessage>>,
    lastViewedTimestamp?: Timestamp,
    selectedMsgId?: Ref<ActivityMessage>,
    loadAll = false
  ) {
    this.chatId = chatId
    this.lastViewedTimestamp = lastViewedTimestamp
    this.msgClass = _class
    this.selectedMsgId = selectedMsgId
    this.loadData(loadAll)

    onDestroy(() => {
      this.destroy()
    })
  }

  public destroy (): void {
    this.clearData()
    this.metadataQuery.unsubscribe()
    this.tailQuery.unsubscribe()
  }

  public canLoadMore (mode: LoadMode, timestamp?: Timestamp): boolean {
    if (timestamp === undefined) {
      return false
    }

    const metadata = get(this.metadataStore)

    if (mode === 'forward') {
      const last = metadata[metadata.length - 1]?.createdOn ?? 0
      return last > timestamp
    } else {
      const first = metadata[0]?.createdOn ?? 0
      return first < timestamp
    }
  }

  private clearData (): void {
    this.metadataStore.set([])
    this.tailStore.set([])
    this.chunksStore.set([])

    this.isInitialLoadingStore.set(false)
    this.isInitialLoadedStore.set(false)
    this.isTailLoading.set(false)

    this.datesStore.set([])
    this.newTimestampStore.set(undefined)
    this.isLoadingMoreStore.set(false)

    this.tailStart = undefined
    this.chatId = undefined
    this.selectedMsgId = undefined
  }

  private loadData (loadAll = false): void {
    if (this.chatId === undefined) {
      return
    }

    this.metadataQuery.query(
      this.msgClass,
      { attachedTo: this.chatId, hidden: { $ne: true } },
      (res) => {
        this.updatesDates(res)
        this.metadataStore.set(res)
        void this.loadInitialMessages(undefined, loadAll)
      },
      {
        projection: { _id: 1, createdOn: 1, createdBy: 1, attachedTo: 1 },
        sort: { createdOn: SortingOrder.Ascending }
      }
    )
  }

  private async loadInitialMessages (selectedMsg?: Ref<ActivityMessage>, loadAll = false): Promise<void> {
    const isLoading = get(this.isInitialLoadingStore)
    const isLoaded = get(this.isInitialLoadedStore)

    if (isLoading || isLoaded) {
      return
    }

    this.isInitialLoadingStore.set(true)

    const metadata = get(this.metadataStore)
    const firstNewMsgIndex = this.getFirstNewMsgIndex(this.lastViewedTimestamp)

    if (get(this.newTimestampStore) === undefined) {
      this.newTimestampStore.set(firstNewMsgIndex !== undefined ? metadata[firstNewMsgIndex]?.createdOn : undefined)
    }

    const startPosition = this.getStartPosition(selectedMsg ?? this.selectedMsgId, firstNewMsgIndex)

    const count = metadata.length
    const isLoadingLatest = startPosition === undefined || startPosition === -1

    if (loadAll) {
      this.loadTail(undefined, combineActivityMessages)
    } else if (isLoadingLatest) {
      const startIndex = Math.max(0, count - this.limit)
      this.isTailLoading.set(true)
      const tailStart = metadata[startIndex]?.createdOn
      this.loadTail(tailStart)
    } else if (count - startPosition <= this.limit) {
      this.isTailLoading.set(true)
      const tailStart = metadata[startPosition]?.createdOn
      this.loadTail(tailStart)
      await this.loadMore('backward', tailStart)
    } else {
      const start = metadata[startPosition]?.createdOn

      if (startPosition === 0) {
        await this.loadMore('forward', metadata[startPosition]?.createdOn, this.limit, true)
      } else {
        await this.loadMore('backward', start, this.limit / 2)
        await this.loadMore('forward', metadata[startPosition - 1]?.createdOn, this.limit / 2)
      }
    }

    this.isInitialLoadingStore.set(false)
    this.isInitialLoadedStore.set(true)
  }

  private loadTail (start?: Timestamp, afterLoad?: (msgs: ActivityMessage[]) => Promise<ActivityMessage[]>): void {
    if (this.chatId === undefined) {
      this.isTailLoading.set(false)
      return
    }

    if (this.tailStart === undefined) {
      this.tailStart = start
    }

    this.tailQuery.query(
      this.msgClass,
      {
        attachedTo: this.chatId,
        hidden: { $ne: true },
        ...(this.tailStart !== undefined ? { createdOn: { $gte: this.tailStart } } : {})
      },
      async (res) => {
        if (afterLoad !== undefined) {
          const result = await afterLoad(res.reverse())
          this.tailStore.set(result)
        } else {
          this.tailStore.set(res.reverse())
        }

        this.isTailLoading.set(false)
      },
      {
        sort: { createdOn: SortingOrder.Descending },
        lookup: {
          _id: { attachments: attachment.class.Attachment }
        }
      }
    )
  }

  public async loadMore (mode: LoadMode, loadAfter?: Timestamp, limit?: number, loadEqual = false): Promise<void> {
    if (this.chatId === undefined || loadAfter === undefined) {
      return
    }

    if (!this.canLoadMore(mode, loadAfter) || get(this.isLoadingMoreStore)) {
      return
    }

    this.isLoadingMoreStore.set(true)

    const isBackward = mode === 'backward'
    const isForward = mode === 'forward'

    if (isForward) {
      const metadata = get(this.metadataStore)
      const metaIndex = metadata.findIndex(({ createdOn }) => createdOn === loadAfter)
      const shouldLoadTail = metaIndex >= 0 && metaIndex + this.limit >= metadata.length

      if (shouldLoadTail) {
        this.loadTail(metadata[metaIndex + 1]?.createdOn)
        this.isLoadingMoreStore.set(false)
        return
      }
    }

    const client = getClient()
    const messages = await client.findAll(
      chunter.class.ChatMessage,
      {
        attachedTo: this.chatId,
        hidden: { $ne: true },
        createdOn: isBackward
          ? loadEqual
            ? { $lte: loadAfter }
            : { $lt: loadAfter }
          : loadEqual
            ? { $gte: loadAfter }
            : { $gt: loadAfter }
      },
      {
        limit: limit ?? this.limit,
        sort: { createdOn: isBackward ? SortingOrder.Descending : SortingOrder.Ascending },
        lookup: {
          _id: { attachments: attachment.class.Attachment }
        }
      }
    )

    if (messages.length === 0) {
      this.isLoadingMoreStore.set(false)
      return
    }

    const from = isBackward ? messages[0] : messages[messages.length - 1]
    const to = isBackward ? messages[messages.length - 1] : messages[0]

    const chunk: Chunk = {
      from: from.createdOn ?? from.modifiedOn,
      to: to.createdOn ?? to.modifiedOn,
      data: isBackward ? messages.reverse() : messages
    }

    const chunks = get(this.chunksStore)

    this.chunksStore.set(isBackward ? [chunk, ...chunks] : [...chunks, chunk])
    this.isLoadingMoreStore.set(false)
  }

  private getStartPosition (selectedMsgId?: Ref<ActivityMessage>, firsNewMsgIndex?: number): number | undefined {
    const metadata = get(this.metadataStore)

    const selectedIndex =
      selectedMsgId !== undefined ? metadata.findIndex(({ _id }) => _id === selectedMsgId) : undefined

    if (selectedIndex !== undefined && selectedIndex >= 0) {
      return selectedIndex
    }

    return firsNewMsgIndex
  }

  private getFirstNewMsgIndex (lastViewedTimestamp?: Timestamp): number | undefined {
    const metadata = get(this.metadataStore)

    if (metadata.length === 0) {
      return undefined
    }

    if (lastViewedTimestamp === undefined) {
      return -1
    }

    const me = getCurrentAccount()._id

    return metadata.findIndex((message) => {
      if (message.createdBy === me) {
        return false
      }

      const createdOn = message.createdOn ?? 0

      return lastViewedTimestamp < createdOn
    })
  }

  private updatesDates (metadata: MessageMetadata[]): void {
    const dates: Timestamp[] = []

    for (const [index, data] of metadata.entries()) {
      const date = data.createdOn

      if (date === undefined) {
        continue
      }

      if (index === 0) {
        dates.push(date)
      }

      const nextDate = metadata[index + 1]?.createdOn

      if (nextDate === undefined) {
        continue
      }

      if (isOtherDay(date, nextDate)) {
        dates.push(nextDate)
      }
    }

    this.datesStore.set(dates)
  }

  private clearMessages (): void {
    this.tailStore.set([])
    this.chunksStore.set([])
    this.isInitialLoadedStore.set(false)
    this.tailQuery.unsubscribe()
    this.tailStart = undefined
  }

  public async jumpToDate (date: Timestamp): Promise<void> {
    const msg = get(this.metadataStore).find(({ createdOn }) => createdOn === date)

    if (msg === undefined) {
      return
    }

    this.clearMessages()
    await this.loadInitialMessages(msg._id)
  }
}
