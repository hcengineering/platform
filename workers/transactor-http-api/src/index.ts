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

import { type Account, type Storage } from '@hcengineering/core'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { type IRequest, type IRequestStrict, type RequestHandler, Router, cors, error, html, json } from 'itty-router'

const { preflight, corsify } = cors({
  maxAge: 86400
})

const router = Router<IRequestStrict, [Env, ExecutionContext], Response>({
  before: [preflight],
  finally: [corsify]
})

type WorkspaceRequest = {
  workspaceId: string
  token: string
} & IRequestStrict

interface TransactorService {
  openRpc: (token: string, workspaceId: string) => Promise<TransactorRawApi>
}

interface TransactorRawApi extends Storage {
  getModel: () => Promise<Buffer>
  getAccount: () => Promise<Account>
}

const withWorkspace: RequestHandler<WorkspaceRequest> = (request: WorkspaceRequest) => {
  if (request.params.workspaceId === undefined || request.params.workspaceId === '') {
    return error(400, 'Missing workspace')
  }
  const token = request.headers.get('Authorization')
  if (token === null) {
    return error(401, 'Missing Authorization header')
  }
  request.workspaceId = decodeURIComponent(request.params.workspaceId)
  request.token = token.split(' ')[1]
}

async function callTransactor (
  request: WorkspaceRequest,
  env: Env,
  method: (transactorRpc: TransactorRawApi) => Promise<Response>
): Promise<Response> {
  const transactorService = env.TRANSACTOR_SERVICE as any as TransactorService
  const transactorRpc = await transactorService.openRpc(request.token, request.workspaceId)
  try {
    return await method(transactorRpc)
  } finally {
    if (Symbol.dispose in transactorRpc) {
      ;(transactorRpc as any)[Symbol.dispose]()
    }
  }
}

router.post('/find-all/:workspaceId', withWorkspace, async (request: WorkspaceRequest, env: Env) => {
  return await callTransactor(request, env, async (transactorRpc) => {
    if (request.body === null) {
      return error(400, 'Missing body')
    }
    const { _class, query, options }: any = await request.json()
    const result = await transactorRpc.findAll(_class, query, options)
    return json(result)
  })
})

router.post('/tx/:workspaceId', withWorkspace, async (request: WorkspaceRequest, env: Env) => {
  return await callTransactor(request, env, async (transactorRpc) => {
    if (request.body === null) {
      return error(400, 'Missing body')
    }
    const tx: any = await request.json()
    const result = await transactorRpc.tx(tx)
    return json(result)
  })
})

router.get('/model/:workspaceId', withWorkspace, async (request: WorkspaceRequest, env: Env) => {
  return await callTransactor(request, env, async (transactorRpc) => {
    const model = await transactorRpc.getModel()
    return new Response(model, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': model.length.toString()
      }
    })
  })
})

router.get('/account/:workspaceId', withWorkspace, async (request: WorkspaceRequest, env: Env) => {
  return await callTransactor(request, env, async (transactorRpc) => {
    const account = await transactorRpc.getAccount()
    return json(account)
  })
})

router.all('/', () =>
  html(
    `Huly&reg; Transactor API&trade; <a href="https://huly.io">https://huly.io</a>
    &copy; 2024 <a href="https://hulylabs.com">Huly Labs</a>`
  )
)

router.all('*', () => error(404))

export default class TransactorHttpApiWorker extends WorkerEntrypoint {
  async fetch (request: IRequest): Promise<Response> {
    return await router.fetch(request, this.env, this.ctx).catch(error)
  }
}
