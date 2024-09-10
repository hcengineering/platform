import { Analytics } from '@hcengineering/analytics'
import type { MeasureContext, WorkspaceId } from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/server-core'
import type { Readable } from 'stream'

const cacheControlNoCache = 'public, no-store, no-cache, must-revalidate, max-age=0'

export interface BlobResponse {
  aborted: boolean
  writeHead: (code: number, header: Record<string, string | number>) => void
  status: (code: number) => void
  end: () => void
  pipeFrom: (readable: Readable, size: number) => void
  cork: (cb: () => void) => void
}

export async function getFile (
  ctx: MeasureContext,
  client: StorageAdapter,
  workspace: WorkspaceId,
  file: string,
  res: BlobResponse
): Promise<void> {
  const stat = await ctx.with('stat', {}, () => client.stat(ctx, workspace, file))
  if (stat === undefined) {
    ctx.error('No such key', { file })
    res.cork(() => {
      res.status(404)
      res.end()
    })
    return
  }

  await ctx.with(
    'write',
    { contentType: stat.contentType },
    async (ctx) => {
      try {
        const dataStream = await ctx.with('readable', {}, () => client.get(ctx, workspace, file))
        await new Promise<void>((resolve, reject) => {
          res.cork(() => {
            res.writeHead(200, {
              'Content-Type': stat.contentType,
              Etag: stat.etag,
              'Last-Modified': new Date(stat.modifiedOn).toISOString(),
              'Cache-Control': cacheControlNoCache
            })

            res.pipeFrom(dataStream, stat.size)
            dataStream.on('end', function () {
              res.cork(() => {
                res.end()
              })
              dataStream.destroy()
              resolve()
            })
            dataStream.on('error', function (err) {
              Analytics.handleError(err)
              ctx.error('error', { err })
              reject(err)
            })
          })
        })
      } catch (err: any) {
        ctx.error('get-file-error', { workspace: workspace.name, err })
        Analytics.handleError(err)
        res.cork(() => {
          res.status(500)
          res.end()
        })
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
  const stat = await ctx.with('stats', {}, () => client.stat(ctx, workspace, uuid))
  if (stat === undefined) {
    ctx.error('No such key', { file: uuid })
    res.cork(() => {
      res.status(404)
      res.end()
    })
    return
  }
  const size: number = stat.size

  let [start, end] = getRange(range, size)

  if (end >= size) {
    end = size // Allow to iterative return of entire document
  }
  if (start >= size) {
    res.cork(() => {
      res.writeHead(416, {
        'Content-Range': `bytes */${size}`
      })
      res.end()
    })
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
          () => client.partial(ctx, workspace, uuid, start, end - start + 1),
          {}
        )
        await new Promise<void>((resolve, reject) => {
          res.cork(() => {
            res.writeHead(206, {
              Connection: 'keep-alive',
              'Content-Range': `bytes ${start}-${end}/${size}`,
              'Accept-Ranges': 'bytes',
              // 'Content-Length': end - start + 1,
              'Content-Type': stat.contentType,
              Etag: stat.etag,
              'Last-Modified': new Date(stat.modifiedOn).toISOString()
            })

            res.pipeFrom(dataStream, end - start)
            dataStream.on('end', function () {
              res.cork(() => {
                res.end()
              })
              dataStream.destroy()
              resolve()
            })
            dataStream.on('error', function (err) {
              Analytics.handleError(err)
              ctx.error('error', { err })
              res.cork(() => {
                res.end()
              })
              reject(err)
            })
          })
        })
      } catch (err: any) {
        if (err?.code === 'NoSuchKey' || err?.code === 'NotFound') {
          ctx.info('No such key', { workspace: workspace.name, uuid })
          res.cork(() => {
            res.status(404)
            res.end()
          })
          return
        } else {
          Analytics.handleError(err)
          ctx.error(err)
        }
        res.cork(() => {
          res.status(500)
          res.end()
        })
      }
    },
    { uuid, start, end: end - start + 1 }
  )
}
