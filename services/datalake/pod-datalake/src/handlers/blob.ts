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

import { Analytics } from '@hcengineering/analytics'
import { MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import { type Request, type Response } from 'express'
import { UploadedFile } from 'express-fileupload'
import fs from 'fs'
import { pipeline, Readable } from 'stream'

import { cacheControl } from '../const'
import { type Datalake, wrapETag } from '../datalake'
import { getBufferSha256, getFileSha256 } from '../hash'
import { type TemporaryDir } from '../tempdir'

interface BlobParentRequest {
  parent: string | null
}

interface DeleteBlobsRequest {
  names: string[]
}

export async function handleWorkspaceStats (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace } = req.params
  const stats = await datalake.getWorkspaceStats(ctx, workspace as WorkspaceUuid)
  res.status(200).json(stats)
}

export async function handleBlobList (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const workspace = req.params.workspace as WorkspaceUuid
  const cursor = req.query.cursor as string
  const limit = extractIntParam(req.query.limit as string)
  const derived = req.query.derived === 'true'

  const blobs = await datalake.list(ctx, workspace, { cursor, limit, derived })
  res.status(200).json(blobs)
}

export async function handleBlobGet (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { name, filename } = req.params
  const workspace = req.params.workspace as WorkspaceUuid

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
    filename !== undefined ? `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` : 'attachment'
  )
  res.setHeader('Cache-Control', blob.cacheControl ?? cacheControl)
  res.setHeader('Last-Modified', new Date(blob.lastModified).toUTCString())
  res.setHeader('ETag', wrapETag(blob.etag))

  if (range != null && blob.bodyRange !== undefined) {
    res.setHeader('Content-Range', blob.bodyRange)
    res.setHeader('ETag', wrapETag(blob.bodyLength !== blob.size ? blob.bodyEtag : blob.etag))
  }

  const status = range != null && blob.bodyLength !== blob.size ? 206 : 200
  res.status(status)

  pipeline(blob.body, res, (err) => {
    if (!blob.body.destroyed) {
      blob.body.destroy()
    }

    if (err != null) {
      // ignore abort errors to avoid flooding the logs
      if (err.name === 'AbortError' || err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
        return
      }
      const error = err instanceof Error ? err.message : String(err)
      ctx.error('error writing response', { workspace, name, error })
      Analytics.handleError(err)
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error')
      }
    }
  })
}

export async function handleBlobHead (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { name, filename } = req.params
  const workspace = req.params.workspace as WorkspaceUuid

  const head = await datalake.head(ctx, workspace, name)
  if (head == null) {
    res.status(404).send()
    return
  }

  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Content-Length', head.size.toString())
  res.setHeader('Content-Type', head.contentType ?? '')
  res.setHeader('Content-Security-Policy', "default-src 'none';")
  res.setHeader(
    'Content-Disposition',
    filename !== undefined ? `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` : 'attachment'
  )
  res.setHeader('Cache-Control', head.cacheControl ?? cacheControl)
  res.setHeader('Last-Modified', new Date(head.lastModified).toUTCString())
  res.setHeader('ETag', wrapETag(head.etag))

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
    await datalake.delete(ctx, workspace as WorkspaceUuid, name)
    ctx.info('deleted', { workspace, name })

    res.status(204).send()
  } catch (error: any) {
    Analytics.handleError(error)
    ctx.error('failed to delete blob', { workspace, name, error })
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
    await datalake.delete(ctx, workspace as WorkspaceUuid, body.names)
    ctx.info('deleted', { workspace, names: body.names })

    res.status(204).send()
  } catch (error: any) {
    Analytics.handleError(error)
    ctx.error('failed to delete blobs', { workspace, names: body.names, error })
    res.status(500).send()
  }
}

export async function handleBlobSetParent (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { name } = req.params
  const workspace = req.params.workspace as WorkspaceUuid
  const { parent } = (await req.body) as BlobParentRequest

  if (parent != null) {
    const [blobHead, parentHead] = await Promise.all([
      datalake.head(ctx, workspace, name),
      datalake.head(ctx, workspace, parent)
    ])

    if (blobHead == null) {
      res.status(404).send()
      return
    }
    if (parentHead == null) {
      res.status(400).send()
      return
    }
  } else {
    const blobHead = await datalake.head(ctx, workspace, name)
    if (blobHead == null) {
      res.status(404).send()
      return
    }
  }

  try {
    await datalake.setParent(ctx, workspace, name, parent)
    res.status(204).send()
  } catch (error: any) {
    Analytics.handleError(error)
    ctx.error('failed to delete blob', { workspace, name, error })
    res.status(500).send()
  }
}

export async function handleUploadFormData (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake,
  tempDir: TemporaryDir
): Promise<void> {
  const workspace = req.params.workspace as WorkspaceUuid

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
      try {
        const name = file.name
        const size = file.size
        const contentType = file.mimetype

        let sha256: string
        try {
          sha256 =
            file.tempFilePath !== undefined ? await getFileSha256(file.tempFilePath) : await getBufferSha256(file.data)
        } catch (err: any) {
          Analytics.handleError(err)
          const error = err instanceof Error ? err.message : String(err)
          ctx.error('failed to calculate file hash', { error })
          throw err
        }

        let data: Buffer | Readable = file.data
        if (file.tempFilePath !== undefined) {
          data = fs.createReadStream(file.tempFilePath)
          data.on('error', (err) => {
            ctx.error('stream error during upload', { workspace, name, file: file.name, error: err })
          })
        }

        try {
          const metadata = await datalake.put(ctx, workspace, name, sha256, data, {
            size,
            contentType,
            cacheControl: Array.isArray(req.headers['cache-control'])
              ? req.headers['cache-control'].join(', ')
              : req.headers['cache-control'],
            lastModified: Date.now()
          })

          ctx.info('uploaded', { workspace, name, etag: metadata.etag, type: contentType })

          return { key, id: name, metadata }
        } catch (err: any) {
          Analytics.handleError(err)
          const error = err instanceof Error ? err.message : String(err)
          ctx.error('failed to upload blob', { error: err })
          return { key, error }
        } finally {
          if (data instanceof Readable) {
            data.destroy()
          }
        }
      } finally {
        if (file.tempFilePath !== undefined) {
          tempDir.rm(file.tempFilePath)
        }
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
