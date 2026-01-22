//
// Copyright © 2026 Hardcore Engineering Inc.
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
import { MeasureContext, metricsAggregate } from '@hcengineering/core'
import { getCPUInfo, getMemoryInfo } from '@hcengineering/server-core'
import { decodeToken, TokenError } from '@hcengineering/server-token'

import cors from 'cors'
import express, { type Express, type NextFunction, type Response } from 'express'
import { type Server } from 'http'
import morgan from 'morgan'

import { type Config } from './config'
import { type RequestWithAuth, errorHandler, keepAlive, withAuthorization } from './middleware'
import { parseLinkPreviewDetails } from './parse'

const KEEP_ALIVE_TIMEOUT = 5 // seconds
const KEEP_ALIVE_MAX = 1000

const cacheControlNoCache = 'public, no-store, no-cache, must-revalidate, max-age=0'

type AsyncRequestHandler = (ctx: MeasureContext, req: RequestWithAuth, res: Response) => Promise<void>

const handleRequest = async (
  ctx: MeasureContext,
  name: string,
  fn: AsyncRequestHandler,
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const source = req.token?.extra?.service ?? '🤦‍♂️user'
    await ctx.with(name, { source }, (ctx) => {
      return fn(ctx, req, res)
    })
  } catch (err: unknown) {
    next(err)
  }
}

export async function createServer (ctx: MeasureContext, config: Config): Promise<{ app: Express, close: () => void }> {
  const app = express()

  app.use(
    cors({
      maxAge: 86400
    })
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(keepAlive({ timeout: KEEP_ALIVE_TIMEOUT, max: KEEP_ALIVE_MAX }))

  const childLogger = ctx.logger.childLogger?.('requests', { enableConsole: 'true' })
  const requests = ctx.newChild('requests', {}, { logger: childLogger, span: false })
  class LogStream {
    write (text: string): void {
      requests.info(text)
    }
  }

  const wrapRequest =
    (ctx: MeasureContext, name: string, fn: AsyncRequestHandler) =>
      (req: RequestWithAuth, res: Response, next: NextFunction) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
        handleRequest(ctx, name, fn, req, res, next)
      }

  app.use(morgan('short', { stream: new LogStream() }))

  app.get(
    '/details',
    withAuthorization,
    wrapRequest(ctx, 'getLinkPreviewDetails', async (ctx, req, res) => {
      if (req.query === undefined) {
        res.status(400).json({ message: 'Bad Request' })
        return
      }
      if (req.query.q === undefined) {
        res.status(400).json({ message: 'Bad Request' })
        return
      }
      const url = req.query.q as string
      try {
        const result = await parseLinkPreviewDetails(ctx, config, url)
        res.status(200).json(result)
      } catch (err) {
        console.error({ message: 'failed to parse link preview details', url, err })
        res.status(422).json({ message: 'Unprocessable Entity' })
      }
    })
  )

  app.get('/api/v1/statistics', (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      const admin = payload.extra?.admin === 'true'
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', cacheControlNoCache)

      const json = JSON.stringify({
        metrics: metricsAggregate((ctx as any).metrics),
        statistics: {
          cpu: getCPUInfo(),
          memory: getMemoryInfo()
        },
        admin
      })
      res.status(200).send(json)
    } catch (err: any) {
      if (err instanceof TokenError) {
        res.status(401).send()
        return
      }
      ctx.error('statistics error', { err })
      Analytics.handleError(err)
      res.status(404).send()
    }
  })

  app.get('/', (_req, res) => {
    res.send(`
      Huly&reg; Link Preview Service&trade; <a href="https://huly.io">https://huly.io</a>
      &copy; 2026 <a href="https://hulylabs.com">Huly Labs</a>
    `)
  })

  app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' })
  })

  app.use(errorHandler({ ctx }))

  return {
    app,
    close: () => {
      // No cleanup needed for this service
    }
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
