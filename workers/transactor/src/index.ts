// Copyright © 2024 Huly Labs.

import { RpcTarget, WorkerEntrypoint } from 'cloudflare:workers'
import { Router, error, html } from 'itty-router'
import { decodeToken } from '@hcengineering/server-token'
import type { Transactor } from './transactor'
import { Class, Doc, DocumentQuery, FindOptions, Ref, Tx } from '@hcengineering/core'

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

class TransactorRpcTarget extends RpcTarget {
  constructor (
    private readonly token: string,
    private readonly workspaceId: string,
    private readonly transactor: DurableObjectStub<Transactor>
  ) {
    super()
  }

  async findAll (_class: Ref<Class<Doc>>, query?: DocumentQuery<Doc>, options?: FindOptions<Doc>): Promise<any> {
    return (this.transactor as any).findAll(this.token, this.workspaceId, _class, query, options)
  }

  async tx (tx: Tx): Promise<any> {
    return (this.transactor as any).tx(this.token, this.workspaceId, tx)
  }

  async getModel (): Promise<any> {
    return (this.transactor as any).getModel()
  }
}

export class TransactorRpc extends WorkerEntrypoint<Env> {
  async openRpc (token: string, workspaceId: string): Promise<TransactorRpcTarget> {
    const decodedToken = decodeToken(token, true, this.env.SERVER_SECRET)
    const id = this.env.TRANSACTOR.idFromName(decodedToken.workspace.name)
    const stub = this.env.TRANSACTOR.get(id)
    return new TransactorRpcTarget(token, workspaceId, stub)
  }
}
