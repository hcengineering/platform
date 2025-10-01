import type { Account, Branding, MeasureContext, SocialStringsToUsers, WorkspaceIds } from '@hcengineering/core'
import type { BroadcastOps, ConnectionSocket, Session, WorkspaceService } from '@hcengineering/server-core'
import type { Token } from '@hcengineering/server-token'
export interface TickHandler {
  ticks: number
  operation: () => void
}

export interface Workspace extends WorkspaceService {
  maintenance: boolean
  closing?: Promise<void>

  workspaceInitCompleted: boolean

  softShutdown: number

  sessions: Map<string, { session: Session, socket: ConnectionSocket, tickHash: number }>
  tickHandlers: Map<string, TickHandler>

  operations: number

  tickHash: number

  wsId: WorkspaceIds
  branding: Branding | null

  context: MeasureContext

  close: (ctx: MeasureContext) => Promise<void>

  createSession: (ctx: MeasureContext, sessionId: string, token: Token, account: Account) => Promise<Session>
  closeSession: (ctx: MeasureContext, session: Session) => Promise<void>

  socialStringsToUsers: SocialStringsToUsers
}

export interface WorkspaceFactoryOpt {
  pipelineCtx: MeasureContext
  broadcast: BroadcastOps
  ids: WorkspaceIds
  branding: Branding | null
  version: string
  region: string
}
export type WorkspaceFactory = (ctx: MeasureContext, opt: WorkspaceFactoryOpt) => Workspace
