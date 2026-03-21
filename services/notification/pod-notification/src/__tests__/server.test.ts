//
// Copyright © 2026 Hardcore Engineering Inc.
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

import http from 'http'
import { createServer } from '../server'
import { ApiError } from '../error'
import type { Endpoint } from '../types'

function httpRequest (
  url: string,
  options: { method?: string, body?: string } = {}
): Promise<{ status: number, json: () => Promise<unknown> }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: options.method ?? 'GET',
        headers:
          options.body !== undefined
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(options.body) }
            : undefined
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => {
          chunks.push(c)
        })
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          resolve({
            status: res.statusCode ?? 0,
            json: async () => JSON.parse(text) as unknown
          })
        })
      }
    )
    req.on('error', reject)
    if (options.body !== undefined) {
      req.write(options.body)
    }
    req.end()
  })
}

function withServer (endpoints: Endpoint[], fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const app = createServer(endpoints)
  return new Promise((resolve, reject) => {
    const srv = app.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      const port = typeof addr === 'object' && addr !== null ? addr.port : 0
      const baseUrl = `http://127.0.0.1:${port}`
      void fn(baseUrl)
        .then(() => {
          srv.close((err) => { err != null ? reject(err) : resolve() })
        })
        .catch((e) => {
          srv.close(() => {
            reject(e)
          })
        })
    })
    srv.on('error', reject)
  })
}

describe('createServer', () => {
  it('returns 404 for unknown routes', async () => {
    await withServer([], async (baseUrl) => {
      const res = await httpRequest(`${baseUrl}/missing`)
      expect(res.status).toBe(404)
      const body = (await res.json()) as { message: string }
      expect(body.message).toBe('Not found')
    })
  })

  it('maps ApiError to 400 with code', async () => {
    const endpoints: Endpoint[] = [
      {
        endpoint: '/err',
        type: 'post',
        handler: async (_req, _res) => {
          throw new ApiError('INVALID', 'bad input')
        }
      }
    ]
    await withServer(endpoints, async (baseUrl) => {
      const res = await httpRequest(`${baseUrl}/err`, { method: 'POST', body: '{}' })
      expect(res.status).toBe(400)
      const body = (await res.json()) as { code: string, message: string }
      expect(body.code).toBe('INVALID')
      expect(body.message).toBe('bad input')
    })
  })

  it('maps unexpected errors to 500', async () => {
    const endpoints: Endpoint[] = [
      {
        endpoint: '/boom',
        type: 'post',
        handler: async (_req, _res) => {
          throw new Error('boom')
        }
      }
    ]
    await withServer(endpoints, async (baseUrl) => {
      const res = await httpRequest(`${baseUrl}/boom`, { method: 'POST', body: '{}' })
      expect(res.status).toBe(500)
      const body = (await res.json()) as { message: string }
      expect(body.message).toBe('boom')
    })
  })
})
