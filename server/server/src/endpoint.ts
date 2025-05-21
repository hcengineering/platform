import type {
  SessionData as CommunicationSession,
  EventResult,
  RequestEvent,
  ServerApi
} from '@hcengineering/communication-sdk-types'
import type {
  Collaborator,
  FindCollaboratorsParams,
  FindLabelsParams,
  FindMessagesGroupsParams,
  FindMessagesParams,
  FindNotificationContextParams,
  FindNotificationsParams,
  Label,
  Message,
  MessagesGroup,
  Notification,
  NotificationContext
} from '@hcengineering/communication-types'
import {
  systemAccountUuid,
  type AccountUuid,
  type Branding,
  type Class,
  type ClientConnection,
  type Doc,
  type DocumentQuery,
  type EndpointInfo,
  type FindOptions,
  type FindResult,
  type Hierarchy,
  type LoadModelResponse,
  type MeasureContext,
  type ModelDb,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type SessionData,
  type Timestamp,
  type Tx,
  type TxResult,
  type WorkspaceIds,
  type WorkspaceUuid
} from '@hcengineering/core'
import { type EndpointConnectionFactory, type Pipeline } from '@hcengineering/server-core'
import type { Session, SessionManager } from './types'
import type { Workspace } from './workspace'

interface EndpointWsInfo {
  lastHash?: string
  lastTx?: string
}

interface CommunicationConnection extends ClientConnection {
  findMessages: (params: FindMessagesParams, queryId?: number) => Promise<Message[]>
  findMessagesGroups: (params: FindMessagesGroupsParams) => Promise<MessagesGroup[]>
  findNotificationContexts: (params: FindNotificationContextParams, queryId?: number) => Promise<NotificationContext[]>
  findNotifications: (params: FindNotificationsParams, queryId?: number) => Promise<Notification[]>
  findLabels: (params: FindLabelsParams) => Promise<Label[]>
  findCollaborators: (params: FindCollaboratorsParams) => Promise<Collaborator[]>
  sendEvent: (event: RequestEvent) => Promise<EventResult>
  unsubscribeQuery: (id: number) => Promise<void>
}

export class EndpointClient {
  connection: ClientConnection

  accounts: Set<AccountUuid> = new Set<AccountUuid>()

  workspaces: Map<WorkspaceUuid, EndpointWsInfo> = new Map<WorkspaceUuid, EndpointWsInfo>()

  constructor (
    readonly ctx: MeasureContext,
    readonly region: string,
    readonly endpoint: EndpointInfo,
    readonly factory: EndpointConnectionFactory,
    readonly sessionManager: SessionManager
  ) {
    this.connection = this.factory(
      this.ctx,
      this.region === this.endpoint.region ? this.endpoint.internalUrl : this.endpoint.externalUrl,
      (txes: Tx[], workspace?: WorkspaceUuid, target?: AccountUuid, exclude?: AccountUuid[]) => {
        if (workspace !== undefined) {
          this.sessionManager.broadcast(workspace, txes, target, exclude)
        }
      },
      {
        // TODO: Pass model filter, to ignore all model
        onConnect: async (event, lastTx, data) => {
          // We need to pass a list of accounts and workspaces we manage on every reconnect.
          await this.doSubscribe()
        },
        onHello (serverVersion) {
          return true
        }
      }
    )
  }

  private async doSubscribe (): Promise<void> {
    if (this.connection === undefined) {
      // No need to subscribe, case for tests
      return
    }
    const info = await this.connection.subscribe({
      accounts: Array.from(this.accounts),
      workspaces: Array.from(this.workspaces.keys())
    })
    for (const ws of Array.from(this.workspaces.keys())) {
      const wsinfo = this.workspaces.get(ws)
      const rinfo = info[ws]
      if (wsinfo !== undefined && rinfo !== undefined) {
        wsinfo.lastHash = rinfo.lastHash
        wsinfo.lastTx = rinfo.lastTx
      }
    }
  }

  async addWorkspace (workspace: WorkspaceUuid): Promise<void> {
    const info = await this.connection.subscribe({
      workspaces: [workspace]
    })
    this.workspaces.set(workspace, {
      lastHash: info[workspace].lastHash, // Will be updated on connect
      lastTx: info[workspace].lastTx
    })
  }

  async removeWorkspace (workspace: WorkspaceUuid): Promise<void> {
    this.workspaces.delete(workspace)
    await this.connection.unsubscribe({
      workspaces: [workspace]
    })
  }

  async addUser (account: AccountUuid): Promise<void> {
    this.accounts.add(account)
    await this.connection.subscribe({
      accounts: [account]
    })
  }

  async removeUser (account: AccountUuid): Promise<void> {
    this.accounts.delete(account)
    await this.connection.unsubscribe({
      accounts: [account]
    })
  }

  getLastHash (workspace: WorkspaceUuid): string | undefined {
    const info = this.workspaces.get(workspace)
    if (info === undefined) {
      return undefined
    }
    return info.lastHash
  }

  getLastTx (workspace: WorkspaceUuid): string | undefined {
    const info = this.workspaces.get(workspace)
    if (info === undefined) {
      return undefined
    }
    return info.lastTx
  }
}

export class EndpointWorkspace implements Workspace {
  softShutdown: number

  sessions = new Map<string, Session>()

  operations: number = 0

  maintenance: boolean = false

  lastTx: string | undefined // TODO: Do not cache for proxy case
  lastHash: string | undefined // TODO: Do not cache for proxy case

  constructor (
    readonly context: MeasureContext,

    readonly endpoint: EndpointClient,

    readonly token: string,

    readonly tickHash: number,

    softShutdown: number,

    readonly wsId: WorkspaceIds,
    readonly branding: Branding | null
  ) {
    this.softShutdown = softShutdown
  }

  async addWorkspace (workspace: WorkspaceUuid): Promise<void> {
    await this.endpoint.addWorkspace(workspace)
  }

  async addSession (session: Session): Promise<void> {
    this.sessions.set(session.sessionId, session)
    await this.endpoint.addUser(session.getRawAccount().uuid)
  }

  async removeSession (session: Session): Promise<void> {
    this.sessions.delete(session.sessionId)
    await this.endpoint.addUser(session.getRawAccount().uuid)
  }

  open (): void {
    // Not required
  }

  async close (ctx: MeasureContext): Promise<void> {
    // Not required
  }

  checkHasUser (): boolean {
    for (const val of this.sessions.values()) {
      if (val.getUser() !== systemAccountUuid || val.subscribedUsers.size > 0) {
        return true
      }
    }
    return false
  }

  getLastHash (): string | undefined {
    return this.endpoint.getLastHash(this.wsId.uuid)
  }

  getLastTx (): string | undefined {
    return this.endpoint.getLastTx(this.wsId.uuid)
  }

  async with<T>(op: (pipeline: Pipeline, communicationApi: ServerApi) => Promise<T>): Promise<T> {
    const endpoint = this.endpoint
    const connection = endpoint.connection
    if (connection === undefined) {
      throw new Error('Endpoint not connected')
    }
    const wsPipeline: Pipeline = {
      context: {
        branding: null,
        communicationApi: null,
        modelDb: {} as any as ModelDb,
        contextVars: {},
        hierarchy: {} as any as Hierarchy,
        workspace: this.wsId
      },
      findAll: async <T extends Doc>(
        ctx: MeasureContext<SessionData>,
        _class: Ref<Class<T>>,
        query: DocumentQuery<T>,
        options?: FindOptions<T>
      ): Promise<FindResult<T>> => {
        return await connection.findAll<T>(_class, query, {
          ...options,
          user: ctx.contextData.account.uuid,
          workspace: this.wsId.uuid
        })
      },
      searchFulltext: async (
        ctx: MeasureContext<SessionData>,
        query: SearchQuery,
        options: SearchOptions
      ): Promise<SearchResult> => {
        return await connection.searchFulltext(query, {
          ...options,
          user: ctx.contextData.account.uuid,
          workspace: this.wsId.uuid
        })
      },
      tx: async (ctx: MeasureContext<SessionData>, tx: Tx[]): Promise<TxResult> => {
        const result: TxResult[] = []
        // It should be one from endpoint operation.
        for (const t of tx) {
          result.push(await connection.tx(t, { user: ctx.contextData.account.uuid }))
        }
        return result[result.length - 1]
      },
      close: async (): Promise<void> => {
        // Ignore
      },
      loadModel: async (
        ctx: MeasureContext<SessionData>,
        lastModelTx: Timestamp,
        hash?: string
      ): Promise<Tx[] | LoadModelResponse> => {
        return await connection.loadModel(lastModelTx, hash, this.wsId.uuid)
      },
      handleBroadcast: async (ctx: MeasureContext<SessionData>): Promise<void> => {
        // ignore
      }
    }
    const communicationClient = connection as CommunicationConnection
    const serverApi: ServerApi = {
      findMessages: async (
        session: CommunicationSession,
        params: FindMessagesParams,
        queryId?: number
      ): Promise<Message[]> => {
        return await communicationClient.findMessages(params, queryId)
      },
      findMessagesGroups: function (
        session: CommunicationSession,
        params: FindMessagesGroupsParams
      ): Promise<MessagesGroup[]> {
        throw new Error('Function not implemented.')
      },
      findNotificationContexts: function (
        session: CommunicationSession,
        params: FindNotificationContextParams,
        queryId?: number | string
      ): Promise<NotificationContext[]> {
        throw new Error('Function not implemented.')
      },
      findNotifications: function (
        session: CommunicationSession,
        params: FindNotificationsParams,
        queryId?: number | string
      ): Promise<Notification[]> {
        throw new Error('Function not implemented.')
      },
      findLabels: function (session: CommunicationSession, params: FindLabelsParams): Promise<Label[]> {
        throw new Error('Function not implemented.')
      },
      findCollaborators: function (
        session: CommunicationSession,
        params: FindCollaboratorsParams
      ): Promise<Collaborator[]> {
        throw new Error('Function not implemented.')
      },
      event: function (session: CommunicationSession, event: RequestEvent): Promise<EventResult> {
        throw new Error('Function not implemented.')
      },
      unsubscribeQuery: function (session: CommunicationSession, id: number): Promise<void> {
        throw new Error('Function not implemented.')
      },
      closeSession: function (sessionId: string): Promise<void> {
        throw new Error('Function not implemented.')
      },
      close: function (): Promise<void> {
        throw new Error('Function not implemented.')
      }
    }
    return await op(wsPipeline, serverApi)
  }
}
