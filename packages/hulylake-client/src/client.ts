//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { WorkspaceUuid } from '@hcengineering/core'
import { RetryOptions } from '@hcengineering/retry'

import { fetchSafe, unwrapContentLength, unwrapEtag, unwrapLastModified } from './utils'
import { HulyHeaders, HulylakeClient, HulyMeta, HulyResponse, JsonPatch, PatchOptions, PutOptions, Body } from './types'

export function getClient (baseUrl: string, workspace: WorkspaceUuid, token: string): HulylakeClient {
  return new Client(baseUrl, workspace, token)
}

class Client implements HulylakeClient {
  constructor (
    private readonly baseUrl: string,
    private readonly workspace: WorkspaceUuid,
    private readonly token: string
  ) {
    this.baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
  }

  private objectUrl (key: string): string {
    return `${this.baseUrl}/api/${this.workspace}/${key}`
  }

  private authHeaders (init?: HeadersInit): Headers {
    const headers = new Headers(init)
    headers.set('Authorization', `Bearer ${this.token}`)
    return headers
  }

  private applyHeaders (h: Headers, headers?: HulyHeaders): void {
    if (headers != null) for (const [k, v] of Object.entries(headers)) h.set(`huly-header-${k}`, v)
  }

  private applyMeta (h: Headers, meta?: HulyMeta): void {
    if (meta != null) for (const [k, v] of Object.entries(meta)) h.set(`huly-meta-${k}`, v)
  }

  public async status (): Promise<boolean> {
    try {
      const res = await fetchSafe(`${this.baseUrl}/status`)
      return res.ok
    } catch {
      return false
    }
  }

  public async head (key: string, retryOptions?: RetryOptions): Promise<HulyResponse<void>> {
    const res = await fetchSafe(
      this.objectUrl(key),
      {
        method: 'HEAD',
        headers: this.authHeaders()
      },
      retryOptions
    )

    return {
      ok: res.ok,
      status: res.status,
      etag: unwrapEtag(res.headers.get('ETag')),
      lastModified: unwrapLastModified(res.headers.get('Last-Modified')),
      contentLength: unwrapContentLength(res.headers.get('Content-Length')),
      headers: res.headers
    }
  }

  public async get (key: string, retryOptions?: RetryOptions): Promise<HulyResponse<ReadableStream<Uint8Array>>> {
    try {
      const res = await fetchSafe(
        this.objectUrl(key),
        {
          method: 'GET',
          headers: this.authHeaders()
        },
        retryOptions
      )

      let body: ReadableStream<Uint8Array> | undefined

      if (res.ok) {
        body = res.body ?? undefined
      }

      return {
        ok: res.ok,
        status: res.status,
        etag: unwrapEtag(res.headers.get('ETag')),
        headers: res.headers,
        body
      }
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return {
          ok: false,
          status: 404,
          etag: undefined,
          headers: new Headers(),
          body: undefined
        }
      }
      throw err
    }
  }

  public async put (
    key: string,
    body: Body,
    opts: PutOptions = {},
    retryOptions?: RetryOptions
  ): Promise<HulyResponse<void>> {
    const { mergeStrategy, headers, meta } = opts
    const contentType = 'contentType' in opts ? opts.contentType : undefined

    const h = this.authHeaders()

    if (mergeStrategy != null) {
      h.set('Huly-Merge-Strategy', mergeStrategy)
    }

    if (contentType != null) {
      h.set('Content-Type', contentType)
    } else if (mergeStrategy === 'jsonpatch') {
      h.set('Content-Type', 'application/json')
    }

    this.applyHeaders(h, headers)
    this.applyMeta(h, meta)

    const res = await fetchSafe(
      this.objectUrl(key),
      {
        method: 'PUT',
        headers: h,
        body: body as any
      },
      retryOptions
    )

    return {
      ok: res.ok,
      status: res.status,
      etag: unwrapEtag(res.headers.get('ETag')),
      lastModified: unwrapLastModified(res.headers.get('Last-Modified')),
      contentLength: unwrapContentLength(res.headers.get('Content-Length')),
      headers: res.headers
    }
  }

  public async patch (
    key: string,
    body: Body,
    opts: PatchOptions = {},
    retryOptions?: RetryOptions
  ): Promise<HulyResponse<void>> {
    const { contentType, headers, meta } = opts

    const h = this.authHeaders()

    if (contentType != null) {
      h.set('Content-Type', contentType)
    }

    this.applyHeaders(h, headers)
    this.applyMeta(h, meta)

    const res = await fetchSafe(
      this.objectUrl(key),
      {
        method: 'PATCH',
        headers: h,
        body: body as any
      },
      retryOptions
    )

    return {
      ok: res.ok,
      status: res.status,
      etag: unwrapEtag(res.headers.get('ETag')),
      lastModified: unwrapLastModified(res.headers.get('Last-Modified')),
      contentLength: unwrapContentLength(res.headers.get('Content-Length')),
      headers: res.headers
    }
  }

  public async getJson<T>(key: string, retryOptions?: RetryOptions): Promise<HulyResponse<T>> {
    try {
      const res = await fetchSafe(
        this.objectUrl(key),
        {
          method: 'GET',
          headers: this.authHeaders()
        },
        retryOptions
      )

      let body: T | undefined

      if (res.ok) {
        body = (await res.json()) as T
      }

      return {
        ok: res.ok,
        status: res.status,
        etag: unwrapEtag(res.headers.get('ETag')),
        lastModified: unwrapLastModified(res.headers.get('Last-Modified')),
        contentLength: unwrapContentLength(res.headers.get('Content-Length')),
        headers: res.headers,
        body
      }
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return {
          ok: false,
          status: 404,
          etag: undefined,
          headers: new Headers(),
          body: undefined
        }
      }
      throw err
    }
  }

  public async putJson<T extends object>(
    key: string,
    json: T,
    options?: Omit<PutOptions, 'mergeStrategy'>,
    retryOptions?: RetryOptions
  ): Promise<HulyResponse<void>> {
    return await this.put(key, JSON.stringify(json), { ...options, mergeStrategy: 'jsonpatch' }, retryOptions)
  }

  public async patchJson (
    key: string,
    body: JsonPatch[],
    options?: Omit<PatchOptions, 'contentType'>,
    retryOptions?: RetryOptions
  ): Promise<HulyResponse<void>> {
    return await this.patch(
      key,
      JSON.stringify(body),
      { ...options, contentType: 'application/json-patch+json' },
      retryOptions
    )
  }
}
