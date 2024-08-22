import { startHttpServer } from './server_http'
import { type ServerFactory } from './types'
/**
 * @public
 */
export const serverFactories: Record<string, ServerFactory> = {
  ws: startHttpServer,
  uweb: (sessions, handleRequest, ctx, pipelineFactory, port, enableCompression, accountsUrl, externalStorage) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serverHttp = require('./server_u')
      return serverHttp.startUWebsocketServer(
        sessions,
        handleRequest,
        ctx,
        pipelineFactory,
        port,
        enableCompression,
        accountsUrl,
        externalStorage
      )
    } catch (err: any) {
      console.error('uwebsocket.js is not supported, switcg back to nodejs ws', err)
      return startHttpServer(
        sessions,
        handleRequest,
        ctx,
        pipelineFactory,
        port,
        enableCompression,
        accountsUrl,
        externalStorage
      )
    }
  }
}
