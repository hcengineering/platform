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
import { Router, error, cors } from 'itty-router'
import { WorkerEntrypoint } from 'cloudflare:workers'
import type { Branding, BrandingMap } from '@hcengineering/core'

import type { Env } from './env'

const { preflight, corsify } = cors({
  maxAge: 86400
})

const router = Router<Request>({
  before: [preflight],
  catch: error,
  finally: [(r: any) => r ?? error(404), corsify]
})

async function getBrandings (env: Env): Promise<BrandingMap> {
  // Note: up to 100 keys can be listed at once. If more, use cursor.
  const keys = (await env.KV.list()).keys
  const values = await Promise.all(keys.map(async (key) => await env.KV.get(key.name)))

  return keys.reduce<BrandingMap>((acc, key, idx) => {
    if (values[idx] === null) return acc

    acc[key.name] = JSON.parse(values[idx])
    return acc
  }, {})
}

router.get('/brandings', async (req, ctx: { env: Env, exCtx: ExecutionContext }) => {
  return new Response(JSON.stringify(await getBrandings(ctx.env)), { status: 200 })
})

// TODO later
// router.get('/branding/{host}')
// router.post('/branding/{host}') [with auth]
// router.put('/branding/{host}') [with auth]

export default class BrandingWorker extends WorkerEntrypoint<Env> {
  async fetch (request: Request): Promise<Response> {
    return await router.fetch(request, { env: this.env })
  }

  async getBranding (host: string): Promise<Branding | null> {
    const value = await this.env.KV.get(host)

    if (value == null) {
      return null
    }

    return JSON.parse(value)
  }

  async getBrandings (): Promise<BrandingMap> {
    return await getBrandings(this.env)
  }
}
