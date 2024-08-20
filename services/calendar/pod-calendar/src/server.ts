//
// Copyright © 2023 Hardcore Engineering Inc.
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
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { type Server } from 'http'
import { ApiError } from './error'
import { type Endpoint, type RequestHandler } from './types'

const catchError = (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      await fn(req, res, next)
    } catch (err: unknown) {
      next(err)
    }
  })()
}

export function createServer (endpoints: Endpoint[]): Express {
  const app = express()

  app.use(cors())
  app.use(express.json())

  endpoints.forEach((endpoint) => {
    if (endpoint.type === 'get') {
      app.get(endpoint.endpoint, catchError(endpoint.handler))
    } else if (endpoint.type === 'post') {
      app.post(endpoint.endpoint, catchError(endpoint.handler))
    }
  })

  app.use((_req, res, _next) => {
    res.status(404).send({ message: 'Not found' })
  })

  app.use((err: any, _req: any, res: any, _next: any) => {
    if (err instanceof ApiError) {
      res.status(400).send({ code: err.code, message: err.message })
      return
    }

    res.status(500).send({ message: err.message })
  })

  return app
}

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Calendar service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
