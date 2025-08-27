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
import { closeLiveQueries, initLiveQueries, refreshLiveQueries } from '@hcengineering/communication-client-query'
import {
  type AddAttachmentsOperation,
  type AddCollaboratorsEvent,
  type AttachmentPatchEvent,
  type CreateMessageEvent,
  type CreateMessageResult,
  type Event,
  type EventResult,
  MessageEventType,
  NotificationEventType,
  type ReactionPatchEvent,
  type RemoveAttachmentsOperation,
  type RemoveCollaboratorsEvent,
  type RemoveNotificationContextEvent,
  type RemovePatchEvent,
  type SetAttachmentsOperation,
  type ThreadPatchEvent,
  type UpdateAttachmentsOperation,
  type UpdateNotificationContextEvent,
  type UpdateNotificationEvent,
  type UpdateNotificationQuery,
  type UpdatePatchEvent
} from '@hcengineering/communication-sdk-types'
import {
  type AccountID,
  type CardID,
  type CardType,
  type Collaborator,
  type ContextID,
  type FindCollaboratorsParams,
  type FindLabelsParams,
  type FindMessagesGroupsParams,
  type FindMessagesParams,
  type FindNotificationContextParams,
  type FindNotificationsParams,
  type Label,
  type Markdown,
  type Message,
  type MessageID,
  type MessagesGroup,
  MessageType,
  type Notification,
  type NotificationContext,
  type SocialID,
  type AttachmentID,
  type AttachmentData,
  type AttachmentParams,
  type AttachmentUpdateData,
  type WithTotal
} from '@hcengineering/communication-types'
import core, {
  generateId,
  getCurrentAccount,
  type OperationDomain,
  type Client as PlatformClient,
  SocialIdType,
  type Tx,
  type TxDomainEvent,
  AccountRole
} from '@hcengineering/core'
import { onDestroy } from 'svelte'
import { addNotification, NotificationSeverity, languageStore } from '@hcengineering/ui'
import { translate } from '@hcengineering/platform'
import view from '@hcengineering/view'
import { v4 as uuid } from 'uuid'

import { getCurrentWorkspaceUuid, getFilesUrl } from './file'
import { addTxListener, removeTxListener, type TxListener } from './utils'
import { get } from 'svelte/store'

export {
  createCollaboratorsQuery,
  createLabelsQuery,
  createMessagesQuery,
  createNotificationContextsQuery,
  createNotificationsQuery,
  initLiveQueries,
  type MessageQueryParams
} from '@hcengineering/communication-client-query'

let client: CommunicationClient

export type CommunicationClient = Client

export function getCommunicationClient (): CommunicationClient {
  return client
}

export async function setCommunicationClient (platformClient: PlatformClient): Promise<void> {
  console.log('setCommunicationClient')
  if (client !== undefined) {
    client.close()
  }
  const _client = new Client(platformClient)
  initLiveQueries(_client, getCurrentWorkspaceUuid(), getFilesUrl(), onDestroy)
  client = _client
  onClientListeners.forEach((fn) => {
    fn()
  })
}

export type AttachmentDataWithOptionalId<P extends AttachmentParams = AttachmentParams> = Omit<
AttachmentData<P>,
'id'
> & {
  id?: AttachmentID
}

const COMMUNICATION = 'communication' as OperationDomain

class Client {
  txHandler: TxListener
  constructor (private readonly connection: PlatformClient) {
    this.txHandler = this.doHandleEvents.bind(this)
    addTxListener(this.txHandler)
  }

  doHandleEvents (events: Tx[]): void {
    for (const event of events) {
      if (event._class === core.class.TxDomainEvent && (event as TxDomainEvent).domain === COMMUNICATION) {
        const evt = event as TxDomainEvent<Event>
        this.onEvent(evt.event)
      }
    }
  }

  onEvent: (event: Event) => void = () => {}
  onRequest: (event: Event, eventPromise: Promise<EventResult>) => void = () => {}

  async attachThread (cardId: CardID, messageId: MessageID, threadId: CardID, threadType: CardType): Promise<void> {
    const event: ThreadPatchEvent = {
      type: MessageEventType.ThreadPatch,
      cardId,
      messageId,
      operation: {
        opcode: 'attach',
        threadId,
        threadType
      },
      socialId: this.getSocialId()
    }

    await this.sendEvent(event)
  }

  async createMessage (cardId: CardID, cardType: CardType, content: Markdown): Promise<CreateMessageResult> {
    const event: CreateMessageEvent = {
      type: MessageEventType.CreateMessage,
      messageType: MessageType.Message,
      cardId,
      cardType,
      content,
      socialId: this.getSocialId(),
      options: {
        skipLinkPreviews: true
      }
    }
    const result = await this.sendEvent(event)
    return result as CreateMessageResult
  }

  async updateMessage (cardId: CardID, messageId: MessageID, content: Markdown): Promise<void> {
    const event: UpdatePatchEvent = {
      type: MessageEventType.UpdatePatch,
      cardId,
      messageId,
      content,
      socialId: this.getSocialId(),
      options: {
        skipLinkPreviewsUpdate: true
      }
    }
    await this.sendEvent(event)
  }

  async removeMessage (cardId: CardID, messageId: MessageID): Promise<void> {
    const event: RemovePatchEvent = {
      type: MessageEventType.RemovePatch,
      cardId,
      messageId,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async addReaction (cardId: CardID, messageId: MessageID, reaction: string): Promise<void> {
    const event: ReactionPatchEvent = {
      type: MessageEventType.ReactionPatch,
      cardId,
      messageId,
      operation: {
        opcode: 'add',
        reaction
      },
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async removeReaction (cardId: CardID, messageId: MessageID, reaction: string): Promise<void> {
    const event: ReactionPatchEvent = {
      type: MessageEventType.ReactionPatch,
      cardId,
      messageId,
      operation: {
        opcode: 'remove',
        reaction
      },
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async attachmentPatch<P extends AttachmentParams>(
    cardId: CardID,
    messageId: MessageID,
    ops: {
      add?: Array<AttachmentDataWithOptionalId<P>>
      remove?: AttachmentID[]
      set?: Array<AttachmentDataWithOptionalId<P>>
      update?: Array<AttachmentUpdateData<P>>
    }
  ): Promise<void> {
    const operations: Array<
    AddAttachmentsOperation | RemoveAttachmentsOperation | SetAttachmentsOperation | UpdateAttachmentsOperation
    > = []

    if (ops.add != null && ops.add.length > 0) {
      operations.push({
        opcode: 'add',
        attachments: ops.add.map((it) => ({
          ...it,
          id: it.id ?? (uuid() as AttachmentID)
        }))
      })
    }

    if (ops.remove != null && ops.remove.length > 0) {
      operations.push({
        opcode: 'remove',
        ids: ops.remove
      })
    }

    if (ops.set != null && ops.set.length > 0) {
      operations.push({
        opcode: 'set',
        attachments: ops.set.map((it) => ({
          ...it,
          id: it.id ?? (uuid() as AttachmentID)
        }))
      })
    }

    if (ops.update != null && ops.update.length > 0) {
      operations.push({
        opcode: 'update',
        attachments: ops.update
      })
    }

    if (operations.length === 0) return

    const event: AttachmentPatchEvent = {
      type: MessageEventType.AttachmentPatch,
      cardId,
      messageId,
      operations,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async addCollaborators (cardId: CardID, cardType: CardType, collaborators: AccountID[]): Promise<void> {
    const event: AddCollaboratorsEvent = {
      type: NotificationEventType.AddCollaborators,
      cardId,
      cardType,
      collaborators,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async removeCollaborators (cardId: CardID, cardType: CardType, collaborators: AccountID[]): Promise<void> {
    const event: RemoveCollaboratorsEvent = {
      type: NotificationEventType.RemoveCollaborators,
      cardId,
      cardType,
      collaborators,
      socialId: this.getSocialId()
    }
    await this.sendEvent(event)
  }

  async updateNotificationContext (contextId: ContextID, lastView: Date): Promise<void> {
    const event: UpdateNotificationContextEvent = {
      type: NotificationEventType.UpdateNotificationContext,
      contextId,
      account: this.getAccount(),
      updates: {
        lastView
      }
    }
    await this.sendEvent(event)
  }

  async removeNotificationContext (contextId: ContextID): Promise<void> {
    const event: RemoveNotificationContextEvent = {
      type: NotificationEventType.RemoveNotificationContext,
      contextId,
      account: this.getAccount()
    }
    await this.sendEvent(event)
  }

  async updateNotifications (contextId: ContextID, query: UpdateNotificationQuery, read: boolean): Promise<void> {
    const event: UpdateNotificationEvent = {
      type: NotificationEventType.UpdateNotification,
      contextId,
      account: this.getAccount(),
      query,
      updates: {
        read
      }
    }
    await this.sendEvent(event)
  }

  async findMessages (params: FindMessagesParams, queryId?: number): Promise<Message[]> {
    return (
      await this.connection.domainRequest<Message[]>(COMMUNICATION, {
        findMessages: { params, queryId }
      })
    ).value
  }

  async findMessagesGroups (params: FindMessagesGroupsParams): Promise<MessagesGroup[]> {
    return (
      await this.connection.domainRequest<MessagesGroup[]>(COMMUNICATION, {
        findMessagesGroups: { params }
      })
    ).value
  }

  async findNotificationContexts (
    params: FindNotificationContextParams,
    queryId?: number
  ): Promise<NotificationContext[]> {
    return (
      await this.connection.domainRequest<NotificationContext[]>(COMMUNICATION, {
        findNotificationContexts: { params, queryId }
      })
    ).value
  }

  async findNotifications (params: FindNotificationsParams, queryId?: number): Promise<WithTotal<Notification>> {
    return (
      await this.connection.domainRequest<WithTotal<Notification>>(COMMUNICATION, {
        findNotifications: { params, queryId }
      })
    ).value
  }

  async findLabels (params: FindLabelsParams): Promise<Label[]> {
    return (
      await this.connection.domainRequest<Label[]>(COMMUNICATION, {
        findLabels: { params }
      })
    ).value
  }

  async findCollaborators (params: FindCollaboratorsParams): Promise<Collaborator[]> {
    return (
      await this.connection.domainRequest<Collaborator[]>(COMMUNICATION, {
        findCollaborators: { params }
      })
    ).value
  }

  async unsubscribeQuery (id: number): Promise<void> {
    await this.connection.domainRequest<Message[]>(COMMUNICATION, {
      unsubscribeQuery: id
    })
  }

  close (): void {
    removeTxListener(this.txHandler)
  }

  private async sendEvent (event: Event): Promise<EventResult> {
    const lang = get(languageStore)
    if (getCurrentAccount().role === AccountRole.ReadOnlyGuest) {
      addNotification(
        await translate(view.string.ReadOnlyWarningTitle, {}, lang),
        await translate(view.string.ReadOnlyWarningMessage, {}, lang),
        view.component.ReadOnlyNotification,
        undefined,
        NotificationSeverity.Info,
        'readOnlyNotification'
      )
      return {}
    }

    const ev: Event = { ...event, _id: generateId() }

    const eventPromise: Promise<EventResult> = this.connection
      .domainRequest<EventResult>(COMMUNICATION, {
      event: ev
    })
      .then((result) => result.value)
    this.onRequest(ev, eventPromise)
    return await eventPromise
  }

  private getSocialId (): SocialID {
    const me = getCurrentAccount()
    const hulySocialId = me.fullSocialIds.find((it) => it.type === SocialIdType.HULY && it.verifiedOn !== undefined)
    const id = hulySocialId?._id ?? me.primarySocialId
    if (id == null || id === '') {
      throw new Error('Social id not found')
    }
    return id
  }

  private getAccount (): AccountID {
    return getCurrentAccount().uuid
  }
}

const onClientListeners: Array<() => void> = []

export function onCommunicationClient (fn: () => void): void {
  onClientListeners.push(fn)
  if (client !== undefined) {
    setTimeout(() => {
      fn()
    })
  }
}

export async function refreshCommunicationClient (): Promise<void> {
  console.log('refreshCommunicationClient')
  await refreshLiveQueries()
}

export async function purgeCommunicationClient (): Promise<void> {
  client.close()
  closeLiveQueries()
}
