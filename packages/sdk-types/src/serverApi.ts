import type { FindMessagesParams, Message, SocialID } from '@hcengineering/communication-types'

import type { BroadcastEvent, EventResult, Event } from './event'

export interface ConnectionInfo {
  sessionId: string
  personalWorkspace: string
  socialId: SocialID
}

export type Result = {
  broadcastEvent?: BroadcastEvent
  result: EventResult
}

export interface ServerApi {
  findMessages(info: ConnectionInfo, params: FindMessagesParams, queryId?: number): Promise<Message[]>

  unsubscribeQuery(info: ConnectionInfo, id: number): Promise<void>

  event(info: ConnectionInfo, event: Event): Promise<Result>

  close(): Promise<void>
}
