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

import { isWorkspaceLoginInfo } from '@hcengineering/account-client'
import client, { ClientSocket } from '@hcengineering/client'
import core, {
  AccountUuid,
  Blob,
  Class,
  Client,
  Doc,
  DocumentQuery,
  generateId,
  MeasureContext,
  type PersonId,
  Ref,
  Space,
  TxOperations,
  WorkspaceIds
} from '@hcengineering/core'
import drive, { createFile, Drive } from '@hcengineering/drive'
import notification from '@hcengineering/notification'
import { setMetadata } from '@hcengineering/platform'
import { createClient, getAccountClient, getTransactorEndpoint } from '@hcengineering/server-client'
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
import exportPlugin, { type TransformConfig } from '@hcengineering/export'

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
    const token =
      extractAuthorizationToken(headers.authorization) ??
      extractQueryToken(queryParams) ??
      extractCookieToken(headers.cookie)

    if (token === null) {
      throw new ApiError(401)
    }

    return token
  } catch {
    throw new ApiError(401)
  }
}

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  wsIds: WorkspaceIds,
  token: string,
  socialId: PersonId,
  next: NextFunction
) => Promise<void>

const handleRequest = async (
  fn: AsyncRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = retrieveToken(req.headers, req.query)
    const wsLoginInfo = await getAccountClient(token).getLoginInfoByToken()
    if (!isWorkspaceLoginInfo(wsLoginInfo)) {
      throw new ApiError(401, "Couldn't find workspace with the provided token")
    }
    if (wsLoginInfo.socialId === undefined) {
      throw new ApiError(401, 'Social ID is missing')
    }
    const wsIds = {
      uuid: wsLoginInfo.workspace,
      dataId: wsLoginInfo.workspaceDataId,
      url: wsLoginInfo.workspaceUrl
    }
    await fn(req, res, wsIds, token, wsLoginInfo.socialId, next)
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
  app.use(cors({ exposedHeaders: 'Content-Disposition' }))
  app.use(express.json())

  app.post(
    '/exportAsync',
    wrapRequest(async (req, res, wsIds, token, socialId) => {
      const format = req.query.format as ExportFormat

      const {
        _class,
        query,
        attributesOnly
      }: {
        _class: Ref<Class<Doc<Space>>>
        query?: DocumentQuery<Doc>
        attributesOnly: boolean
      } = req.body

      if (_class == null || format == null) {
        throw new ApiError(400, 'Missing required parameters')
      }

      const platformClient = await createPlatformClient(token)
      const { account } = decodeToken(token)

      const txOperations = new TxOperations(platformClient, socialId)

      res.status(200).send({ message: 'Export started' })

      void (async () => {
        const exportDir = await fs.mkdtemp(join(tmpdir(), 'export-'))
        try {
          const exporter = new WorkspaceExporter(measureCtx, txOperations, storageAdapter, wsIds)

          await exporter.export(_class, exportDir, { format, attributesOnly, query })

          const hierarchy = platformClient.getHierarchy()
          const className = hierarchy.getClass(_class).label

          const archiveDir = await fs.mkdtemp(join(tmpdir(), 'export-archive-'))
          const archiveName = `export-${wsIds.uuid}-${className}-${format}-${Date.now()}.zip`
          const archivePath = join(archiveDir, archiveName)

          await saveToArchive(exportDir, archivePath)
          const exportDrive = await saveToDrive(measureCtx, txOperations, storageAdapter, wsIds, archivePath, account)

          await sendSuccessNotification(txOperations, account, exportDrive, archiveName)
        } catch (err: any) {
          console.error('Export failed:', err)
          await sendFailureNotification(txOperations, account, err.message ?? 'Unknown error when exporting')
        } finally {
          await fs.rmdir(exportDir, { recursive: true })
        }
      })()
    })
  )

  app.post(
    '/exportSync',
    wrapRequest(async (req, res, wsIds, token, socialId) => {
      const format = req.query.format as ExportFormat
      const {
        _class,
        query,
        attributesOnly,
        config
      }: {
        _class: Ref<Class<Doc<Space>>>
        query?: DocumentQuery<Doc>
        attributesOnly?: boolean
        config?: TransformConfig
      } = req.body

      if (_class == null || format == null) {
        throw new ApiError(400, 'Missing required parameters')
      }

      const platformClient = await createPlatformClient(token)
      const txOperations = new TxOperations(platformClient, socialId)

      const exportDir = await fs.mkdtemp(join(tmpdir(), 'export-'))
      try {
        const exporter = new WorkspaceExporter(measureCtx, txOperations, storageAdapter, wsIds, config)
        await exporter.export(_class, exportDir, { format, attributesOnly: attributesOnly ?? false, query })

        const files = await fs.readdir(exportDir)
        if (files.length === 0) {
          throw new ApiError(400, 'No data to export')
        }

        if (files.length !== 1) {
          throw new ApiError(400, 'Unexpected number of files exported')
        }

        const exportedFile = join(exportDir, files[0])
        res.download(exportedFile, basename(exportedFile), () => {})
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
  wsIds: WorkspaceIds,
  archivePath: string,
  account: AccountUuid
): Promise<Ref<Drive>> {
  const exportDrive = await ensureExportDrive(client, account)

  const fileContent = await fs.readFile(archivePath)
  const blobId = uuid() as Ref<Blob>
  await storage.put(ctx, wsIds, blobId, fileContent, 'application/gzip', fileContent.length)

  await createFile(client, exportDrive, drive.ids.Root, {
    title: basename(archivePath),
    file: blobId,
    size: fileContent.length,
    type: 'application/gzip',
    lastModified: Date.now()
  })
  return exportDrive
}

async function ensureExportDrive (client: TxOperations, account: AccountUuid): Promise<Ref<Drive>> {
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
  account: AccountUuid,
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
    icon: exportPlugin.icon.Export,
    message: exportPlugin.string.ExportCompleted,
    props: {
      fileName: archiveName
    },
    isViewed: false,
    archived: false,
    docNotifyContext: docNotifyContextId
  })
}

async function sendFailureNotification (client: TxOperations, account: AccountUuid, error: string): Promise<void> {
  const docNotifyContextId = await client.createDoc(notification.class.DocNotifyContext, core.space.Space, {
    objectId: core.class.Doc,
    objectClass: core.class.Doc,
    objectSpace: core.space.Space,
    user: account,
    isPinned: false,
    hidden: false
  })

  await client.createDoc(notification.class.CommonInboxNotification, core.space.Space, {
    user: account,
    objectId: core.class.Doc,
    objectClass: core.class.Doc,
    icon: exportPlugin.icon.Export,
    message: exportPlugin.string.ExportFailed,
    props: {
      error
    },
    isViewed: false,
    archived: false,
    docNotifyContext: docNotifyContextId
  })
}
