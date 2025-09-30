import {
  systemAccountUuid,
  type Account,
  type AccountUuid,
  type BrandingMap,
  type MeasureContext,
  type SocialStringsToUsers,
  type Tx,
  type WorkspaceIds
} from '@hcengineering/core'
import { createAgent } from '@hcengineering/network-client'
import {
  containerOnAgentEndpointRef,
  type ClientUuid,
  type Container,
  type ContainerKind,
  type NetworkClient
} from '@hcengineering/network-core'
import {
  ClientSession,
  type BackupClientOps,
  type Session,
  type WorkspaceService,
  type WorkspaceServiceFactory
} from '@hcengineering/server-core'
import type { Token } from '@hcengineering/server-token'
import { transactorKind } from './types'

export class WorkspaceContainer implements Container {
  clients = new Map<
  ClientUuid,
  {
    broadcast: (data: any) => Promise<void>
    sessions: Set<string>
  }
  >()

  accounts = new Map<AccountUuid, { account: Account, sessions: Set<string> }>()
  socialStringsToUsers: SocialStringsToUsers = new Map()
  sessions = new Map<string, Session>()

  ops: BackupClientOps | undefined

  constructor (
    readonly ctx: MeasureContext,
    readonly ids: WorkspaceIds,
    readonly workspaceService: WorkspaceService
  ) {}

  async request (operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    console.log('WorkspaceContainer request', { operation, data, clientId })
    switch (operation) {
      case 'registerSession': {
        const token: Token = data.token
        const sessionId = data.sessionId as string
        const account = data.account as Account
        if (account === undefined) {
          throw new Error('Account is required')
        }
        const sessions = this.accounts.get(account.uuid)?.sessions ?? new Set()
        sessions.add(sessionId)
        this.accounts.set(account.uuid, { account, sessions })
        this.sessions.set(
          sessionId,
          new ClientSession(token, sessionId, this.ids, account, token.extra?.admin === 'true')
        )

        if (account.uuid !== systemAccountUuid) {
          // Just fill social ids, do not clean
          const userSocialIds = account.fullSocialIds
          for (const id of userSocialIds) {
            this.socialStringsToUsers.set(id._id, {
              accountUuid: account.uuid,
              role: account.role
            })
          }
        }
        break
      }
      case 'closeSession': {
        const sessionId = data.sessionId as string
        const session = this.sessions.get(sessionId)
        if (session !== undefined) {
          this.sessions.delete(sessionId)

          const account = this.accounts.get(session.getRawAccount().uuid)
          if (account !== undefined) {
            if (account.sessions.delete(sessionId) && account.sessions.size === 0) {
              this.accounts.delete(account.account.uuid)
            }
          }

          if (clientId !== undefined) {
            this.clients?.get(clientId)?.sessions?.delete(sessionId)
          }
        }
        break
      }
      case 'loadModel': {
        return await this.exec(operation, data, async (ctx, session) => {
          const [lastModelTx, hash, filter] = data.params
          // We need to be carefully in null's
          return await this.workspaceService.loadModel(
            ctx,
            session,
            lastModelTx,
            hash ?? undefined,
            filter ?? undefined
          )
        })
      }
      case 'findAll': {
        return await this.exec(operation, data, async (ctx, session) => {
          const [_class, query, options] = data.params
          return await this.workspaceService.findAll(ctx, session, _class, query, options ?? undefined)
        })
      }
      case 'searchFulltext': {
        return await this.exec(operation, data, async (ctx, session) => {
          const [query, options] = data.params
          return await this.workspaceService.searchFulltext(ctx, session, query, options)
        })
      }
      case 'tx': {
        return await this.exec(operation, data, async (ctx, session) => {
          const [tx] = data.params
          return await this.workspaceService.tx(ctx, session, tx)
        })
      }
      case 'domainRequest': {
        return await this.exec(operation, data, async (ctx, session) => {
          const [domain, params] = data.params
          return await this.workspaceService.domainRequest(ctx, session, domain, params)
        })
      }
      case 'getLastTxHash': {
        return await this.workspaceService.getLastTxHash(this.ctx)
      }
      case 'loadChunk': {
        return await this.exec(operation, data, async (ctx, session) => {
          const [domain, idx] = data.params
          return await this.workspaceService.loadChunk(ctx, session, domain, idx ?? undefined)
        })
      }
      case 'getDomainHash': {
        return await this.workspaceService.getDomainHash(this.ctx, data.domain)
      }
      case 'closeChunk': {
        await this.exec(operation, data, async (ctx, session) => {
          const [idx] = data.params
          await this.workspaceService.closeChunk(ctx, session, idx)
        })
        return
      }
      case 'loadDocs': {
        return await this.exec(operation, data, async (ctx, session) => {
          const [domain, docs] = data.params
          return await this.workspaceService.loadDocs(ctx, session, domain, docs)
        })
      }
      case 'upload': {
        await this.exec(operation, data, async (ctx, session) => {
          const [domain, docs] = data.params
          await this.workspaceService.upload(ctx, session, domain, docs)
        })
        return
      }
      case 'clean': {
        return await this.exec(operation, data, async (ctx, session) => {
          const [domain, docs] = data.params
          await this.workspaceService.clean(ctx, session, domain, docs)
        })
      }
      default: {
        throw new Error(`Unknown operation: ${operation}`)
      }
    }
  }

  exec (operation: string, data: any, op: (ctx: MeasureContext, session: Session) => Promise<any>): Promise<any> {
    const sessionId = data.sessionId as string
    const session = this.sessions.get(sessionId)
    if (session === undefined) {
      throw new Error('Session is required')
    }
    return this.ctx.with(operation, {}, (ctx) => op(ctx, session))
  }

  // Called when the container is terminated
  onTerminated?: () => void

  async terminate (): Promise<void> {
    await this.workspaceService.close(this.ctx)
  }

  async ping (): Promise<void> {}

  connect (clientId: ClientUuid, broadcast: (data: any) => Promise<void>): void {
    console.log('Client connected', { clientId })
    this.clients.set(clientId, { broadcast, sessions: this.clients.get(clientId)?.sessions ?? new Set<string>() })
  }

  disconnect (clientId: ClientUuid): void {
    console.log('Client disconnected', { clientId })
    const sessions = this.clients.get(clientId)?.sessions
    this.clients.delete(clientId)
    for (const sessionId of sessions ?? []) {
      this.sessions.delete(sessionId)
    }
  }

  broadcast (ctx: MeasureContext, tx: Tx[], targets?: AccountUuid | AccountUuid[], exclude?: AccountUuid[]): void {
    for (const { broadcast } of this.clients.values()) {
      void broadcast(['broadcast', tx, targets, exclude])
    }
  }

  broadcastSessions (measure: MeasureContext, sessions: Record<string, Tx[]>): void {
    for (const { broadcast } of this.clients.values()) {
      void broadcast(['broadcast-sessions', sessions])
    }
  }
}

export async function startNetworkTransactor (
  ctx: MeasureContext,
  client: NetworkClient,
  metrics: MeasureContext,
  agentHost: string,
  region: string,
  opt: {
    workspaceFactory: WorkspaceServiceFactory
    brandingMap: BrandingMap
  }
): Promise<() => Promise<void>> {
  // Let's use host name as agentId
  //
  ctx.info('Starting Net transactor on', { agentHost, region })
  const { agent, server } = await createAgent(agentHost, {
    [(transactorKind + region) as ContainerKind]: async (request) => {
      ctx.info('Requested workspace', { request })
      if (request.uuid === undefined) {
        throw new Error('Workspace uuid is required')
      }

      const ids: WorkspaceIds = request.extra?.ids
      if (ids === undefined) {
        throw new Error('Workspace ids are required')
      }
      if (agent.endpoint === undefined) {
        throw new Error('Agent endpoint not set')
      }
      const brandingRef: string = request.extra?.branding ?? null

      const branding = opt.brandingMap[brandingRef] ?? null

      // eslint-disable-next-line prefer-const
      let container: WorkspaceContainer | undefined

      const wsService = await opt.workspaceFactory(
        metrics,
        ids,
        {
          broadcast: (ctx, tx, targets, exclude) => {
            container?.broadcast(ctx, tx, targets, exclude)
          },
          broadcastSessions: (measure, sessionIds) => {
            container?.broadcastSessions(measure, sessionIds)
          }
        },
        branding
      )

      container = new WorkspaceContainer(metrics, ids, wsService)
      const result = {
        uuid: request.uuid,
        container,
        endpoint: containerOnAgentEndpointRef(agent.endpoint, request.uuid)
      }
      console.log('Workspace started', { ids })
      return result
    }
  })

  void client.register(agent).catch((err) => {
    console.error('Network registration error', err)
    process.exit(1)
  })
  return async () => {
    await server.close()
    await client.close()
  }
}
