/* eslint-disable @typescript-eslint/unbound-method */
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

import { getClient, isWorkspaceLoginInfo } from '@hcengineering/account-client'
import client, { ClientSocket } from '@hcengineering/client'
import core, {
  AccountRole,
  AccountUuid,
  Blob,
  Class,
  Client,
  Doc,
  DocumentQuery,
  generateId,
  Hierarchy,
  MeasureContext,
  ModelDb,
  type PersonId,
  Ref,
  Space,
  systemAccountUuid,
  Tx,
  TxOperations,
  WorkspaceIds,
  type WorkspaceUuid
} from '@hcengineering/core'
import drive, { createFile, Drive } from '@hcengineering/drive'
import exportPlugin, { type TransformConfig, type RelationDefinition } from '@hcengineering/export'
import {
  ContextNameMiddleware,
  DBAdapterInitMiddleware,
  DBAdapterMiddleware,
  DomainFindMiddleware,
  DomainTxMiddleware,
  LowLevelMiddleware,
  ModelMiddleware
} from '@hcengineering/middleware'
import notification from '@hcengineering/notification'
import { setMetadata } from '@hcengineering/platform'
import { createClient, getAccountClient, getTransactorEndpoint } from '@hcengineering/server-client'
import {
  createDummyStorageAdapter,
  createPipeline,
  type MiddlewareCreator,
  type Pipeline,
  type PipelineContext,
  StorageAdapter,
  StorageConfiguration
} from '@hcengineering/server-core'
import { getConfig } from '@hcengineering/server-pipeline'
import { buildStorageFromConfig } from '@hcengineering/server-storage'
import { Token, decodeToken, generateToken } from '@hcengineering/server-token'
import archiver from 'archiver'
import { sendExportCompletionEmail } from './notifications'
import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { createWriteStream } from 'fs'
import fs from 'fs/promises'
import { IncomingHttpHeaders, type Server } from 'http'
import { tmpdir } from 'os'
import { basename, join } from 'path'
import { v4 as uuid } from 'uuid'
import WebSocket from 'ws'
import envConfig from './config'
import { ApiError } from './error'
import { ExportFormat, WorkspaceExporter } from './exporter'
import { CrossWorkspaceExporter, type ExportOptions, type ExportResult } from './workspace'

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

interface RelationPayloadEntry {
  field?: string
  class?: Ref<Class<Doc>>
  direction?: 'forward' | 'inverse'
}

type RelationPayload = RelationPayloadEntry[] | Record<string, RelationPayloadEntry | Ref<Class<Doc>>>

const isRelationPayloadEntry = (value: unknown): value is RelationPayloadEntry =>
  value != null && typeof value === 'object'

const normalizeRelations = (input: unknown): RelationDefinition[] | undefined => {
  if (input == null) {
    return undefined
  }

  const result: RelationDefinition[] = []

  if (Array.isArray(input)) {
    for (const item of input as RelationPayloadEntry[]) {
      if (!isRelationPayloadEntry(item)) {
        continue
      }

      if (item.class === undefined || typeof item.field !== 'string') {
        continue
      }

      result.push({
        field: item.field,
        class: item.class,
        direction: item.direction ?? 'forward'
      })
    }

    return result.length > 0 ? result : undefined
  }

  if (typeof input === 'object') {
    const entries = Object.entries(input as RelationPayload)
    for (const [key, value] of entries) {
      if (!isRelationPayloadEntry(value) && typeof value !== 'string') {
        continue
      }

      if (typeof value === 'string') {
        result.push({ field: key, class: value as Ref<Class<Doc>>, direction: 'forward' })
        continue
      }

      if (!isRelationPayloadEntry(value) || value.class === undefined) {
        continue
      }

      const field = typeof value.field === 'string' ? value.field : key
      result.push({ field, class: value.class, direction: value.direction ?? 'forward' })
    }

    return result.length > 0 ? result : undefined
  }

  return undefined
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

export function createServer (
  storageConfig: StorageConfiguration,
  dbUrl: string,
  model: Tx[],
  measureCtx: MeasureContext
): { app: Express, close: () => void } {
  const storageAdapter = buildStorageFromConfig(storageConfig)

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

      const decodedToken = decodeToken(token)
      if (decodedToken.extra?.readonly !== undefined) {
        throw new ApiError(403, 'Forbidden')
      }
      const isAdmin: boolean = decodedToken.extra?.admin === 'true'

      const accountClient = getClient(envConfig.AccountsUrl, token)

      try {
        const info = await accountClient.getLoginWithWorkspaceInfo()
        const winfo = info.workspaces[decodedToken.workspace]
        if (!isAdmin) {
          if (winfo === undefined) {
            res.status(401).end('Invalid workspace')
            return
          } else {
            if (winfo.role !== AccountRole.Owner) {
              res.status(401).end('Not an owner of workspace')
              return
            }
          }
        }
      } catch (err: any) {
        res.status(401).end('Invalid workspace')
        return
      }

      const sysToken = generateToken(systemAccountUuid, decodedToken.workspace, {
        service: 'export'
      })

      const platformClient = await createPlatformClient(sysToken)
      const account = decodedToken.account

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
          measureCtx.error('Export failed:', err)
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
        measureCtx.error('Export failed:', err)
        throw err
      } finally {
        void fs.rmdir(exportDir, { recursive: true })
      }
    })
  )

  app.post(
    '/export-to-workspace',
    wrapRequest(async (req, res, wsIds, token, socialId) => {
      let decodedToken: Token | undefined

      try {
        const {
          targetWorkspace,
          _class,
          query,
          conflictStrategy,
          includeAttachments,
          relations: rawRelations,
          fieldMappers
        }: {
          targetWorkspace: WorkspaceUuid
          _class: Ref<Class<Doc>>
          query?: DocumentQuery<Doc>
          conflictStrategy?: 'skip' | 'duplicate'
          includeAttachments?: boolean
          relations?: RelationPayload
          objectId?: Ref<Doc>
          objectSpace?: Ref<Space>
          fieldMappers?: Record<string, Record<string, any>>
        } = req.body

        // Validate required parameters
        if (targetWorkspace == null || typeof targetWorkspace !== 'string') {
          measureCtx.warn(`Invalid targetWorkspace parameter: ${String(targetWorkspace)}`)
          throw new ApiError(400, 'Missing or invalid required parameter: targetWorkspace')
        }
        if (_class == null || typeof _class !== 'string') {
          measureCtx.warn(`Invalid _class parameter: ${String(_class)}`)
          throw new ApiError(400, 'Missing or invalid required parameter: _class')
        }
        if (conflictStrategy !== undefined && conflictStrategy !== 'skip' && conflictStrategy !== 'duplicate') {
          measureCtx.warn(`Invalid conflictStrategy: ${String(conflictStrategy)}`)
          throw new ApiError(400, 'Invalid conflictStrategy. Must be "skip" or "duplicate"')
        }
        if (includeAttachments !== undefined && typeof includeAttachments !== 'boolean') {
          measureCtx.warn(`Invalid includeAttachments: ${String(includeAttachments)}`)
          throw new ApiError(400, 'Invalid includeAttachments. Must be boolean')
        }

        decodedToken = decodeToken(token)
        if (decodedToken.extra?.readonly !== undefined) {
          throw new ApiError(403, 'Forbidden: read-only token')
        }

        // Get target workspace info
        const accountClient = getClient(envConfig.AccountsUrl, token)
        const targetWsLoginInfo = await accountClient.getLoginWithWorkspaceInfo()

        const targetWsInfo = targetWsLoginInfo.workspaces[targetWorkspace]
        if (targetWsInfo === undefined) {
          measureCtx.warn(`Target workspace not found or not accessible: ${targetWorkspace}`)
          throw new ApiError(404, 'Target workspace not found or not accessible')
        }

        // Verify user has write access to target workspace
        const isAdmin: boolean = decodedToken.extra?.admin === 'true'
        if (!isAdmin && targetWsInfo.role !== AccountRole.Owner) {
          measureCtx.warn(
            `User does not have write access to target workspace: ${targetWorkspace}, role: ${targetWsInfo.role}`
          )
          throw new ApiError(403, 'You do not have write access to the target workspace. Owner role required.')
        }

        const targetWsIds: WorkspaceIds = {
          uuid: targetWorkspace,
          dataId: targetWsInfo.dataId,
          url: targetWsInfo.url
        }

        const targetToken = generateToken(decodedToken.account, targetWorkspace, {
          service: 'export'
        })

        // Create clients for both workspaces
        const sourceClient = await createPlatformClient(token)
        const targetClient = await createPlatformClient(targetToken)
        const targetTxOps = new TxOperations(targetClient, socialId)

        try {
          // Create pipeline factory for source workspace using same approach as rating calculator
          const sourcePipelineFactory = async (ctx: MeasureContext, workspace: WorkspaceIds): Promise<Pipeline> => {
            const externalStorage = createDummyStorageAdapter()
            const dbConf = getConfig(ctx, dbUrl, ctx, {
              disableTriggers: true,
              externalStorage
            })

            const middlewares: MiddlewareCreator[] = [
              LowLevelMiddleware.create,
              ContextNameMiddleware.create,
              DomainFindMiddleware.create,
              DomainTxMiddleware.create,
              DBAdapterInitMiddleware.create,
              ModelMiddleware.create(model),
              DBAdapterMiddleware.create(dbConf)
            ]

            const hierarchy = new Hierarchy()
            const modelDb = new ModelDb(hierarchy)

            const context: PipelineContext = {
              workspace,
              branding: null,
              modelDb,
              hierarchy,
              storageAdapter: externalStorage,
              contextVars: {}
            }

            return await createPipeline(ctx, middlewares, context)
          }

          const exporter = new CrossWorkspaceExporter(
            measureCtx,
            sourcePipelineFactory,
            targetTxOps,
            storageAdapter,
            decodedToken.account,
            wsIds,
            targetWsIds
          )

          const relations = normalizeRelations(rawRelations)

          const options: ExportOptions = {
            sourceWorkspace: wsIds,
            targetWorkspace: targetWsIds,
            sourceQuery: query ?? {},
            _class,
            conflictStrategy: conflictStrategy ?? 'duplicate',
            includeAttachments: includeAttachments ?? true,
            relations,
            fieldMappers
          }

          const exportResult: ExportResult = await exporter.export(options)

          if (exportResult.success && exportResult.exportedCount > 0) {
            await sendExportCompletionEmail(
              measureCtx,
              targetWorkspace,
              targetWsIds,
              exportResult.exportedDocuments,
              wsIds
            )
          }

          res.status(200).send({ message: 'Export completed' })
        } catch (err: any) {
          measureCtx.error('Export failed:', err)
          res.status(500).send({ message: 'Export failed', error: err.message ?? 'Unknown error' })
        } finally {
          await sourceClient.close()
          await targetClient.close()
        }
      } catch (err: any) {
        measureCtx.error('Export to workspace request failed:', err)
        const errorMessage = err instanceof ApiError ? err.message : 'Export to workspace request failed'
        res.status(err instanceof ApiError ? err.code : 500).send({ message: errorMessage })
      }
    })
  )

  app.use((err: any, _req: any, res: any, _next: any) => {
    measureCtx.warn(err)
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

export function listen (e: Express, port: number, measureCtx: MeasureContext, host?: string): Server {
  const cb = (): void => {
    measureCtx.info(`Export service has been started at ${host ?? '*'}:${port}`)
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
  await storage.put(ctx, wsIds, blobId, fileContent, 'application/zip', fileContent.length)

  await createFile(client, exportDrive, drive.ids.Root, {
    title: basename(archivePath),
    file: blobId,
    size: fileContent.length,
    type: 'application/zip',
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

async function sendFailureNotification (
  client: TxOperations,
  account: AccountUuid,
  error: string,
  objectClass?: Ref<Class<Doc>>,
  objectId?: Ref<Doc>,
  objectSpace?: Ref<Space>
): Promise<void> {
  const _objectSpace = objectSpace ?? core.space.Space

  if (objectId === undefined || objectClass === undefined) {
    return
  }

  const docNotifyContextId = await client.createDoc(notification.class.DocNotifyContext, core.space.Space, {
    objectId,
    objectClass,
    objectSpace: _objectSpace,
    user: account,
    isPinned: false,
    hidden: false
  })

  await client.createDoc(notification.class.CommonInboxNotification, core.space.Space, {
    user: account,
    objectId,
    objectClass,
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
