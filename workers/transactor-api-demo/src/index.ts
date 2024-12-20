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

import { Router, error, json } from 'itty-router'
import {
  type ConnectOptions,
  type TransactorService,
  type TransactorRawApi,
  createHttpClient,
  createRpcClient,
  getWorkspaceLogin,
  unpackModel
} from '@hcengineering/cloud-transactor-api'
import contact, { AvatarType, type Person } from '@hcengineering/contact'
import core, { buildSocialIdString, type Client, generateId, type Ref, SocialIdType, type TxCreateDoc, TxOperations } from '@hcengineering/core'

async function callClient<T> (client: T, method: () => Promise<any>): Promise<Response> {
  try {
    return json(await method())
  } catch (error) {
    console.error({ error })
    throw error
  } finally {
    if (Symbol.dispose in (client as any)) {
      ;(client as any)[Symbol.dispose]()
    }
  }
}

export default {
  async fetch (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const transactorService = env.TRANSACTOR_SERVICE as any as TransactorService

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

    async function rawClient (params: Record<string, any>): Promise<TransactorRawApi> {
      const email = params.email
      const password = params.password
      const workspace = params.workspace
      const info = await getWorkspaceLogin('', { email, password, workspace }, { ACCOUNTS_URL: env.ACCOUNTS_URL })
      return await transactorService.openRpc(info.token, params.workspace)
    }

    async function rpcClient (params: Record<string, any>): Promise<Client> {
      return await createRpcClient(transactorService, getConnectOpts(params))
    }

    async function httpClient (params: Record<string, any>): Promise<Client> {
      return await createHttpClient(env.HTTP_API_URL, getConnectOpts(params))
    }

    const router = Router()
    router
      .get('/demo-find-raw/:email/:password/:workspace', async ({ params }) => {
        const client = await rawClient(params)
        return await callClient(client, async () => {
          return await client.findAll(contact.class.Person, {})
        })
      })
      .get('/demo-find-rpc/:email/:password/:workspace', async ({ params }) => {
        const client = await rpcClient(params)
        return await callClient(client, async () => {
          return await client.findAll(contact.class.Person, {})
        })
      })
      .get('/demo-find-http/:email/:password/:workspace', async ({ params }) => {
        const client = await httpClient(params)
        return await callClient(client, async () => {
          return await client.findAll(contact.class.Person, {})
        })
      })
      .get('/demo-get-model-raw/:email/:password/:workspace', async ({ params }) => {
        const client = await rawClient(params)
        return await callClient(client, async () => {
          return await unpackModel(await client.getModel())
        })
      })
      .get('/demo-get-model-rpc/:email/:password/:workspace', async ({ params }) => {
        const client = await rpcClient({ ...params, loadModel: true })
        return await callClient(client, async () => {
          return client.getModel()
        })
      })
      .get('/demo-get-model-http/:email/:password/:workspace', async ({ params }) => {
        const client = await httpClient({ ...params, loadModel: true })
        return await callClient(client, async () => {
          return client.getModel()
        })
      })
      .get('/demo-tx-raw/:email/:password/:workspace', async ({ params }) => {
        const client = await rawClient(params)
        const socialString = buildSocialIdString({ type: SocialIdType.EMAIL, value: params.email })
        return await callClient(client, async () => {
          const id = generateId()
          const tx: TxCreateDoc<Person> = {
            _id: id as Ref<TxCreateDoc<Person>>,
            _class: core.class.TxCreateDoc,
            space: core.space.Tx,
            objectId: id as Ref<Person>,
            objectClass: contact.class.Person,
            objectSpace: contact.space.Contacts,
            modifiedOn: Date.now(),
            modifiedBy: socialString,
            createdBy: socialString,
            attributes: {
              name: 'Person ' + id,
              city: 'Unknown',
              avatarType: AvatarType.COLOR
            }
          }
          return await client.tx(tx)
        })
      })
      .get('/demo-tx-rpc/:email/:password/:workspace', async ({ params }) => {
        const client = await rpcClient({ ...params, loadModel: true })
        return await callClient(client, async () => {
          const socialString = buildSocialIdString({ type: SocialIdType.EMAIL, value: params.email })
          const txops = new TxOperations(client, socialString)
          return await txops.createDoc(contact.class.Person, contact.space.Contacts, {
            name: 'Person ' + generateId(),
            city: 'Unknown',
            avatarType: AvatarType.COLOR
          })
        })
      })
      .get('/demo-tx-http/:email/:password/:workspace', async ({ params }) => {
        const client = await httpClient({ ...params, loadModel: true })
        return await callClient(client, async () => {
          const socialString = buildSocialIdString({ type: SocialIdType.EMAIL, value: params.email })
          const txops = new TxOperations(client, socialString)
          return await txops.createDoc(contact.class.Person, contact.space.Contacts, {
            name: 'Person ' + generateId(),
            city: 'Unknown',
            avatarType: AvatarType.COLOR
          })
        })
      })
      .all('*', () => error(404))
    return await router.fetch(request).catch(error)
  }
} satisfies ExportedHandler<Env>
