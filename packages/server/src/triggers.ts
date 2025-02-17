import {
  ResponseEventType,
  type DbAdapter,
  type MessageCreatedEvent,
  type NotificationContextCreatedEvent,
  type NotificationCreatedEvent,
  type ResponseEvent
} from '@hcengineering/communication-sdk-types'
import type { NotificationContext, ContextID, CardID, WorkspaceID } from '@hcengineering/communication-types'

export class Triggers {
  constructor(
    private readonly db: DbAdapter,
    private readonly workspace: WorkspaceID
  ) {}

  async process(event: ResponseEvent): Promise<ResponseEvent[]> {
    switch (event.type) {
      case ResponseEventType.MessageCreated:
        return this.createNotifications(event)
    }

    return []
  }

  private async createNotifications(event: MessageCreatedEvent): Promise<ResponseEvent[]> {
    const card = event.message.card as any as CardID
    const subscribedPersonalWorkspaces = [
      'cd0aba36-1c4f-4170-95f2-27a12a5415f7',
      'cd0aba36-1c4f-4170-95f2-27a12a5415f8'
    ] as WorkspaceID[]

    const res: ResponseEvent[] = []
    const contexts = await this.db.findContexts({ card }, [], this.workspace)

    res.push(...(await this.updateNotificationContexts(event.message.created, contexts)))

    for (const personalWorkspace of subscribedPersonalWorkspaces) {
      const existsContext = contexts.find(
        (it) => it.card === card && it.personalWorkspace === personalWorkspace && this.workspace === it.workspace
      )
      const contextId = await this.getOrCreateContextId(
        personalWorkspace,
        card,
        res,
        event.message.created,
        existsContext
      )

      await this.db.createNotification(event.message.id, contextId)

      const resultEvent: NotificationCreatedEvent = {
        type: ResponseEventType.NotificationCreated,
        personalWorkspace,
        notification: {
          context: contextId,
          message: event.message,
          read: false,
          archived: false
        }
      }
      res.push(resultEvent)
    }

    return res
  }

  private async getOrCreateContextId(
    personalWorkspace: WorkspaceID,
    card: CardID,
    res: ResponseEvent[],
    lastUpdate: Date,
    context?: NotificationContext
  ): Promise<ContextID> {
    if (context !== undefined) {
      return context.id
    } else {
      const contextId = await this.db.createContext(personalWorkspace, card, undefined, lastUpdate)
      const newContext = {
        id: contextId,
        card,
        workspace: this.workspace,
        personalWorkspace
      }
      const resultEvent: NotificationContextCreatedEvent = {
        type: ResponseEventType.NotificationContextCreated,
        context: newContext
      }

      res.push(resultEvent)

      return contextId
    }
  }

  private async updateNotificationContexts(
    lastUpdate: Date,
    contexts: NotificationContext[]
  ): Promise<ResponseEvent[]> {
    const res: ResponseEvent[] = []
    for (const context of contexts) {
      if (context.lastUpdate === undefined || context.lastUpdate < lastUpdate) {
        await this.db.updateContext(context.id, { lastUpdate })
        res.push({
          type: ResponseEventType.NotificationContextUpdated,
          personalWorkspace: context.personalWorkspace,
          context: context.id,
          update: {
            lastUpdate
          }
        })
      }
    }
    return res
  }
}
