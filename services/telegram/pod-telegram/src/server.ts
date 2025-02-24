import express, { NextFunction, Request, Response, Express } from 'express'
import cors from 'cors'
import { Server } from 'http'
import { ApiError } from './error'

export type Handler = (req: Request, res: Response, next?: NextFunction) => Promise<void>

const catchError = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      await fn(req, res, next)
    } catch (err: unknown) {
      next(err)
    }
  })()
}

export function createServer (endpoints: Array<[string, Handler]>): Express {
  const app = express()

  app.use(cors())
  app.use(express.json())

  endpoints.forEach(([endpoint, handler]) => {
    app.post(endpoint, catchError(handler))
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
    console.log(`App has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
