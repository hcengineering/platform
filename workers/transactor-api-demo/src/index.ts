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
import {
  type ConnectOptions,
  type TransactorService,
  createHttpClient,
  createRpcClient,
  getWorkspaceLogin,
  unpackModel
} from '@hcengineering/cloud-transactor-api'
import contact, { AvatarType, type Person } from '@hcengineering/contact'
import core, { generateId, type Ref, type TxCreateDoc, TxOperations } from '@hcengineering/core'

const httpWorkerUrl = 'to-do'

export default {
  async fetch (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const transactorService = env.TRANSACTOR_SERVICE as any as TransactorService

    async function getToken (params: Record<string, string>): Promise<string> {
      const email = params.email
      const password = params.password
      const workspace = params.workspace
      const info = await getWorkspaceLogin('', { email, password, workspace }, { ACCOUNTS_URL: env.ACCOUNTS_URL })
      return info.token
    }

    function getConnectOpts (params: Record<string, any>): ConnectOptions {
      return {
        authOptions: {
          email: params.email,
          password: params.password,
          workspace: params.workspace
        },
        serverConfig: {
          ACCOUNTS_URL: env.ACCOUNTS_URL
        },
        workspaceId: params.workspace,
        loadModel: params.loadModel === true
      }
    }

    const router = Router()
    router

      .get('/demo-find-raw/:email/:password/:workspace', async ({ params }) => {
        console.log('REQ', params)
        const client = await transactorService.openRpc(await getToken(params), params.workspace)
        try {
          const result = await client.findAll(contact.class.Person, {})
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
        const client = await createRpcClient('', getConnectOpts(params), transactorService)
        try {
          const result = await client.findAll(contact.class.Person, {})
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
        const client = await createHttpClient('', getConnectOpts(params), 'todo-worker-url')
        try {
          const result = await client.findAll(contact.class.Person, {})
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
        const client = await createRpcClient('', getConnectOpts({ ...params, loadModel: true }), transactorService)
        try {
          const result = client.getModel()
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

      .get('/demo-get-model-http/:email/:password/:workspace', async ({ params }) => {
        const client = await createHttpClient('', getConnectOpts({ ...params, loadModel: true }), httpWorkerUrl)
        try {
          const result = client.getModel()
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

      .get('/demo-tx-raw/:email/:password/:workspace', async ({ params }) => {
        const client = await transactorService.openRpc(await getToken(params), params.workspace)
        try {
          const account = await client.getAccount()
          const id = generateId()
          console.log('NEW_ID', id)
          const tx: TxCreateDoc<Person> = {
            _id: id as Ref<TxCreateDoc<Person>>,
            _class: core.class.TxCreateDoc,
            space: core.space.Tx,
            objectId: id as Ref<Person>,
            objectClass: contact.class.Person,
            objectSpace: account.space,
            modifiedOn: Date.now(),
            modifiedBy: account._id,
            createdBy: account._id,
            attributes: {
              name: 'Person ' + id,
              city: 'Unknown',
              avatarType: AvatarType.COLOR
            }
          }
          const result = await client.tx(tx)
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

      .get('/demo-tx-rpc/:email/:password/:workspace', async ({ params }) => {
        const client = await createRpcClient('', getConnectOpts({ ...params, loadModel: true }), transactorService)
        try {
          const account = await client.getAccount()
          const txops = new TxOperations(client, account._id)
          const result = await txops.createDoc(contact.class.Person, account.space, {
            name: 'Person ' + generateId(),
            city: 'Unknown',
            avatarType: AvatarType.COLOR
          })
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

      .get('/demo-tx-http/:email/:password/:workspace', async ({ params }) => {
        const client = await createHttpClient('', getConnectOpts({ ...params, loadModel: true }), httpWorkerUrl)
        try {
          const account = await client.getAccount()
          const txops = new TxOperations(client, account._id)
          const result = await txops.createDoc(contact.class.Person, account.space, {
            name: 'Person ' + generateId(),
            city: 'Unknown',
            avatarType: AvatarType.COLOR
          })
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
