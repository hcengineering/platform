import cors from 'cors'
import express, { type Express } from 'express'
import { Server } from 'http'

export function createServer (): Express {
    const app = express()

    app.use(cors())
    app.use(express.json())

    app.use((_req, res, _next) => {
        res.status(404).send({ message: 'Not found' })
    })

    return app
}

export function listen (e: Express, port: number, host?: string): Server {
    const cb = (): void => {
        console.log(`Communication server has been started at ${host ?? '*'}:${port}`)
    }

    return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
