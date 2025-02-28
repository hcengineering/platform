//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { initStatisticsContext } from '@hcengineering/server-core'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import formData from 'express-form-data'
import { type IncomingHttpHeaders, type Server } from 'http'
import morgan from 'morgan'
import os from 'os'
import { type Readable } from 'stream'
import config from './config'
import { ApiError } from './error'
import { extract } from './extractors'
import { parseGenericResume } from './generic'
import { decode } from './jwt'
import { extractDocument } from './process'
import { type ReconiDocument } from './types'
import serverToken from '@hcengineering/server-token'
import { setMetadata } from '@hcengineering/platform'
// eslint-disable-next-line @typescript-eslint/no-var-requires

const extractToken = (header: IncomingHttpHeaders): any => {
  try {
    return header.authorization?.slice(7) ?? ''
  } catch {
    return undefined
  }
}

export const startServer = async (): Promise<void> => {
  const app = express()

  setMetadata(serverToken.metadata.Secret, process.env.SECRET)
  const ctx = initStatisticsContext('rekoni', {})

  class MyStream {
    write (text: string): void {
      ctx.info(text)
    }
  }

  const myStream = new MyStream()

  app.use(cors())
  app.use(express.json({ limit: '50mb' }))
  app.use(express.text({ limit: '50mb' }))
  app.use(express.raw({ limit: '50mb' }))
  app.use(bodyParser.json())

  app.use(morgan('short', { stream: myStream }))
  app.use(
    bodyParser.text({
      type: 'text/plain'
    })
  )
  app.use(
    bodyParser.raw({
      type: 'application/octet-stream'
    })
  )

  const options = {
    uploadDir: os.tmpdir(),
    autoClean: true
  }

  // parse data with connect-multiparty.
  app.use(formData.parse(options))
  // delete from the request all empty files (size == 0)
  app.use(formData.format())
  // change the file objects to fs.ReadStream
  app.use(formData.stream())
  // union the body and the files
  app.use(formData.union())

  const ops = new Map<number, Promise<void>>()
  let idx = 0
  // Allow to execute 30 per second.
  const extractQueue = {
    add: async <T>(exec: () => Promise<T>): Promise<T> => {
      if (ops.size > 100) {
        await Promise.any(ops.values())
      }
      const id = idx++
      const p = exec()
      ops.set(
        id,
        p.then(() => {
          ops.delete(id)
        })
      )

      return await p
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/recognize', async (req, res) => {
    const token = extractToken(req.headers)
    decode(token)
    const params = req.body
    console.log('recognize from', params.fileUrl)

    const contentType = req.body.type as string
    const name = req.body.name as string

    const bodyStream = req.body.file as Readable

    const temp: Buffer[] = []
    const body = await new Promise<Buffer>((resolve) => {
      bodyStream.on('data', function (d) {
        temp.push(d)
      })
      bodyStream.on('end', function () {
        resolve(Buffer.concat(temp))
      })
    })

    res.set('Cache-Control', 'no-cache')

    if (contentType === 'application/pdf') {
      await extractQueue.add(async () => {
        res.set('Cache-Control', 'no-cache')
        try {
          const { resume: doc } = await extractDocument(body)
          res.status(200)
          res.json(doc)
        } catch (err: any) {
          res.status(400)
          res.json({ error: JSON.stringify(err) })
        }
      })
    } else {
      await extractQueue.add(async () => {
        res.set('Cache-Control', 'no-cache')
        try {
          const { content, error } = await extract(name, contentType, body)
          if (error !== undefined) {
            res.status(400)
            res.json({ error: JSON.stringify(error) })
            return
          } else {
            res.status(200)
          }

          const resume: ReconiDocument = {
            format: 'unknown',
            firstName: '',
            lastName: '',
            skills: []
          }

          const textContent = content
            .split(/ |\t|\f/)
            .filter((it) => it)
            .join(' ')
            .split(/\n+/)
            .join('\n')
            .trim()

          parseGenericResume(
            {
              author: undefined,
              annotations: [],
              images: [],
              lines: textContent.split('\n').map((it) => ({
                items: [it],
                height: 0,
                widths: []
              }))
            },
            resume
          )
          res.status(200)
          res.json(resume)
        } catch (err: any) {
          res.status(400)
          res.json({ error: JSON.stringify(err) })
        }
      })
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/toText', async (req, res) => {
    const token = extractToken(req.headers)
    decode(token)
    const name = req.query.name as string
    const contentType = req.query.type as string

    try {
      const body = typeof req.body === 'string' ? Buffer.from(req.body, 'base64') : (req.body as Buffer)

      res.set('Cache-Control', 'no-cache')
      await extractQueue.add(async () => {
        const { matched, content, error } = await extract(name, contentType, body)
        if (error !== undefined) {
          res.status(400)
        } else {
          res.status(200)
        }
        res.json({
          matched,
          content,
          error
        })
      })
    } catch (err: any) {
      res.status(400)
      res.json({ error: JSON.stringify(err) })
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

  const server = listen(app, config.Port)

  const shutdown = (): void => {
    server.close()
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

export function listen (e: express.Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Rekoni service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
