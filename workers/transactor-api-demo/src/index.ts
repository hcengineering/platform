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
import { type Class, type Doc, type Ref } from '@hcengineering/core'
import {
  type TransactorService,
  createHttpClient,
  createRpcClient,
  unpackModel
} from '@hcengineering/cloud-transactor-api'

async function login (accountsUrl: string, user: string, password: string, workspace: string): Promise<string> {
  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'login',
      params: [user, password, workspace]
    })
  })

  const result: any = await response.json()
  return result.result?.token
}

async function selectWorkspace (accountsUrl: string, token: string, workspace: string): Promise<any> {
  const response = await fetch(accountsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      method: 'selectWorkspace',
      params: [workspace, 'external']
    })
  })
  const result: any = await response.json()
  return result.result
}

export default {
  async fetch (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const transactorService = env.TRANSACTOR_SERVICE as any as TransactorService

    async function getToken (params: Record<string, string>): Promise<string> {
      const email = params.email
      const password = params.password
      const workspace = params.workspace
      const token = await login(env.ACCOUNTS_URL, email, password, workspace)
      const info = await selectWorkspace(env.ACCOUNTS_URL, token, workspace)
      return info.token
    }

    const router = Router()
    router

      .get('/demo-find-raw/:email/:password/:workspace', async ({ params }) => {
        console.log('REQ', params)
        const client = await transactorService.openRpc(await getToken(params), params.workspace)
        try {
          const result = await client.findAll('contact:class:Person' as Ref<Class<Doc>>)
          return new Response(JSON.stringify(result))
        } catch (error) {
          console.error({ error })
          throw error
        } finally {
          if (Symbol.dispose in client) {
            ;(client as any)[Symbol.dispose]()
          }
        }
      })

      .get('/demo-find-rpc/:email/:password/:workspace', async ({ params }) => {
        const client = await createRpcClient(await getToken(params), params.workspace, transactorService)
        try {
          const result = await client.findAll('contact:class:Person' as Ref<Class<Doc>>)
          return new Response(JSON.stringify(result))
        } catch (error) {
          console.error({ error })
          throw error
        } finally {
          if (Symbol.dispose in client) {
            ;(client as any)[Symbol.dispose]()
          }
        }
      })

      .get('/demo-find-http/:email/:password/:workspace', async ({ params }) => {
        const client = await createHttpClient(await getToken(params), params.workspace, 'todo-worker-url')
        try {
          const result = await client.findAll('contact:class:Person' as Ref<Class<Doc>>)
          return new Response(JSON.stringify(result))
        } catch (error) {
          console.error({ error })
          throw error
        } finally {
          if (Symbol.dispose in client) {
            ;(client as any)[Symbol.dispose]()
          }
        }
      })

      .get('/demo-get-model-raw/:email/:password/:workspace', async ({ params }) => {
        const client = await transactorService.openRpc(await getToken(params), params.workspace)
        try {
          const result = await client.getModel()
          const model = await unpackModel(result)
          return new Response(JSON.stringify(model))
        } catch (error) {
          console.error({ error })
          throw error
        } finally {
          if (Symbol.dispose in client) {
            ;(client as any)[Symbol.dispose]()
          }
        }
      })

      .get('/demo-get-model-rpc/:email/:password/:workspace', async ({ params }) => {
        const client = await createRpcClient(await getToken(params), params.workspace, transactorService)
        try {
          const result = await client.getModel()
          return new Response(JSON.stringify(result))
        } catch (error) {
          console.error({ error })
          throw error
        } finally {
          if (Symbol.dispose in client) {
            ;(client as any)[Symbol.dispose]()
          }
        }
      })

      .all('*', () => error(404))
    return await router.fetch(request).catch(error)
  }
} satisfies ExportedHandler<Env>
