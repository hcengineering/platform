import WebSocket, { WebSocketServer, type RawData } from 'ws'
import { createDbAdapter } from '@hcengineering/communication-cockroach'
import type { Response, HelloRequest } from '@hcengineering/communication-sdk-types'
import { decodeToken } from '@hcengineering/server-token'
import type { SocialID } from '@hcengineering/communication-types'

import type { ConnectionInfo } from './types.ts'
import { deserializeRequest, serializeResponse } from './utils/serialize.ts'
import config from './config'
import { listen, createServer } from './server/server'
import { ConsoleLogger } from './utils/logger'
import { Manager } from './manager.ts'
import type { Session } from './session.ts'
import { getWorkspaceInfo } from './utils/account.ts'

const logger = new ConsoleLogger()

const pingTimeout = 10000
const requestTimeout = 60 * 1000

//TODO: use platform errors
const UNAUTHORIZED_ERROR = 'Unauthorized'
const UNKNOWN_ERROR = 'Unknown'

export const main = async (): Promise<void> => {
  const server = listen(createServer(), config.Port)
  const wss = new WebSocketServer({ noServer: true })
  const db = await createDbAdapter(config.DbUrl)
  const manager = new Manager(db)

  server.on('upgrade', async (req, socket, head) => {
    const url = new URL('http://localhost' + (req.url ?? ''))
    const token = url.searchParams.get('token') ?? ''

    try {
      const info = await validateToken(token)
      wss.handleUpgrade(req, socket, head, (ws) => {
        handleConnection(ws, manager, info)
      })
    } catch (error: any) {
      logger.error('Invalid token', { error })
      wss.handleUpgrade(req, socket, head, (ws) => {
        const resp: Response = {
          result: UNAUTHORIZED_ERROR,
          error
        }
        sendResponse(ws, resp, false)
        socket.destroy()
      })
    }
  })

  const shutdown = (): void => {
    db.close()
    server.close(() => {
      process.exit()
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (e) => {
    console.error(e)
  })
  process.on('unhandledRejection', (e) => {
    console.error(e)
  })
}

function handleConnection(ws: WebSocket, manager: Manager, info: ConnectionInfo) {
  const session = manager.createSession(ws, info)
  const pingInterval = setInterval(() => {
    const now = Date.now()
    const lastRequestDiff = now - session.lastRequest

    if (lastRequestDiff > requestTimeout) {
      console.warn(`Connection inactive for ${lastRequestDiff}ms, closing`, info)
      manager.closeSession(ws, info.workspace)
      ws.close()
      clearInterval(pingInterval)
      return
    }
    sendResponse(ws, { id: 'ping', result: 'ping' }, session.binary)
  }, pingTimeout)

  ws.on('message', async (raw: RawData) => {
    try {
      await handleRequest(raw, session, ws)
    } catch (err: any) {
      logger.error('Error during message handling', { err })
    }
  })

  ws.on('close', () => {
    manager.closeSession(ws, info.workspace)
    clearInterval(pingInterval)
  })

  ws.on('error', (error) => {
    logger.log('Error', { error, ...info })
  })
}

function sendResponse(ws: WebSocket, resp: Response, binary: boolean) {
  ws.send(serializeResponse(resp, binary), { binary })
}

async function handleRequest(raw: RawData, session: Session, ws: WebSocket) {
  const request = deserializeRequest(raw, session.binary)
  if (request === undefined) return

  if (request.id === 'hello') {
    const hello = request as HelloRequest
    session.binary = hello.binary ?? false
    sendResponse(ws, { id: 'hello', result: 'hello' }, false)
    return
  }

  try {
    const fn = (session as any)[request.method]
    const params = [...request.params]
    const result = await fn.apply(session, params)
    const response: Response = { id: request.id, result }
    sendResponse(ws, response, session.binary)
  } catch (err: any) {
    const response: Response = { id: request.id, result: UNKNOWN_ERROR, error: err }
    sendResponse(ws, response, session.binary)
  }
}

//TODO: decodeToken or authorize with account service or both
async function validateToken(token: string): Promise<ConnectionInfo> {
  const { email } = decodeToken(token, true, config.Secret)
  const info = await getWorkspaceInfo(token)

  if (info === undefined) {
    throw new Error('No workspace info')
  }

  const personWorkspace = 'cd0aba36-1c4f-4170-95f2-27a12a5415f7'
  return { workspace: info.workspaceId, personWorkspace, socialId: email as SocialID }
}
