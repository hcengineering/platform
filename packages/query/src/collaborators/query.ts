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

import type { AccountID, Collaborator, FindCollaboratorsParams, WorkspaceID } from '@hcengineering/communication-types'
import {
  type EventResult,
  type FindClient,
  type QueryCallback,
  type Event,
  NotificationEventType,
  CardEventType,
  AddCollaboratorsEvent,
  RemoveCollaboratorsEvent,
  RemoveCardEvent
} from '@hcengineering/communication-sdk-types'

import { QueryResult } from '../result'
import { type Query, type QueryId } from '../types'

export class CollaboratorsQuery implements Query<Collaborator, FindCollaboratorsParams> {
  private result: Promise<QueryResult<Collaborator>> | QueryResult<Collaborator>
  private isCardRemoved = false

  constructor (
    private readonly client: FindClient,
    private readonly workspace: WorkspaceID,
    private readonly filesUrl: string,
    public readonly id: QueryId,
    public readonly params: FindCollaboratorsParams,
    private callback?: QueryCallback<Collaborator>,
    initialResult?: QueryResult<Collaborator>
  ) {
    if (initialResult !== undefined) {
      this.result = initialResult
      void this.notify()
    } else {
      this.result = this.initResult()
    }
  }

  async onEvent (event: Event): Promise<void> {
    if (this.isCardRemoved) return
    switch (event.type) {
      case NotificationEventType.AddCollaborators:
        await this.onCollaboratorsAdded(event)
        break
      case NotificationEventType.RemoveCollaborators:
        await this.onCollaboratorsRemoved(event)
        break
      case CardEventType.RemoveCard:
        await this.onCardRemoved(event)
        break
    }
  }

  async onCollaboratorsAdded (event: AddCollaboratorsEvent): Promise<void> {
    if (event.cardId !== this.params.card || event.collaborators.length === 0) return
    if (this.result instanceof Promise) this.result = await this.result

    let updated = false
    for (const account of event.collaborators) {
      if (this.params.limit != null && this.result.length >= this.params.limit) break
      const existing = this.result.get(account)
      if (existing != null) continue
      const match = this.match(account)
      if (!match) continue
      updated = true
      this.result.push({
        account,
        cardId: event.cardId,
        cardType: event.cardType
      })
    }

    if (updated) {
      void this.notify()
    }
  }

  async onCollaboratorsRemoved (event: RemoveCollaboratorsEvent): Promise<void> {
    if (event.cardId !== this.params.card || event.collaborators.length === 0) return
    if (this.result instanceof Promise) this.result = await this.result

    const prevLength = this.result.length
    let deleted = false
    for (const account of event.collaborators) {
      const d = this.result.delete(account)
      deleted = deleted || d !== undefined
    }
    if (!deleted) return

    if (this.params.limit != null && this.result.length < this.params.limit && prevLength >= this.params.limit) {
      const collaborators = await this.find(this.params)
      this.result = new QueryResult(collaborators, (c) => c.account)
    }

    void this.notify()
  }

  async onCardRemoved (event: RemoveCardEvent): Promise<void> {
    if (this.params.card !== event.cardId) return
    if (this.result instanceof Promise) this.result = await this.result

    this.isCardRemoved = true
    this.result.deleteAll()
    void this.notify()
  }

  async onRequest (event: Event, promise: Promise<EventResult>): Promise<void> {}

  private async initResult (): Promise<QueryResult<Collaborator>> {
    try {
      const res = await this.find(this.params)
      const result = new QueryResult(res, (c) => c.account)

      void this.notify()
      return result
    } catch (error) {
      console.error('Failed to initialize query:', error)
      return new QueryResult([] as Collaborator[], (c) => c.account)
    }
  }

  async unsubscribe (): Promise<void> {
    await this.client.unsubscribeQuery(this.id)
  }

  removeCallback (): void {
    this.callback = () => {}
  }

  setCallback (callback: QueryCallback<Collaborator>): void {
    this.callback = callback
    void this.notify()
  }

  copyResult (): QueryResult<Collaborator> | undefined {
    if (this.result instanceof Promise) {
      return undefined
    }

    return this.result.copy()
  }

  private async find (params: FindCollaboratorsParams): Promise<Collaborator[]> {
    if (this.isCardRemoved) return []
    return await this.client.findCollaborators(params, this.id)
  }

  private async notify (): Promise<void> {
    if (this.callback == null) return
    if (this.result instanceof Promise) this.result = await this.result
    const result = this.result.getResult()
    this.callback(result)
  }

  private match (account: AccountID): boolean {
    if (this.params.account != null) {
      const accounts = Array.isArray(this.params.account) ? this.params.account : [this.params.account]
      if (!accounts.includes(account)) {
        return false
      }
    }
    return true
  }
}
