import {
  type BroadcastEvent,
  type DbAdapter,
  EventType,
  type MessageCreatedEvent,
  type NotificationContextCreatedEvent,
  type NotificationCreatedEvent
} from '@hcengineering/communication-sdk-types'
import type { NotificationContext, ContextID, CardID } from '@hcengineering/communication-types'

export class Triggers {
  constructor(private readonly db: DbAdapter) {}

  async process(event: BroadcastEvent, workspace: string): Promise<BroadcastEvent[]> {
    switch (event.type) {
      case EventType.MessageCreated:
        return this.createNotifications(event, workspace)
    }

    return []
  }

  private async createNotifications(event: MessageCreatedEvent, workspace: string): Promise<BroadcastEvent[]> {
    const card = event.message.thread as any as CardID
    const subscribedPersonWorkspaces = ['cd0aba36-1c4f-4170-95f2-27a12a5415f7', 'cd0aba36-1c4f-4170-95f2-27a12a5415f8']

    const res: BroadcastEvent[] = []
    const contexts = await this.db.findContexts({ card }, [], workspace)

    res.push(...(await this.updateNotificationContexts(event.message.created, contexts)))

    for (const personWorkspace of subscribedPersonWorkspaces) {
      const existsContext = contexts.find(
        (it) => it.card === card && it.personWorkspace === personWorkspace && workspace === it.workspace
      )
      const contextId = await this.getOrCreateContextId(
        workspace,
        card,
        personWorkspace,
        res,
        event.message.created,
        existsContext
      )

      await this.db.createNotification(event.message.id, contextId)

      const resultEvent: NotificationCreatedEvent = {
        type: EventType.NotificationCreated,
        personWorkspace,
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
    workspace: string,
    card: CardID,
    personWorkspace: string,
    res: BroadcastEvent[],
    lastUpdate: Date,
    context?: NotificationContext
  ): Promise<ContextID> {
    if (context !== undefined) {
      return context.id
    } else {
      const contextId = await this.db.createContext(personWorkspace, workspace, card, undefined, lastUpdate)
      const newContext = {
        id: contextId,
        card,
        workspace,
        personWorkspace
      }
      const resultEvent: NotificationContextCreatedEvent = {
        type: EventType.NotificationContextCreated,
        context: newContext
      }

      res.push(resultEvent)

      return contextId
    }
  }

  private async updateNotificationContexts(
    lastUpdate: Date,
    contexts: NotificationContext[]
  ): Promise<BroadcastEvent[]> {
    const res: BroadcastEvent[] = []
    for (const context of contexts) {
      if (context.lastUpdate === undefined || context.lastUpdate < lastUpdate) {
        await this.db.updateContext(context.id, { lastUpdate })
        res.push({
          type: EventType.NotificationContextUpdated,
          personWorkspace: context.personWorkspace,
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
