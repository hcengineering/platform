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

import { type IRequestStrict, type RequestHandler, Router, cors, error, html } from 'itty-router'
import { type Env } from './env'
import { type DocumentRequest } from './types'

export { Collaborator } from './collaborator'

const { preflight, corsify } = cors({ maxAge: 86400 })

const withDocumentId: RequestHandler<DocumentRequest> = (request) => {
  if (request.params.id === undefined || request.params.id === '') {
    return error(400, 'Missing document id')
  }
  request.documentId = decodeURIComponent(request.params.id)
}

const router = Router<IRequestStrict, [Env]>()
  .options('*', preflight)
  .get('/:id', withDocumentId, (request, env) => {
    const { documentId, headers } = request
    if (headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected header Upgrade: websocket', { status: 426 })
    }

    const id = env.COLLABORATOR.idFromName(documentId)
    const stub = env.COLLABORATOR.get(id)

    return stub.fetch(request)
  })
  .post('/rpc/:id', withDocumentId, async (request, env) => {
    const { documentId } = request

    const id = env.COLLABORATOR.idFromName(documentId)
    const stub = env.COLLABORATOR.get(id)

    return stub.fetch(request)
  })
  .all('/', () =>
    html(
      `Huly&reg; Collaborator&trade; <a href="https://huly.io">https://huly.io</a>
      &copy; 2024 <a href="https://hulylabs.com">Huly Labs</a>`
    )
  )
  .all('*', () => new Response('Not found', { status: 404 }))

export default {
  async fetch (request: Request, env: Env): Promise<Response> {
    return await router
      .fetch(request, env)
      .catch(error)
      .then((response) => {
        // workaround for "Can't modify immutable headers" error
        // see https://github.com/kwhitley/itty-router/issues/242
        return corsify(new Response(response.body, response))
      })
  }
} satisfies ExportedHandler<Env>
