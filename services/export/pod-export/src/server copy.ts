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

import { generateId } from '@hcengineering/core'
import { StorageConfiguration, initStatisticsContext } from '@hcengineering/server-core'
import { buildStorageFromConfig } from '@hcengineering/server-storage'
import { Token, decodeToken } from '@hcengineering/server-token'
import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { IncomingHttpHeaders, Server } from 'http'
import { createClient } from '@hcengineering/server-client'
import { ExportType, WorkspaceExporter } from '@hcengineering/importer'
import { join } from 'path'
import fs, { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { ApiError } from './error'

const extractToken = (headers: IncomingHttpHeaders, queryParams: any): Token => {
  try {
    const token = queryParams.token
    if (token === undefined) {
      throw new ApiError(401)
    }
    return decodeToken(token)
  } catch {
    throw new ApiError(401)
  }
}

type AsyncRequestHandler = (req: Request, res: Response, token: Token, next: NextFunction) => Promise<void>

const handleRequest = async (
  fn: AsyncRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req.headers, req.query)
    await fn(req, res, token, next)
  } catch (err: unknown) {
    next(err)
  }
}

const wrapRequest = (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  void handleRequest(fn, req, res, next)
}

export function createServer (storageConfig: StorageConfiguration, accountsUrl: string): { app: Express, close: () => void } {
  const storageAdapter = buildStorageFromConfig(storageConfig)
  const measureCtx = initStatisticsContext('export', {})

  console.log("Create server")
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get(
    '/export',
    wrapRequest(async (req, res, token) => {

      console.log("Export")
      const classId = req.query.class as string
      const exportType = req.query.type as ExportType

      if (classId == null || exportType == null) {
        throw new ApiError(400, 'Missing required parameters')
      }

      // Создаем временную директорию
      const tempDir = await mkdtemp(join(tmpdir(), 'export-'))
      
      try {
        // // Создаем клиент для работы с transactor
        // const client = await createClient(accountsUrl, token.token)

        // // Создаем экземпляр WorkspaceExporter с клиентом
        // const exporter = new WorkspaceExporter(
        //   measureCtx,
        //   client,
        //   storageAdapter,
        //   {
        //     log: (msg: string) => { measureCtx.info('export', { msg }) },
        //     error: (msg: string, err?: any) => { measureCtx.error('export-error', { msg, err }) }
        //   },
        //   token.workspace
        // )

        // // Выполняем экспорт
        // await exporter.exportDocuments(classId, exportType, tempDir)

        // // Находим созданный файл
        // const files = await fs.promises.readdir(tempDir)
        // if (files.length === 0) {
        //   throw new ApiError(400, 'No files were exported')
        // }

        // const filePath = join(tempDir, files[0])
        
        // // Отправляем файл
        // res.download(filePath, `export-${Date.now()}.json`, (err) => {
        //   void (async () => {
        //     await rm(tempDir, { recursive: true, force: true })
        //     if (err != null) {
        //       measureCtx.error('export-download-error', { error: err })
        //     }
        //   })()
        // })

      } catch (error) {
        // Очищаем временную директорию в случае ошибки
        await rm(tempDir, { recursive: true, force: true })
        throw error
      }
      console.log("Export done")
    })
  )

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.log(err)
    if (err instanceof ApiError) {
      res.status(err.code).send({ code: err.code, message: err.message })
      return
    }
    res.status(500).send(err.message?.length > 0 ? { message: err.message } : err)
  })

  return {
    app,
    close: () => {
      void storageAdapter.close()
    }
  }
}

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Export service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}