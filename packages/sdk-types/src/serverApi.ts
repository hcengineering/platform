import type {
  FindMessagesGroupsParams,
  FindMessagesParams,
  Message,
  MessagesGroup,
  SocialID,
  WorkspaceID
} from '@hcengineering/communication-types'

import type { EventResult, RequestEvent } from './requestEvent.ts'

export interface ConnectionInfo {
  sessionId: string
  personalWorkspace: WorkspaceID
  socialIds: SocialID[]
}

export interface ServerApi {
  findMessages(info: ConnectionInfo, params: FindMessagesParams, queryId?: number): Promise<Message[]>
  findMessagesGroups(info: ConnectionInfo, params: FindMessagesGroupsParams): Promise<MessagesGroup[]>

  event(info: ConnectionInfo, event: RequestEvent): Promise<EventResult>

  closeSession(sessionId: string): Promise<void>
  unsubscribeQuery(info: ConnectionInfo, id: number): Promise<void>

  close(): Promise<void>
}
