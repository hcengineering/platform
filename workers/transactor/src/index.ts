// Copyright © 2024 Huly Labs.

import { Router, error, html } from 'itty-router'

import { decodeToken } from '@hcengineering/server-token'
import type { Transactor } from './transactor'

export { Transactor } from './transactor'

export interface Env {
  TRANSACTOR: DurableObjectNamespace<Transactor>

  HYPERDRIVE: Hyperdrive

  SERVER_SECRET: string
  ACCOUNTS_URL: string
}

export default {
  async fetch (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const router = Router()

    router
      .get('/:token', ({ params, headers }) => {
        if (headers.get('Upgrade') !== 'websocket') {
          return new Response('Expected header Upgrade: websocket', { status: 426 })
        }
        try {
          const decodedToken = decodeToken(params.token, true, env.SERVER_SECRET)
          console.log('connecting', decodedToken.email)

          const id = env.TRANSACTOR.idFromName(decodedToken.workspace.name)
          const stub = env.TRANSACTOR.get(id)

          return stub.fetch(request)
        } catch (err: any) {
          return new Response('Expected header Upgrade: websocket', { status: 426 })
        }
      })
      // TODO: Add statistics using storage
      .all('/', () =>
        html(
          `Huly&reg; Transactor&trade; <a href="https://huly.io">https://huly.io</a>
          &copy; 2024 <a href="https://hulylabs.com">Huly Labs</a>`
        )
      )

    return await router.fetch(request).catch(error)
  }
} satisfies ExportedHandler<Env>
