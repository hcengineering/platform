import { MeasureContext } from '@hcengineering/core'
import { Response, serialize, UNAUTHORIZED } from '@hcengineering/platform'
import { decodeToken, Token } from '@hcengineering/server-token'
import { createServer, IncomingMessage } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import { setupWSConnection } from './yserver'

import { MinioService } from '@hcengineering/minio'
/**
 * @public
 * @param sessionFactory -
 * @param port -
 * @param host -
 */
export function start (ctx: MeasureContext, port: number, minio: MinioService, host?: string): () => void {
  console.log(`starting server on port ${port} ...`)

  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Below options specified as default values.
      concurrencyLimit: 10, // Limits zlib concurrency for perf.
      threshold: 1024 // Size (in bytes) below which messages
      // should not be compressed if context takeover is disabled.
    }
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  wss.on(
    'connection',
    (ws: WebSocket, request: IncomingMessage, token: Token, documentId: string, initialContentId: string) => {
      setupWSConnection(ws, request, documentId, token, minio, initialContentId)
    }
  )

  const server = createServer()

  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    try {
      const parsedUrl = new URL('http://host' + (request.url ?? ''))
      const token = parsedUrl.searchParams.get('token')
      const payload = decodeToken(token ?? '')

      const documentId = parsedUrl.searchParams.get('documentId') as string
      console.log('client connected with payload', payload, documentId)
      const initialContentId = parsedUrl.searchParams.get('initialContentId') as string
      wss.handleUpgrade(request, socket, head, (ws) =>
        wss.emit('connection', ws, request, payload, documentId, initialContentId)
      )
    } catch (err) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        const resp: Response<any> = {
          id: -1,
          error: UNAUTHORIZED,
          result: 'hello'
        }
        ws.send(serialize(resp))
        ws.onmessage = (msg) => {
          const resp: Response<any> = {
            error: UNAUTHORIZED
          }
          ws.send(serialize(resp))
        }
      })
    }
  })

  server.listen(port, host)
  return () => {
    server.close()
  }
}
