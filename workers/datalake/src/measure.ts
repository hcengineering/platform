//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { type IRequest, type ResponseHandler, type RequestHandler } from 'itty-router'

export async function measure<T> (label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  try {
    return await fn()
  } finally {
    const duration = performance.now() - start
    console.log({ stage: label, duration })
  }
}

export function measureSync<T> (label: string, fn: () => T): T {
  const start = performance.now()
  try {
    return fn()
  } finally {
    const duration = performance.now() - start
    console.log({ stage: label, duration })
  }
}

export const requestTimeBefore: RequestHandler<IRequest> = async (request: IRequest) => {
  request.startTime = performance.now()
}

export const requestTimeAfter: ResponseHandler<Response> = async (response: Response, request: IRequest) => {
  const duration = performance.now() - request.startTime
  console.log({ stage: 'total', duration })
}

export class LoggedR2Bucket implements R2Bucket {
  constructor (private readonly bucket: R2Bucket) {}

  async head (key: string): Promise<R2Object | null> {
    return await measure('r2.head', () => this.bucket.head(key))
  }

  async get (
    key: string,
    options?: R2GetOptions & {
      onlyIf?: R2Conditional | Headers
    }
  ): Promise<R2ObjectBody | null> {
    return await measure('r2.get', () => this.bucket.get(key, options))
  }

  async put (
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob,
    options?: R2PutOptions & {
      onlyIf?: R2Conditional | Headers
    }
  ): Promise<R2Object> {
    return await measure('r2.put', () => this.bucket.put(key, value, options))
  }

  async createMultipartUpload (key: string, options?: R2MultipartOptions): Promise<R2MultipartUpload> {
    return await measure('r2.createMultipartUpload', () => this.bucket.createMultipartUpload(key, options))
  }

  resumeMultipartUpload (key: string, uploadId: string): R2MultipartUpload {
    return measureSync('r2.resumeMultipartUpload', () => this.bucket.resumeMultipartUpload(key, uploadId))
  }

  async delete (keys: string | string[]): Promise<void> {
    await measure('r2.delete', () => this.bucket.delete(keys))
  }

  async list (options?: R2ListOptions): Promise<R2Objects> {
    return await measure('r2.list', () => this.bucket.list(options))
  }
}

export class LoggedKVNamespace implements KVNamespace {
  constructor (private readonly kv: KVNamespace) {}

  get (key: string, options?: Partial<KVNamespaceGetOptions<undefined>>): Promise<string | null>
  get (key: string, type: 'text'): Promise<string | null>
  get<ExpectedValue = unknown>(key: string, type: 'json'): Promise<ExpectedValue | null>
  get (key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>
  get (key: string, type: 'stream'): Promise<ReadableStream | null>
  get (key: string, options?: KVNamespaceGetOptions<'text'>): Promise<string | null>
  get<ExpectedValue = unknown>(key: string, options?: KVNamespaceGetOptions<'json'>): Promise<ExpectedValue | null>
  get (key: string, options?: KVNamespaceGetOptions<'arrayBuffer'>): Promise<ArrayBuffer | null>
  get (key: string, options?: KVNamespaceGetOptions<'stream'>): Promise<ReadableStream | null>
  async get (key: string, options?: any): Promise<any> {
    return await measure('kv.get', () => this.kv.get(key, options))
  }

  getWithMetadata<Metadata = unknown>(
    key: string,
    options?: Partial<KVNamespaceGetOptions<undefined>>
  ): Promise<KVNamespaceGetWithMetadataResult<string, Metadata>>
  getWithMetadata<Metadata = unknown>(
    key: string,
    type: 'text'
  ): Promise<KVNamespaceGetWithMetadataResult<string, Metadata>>
  getWithMetadata<ExpectedValue = unknown, Metadata = unknown>(
    key: string,
    type: 'json'
  ): Promise<KVNamespaceGetWithMetadataResult<ExpectedValue, Metadata>>
  getWithMetadata<Metadata = unknown>(
    key: string,
    type: 'arrayBuffer'
  ): Promise<KVNamespaceGetWithMetadataResult<ArrayBuffer, Metadata>>
  getWithMetadata<Metadata = unknown>(
    key: string,
    type: 'stream'
  ): Promise<KVNamespaceGetWithMetadataResult<ReadableStream, Metadata>>
  getWithMetadata<Metadata = unknown>(
    key: string,
    options?: KVNamespaceGetOptions<'text'>
  ): Promise<KVNamespaceGetWithMetadataResult<string, Metadata>>
  getWithMetadata<ExpectedValue = unknown, Metadata = unknown>(
    key: string,
    options?: KVNamespaceGetOptions<'json'>
  ): Promise<KVNamespaceGetWithMetadataResult<ExpectedValue, Metadata>>
  getWithMetadata<Metadata = unknown>(
    key: string,
    options?: KVNamespaceGetOptions<'arrayBuffer'>
  ): Promise<KVNamespaceGetWithMetadataResult<ArrayBuffer, Metadata>>
  getWithMetadata<Metadata = unknown>(
    key: string,
    options?: KVNamespaceGetOptions<'stream'>
  ): Promise<KVNamespaceGetWithMetadataResult<ReadableStream, Metadata>>
  async getWithMetadata (key: string, options?: any): Promise<any> {
    return await measure('kv.getWithMetadata', () => this.kv.getWithMetadata(key, options))
  }

  async list<Metadata = unknown>(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult<Metadata, string>> {
    return await measure('kv.list', () => this.kv.list(options))
  }

  async put (
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: KVNamespacePutOptions
  ): Promise<void> {
    await measure('kv.put', () => this.kv.put(key, value))
  }

  async delete (key: string): Promise<void> {
    await measure('kv.delete', () => this.kv.delete(key))
  }
}

export class LoggedCache implements Cache {
  constructor (private readonly cache: Cache) {}

  async match (request: RequestInfo, options?: CacheQueryOptions): Promise<Response | undefined> {
    return await measure('cache.match', () => this.cache.match(request, options))
  }

  async delete (request: RequestInfo, options?: CacheQueryOptions): Promise<boolean> {
    return await measure('cache.delete', () => this.cache.delete(request, options))
  }

  async put (request: RequestInfo, response: Response): Promise<void> {
    await measure('cache.put', () => this.cache.put(request, response))
  }
}
