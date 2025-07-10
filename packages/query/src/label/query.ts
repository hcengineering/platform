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

import type { FindLabelsParams, Label, WorkspaceID } from '@hcengineering/communication-types'
import {
  CardEventType,
  CreateLabelEvent,
  type Event,
  type EventResult,
  type FindClient,
  LabelEventType,
  type QueryCallback,
  RemoveCardEvent,
  RemoveLabelEvent,
  UpdateCardTypeEvent
} from '@hcengineering/communication-sdk-types'

import { QueryResult } from '../result'
import { type Query, type QueryId } from '../types'

function getId (label: Label): string {
  return `${label.labelId}:${label.cardId}:${label.account}`
}

export class LabelsQuery implements Query<Label, FindLabelsParams> {
  private result: Promise<QueryResult<Label>> | QueryResult<Label>
  private isCardRemoved = false

  constructor (
    private readonly client: FindClient,
    private readonly workspace: WorkspaceID,
    private readonly filesUrl: string,
    public readonly id: QueryId,
    public readonly params: FindLabelsParams,
    private callback?: QueryCallback<Label>,
    initialResult?: QueryResult<Label>
  ) {
    if (initialResult !== undefined) {
      this.result = initialResult
      void this.notify()
    } else {
      this.result = this.initResult()
      void this.result.then(() => {
        void this.notify()
      })
    }
  }

  async onEvent (event: Event): Promise<void> {
    if (this.isCardRemoved) return
    switch (event.type) {
      case LabelEventType.CreateLabel:
        await this.onLabelCreated(event)
        break
      case LabelEventType.RemoveLabel:
        await this.onLabelRemoved(event)
        break

      case CardEventType.UpdateCardType:
        await this.onCardTypeUpdated(event)
        break
      case CardEventType.RemoveCard:
        await this.onCardRemoved(event)
        break
    }
  }

  async onLabelCreated (event: CreateLabelEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result
    if (this.params.limit != null && this.result.length >= this.params.limit) return
    const label: Label = {
      labelId: event.labelId,
      cardId: event.cardId,
      cardType: event.cardType,
      account: event.account,
      created: event.date ?? new Date()
    }

    const match = this.match(label)
    if (!match) return
    const existing = this.result.get(getId(label))
    if (existing != null) return
    this.result.push(label)
    void this.notify()
  }

  async onLabelRemoved (event: RemoveLabelEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    const existing = this.result
      .getResult()
      .find((it) => it.account === event.account && it.cardId === event.cardId && it.labelId === event.labelId)
    if (existing === undefined) return
    const prevLength = this.result.length
    this.result.delete(getId(existing))

    if (this.params.limit != null && this.result.length < this.params.limit && prevLength >= this.params.limit) {
      const labels = await this.find(this.params)
      this.result = new QueryResult(labels, getId)
    }

    void this.notify()
  }

  async onCardTypeUpdated (event: UpdateCardTypeEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    const result = this.result.getResult()
    const currentLength = this.result.length
    let updated = false

    if (this.params.cardType != null) {
      const cardTypes = Array.isArray(this.params.cardType) ? this.params.cardType : [this.params.cardType]
      if (cardTypes.includes(event.cardType)) {
        const labels = await this.find(this.params)
        this.result = new QueryResult(labels, getId)
        void this.notify()
        return
      }
    }

    for (const label of result) {
      if (label.cardId === event.cardId) {
        const updatedLabel: Label = { ...label, cardType: event.cardType }
        const matched = this.match(updatedLabel)
        if (matched) {
          this.result.update(updatedLabel)
        } else {
          this.result.delete(getId(label))
        }
        updated = true
      }
    }

    if (updated) {
      const newLength = this.result.length
      if (this.params.limit != null && newLength < currentLength && newLength >= this.params.limit) {
        const labels = await this.find(this.params)
        this.result = new QueryResult(labels, getId)
      }

      void this.notify()
    }
  }

  async onCardRemoved (event: RemoveCardEvent): Promise<void> {
    if (this.result instanceof Promise) this.result = await this.result

    if (this.params.card === event.cardId) {
      this.isCardRemoved = true
      this.result.deleteAll()
      void this.notify()
      return
    }

    const result = this.result.getResult()
    const prevLength = this.result.length
    let deleted = false
    for (const label of result) {
      if (label.cardId === event.cardId) {
        this.result.delete(label.labelId)
        deleted = true
      }
    }

    if (deleted) {
      if (this.params.limit != null && this.result.length < this.params.limit && prevLength >= this.params.limit) {
        const labels = await this.find(this.params)
        this.result = new QueryResult(labels, getId)
      }
      void this.notify()
    }
  }

  async onRequest (event: Event, promise: Promise<EventResult>): Promise<void> {}

  private async initResult (): Promise<QueryResult<Label>> {
    try {
      const res = await this.find(this.params)
      return new QueryResult(res, getId)
    } catch (error) {
      console.error('Failed to initialize query:', error)
      return new QueryResult([] as Label[], getId)
    }
  }

  async unsubscribe (): Promise<void> {
    await this.client.unsubscribeQuery(this.id)
  }

  removeCallback (): void {
    this.callback = () => {}
  }

  setCallback (callback: QueryCallback<Label>): void {
    this.callback = callback
    void this.notify()
  }

  copyResult (): QueryResult<Label> | undefined {
    if (this.result instanceof Promise) {
      return undefined
    }

    return this.result.copy()
  }

  private async find (params: FindLabelsParams): Promise<Label[]> {
    if (this.isCardRemoved) return []
    return await this.client.findLabels(params, this.id)
  }

  private async notify (): Promise<void> {
    if (this.callback == null) return
    if (this.result instanceof Promise) this.result = await this.result
    const result = this.result.getResult()
    this.callback(result)
  }

  private match (label: Label): boolean {
    if (this.params.account != null && this.params.account !== label.account) {
      return false
    }
    if (this.params.card != null && this.params.card !== label.cardId) {
      return false
    }

    if (this.params.label != null) {
      const labels = Array.isArray(this.params.label) ? this.params.label : [this.params.label]
      if (!labels.includes(label.labelId)) {
        return false
      }
    }
    if (this.params.cardType != null) {
      const types = Array.isArray(this.params.cardType) ? this.params.cardType : [this.params.cardType]
      if (!types.includes(label.cardType)) {
        return false
      }
    }
    return true
  }

  async refresh (): Promise<void> {
    this.result = new QueryResult([] as Label[], getId)
    await this.initResult()
  }
}
