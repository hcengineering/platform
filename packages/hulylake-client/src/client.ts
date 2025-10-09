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
import {
  HulyHeaders,
  HulylakeClient,
  HulylakeWorkspaceClient,
  HulyMeta,
  HulyResponse,
  JsonPatch,
  PatchOptions,
  PutOptions,
  Body
} from './types'

export function getWorkspaceClient (baseUrl: string, workspace: WorkspaceUuid, token: string): HulylakeWorkspaceClient {
  const client = new Client(baseUrl, token)
  return new WorkspaceClient(client, workspace)
}

export function getClient (baseUrl: string, token: string): HulylakeClient {
  return new Client(baseUrl, token)
}

class WorkspaceClient implements HulylakeWorkspaceClient {
  constructor (
    private readonly client: HulylakeClient,
    private readonly workspace: WorkspaceUuid
  ) {}

  head (key: string, retryOptions?: RetryOptions): Promise<HulyResponse<void>> {
    return this.client.head(this.workspace, key, retryOptions)
  }

  get (key: string, retryOptions?: RetryOptions): Promise<HulyResponse<ReadableStream<Uint8Array>>> {
    return this.client.get(this.workspace, key, retryOptions)
  }

  put (key: string, body: Body, opts: PutOptions, retryOptions?: RetryOptions): Promise<HulyResponse<void>> {
    return this.client.put(this.workspace, key, body, opts, retryOptions)
  }

  patch (key: string, body: Body, opts: PatchOptions, retryOptions?: RetryOptions): Promise<HulyResponse<void>> {
    return this.client.patch(this.workspace, key, body, opts, retryOptions)
  }

  delete (key: string, retryOptions?: RetryOptions): Promise<HulyResponse<void>> {
    return this.client.delete(this.workspace, key, retryOptions)
  }

  public async getJson<T>(key: string, retryOptions?: RetryOptions): Promise<HulyResponse<T>> {
    const res = await this.client.get(this.workspace, key, retryOptions)
    const body = res.ok && res.body != null ? ((await new Response(res.body).json()) as T) : undefined
    return { ...res, body }
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

class Client implements HulylakeClient {
  constructor (
    private readonly baseUrl: string,
    private readonly token: string
  ) {
    this.baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
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

  public objectUrl (workspace: string, key: string): string {
    return `${this.baseUrl}/api/${workspace}/${encodeURIComponent(key)}`
  }

  public async head (workspace: string, key: string, retryOptions?: RetryOptions): Promise<HulyResponse<void>> {
    const res = await fetchSafe(
      this.objectUrl(workspace, key),
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
      contentType: res.headers.get('Content-Type') ?? 'application/octet-stream',
      contentLength: unwrapContentLength(res.headers.get('Content-Length')),
      headers: res.headers
    }
  }

  public async get (
    workspace: string,
    key: string,
    retryOptions?: RetryOptions
  ): Promise<HulyResponse<ReadableStream<Uint8Array>>> {
    try {
      const res = await fetchSafe(
        this.objectUrl(workspace, key),
        {
          method: 'GET',
          headers: this.authHeaders()
        },
        retryOptions
      )

      return {
        ok: res.ok,
        status: res.status,
        etag: unwrapEtag(res.headers.get('ETag')),
        headers: res.headers,
        lastModified: unwrapLastModified(res.headers.get('Last-Modified')),
        contentType: res.headers.get('Content-Type') ?? 'application/octet-stream',
        contentLength: unwrapContentLength(res.headers.get('Content-Length')),
        body: res.ok ? (res.body ?? undefined) : undefined
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

  public async partial (
    workspace: string,
    key: string,
    offset: number,
    length?: number,
    retryOptions?: RetryOptions
  ): Promise<HulyResponse<ReadableStream<Uint8Array>>> {
    try {
      const res = await fetchSafe(
        this.objectUrl(workspace, key),
        {
          method: 'GET',
          headers: this.authHeaders({
            Range: length !== undefined ? `bytes=${offset}-${offset + length - 1}` : `bytes=${offset}`
          })
        },
        retryOptions
      )

      return {
        ok: res.ok,
        status: res.status,
        etag: unwrapEtag(res.headers.get('ETag')),
        headers: res.headers,
        body: res.ok ? (res.body ?? undefined) : undefined
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
    workspace: string,
    key: string,
    body: Body,
    opts: PutOptions = {},
    retryOptions?: RetryOptions
  ): Promise<HulyResponse<void>> {
    const { mergeStrategy, headers, meta } = opts
    const contentType = 'contentType' in opts ? opts.contentType : undefined
    const contentLength = 'contentLength' in opts ? opts.contentLength : undefined

    const h = this.authHeaders()

    if (mergeStrategy != null) {
      h.set('Huly-Merge-Strategy', mergeStrategy)
    }

    if (contentType != null) {
      h.set('Content-Type', contentType)
    } else if (mergeStrategy === 'jsonpatch') {
      h.set('Content-Type', 'application/json')
    }

    if (contentLength != null) {
      h.set('Content-Length', contentLength.toString())
    }

    this.applyHeaders(h, headers)
    this.applyMeta(h, meta)

    const duplex = body instanceof ReadableStream ? 'half' : undefined

    const res = await fetchSafe(
      this.objectUrl(workspace, key),
      {
        method: 'PUT',
        headers: h,
        body,
        // @ts-expect-error must present for ReadableStream but it is not in the interface
        duplex
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
    workspace: string,
    key: string,
    body: Body,
    opts: PatchOptions = {},
    retryOptions?: RetryOptions
  ): Promise<HulyResponse<void>> {
    const { contentType, contentLength, headers, meta } = opts

    const h = this.authHeaders()

    if (contentType != null) {
      h.set('Content-Type', contentType)
    }

    if (contentLength != null) {
      h.set('Content-Length', contentLength.toString())
    }

    this.applyHeaders(h, headers)
    this.applyMeta(h, meta)

    const duplex = body instanceof ReadableStream ? 'half' : undefined

    const res = await fetchSafe(
      this.objectUrl(workspace, key),
      {
        method: 'PATCH',
        headers: h,
        body,
        // @ts-expect-error must present for ReadableStream but it is not in the interface
        duplex
      },
      retryOptions
    )

    return {
      ok: res.ok,
      status: res.status,
      etag: unwrapEtag(res.headers.get('ETag')),
      lastModified: unwrapLastModified(res.headers.get('Last-Modified')),
      contentLength: unwrapContentLength(res.headers.get('Content-Length')),
      contentType: res.headers.get('Content-Type') ?? undefined,
      headers: res.headers
    }
  }

  public async delete (workspace: string, key: string, retryOptions?: RetryOptions): Promise<HulyResponse<void>> {
    const res = await fetchSafe(
      this.objectUrl(workspace, key),
      {
        method: 'DELETE',
        headers: this.authHeaders()
      },
      retryOptions
    )

    return {
      ok: res.ok,
      status: res.status,
      headers: res.headers
    }
  }
}
