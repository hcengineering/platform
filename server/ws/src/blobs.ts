import { Analytics } from '@hcengineering/analytics'
import type { MeasureContext, WorkspaceId } from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/server-core'
import type { Readable } from 'stream'

const cacheControlNoCache = 'public, no-store, no-cache, must-revalidate, max-age=0'

export interface BlobResponse {
  writeHead: (code: number, header: Record<string, string | number>) => void
  status: (code: number) => void
  end: () => void
  pipeFrom: (readable: Readable, size: number) => void
}

export async function getFile (
  ctx: MeasureContext,
  client: StorageAdapter,
  workspace: WorkspaceId,
  file: string,
  res: BlobResponse
): Promise<void> {
  const stat = await ctx.with('stat', {}, async () => await client.stat(ctx, workspace, file))
  if (stat === undefined) {
    ctx.error('No such key', { file })
    res.status(404)
    res.end()
    return
  }

  await ctx.with(
    'write',
    { contentType: stat.contentType },
    async (ctx) => {
      try {
        const dataStream = await ctx.with('readable', {}, async () => await client.get(ctx, workspace, file))
        res.writeHead(200, {
          'Content-Type': stat.contentType,
          Etag: stat.etag,
          'Last-Modified': new Date(stat.modifiedOn).toISOString(),
          'Cache-Control': cacheControlNoCache
        })

        res.pipeFrom(dataStream, stat.size)
        await new Promise<void>((resolve, reject) => {
          dataStream.on('end', function () {
            res.end()
            dataStream.destroy()
            resolve()
          })
          dataStream.on('error', function (err) {
            Analytics.handleError(err)
            ctx.error('error', { err })
            reject(err)
          })
        })
      } catch (err: any) {
        ctx.error('get-file-error', { workspace: workspace.name, err })
        Analytics.handleError(err)
        res.status(500)
        res.end()
      }
    },
    {}
  )
}

function getRange (range: string, size: number): [number, number] {
  const [startStr, endStr] = range.replace(/bytes=/, '').split('-')

  let start = parseInt(startStr, 10)
  let end = endStr !== undefined ? parseInt(endStr, 10) : size - 1

  if (!isNaN(start) && isNaN(end)) {
    end = size - 1
  }

  if (isNaN(start) && !isNaN(end)) {
    start = size - end
    end = size - 1
  }

  return [start, end]
}
export async function getFileRange (
  ctx: MeasureContext,
  range: string,
  client: StorageAdapter,
  workspace: WorkspaceId,
  uuid: string,
  res: BlobResponse
): Promise<void> {
  const stat = await ctx.with('stats', {}, async () => await client.stat(ctx, workspace, uuid))
  if (stat === undefined) {
    ctx.error('No such key', { file: uuid })
    res.status(404)
    res.end()
    return
  }
  const size: number = stat.size

  const [start, end] = getRange(range, size)

  if (start >= size || end >= size) {
    res.writeHead(416, {
      'Content-Range': `bytes */${size}`
    })
    res.end()
    return
  }

  await ctx.with(
    'write',
    { contentType: stat.contentType },
    async (ctx) => {
      try {
        const dataStream = await ctx.with(
          'partial',
          {},
          async () => await client.partial(ctx, workspace, uuid, start, end - start + 1),
          {}
        )
        res.writeHead(206, {
          Connection: 'keep-alive',
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': stat.contentType,
          Etag: stat.etag,
          'Last-Modified': new Date(stat.modifiedOn).toISOString()
        })

        res.pipeFrom(dataStream, end - start)
        await new Promise<void>((resolve, reject) => {
          dataStream.on('end', function () {
            res.end()
            dataStream.destroy()
            resolve()
          })
          dataStream.on('error', function (err) {
            Analytics.handleError(err)
            ctx.error('error', { err })
            reject(err)
          })
        })
      } catch (err: any) {
        if (err?.code === 'NoSuchKey' || err?.code === 'NotFound') {
          ctx.info('No such key', { workspace: workspace.name, uuid })
          res.status(404)
          res.end()
          return
        } else {
          Analytics.handleError(err)
          ctx.error(err)
        }
        res.status(500)
        res.end()
      }
    },
    { uuid, start, end: end - start + 1 }
  )
}
