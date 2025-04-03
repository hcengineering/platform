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
import express, { NextFunction, Request, Response } from 'express'
import { join } from 'path'
import { SplitLogger } from '@hcengineering/analytics-service'
import { MeasureContext, MeasureMetricsContext, newMetrics } from '@hcengineering/core'
import { initStatisticsContext } from '@hcengineering/server-core'
import { handleMtaHook } from './handlerMta'
import config from './config'

type RequestHandler = (req: Request, res: Response, ctx: MeasureContext, next?: NextFunction) => Promise<void>

async function main (): Promise<void> {
  const ctx = initStatisticsContext('inbound-mail', {
    factory: () =>
      new MeasureMetricsContext(
        'inbound-mail',
        {},
        {},
        newMetrics(),
        new SplitLogger('inbound-mail', {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  const app = express()

  app.use(cors())
  app.use(
    express.json({
      limit: config.mailSizeLimit
    })
  )

  const catchError = (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        await fn(req, res, ctx)
      } catch (error: any) {
        ctx.error('Failed to handle request', { method: req.method, path: req.path, error })
        next(error)
      }
    })()
  }

  app.post('/mta-hook', catchError(handleMtaHook))

  app.use((_req, res, _next) => {
    res.status(404).send({ message: 'Not found' })
  })

  app.use((err: any, req: Request, res: any, _next: any) => {
    ctx.error(err)
    if (req.path === '/mta-hook') {
      // Any error in the mta-hook should not prevent the mail server from handling emails
      // At least the PayloadTooLargeError falls here before reacing our code
      res.status(200).send({ action: 'accept' })
      return
    }
    res.status(500).send({ message: err.message })
  })

  const server = app.listen(config.port, () => {
    ctx.info('server started', { ...config, secret: '(stripped)', hookToken: '(stripped)' })
  })

  const shutdown = (): void => {
    server.close(() => {
      process.exit()
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (error: any) => {
    ctx.error('Uncaught exception', { error })
  })
  process.on('unhandledRejection', (error: any) => {
    ctx.error('Unhandled rejection', { error })
  })
}

void main().catch((err) => {
  console.error(err)
})
