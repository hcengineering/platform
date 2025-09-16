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

import { RetryOptions } from '@hcengineering/retry'

export interface HulylakeClient {
  head: (key: string, retryOptions?: RetryOptions) => Promise<HulyResponse<void>>
  get: (key: string, retryOptions?: RetryOptions) => Promise<HulyResponse<ReadableStream<Uint8Array>>>
  put: (key: string, body: Body, opts: PutOptions, retryOptions?: RetryOptions) => Promise<HulyResponse<void>>
  patch: (key: string, body: Body, opts: PatchOptions, retryOptions?: RetryOptions) => Promise<HulyResponse<void>>

  getJson: <T>(key: string, retryOptions?: RetryOptions) => Promise<HulyResponse<T>>
  putJson: <T extends object>(
    key: string,
    json: T,
    options?: Omit<PutOptions, 'mergeStrategy'>,
    retryOptions?: RetryOptions
  ) => Promise<HulyResponse<void>>
  patchJson: (
    key: string,
    body: JsonPatch[],
    options?: Omit<PatchOptions, 'contentType'>,
    retryOptions?: RetryOptions
  ) => Promise<HulyResponse<void>>
}

export type Body = ArrayBuffer | Blob | string
export type MergeStrategy = 'concatenate' | 'jsonpatch'
export type HulyHeaders = Record<string, string>
export type HulyMeta = Record<string, string>

export type PutOptions =
  | {
    mergeStrategy?: 'concatenate'
    contentType?: string
    headers?: HulyHeaders
    meta?: HulyMeta
  }
  | {
    mergeStrategy: 'jsonpatch'
    headers?: HulyHeaders
    meta?: HulyMeta
  }

export interface PatchOptions {
  contentType?: string
  headers?: HulyHeaders
  meta?: HulyMeta
}

export type JsonPatch =
  | { op: 'add', path: string, value: any }
  | { op: 'replace', path: string, value: any }
  | { op: 'remove', path: string }
  | { op: 'move', from: string, path: string }
  | { op: 'copy', from: string, path: string }
  | { op: 'test', path: string, value: any }
  | { hop: 'add', path: string, value: any, safe?: boolean }
  | { hop: 'inc', path: string, value: number, safe?: boolean }

export interface HulyResponse<Body = ArrayBuffer | string | any> {
  ok: boolean
  status: number
  etag?: string
  contentLength?: number
  lastModified?: number
  headers: Headers
  body?: Body
}
