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

import { MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import { type Request, type Response } from 'express'
import { cacheControl } from '../const'
import { Datalake } from '../datalake'

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
  const workspace = req.params.workspace as WorkspaceUuid

  const { bucket } = await datalake.selectStorage(ctx, workspace)

  const contentType = req.headers['content-type'] ?? 'application/octet-stream'
  const lastModifiedHeader = req.headers['last-modified']
  const lastModified =
    lastModifiedHeader != null ? new Date(lastModifiedHeader).toISOString() : new Date().toISOString()

  const uuid = crypto.randomUUID()

  const multipart = await bucket.createMultipartUpload(ctx, uuid, { contentType, cacheControl, lastModified })
  const uploadId = formatUploadId(uuid, multipart.uploadId)

  ctx.info('multipart-create', { workspace, uuid, uploadId: multipart.uploadId })

  res.status(200).json({ uuid, uploadId })
}

export async function handleMultipartUploadPart (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const workspace = req.params.workspace as WorkspaceUuid
  const partNumber = req.query.partNumber as string

  let uuid: string
  let uploadId: string

  const upload = req.query.uploadId as string
  try {
    ;({ uuid, uploadId } = parseUploadId(upload))
  } catch (err: any) {
    res.status(400).send('invalid upload id')
    return
  }

  if (!req.readable) {
    res.status(400).send('missing body')
    return
  }

  const { bucket } = await datalake.selectStorage(ctx, workspace)

  const part = await bucket.uploadMultipartPart(ctx, uuid, { uploadId }, req, {
    size: Number.parseInt(req.headers['content-length'] ?? '0'),
    partNumber: Number.parseInt(partNumber)
  })

  ctx.info('multipart-part', { workspace, uuid, uploadId, partNumber })

  res.status(200).json(part)
}

export async function handleMultipartUploadComplete (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { name } = req.params
  const workspace = req.params.workspace as WorkspaceUuid
  const { bucket } = await datalake.selectStorage(ctx, workspace)

  let uuid: string
  let uploadId: string

  const upload = req.query.uploadId as string
  try {
    ;({ uuid, uploadId } = parseUploadId(upload))
  } catch (err: any) {
    res.status(400).send('invalid upload id')
    return
  }

  const { parts } = req.body as MultipartUploadCompleteRequest
  await bucket.completeMultipartUpload(ctx, uuid, { uploadId }, parts)
  const metadata = await datalake.create(ctx, workspace, name, uuid)

  ctx.info('multipart-complete', { workspace, name, uuid, uploadId })

  res.status(200).json(metadata)
}

export async function handleMultipartUploadAbort (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { name } = req.params
  const workspace = req.params.workspace as WorkspaceUuid

  let uuid: string
  let uploadId: string

  const upload = req.query.uploadId as string
  try {
    ;({ uuid, uploadId } = parseUploadId(upload))
  } catch (err: any) {
    res.status(400).send('invalid upload id')
    return
  }

  const { bucket } = await datalake.selectStorage(ctx, workspace)
  await bucket.abortMultipartUpload(ctx, uuid, { uploadId })

  ctx.info('multipart-abort', { workspace, name, uuid, uploadId })

  res.status(204).send()
}

function formatUploadId (uuid: string, uploadId: string): string {
  return `${uuid}/${uploadId}`
}

function parseUploadId (value: string): { uuid: string, uploadId: string } {
  const [uuid, uploadId] = value.split('/')
  if (uuid == null || uploadId == null) {
    throw new Error('Invalid upload id')
  }
  return { uuid, uploadId }
}
