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

import { type Readable } from 'stream'
import { S3Bucket } from '../s3'

export type Location = 'weur' | 'eeur' | 'wnam' | 'enam' | 'apac'

export type UUID = string & { __uuid: true }

export interface BlobList {
  cursor?: string
  blobs: Array<Omit<BlobHead, 'lastModified' | 'cacheControl'>>
}

export interface BlobHead {
  name: string
  etag: string
  size: number
  contentType: string
  lastModified: number
  cacheControl?: string
}

export interface BlobBody extends BlobHead {
  body: Readable
  bodyLength: number
  bodyEtag: string
  bodyRange?: string
}

export interface BlobStorage {
  location: Location
  bucket: S3Bucket
}

export interface Datalake {
  list: (workspace: string, cursor?: string, limit?: number) => Promise<BlobList>
  head: (workspace: string, name: string) => Promise<BlobHead | null>
  get: (workspace: string, name: string, options: { range?: string }) => Promise<BlobBody | null>
  delete: (workspace: string, name: string | string[]) => Promise<void>
  put: (
    workspace: string,
    name: string,
    sha256: string,
    body: Buffer | Readable,
    options: Omit<BlobHead, 'name' | 'etag'>
  ) => Promise<BlobHead>
  create: (workspace: string, name: string, filename: string) => Promise<BlobHead | null>

  setParent: (workspace: string, name: string, parent: string | null) => Promise<void>
  selectStorage: (workspace: string) => Promise<BlobStorage>
}
