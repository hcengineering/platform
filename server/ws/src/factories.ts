import { startHttpServer } from './server_http'
import { type ServerFactory } from './types'
/**
 * @public
 */
export const serverFactories: Record<string, ServerFactory> = {
  ws: startHttpServer
}
