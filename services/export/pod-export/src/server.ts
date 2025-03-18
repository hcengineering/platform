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

import client, { ClientSocket } from '@hcengineering/client'
import core, {
  Account,
  Blob,
  Class,
  Client,
  Doc,
  DocumentQuery,
  generateId,
  MeasureContext,
  Ref,
  Space,
  TxOperations,
  WorkspaceId
} from '@hcengineering/core'
import drive, { createFile, Drive } from '@hcengineering/drive'
import notification from '@hcengineering/notification'
import { Asset, IntlString, setMetadata } from '@hcengineering/platform'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'
import { initStatisticsContext, StorageAdapter, StorageConfiguration } from '@hcengineering/server-core'
import { buildStorageFromConfig } from '@hcengineering/server-storage'
import { decodeToken } from '@hcengineering/server-token'
import archiver from 'archiver'
import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { createWriteStream } from 'fs'
import fs from 'fs/promises'
import { IncomingHttpHeaders, type Server } from 'http'
import { tmpdir } from 'os'
import { basename, join } from 'path'
import { v4 as uuid } from 'uuid'
import WebSocket from 'ws'
import { ApiError } from './error'
import { ExportFormat, WorkspaceExporter } from './exporter'
import { TransformConfig } from './transformer'
const extractCookieToken = (cookie?: string): string | null => {
  if (cookie === undefined || cookie === null) {
    return null
  }

  const cookies = cookie.split(';')
  const tokenCookie = cookies.find((cookie) => cookie.toLocaleLowerCase().includes('token'))
  if (tokenCookie === undefined) {
    return null
  }

  const encodedToken = tokenCookie.split('=')[1]
  if (encodedToken === undefined) {
    return null
  }

  return encodedToken
}

const extractAuthorizationToken = (authorization?: string): string | null => {
  if (authorization === undefined || authorization === null) {
    return null
  }
  const encodedToken = authorization.split(' ')[1]

  if (encodedToken === undefined) {
    return null
  }

  return encodedToken
}

const extractQueryToken = (queryParams: any): string | null => {
  if (queryParams == null) {
    return null
  }

  const encodedToken = queryParams.token

  if (encodedToken == null) {
    return null
  }

  return encodedToken
}

const retrieveToken = (headers: IncomingHttpHeaders, queryParams: any): string => {
  try {
    const encodedToken =
      extractCookieToken(headers.cookie) ??
      extractAuthorizationToken(headers.authorization) ??
      extractQueryToken(queryParams)

    if (encodedToken === null) {
      throw new ApiError(401)
    }

    return encodedToken
  } catch {
    throw new ApiError(401)
  }
}

type AsyncRequestHandler = (req: Request, res: Response, token: string, next: NextFunction) => Promise<void>

const handleRequest = async (
  fn: AsyncRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const encodedToken = retrieveToken(req.headers, req.query)
    await fn(req, res, encodedToken, next)
  } catch (err: unknown) {
    next(err)
  }
}

const wrapRequest = (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleRequest(fn, req, res, next)
}

export function createServer (storageConfig: StorageConfiguration): { app: Express, close: () => void } {
  const storageAdapter = buildStorageFromConfig(storageConfig)
  const measureCtx = initStatisticsContext('export', {})

  const app = express()
  app.use(cors())
  app.use(express.json())

  app.post(
    '/exportAsync',
    wrapRequest(async (req, res, token) => {
      const format = req.query.format as ExportFormat

      const { _class, query, attributesOnly }: {
        _class: Ref<Class<Doc<Space>>>
        query?: DocumentQuery<Doc>
        attributesOnly: boolean
      } = req.body

      if (_class == null || format == null) {
        throw new ApiError(400, 'Missing required parameters')
      }

      const platformClient = await createPlatformClient(token)
      const { email, workspace } = decodeToken(token)

      const account = platformClient.getModel().getAccountByEmail(email)
      if (account === undefined) {
        throw new ApiError(401, 'Account not found')
      }

      const txOperations = new TxOperations(platformClient, account._id)

      res.status(200).send({ message: 'Export started' })

      void (async () => {
        const exportDir = await fs.mkdtemp(join(tmpdir(), 'export-'))
        try {
          const exporter = new WorkspaceExporter(measureCtx, txOperations, storageAdapter, workspace)

          await exporter.export(_class, exportDir, { format, attributesOnly, query })

          const hierarchy = platformClient.getHierarchy()
          const className = hierarchy.getClass(_class).label

          const archiveDir = await fs.mkdtemp(join(tmpdir(), 'export-archive-'))
          const archiveName = `export-${workspace.name}-${className}-${format}-${Date.now()}.zip`
          const archivePath = join(archiveDir, archiveName)

          const files = await fs.readdir(exportDir)
          if (files.length === 0) {
            throw new ApiError(400, 'No files were exported')
          }

          await saveToArchive(exportDir, archivePath)
          const exportDrive = await saveToDrive(
            measureCtx,
            txOperations,
            storageAdapter,
            workspace,
            archivePath,
            account._id
          )

          await sendSuccessNotification(txOperations, account._id, exportDrive, archiveName)
        } catch (err: any) {
          console.error('Export failed:', err)
          await sendFailureNotification(txOperations, account._id, err.message ?? 'Unknown error when exporting')
        } finally {
          await fs.rmdir(exportDir, { recursive: true })
        }
      })()
    })
  )

  app.post(
    '/exportSync',
    wrapRequest(async (req, res, token) => {
      const format = req.query.format as ExportFormat
      const { _class, query, attributesOnly, config }: {
        _class: Ref<Class<Doc<Space>>>
        query?: DocumentQuery<Doc>
        attributesOnly?: boolean
        config?: TransformConfig
      } = req.body

      if (_class == null || format == null) {
        throw new ApiError(400, 'Missing required parameters')
      }

      const platformClient = await createPlatformClient(token)
      const { email, workspace } = decodeToken(token)

      const account = platformClient.getModel().getAccountByEmail(email)
      if (account === undefined) {
        throw new ApiError(401, 'Account not found')
      }

      const txOperations = new TxOperations(platformClient, account._id)

      // Always synchronous - similar to /export?sync=true
      const exportDir = await fs.mkdtemp(join(tmpdir(), 'export-'))
      try {
        const exporter = new WorkspaceExporter(measureCtx, txOperations, storageAdapter, workspace, config)
        await exporter.export(_class, exportDir, { format, attributesOnly: attributesOnly ?? false, query })

        const files = await fs.readdir(exportDir)
        if (files.length === 0) {
          throw new ApiError(400, 'No files were exported')
        }

        if (files.length !== 1) {
          throw new ApiError(400, 'Unexpected number of files exported')
        }

        const exportedFile = join(exportDir, files[0])
        res.download(exportedFile, basename(exportedFile), () => {
        })
      } catch (err: any) {
        console.error('Export failed:', err)
        throw err
      } finally {
        void fs.rmdir(exportDir, { recursive: true })
      }
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

async function createPlatformClient (token: string): Promise<Client> {
  setMetadata(client.metadata.ClientSocketFactory, (url) => {
    return new WebSocket(url, {
      headers: {
        'User-Agent': process.env.SERVICE_ID
      }
    }) as never as ClientSocket
  })

  const endpoint = await getTransactorEndpoint(token)
  const connection = await createClient(endpoint, token)

  return connection
}

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Export service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}

async function saveToArchive (inputDir: string, outputPath: string): Promise<void> {
  await new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    output.on('close', () => {
      resolve(0)
    })

    archive.on('error', (err: any) => {
      reject(err)
    })

    archive.pipe(output)
    archive.directory(inputDir, false)
    void archive.finalize()
  })
}

async function saveToDrive (
  ctx: MeasureContext,
  client: TxOperations,
  storage: StorageAdapter,
  workspace: WorkspaceId,
  archivePath: string,
  account: Ref<Account>
): Promise<Ref<Drive>> {
  const exportDrive = await ensureExportDrive(client, account)

  const fileContent = await fs.readFile(archivePath)
  const blobId = uuid() as Ref<Blob>
  await storage.put(ctx, workspace, blobId, fileContent, 'application/gzip', fileContent.length)

  await createFile(client, exportDrive, drive.ids.Root, {
    title: basename(archivePath),
    file: blobId,
    size: fileContent.length,
    type: 'application/gzip',
    lastModified: Date.now()
  })
  return exportDrive
}

async function ensureExportDrive (client: TxOperations, account: Ref<Account>): Promise<Ref<Drive>> {
  const exportDrive = await client.findOne(drive.class.Drive, {
    name: 'Export'
  })

  if (exportDrive !== undefined) {
    return exportDrive._id
  }

  const driveId = generateId<Drive>()
  await client.createDoc(
    drive.class.Drive,
    core.space.Space,
    {
      name: 'Export',
      description: 'Drive for exported files',
      private: false,
      archived: false,
      members: [account],
      type: drive.spaceType.DefaultDrive,
      autoJoin: true
    },
    driveId
  )

  return driveId
}

async function sendSuccessNotification (
  client: TxOperations,
  account: Ref<Account>,
  exportDrive: Ref<Drive>,
  archiveName: string
): Promise<void> {
  const docNotifyContextId = await client.createDoc(notification.class.DocNotifyContext, core.space.Space, {
    objectId: exportDrive,
    objectClass: drive.class.Drive,
    objectSpace: core.space.Space,
    user: account,
    isPinned: false,
    hidden: false
  })

  await client.createDoc(notification.class.CommonInboxNotification, core.space.Space, {
    user: account,
    objectId: exportDrive,
    objectClass: drive.class.Drive,
    icon: 'setting:icon:Export' as Asset,
    message: 'setting:string:ExportCompleted' as IntlString,
    props: {
      fileName: archiveName
    },
    isViewed: false,
    archived: false,
    docNotifyContext: docNotifyContextId
  })
}

async function sendFailureNotification (client: TxOperations, account: Ref<Account>, error: string): Promise<void> {
  const docNotifyContextId = await client.createDoc(notification.class.DocNotifyContext, core.space.Space, {
    objectId: account,
    objectClass: core.class.Account,
    objectSpace: core.space.Space,
    user: account,
    isPinned: false,
    hidden: false
  })

  await client.createDoc(notification.class.CommonInboxNotification, core.space.Space, {
    user: account,
    objectId: account,
    objectClass: core.class.Account,
    icon: 'setting:icon:Export' as Asset,
    message: 'setting:string:ExportFailed' as IntlString,
    props: {
      error
    },
    isViewed: false,
    archived: false,
    docNotifyContext: docNotifyContextId
  })
}
