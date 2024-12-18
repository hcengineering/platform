//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Router, error } from 'itty-router'
import type { Class, Doc, Ref } from '@hcengineering/core'
import { type TransactorApi, type TransactorService, TransactorHttpClient, TransactorRpcClient } from '@hcengineering/cloud-transactor-api'

//const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb25maXJtZWQiOnRydWUsImVtYWlsIjoibm9uZUBub25lLnJ1Iiwid29ya3NwYWNlIjoidy1ub25lLXdzMS02NzViMjcyOC0zY2UzMmM0MWE4LWU1NzZkOSJ9.iafNSNaH5XC1jRUcOZT6fkRY8wrdgjwbmUNPZKKXBhg'
const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb25maXJtZWQiOnRydWUsImVtYWlsIjoibm9uZUBub25lLm5vIiwid29ya3NwYWNlIjoidy1ub25lLXdzMi02NzYxOTIzNS03NDgyMzQ5NDc3LTY1MGRmMCJ9.n16Y8EizmBk9MvvouIb5dOtQCqQfuswpJfuDIEJhwLs'
const workspaceId = 'demo'

async function demoFindAll (client: TransactorApi): Promise<Response> {
  try {
    const result = await client.findAll('contact:class:Person' as Ref<Class<Doc>>)
    return new Response(JSON.stringify(result))
  } catch (error) {
    console.error({ error })
    throw error
  } finally {
    if (Symbol.dispose in client) {
      (client as any)[Symbol.dispose]()
    }
  }
}

export default {
  async fetch (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const transactorService = env.TRANSACTOR_SERVICE as any as TransactorService
    const router = Router()
    router

      .get('/demo-find-raw', async () => {
        const client = await transactorService.openRpc(token, workspaceId)
        return await demoFindAll(client)
      })

      .get('/demo-find-rpc', async () => {
        const client = new TransactorRpcClient(token, workspaceId, transactorService)
        return await demoFindAll(client)
      })

      .get('/demo-find-http', async () => {
        const client = new TransactorHttpClient(token, workspaceId, 'todo')
        return await demoFindAll(client)
      })

      .all('*', () => error(404))
    return await router.fetch(request).catch(error)
  }
} satisfies ExportedHandler<Env>
