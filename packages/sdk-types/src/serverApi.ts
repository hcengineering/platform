import type { FindMessagesParams, Message, SocialID } from '@hcengineering/communication-types'

import type { EventResult, Event } from './event'

export interface ConnectionInfo {
  sessionId: string
  personalWorkspace: string
  socialId: SocialID
}

export interface ServerApi {
  findMessages(info: ConnectionInfo, params: FindMessagesParams, queryId?: number): Promise<Message[]>

  event(info: ConnectionInfo, event: Event): Promise<EventResult>

  closeSession(sessionId: string): Promise<void>
  unsubscribeQuery(info: ConnectionInfo, id: number): Promise<void>

  close(): Promise<void>
}
