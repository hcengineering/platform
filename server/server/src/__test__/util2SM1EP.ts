/* eslint-disable @typescript-eslint/unbound-method */
import type { ServerApi } from '@hcengineering/communication-sdk-types'
import {
  Hierarchy,
  type MeasureMetricsContext,
  ModelDb,
  systemAccount,
  systemAccountUuid,
  type AccountUuid,
  type Branding,
  type MeasureContext,
  type WorkspaceIds,
  type WorkspaceUuid
} from '@hcengineering/core'
import {
  createPipeline,
  type BroadcastFunc,
  type CommunicationApiFactory,
  type EndpointConnectionFactory,
  type PipelineFactory
} from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'
import type { ClientSession } from '../client'
import { createSessionManager, type TSessionManager } from '../sessionManager'
import { hookSessionManagerAccount } from './account'
import { createCollectQueue } from './collectQueue'
import { CollectConnectionSocket, SMClientConnection } from './connection'
import { CollectMiddleware } from './test-middleware'
export async function prepapre2SM1EP (
  ctx: MeasureMetricsContext
): Promise<{
    newSession: (user: AccountUuid, target?: WorkspaceUuid) => Promise<ClientSession>
    endpointMgr: TSessionManager
    endpoint2Mgr: TSessionManager
  }> {
  const queue = createCollectQueue()
  const hierarchy = new Hierarchy()
  const modelDb = new ModelDb(hierarchy)

  const pipelineFactory: PipelineFactory = async (
    ctx: MeasureContext,
    ws: WorkspaceIds,
    broadcast: BroadcastFunc,
    branding: Branding | null,
    communicationApi: ServerApi | null
  ) => {
    return await createPipeline(ctx, [CollectMiddleware.create()], {
      hierarchy,
      modelDb,
      queue,
      workspace: ws,
      branding,
      contextVars: {},
      communicationApi
    })
  }

  const communicationApiFactory: CommunicationApiFactory = async (ctx, ws, br) => {
    return jest.mocked({ ctx, ws, br } as any)
  }

  const endpoint2Mgr: TSessionManager = createSessionManager(
    ctx,
    'region',
    'endpoint2',
    {},
    {
      pingTimeout: 10000,
      reconnectTimeout: 30 // seconds to reconnect
    },
    {
      start: () => {},
      stop: async () => ''
    },
    'account',
    false,
    queue,
    pipelineFactory,
    () => {
      throw new Error('Endpoint not found')
    },
    communicationApiFactory,
    false
  ) as TSessionManager

  hookSessionManagerAccount(endpoint2Mgr)
  const sysSocket = new CollectConnectionSocket()
  const sysSession = await endpoint2Mgr.addSession(
    ctx,
    sysSocket,
    {
      account: systemAccountUuid,
      workspace: '' as WorkspaceUuid
    },
    generateToken(systemAccountUuid),
    'root-s1'
  )

  const endpointFactory: EndpointConnectionFactory = (ctx, ws, handler, opt) => {
    if (ws === 'endpoint2') {
      return new SMClientConnection(ctx, ws, systemAccount, endpoint2Mgr, sysSession as ClientSession, handler, opt)
    }
    throw new Error('Endpoint not found')
  }

  const endpointMgr: TSessionManager = createSessionManager(
    ctx,
    'region',
    'endpoint',
    {},
    {
      pingTimeout: 10000,
      reconnectTimeout: 30 // seconds to reconnect
    },
    {
      start: () => {},
      stop: async () => ''
    },
    'account',
    false,
    queue,
    pipelineFactory,
    endpointFactory,
    communicationApiFactory,
    false
  ) as TSessionManager

  hookSessionManagerAccount(endpointMgr)

  const newSession = async (user: AccountUuid, target?: WorkspaceUuid): Promise<ClientSession> => {
    const socket = new CollectConnectionSocket()
    return (await endpointMgr.addSession(
      ctx,
      socket,
      {
        account: 'user1' as AccountUuid,
        workspace: '' as WorkspaceUuid
      },
      generateToken('user1' as AccountUuid),
      's1'
    )) as ClientSession
  }
  return { endpointMgr, endpoint2Mgr, newSession }
}
