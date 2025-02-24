// Copyright © 2024 Huly Labs.

import { Class, Doc, DocumentQuery, FindOptions, Ref, Tx } from '@hcengineering/core'
import { decodeToken } from '@hcengineering/server-token'
import { RpcTarget, WorkerEntrypoint } from 'cloudflare:workers'
import { Router, error, html } from 'itty-router'
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
      .get('/:token', async ({ params, headers }) => {
        if (headers.get('Upgrade') !== 'websocket') {
          return new Response('Expected header Upgrade: websocket', { status: 426 })
        }
        try {
          const { account, workspace } = decodeToken(params.token, true, env.SERVER_SECRET)
          console.log({ message: 'connecting', account, workspace })

          const id = env.TRANSACTOR.idFromName(workspace)
          const stub = env.TRANSACTOR.get(id)

          return await stub.fetch(request)
        } catch (err: any) {
          console.error({ message: 'Request failed:', err, errMessage: err.message, stack: err.stack })

          return new Response('Invalid', { status: 401 })
        }
      })

      // TODO: Add statistics using storage
      .all('/', () =>
        html(
          `Huly&reg; Transactor&trade; <a href="https://huly.io">https://huly.io</a>
          &copy; 2024 <a href="https://hulylabs.com">Huly Labs</a>`
        )
      )
      .all('*', () => error(404))

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
    return (this.transactor as any).getModel(this.token)
  }

  async getAccount (): Promise<any> {
    return (this.transactor as any).getAccount(this.token, this.workspaceId)
  }
}

export class TransactorRpc extends WorkerEntrypoint<Env> {
  async openRpc (token: string, workspaceId: string): Promise<TransactorRpcTarget> {
    const decodedToken = decodeToken(token, true, this.env.SERVER_SECRET)
    const id = this.env.TRANSACTOR.idFromName(decodedToken.workspace)
    const stub = this.env.TRANSACTOR.get(id)
    return new TransactorRpcTarget(token, workspaceId, stub)
  }
}
