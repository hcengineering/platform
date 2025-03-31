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
import { handleMtaHook } from './handlerMta'
import config from './config'

type RequestHandler = (req: Request, res: Response, next?: NextFunction) => Promise<void>

const catchError = (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      await fn(req, res, next)
    } catch (err: unknown) {
      console.error(req.method, req.path, err)
      next(err)
    }
  })()
}

async function main (): Promise<void> {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.post('/mta-hook', catchError(handleMtaHook))

  app.use((_req, res, _next) => {
    res.status(404).send({ message: 'Not found' })
  })

  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(500).send({ message: err.message })
  })

  const server = app.listen(config.port, () => {
    console.log(`server started on port ${config.port}`)
    console.log({ ...config, secret: '(stripped)' })
  })

  const shutdown = (): void => {
    server.close(() => {
      process.exit()
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (e) => {
    console.error(e)
  })
  process.on('unhandledRejection', (e) => {
    console.error(e)
  })
}

void main().catch((err) => {
  console.error(err)
})
