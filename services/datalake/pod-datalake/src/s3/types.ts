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

import { MeasureContext } from '@hcengineering/core'
import { Readable } from 'stream'

export interface S3Object {
  key: string
  etag: string
  size: number
  contentType: string
  lastModified: number
  cacheControl?: string
}

export interface S3ObjectBody extends S3Object {
  body: Readable
  range?: string
}

export interface S3GetOptions {
  range?: string
}

export interface S3PutOptions {
  contentLength: number
  contentType: string
  cacheControl: string
  lastModified: number
}

export interface S3MultipartUpload {
  uploadId: string
}

export interface S3MultipartUploadPart {
  etag: string
  partNumber: number
}

export interface S3CreateMultipartUploadOptions {
  contentType: string
  cacheControl: string
  lastModified: string
}

export interface S3UploadPartOptions {
  partNumber: number
}

export interface S3Bucket {
  bucket: string

  head: (ctx: MeasureContext, key: string) => Promise<S3Object | null>
  get: (ctx: MeasureContext, key: string, options?: S3GetOptions) => Promise<S3ObjectBody | null>
  put: (ctx: MeasureContext, key: string, body: Readable | Buffer | string, options: S3PutOptions) => Promise<S3Object>
  delete: (ctx: MeasureContext, key: string) => Promise<void>

  // multipart
  createMultipartUpload: (
    ctx: MeasureContext,
    key: string,
    options: S3CreateMultipartUploadOptions
  ) => Promise<S3MultipartUpload>
  uploadMultipartPart: (
    ctx: MeasureContext,
    key: string,
    multipart: S3MultipartUpload,
    body: Readable | Buffer | string,
    options: S3UploadPartOptions
  ) => Promise<S3MultipartUploadPart>
  completeMultipartUpload: (
    ctx: MeasureContext,
    key: string,
    multipart: S3MultipartUpload,
    parts: S3MultipartUploadPart[]
  ) => Promise<void>
  abortMultipartUpload: (ctx: MeasureContext, key: string, multipart: S3MultipartUpload) => Promise<void>
}
