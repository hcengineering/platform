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
import { UploadedFile } from 'express-fileupload'
import fs from 'fs'

import { cacheControl } from '../const'
import { type Datalake } from '../datalake'
import { getBufferSha256, getStreamSha256 } from '../hash'

interface BlobParentRequest {
  parent: string | null
}

interface DeleteBlobsRequest {
  names: string[]
}

export async function handleBlobList (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace } = req.params
  const cursor = req.query.cursor as string
  const limit = extractIntParam(req.query.limit as string)

  const blobs = await datalake.list(ctx, workspace, cursor, limit)
  res.status(200).json(blobs)
}

export async function handleBlobGet (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace, name, filename } = req.params

  const range = req.headers.range

  const blob = await datalake.get(ctx, workspace, name, { range })
  if (blob == null) {
    res.status(404).send()
    return
  }

  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Content-Length', blob.bodyLength.toString())
  res.setHeader('Content-Type', blob.contentType ?? '')
  res.setHeader('Content-Security-Policy', "default-src 'none';")
  res.setHeader(
    'Content-Disposition',
    filename !== undefined ? `attachment; filename*=UTF-8''${encodeURIComponent(filename)}"` : 'attachment'
  )
  res.setHeader('Cache-Control', blob.cacheControl ?? cacheControl)
  res.setHeader('Last-Modified', new Date(blob.lastModified).toUTCString())
  res.setHeader('ETag', blob.etag)

  if (range != null && blob.bodyRange !== undefined) {
    res.setHeader('Content-Range', blob.bodyRange)
    res.setHeader('ETag', blob.bodyLength !== blob.size ? blob.bodyEtag : blob.etag)
  }

  const status = range != null && blob.bodyLength !== blob.size ? 206 : 200
  res.status(status)

  const data = blob.body
  data.pipe(res)

  await new Promise<void>((resolve, reject) => {
    data.on('end', () => {
      data.destroy()
      res.end()
      resolve()
    })
    data.on('error', (err) => {
      ctx.error('error receive stream', { workspace, name, error: err })

      res.end()
      data.destroy()
      reject(err)
    })
  })
}

export async function handleBlobHead (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace, name, filename } = req.params

  const head = await datalake.head(ctx, workspace, name)
  if (head == null) {
    res.status(404).send()
    return
  }

  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Content-Length', head.size.toString())
  res.setHeader('Content-Type', head.contentType ?? '')
  res.setHeader('Content-Security-Policy', "default-src 'none';")
  res.setHeader('Content-Disposition', filename !== undefined ? `attachment; filename="${filename}"` : 'attachment')
  res.setHeader('Cache-Control', head.cacheControl ?? cacheControl)
  res.setHeader('Last-Modified', new Date(head.lastModified).toUTCString())
  res.setHeader('ETag', head.etag)

  res.status(200).send()
}

export async function handleBlobDelete (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace, name } = req.params

  try {
    await datalake.delete(ctx, workspace, name)
    ctx.info('deleted', { workspace, name })

    res.status(204).send()
  } catch (error: any) {
    ctx.error('failed to delete blob', { error })
    res.status(500).send()
  }
}

export async function handleBlobDeleteList (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace } = req.params
  const body = req.body.names as DeleteBlobsRequest

  try {
    await datalake.delete(ctx, workspace, body.names)
    ctx.info('deleted', { workspace, names: body.names })

    res.status(204).send()
  } catch (error: any) {
    ctx.error('failed to delete blobs', { error })
    res.status(500).send()
  }
}

export async function handleBlobSetParent (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace, name } = req.params
  const { parent } = (await req.body) as BlobParentRequest

  try {
    await datalake.setParent(ctx, workspace, name, parent)
    res.status(204).send()
  } catch (error: any) {
    ctx.error('failed to delete blob', { error })
    res.status(500).send()
  }
}

export async function handleUploadFormData (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace } = req.params

  if (req.files == null) {
    res.status(400).send('missing files')
    return
  }

  const files: [UploadedFile, key: string][] = []
  Object.entries(req.files).forEach(([key, value]) => {
    files.push([value as UploadedFile, key])
  })

  const result = await Promise.all(
    files.map(async ([file, key]) => {
      const name = file.name
      const size = file.size
      const contentType = file.mimetype

      let sha256: string
      if (file.tempFilePath !== undefined) {
        const stream = fs.createReadStream(file.tempFilePath)
        try {
          sha256 = await getStreamSha256(stream)
        } finally {
          stream.destroy()
        }
      } else {
        sha256 = await getBufferSha256(file.data)
      }

      const data = file.tempFilePath !== undefined ? fs.createReadStream(file.tempFilePath) : file.data

      try {
        const metadata = await datalake.put(ctx, workspace, name, sha256, data, {
          size,
          contentType,
          lastModified: Date.now()
        })

        return { key, metadata }
      } catch (err: any) {
        const error = err instanceof Error ? err.message : String(err)
        ctx.error('failed to upload blob', { error: err })
        return { key, error }
      }
    })
  )

  res.status(200).json(result)
}

function extractIntParam (value: string | string[] | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (Array.isArray(value)) {
    value = value[0]
  }

  const intValue = Number.parseInt(value)
  if (Number.isInteger(intValue)) {
    return intValue
  }

  return undefined
}
