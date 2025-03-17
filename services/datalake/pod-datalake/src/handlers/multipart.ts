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
import { type Request, type Response } from 'express'
import { cacheControl } from '../const'
import { Datalake } from '../datalake'
import { requestHLS } from './video'

export interface MultipartUpload {
  key: string
  uploadId: string
}

export interface MultipartUploadPart {
  partNumber: number
  etag: string
}

export interface MultipartUploadCompleteRequest {
  parts: MultipartUploadPart[]
}

export async function handleMultipartUploadStart (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace, name } = req.params

  const { bucket } = await datalake.selectStorage(ctx, workspace)

  const contentType = req.headers['content-type'] ?? 'application/octet-stream'
  const lastModifiedHeader = req.headers['last-modified']
  const lastModified =
    lastModifiedHeader != null ? new Date(lastModifiedHeader).toISOString() : new Date().toISOString()

  const { uploadId } = await bucket.createMultipartUpload(ctx, name, { contentType, cacheControl, lastModified })
  res.status(200).json({ key: name, uploadId })
}

export async function handleMultipartUploadPart (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace } = req.params

  const key = req.query.key as string
  const uploadId = req.query.uploadId as string
  const partNumber = req.query.partNumber as string
  if (typeof key !== 'string' || typeof uploadId !== 'string' || typeof partNumber !== 'string') {
    res.status(400).send('missing key or uploadId or partNumber')
    return
  }

  if (req.body === null) {
    res.status(400).send('missing body')
    return
  }

  const { bucket } = await datalake.selectStorage(ctx, workspace)

  const part = await bucket.uploadMultipartPart(ctx, key, { uploadId }, req.body, {
    partNumber: Number.parseInt(partNumber)
  })

  res.status(200).json(part)
}

export async function handleMultipartUploadComplete (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace, name } = req.params
  const { bucket } = await datalake.selectStorage(ctx, workspace)

  const uploadId = req.query.uploadId as string
  if (typeof uploadId !== 'string') {
    res.status(400).send('missing uploadId')
    return
  }

  const { parts } = req.body as MultipartUploadCompleteRequest
  await bucket.completeMultipartUpload(ctx, name, { uploadId }, parts)
  const metadata = await datalake.create(ctx, workspace, name, name)

  res.status(200).json(metadata)
}

export async function handleMultipartUploadAbort (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace, name } = req.params

  const uploadId = req.query.uploadId as string
  if (typeof uploadId !== 'string') {
    res.status(400).send('missing uploadId')
    return
  }

  const { bucket } = await datalake.selectStorage(ctx, workspace)
  await bucket.abortMultipartUpload(ctx, name, { uploadId })

  const contentType = req.headers['content-type'] ?? 'application/octet-stream'
  if (contentType.startsWith('video/')) {
    void requestHLS(ctx, workspace, name)
  }

  res.status(204).send()
}
