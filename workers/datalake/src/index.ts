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

import { type IRequest, Router, error, html } from 'itty-router'
import { deleteBlob, getBlob, headBlob, postBlobFormData } from './blob'
import { cors } from './cors'
import { getImage } from './image'
import { getVideoMeta } from './video'
import { handleSignAbort, handleSignComplete, handleSignCreate } from './sign'

const { preflight, corsify } = cors({
  maxAge: 86400
})

export default {
  async fetch (request, env, ctx): Promise<Response> {
    const router = Router<IRequest>({
      before: [preflight],
      finally: [corsify]
    })

    router
      .get('/blob/:workspace/:name', ({ params }) => getBlob(request, env, ctx, params.workspace, params.name))
      .head('/blob/:workspace/:name', ({ params }) => headBlob(request, env, ctx, params.workspace, params.name))
      .delete('/blob/:workspace/:name', ({ params }) => deleteBlob(env, params.workspace, params.name))
      // Image
      .get('/image/:transform/:workspace/:name', ({ params }) =>
        getImage(request, params.workspace, params.name, params.transform)
      )
      // Video
      .get('/video/:workspace/:name/meta', ({ params }) =>
        getVideoMeta(request, env, ctx, params.workspace, params.name)
      )
      // Upload
      .post('/upload/form-data/:workspace', ({ params }) => postBlobFormData(request, env, params.workspace))
      // Signed URL
      .post('/upload/signed-url/:workspace/:name', ({ params }) =>
        handleSignCreate(request, env, ctx, params.workspace, params.name)
      )
      .put('/upload/signed-url/:workspace/:name', ({ params }) =>
        handleSignComplete(request, env, ctx, params.workspace, params.name)
      )
      .delete('/upload/signed-url/:workspace/:name', ({ params }) =>
        handleSignAbort(request, env, ctx, params.workspace, params.name)
      )
      .all('/', () =>
        html(
          `Huly&reg; Datalake&trade; <a href="https://huly.io">https://huly.io</a>
          &copy; 2024 <a href="https://hulylabs.com">Huly Labs</a>`
        )
      )
      .all('*', () => error(404))

    return await router.fetch(request).catch(error)
  }
} satisfies ExportedHandler<Env>
