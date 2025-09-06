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

import cors from 'cors'
import express, { type Express, NextFunction, type Request, type Response } from 'express'
import { type Server } from 'http'
import { Config } from './config'
import { MeasureContext } from '@hcengineering/core'
import morgan from 'morgan'
import onHeaders from 'on-headers'
import { withAdmin, withOwner, withToken } from './middleware'
import {
  handleListLiveKitSessions,
  handleSetLiveKitEgress,
  handleSetLiveKitSessions,
  handleListLiveKitEgress,
  handleGetLiveKitStats,
  handleGetDatalakeStats,
  handleGetStats
} from './billing'
import { BillingDB } from './types'
import { createDb } from './db/postgres'
import { StorageConfig } from '@hcengineering/server-core'
import { storageConfigFromEnv } from '@hcengineering/server-storage'

const KEEP_ALIVE_TIMEOUT = 5 // seconds

// const cacheControlNoCache = 'public, no-store, no-cache, must-revalidate, max-age=0'

type AsyncRequestHandler = (
  ctx: MeasureContext,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  req: Request,
  res: Response
) => Promise<void>

const handleRequest = async (
  ctx: MeasureContext,
  name: string,
  db: BillingDB,
  storageConfigs: StorageConfig[],
  fn: AsyncRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await ctx.with(name, {}, (ctx) => {
      onHeaders(res, () => {
        const measurements = ctx.metrics?.measurements
        if (measurements !== undefined) {
          const values = []
          for (const [k, v] of Object.entries(measurements)) {
            values.push(`${k};dur=${v.value.toFixed(2)}`)
          }
          if (values.length > 0) {
            if (!res.headersSent) {
              res.setHeader('Server-Timing', values.join(', '))
            }
          }
        }
      })
      return fn(ctx, db, storageConfigs, req, res)
    })
  } catch (err: unknown) {
    ctx.error('Failed to process billing request', { err })
    res.status(500).end()
  }
}

export async function createServer (ctx: MeasureContext, config: Config): Promise<{ app: Express, close: () => void }> {
  const db = await createDb(ctx, config.DbUrl)
  const storageConfigs: StorageConfig[] = storageConfigFromEnv().storages.filter((p) => p.kind === 'datalake')

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '50mb' }))

  const childLogger = ctx.logger.childLogger?.('requests', { enableConsole: 'true' })
  const requests = ctx.newChild('requests', {}, { logger: childLogger, span: false })
  class LogStream {
    write (text: string): void {
      requests.info(text)
    }
  }

  const wrapRequest =
    (ctx: MeasureContext, name: string, fn: AsyncRequestHandler) =>
      (req: Request, res: Response, next: NextFunction) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
        handleRequest(ctx, name, db, storageConfigs, fn, req, res, next)
      }

  app.use(morgan('short', { stream: new LogStream() }))

  app.post(
    '/api/v1/livekit/sessions',
    withToken,
    withAdmin,
    wrapRequest(ctx, 'setLiveKitSessions', handleSetLiveKitSessions)
  )
  app.post('/api/v1/livekit/egress', withToken, withAdmin, wrapRequest(ctx, 'setLiveKitEgress', handleSetLiveKitEgress))

  app.get(
    '/api/v1/:workspace/livekit/sessions',
    withToken,
    withOwner,
    wrapRequest(ctx, 'listLiveKitSessions', handleListLiveKitSessions)
  )
  app.get(
    '/api/v1/:workspace/livekit/egress',
    withToken,
    withOwner,
    wrapRequest(ctx, 'listLiveKitEgress', handleListLiveKitEgress)
  )
  app.get(
    '/api/v1/:workspace/livekit/stats',
    withToken,
    withOwner,
    wrapRequest(ctx, 'getLiveKitStats', handleGetLiveKitStats)
  )
  app.get(
    '/api/v1/:workspace/datalake/stats',
    withToken,
    withOwner,
    wrapRequest(ctx, 'getDatalakeStats', handleGetDatalakeStats)
  )
  app.get('/api/v1/:workspace/stats', withToken, withOwner, wrapRequest(ctx, 'getStats', handleGetStats))

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not Found' })
  })

  return {
    app,
    close: () => {}
  }
}

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Service started at ${host ?? '*'}:${port}`)
  }

  const server = host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT * 1000 + 1000
  server.headersTimeout = KEEP_ALIVE_TIMEOUT * 1000 + 2000

  return server
}
