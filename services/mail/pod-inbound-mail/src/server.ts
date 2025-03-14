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
import express, { Express, NextFunction, Request, Response } from 'express'
import { Server } from 'http'

import { RequestHandler } from './types'
import { errorHandler } from './error'
import { createMessage } from './handlers'

const catchError = (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      await fn(req, res, next)
    } catch (err: unknown) {
      next(err)
    }
  })()
}

export function createServer (): Express {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use((_req, res, _next) => {
    res.status(404).send({ message: 'Not found' })
  })

  app.use(errorHandler)

  app.post('/create-mail', catchError(createMessage))

  return app
}

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Inbound mail service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
