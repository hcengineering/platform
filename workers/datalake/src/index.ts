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

import { WorkerEntrypoint } from 'cloudflare:workers'
import { type IRequestStrict, type RequestHandler, Router, error, html } from 'itty-router'

import { handleBlobDelete, handleBlobGet, handleBlobHead, handleUploadFormData } from './blob'
import { cors } from './cors'
import { handleImageGet } from './image'
import { handleVideoMetaGet } from './video'
import { handleSignAbort, handleSignComplete, handleSignCreate } from './sign'
import { type BlobRequest, type WorkspaceRequest } from './types'

const { preflight, corsify } = cors({
  maxAge: 86400
})

const router = Router<IRequestStrict, [Env, ExecutionContext], Response>({
  before: [preflight],
  finally: [corsify]
})

const withWorkspace: RequestHandler<WorkspaceRequest> = (request: WorkspaceRequest) => {
  if (request.params.workspace === undefined || request.params.workspace === '') {
    return error(400, 'Missing workspace')
  }
  request.workspace = decodeURIComponent(request.params.workspace)
}

const withBlob: RequestHandler<BlobRequest> = (request: BlobRequest) => {
  if (request.params.workspace === undefined || request.params.workspace === '') {
    return error(400, 'Missing workspace')
  }
  if (request.params.name === undefined || request.params.name === '') {
    return error(400, 'Missing blob name')
  }
  request.workspace = decodeURIComponent(request.params.workspace)
  request.name = decodeURIComponent(request.params.name)
}

router
  .get('/blob/:workspace/:name', withBlob, handleBlobGet)
  .head('/blob/:workspace/:name', withBlob, handleBlobHead)
  .delete('/blob/:workspace/:name', withBlob, handleBlobDelete)
  // Image
  .get('/image/:transform/:workspace/:name', withBlob, handleImageGet)
  // Video
  .get('/video/:workspace/:name/meta', withBlob, handleVideoMetaGet)
  // Form Data
  .post('/upload/form-data/:workspace', withWorkspace, handleUploadFormData)
  // Signed URL
  .post('/upload/signed-url/:workspace/:name', withBlob, handleSignCreate)
  .put('/upload/signed-url/:workspace/:name', withBlob, handleSignComplete)
  .delete('/upload/signed-url/:workspace/:name', withBlob, handleSignAbort)
  .all('/', () =>
    html(
      `Huly&reg; Datalake&trade; <a href="https://huly.io">https://huly.io</a>
      &copy; 2024 <a href="https://hulylabs.com">Huly Labs</a>`
    )
  )
  .all('*', () => error(404))

export default class DatalakeWorker extends WorkerEntrypoint<Env> {
  async fetch (request: Request): Promise<Response> {
    return await router.fetch(request, this.env, this.ctx).catch(error)
  }

  async getBlob (workspace: string, name: string): Promise<ArrayBuffer> {
    const request = new Request(`https://datalake/blob/${workspace}/${name}`)
    const response = await router.fetch(request)

    if (!response.ok) {
      console.error({ error: 'datalake error: ' + response.statusText, workspace, name })
      throw new Error(`Failed to fetch blob: ${response.statusText}`)
    }

    return await response.arrayBuffer()
  }

  async putBlob (workspace: string, name: string, data: ArrayBuffer | Blob | string, type: string): Promise<void> {
    const request = new Request(`https://datalake/upload/form-data/${workspace}`)

    const body = new FormData()
    const blob = new Blob([data], { type })
    body.set('file', blob, name)

    const response = await router.fetch(request, { method: 'POST', body })

    if (!response.ok) {
      console.error({ error: 'datalake error: ' + response.statusText, workspace, name })
      throw new Error(`Failed to fetch blob: ${response.statusText}`)
    }
  }
}
