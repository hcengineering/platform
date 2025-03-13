/* eslint-disable @typescript-eslint/unbound-method */
import { Analytics } from '@hcengineering/analytics'
import type {
  Class,
  Doc,
  DocumentQuery,
  Domain,
  IndexingUpdateEvent,
  MeasureContext,
  Ref,
  SearchOptions,
  SearchQuery,
  Tx,
  TxCUD,
  TxWorkspaceEvent,
  WorkspaceIds,
  WorkspaceUuid
} from '@hcengineering/core'
import core, {
  generateId,
  Hierarchy,
  ModelDb,
  systemAccountUuid,
  TxProcessor,
  WorkspaceEvent
} from '@hcengineering/core'
import {
  ContextNameMiddleware,
  DBAdapterInitMiddleware,
  DBAdapterMiddleware,
  DomainFindMiddleware,
  LowLevelMiddleware,
  ModelMiddleware
} from '@hcengineering/middleware'
import {
  createMongoAdapter,
  createMongoDestroyAdapter,
  createMongoTxAdapter,
  shutdownMongo
} from '@hcengineering/mongo'
import { PlatformError, setMetadata, unknownError } from '@hcengineering/platform'
import {
  createPostgreeDestroyAdapter,
  createPostgresAdapter,
  createPostgresTxAdapter,
  setDBExtraOptions,
  shutdownPostgres
} from '@hcengineering/postgres'
import serverClientPlugin, { getAccountClient, getTransactorEndpoint } from '@hcengineering/server-client'
import serverCore, {
  createContentAdapter,
  createPipeline,
  QueueTopic,
  QueueWorkspaceEvent,
  workspaceEvents,
  type ConsumerControl,
  type ContentTextAdapter,
  type FullTextAdapter,
  type MiddlewareCreator,
  type Pipeline,
  type PipelineContext,
  type PlatformQueue,
  type QueueWorkspaceMessage,
  type QueueWorkspaceReindexMessage,
  type StorageAdapter
} from '@hcengineering/server-core'
import { FullTextIndexPipeline, searchFulltext, type FulltextDBConfiguration } from '@hcengineering/server-indexer'
import {
  getConfig,
  registerAdapterFactory,
  registerDestroyFactory,
  registerServerPlugins,
  registerStringLoaders,
  registerTxAdapterFactory,
  setAdapterSecurity,
  sharedPipelineContextVars
} from '@hcengineering/server-pipeline'
import serverToken, { decodeToken, generateToken } from '@hcengineering/server-token'
import cors from '@koa/cors'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'

function fulltextModelFilter (h: Hierarchy, model: Tx[]): Tx[] {
  const allowedClasess: Ref<Class<Doc>>[] = [
    core.class.Class,
    core.class.Attribute,
    core.class.Mixin,
    core.class.Type,
    core.class.Status,
    core.class.Permission,
    core.class.Space,
    core.class.Tx,
    core.class.FullTextSearchContext
  ]
  return model.filter(
    (it) =>
      TxProcessor.isExtendsCUD(it._class) &&
      allowedClasess.some((cl) => h.isDerived((it as TxCUD<Doc>).objectClass, cl))
  )
}

class WorkspaceIndexer {
  fulltext!: FullTextIndexPipeline
  pipeline!: Pipeline

  lastUpdate: number = Date.now()

  constructor (readonly fulltextAdapter: FullTextAdapter) {}

  static async create (
    ctx: MeasureContext,
    model: Tx[],
    workspace: WorkspaceIds,
    dbURL: string,
    externalStorage: StorageAdapter,
    ftadapter: FullTextAdapter,
    contentAdapter: ContentTextAdapter
  ): Promise<WorkspaceIndexer> {
    const result = new WorkspaceIndexer(ftadapter)
    const dbConf = getConfig(ctx, dbURL, ctx, {
      disableTriggers: true,
      externalStorage
    })

    const middlewares: MiddlewareCreator[] = [
      LowLevelMiddleware.create,
      ContextNameMiddleware.create,
      DomainFindMiddleware.create,
      DBAdapterInitMiddleware.create,
      ModelMiddleware.create(model, fulltextModelFilter), // TODO: Add filtration of only class structure and FullTextSearchContext
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
      contextVars: {},
      // TODO: Communication API ??
      communicationApi: null
    }
    result.pipeline = await createPipeline(ctx, middlewares, context)

    const defaultAdapter = result.pipeline.context.adapterManager?.getDefaultAdapter()
    if (defaultAdapter === undefined) {
      throw new PlatformError(unknownError('Default adapter should be set'))
    }

    const token = generateToken(systemAccountUuid, workspace.uuid)
    const transactorEndpoint = (await getTransactorEndpoint(token, 'internal'))
      .replace('wss://', 'https://')
      .replace('ws://', 'http://')

    result.fulltext = new FullTextIndexPipeline(
      ftadapter,
      defaultAdapter,
      hierarchy,
      workspace,
      ctx,
      modelDb,
      externalStorage,
      contentAdapter,
      (ctx: MeasureContext, classes: Ref<Class<Doc>>[]) => {
        ctx.info('broadcast indexing update', { classes, workspace })
        const evt: IndexingUpdateEvent = {
          _class: classes
        }
        const tx: TxWorkspaceEvent = {
          _class: core.class.TxWorkspaceEvent,
          _id: generateId(),
          event: WorkspaceEvent.IndexingUpdate,
          modifiedBy: core.account.System,
          modifiedOn: Date.now(),
          objectSpace: core.space.DerivedTx,
          space: core.space.DerivedTx,
          params: evt
        }
        // Send tx to pipeline
        // TODO: Fix me
        void fetch(transactorEndpoint + `/api/v1/broadcast?workspace=${workspace.uuid}`, {
          method: 'PUT',
          keepalive: true,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(tx)
        })
      }
    )
    return result
  }

  async reindex (
    ctx: MeasureContext,
    domain: Domain,
    classes: Ref<Class<Doc>>[],
    control?: ConsumerControl
  ): Promise<void> {
    await this.fulltext.reindex(ctx, domain, classes, control)
  }

  async dropWorkspace (): Promise<void> {
    await this.fulltext.dropWorkspace()
  }

  async getIndexClassess (): Promise<{ domain: Domain, classes: Ref<Class<Doc>>[] }[]> {
    return await this.fulltext.getIndexClassess()
  }

  async close (): Promise<void> {
    await this.pipeline.close()
  }
}

interface IndexDocuments {
  token: string
  requests: {
    _class: Ref<Class<Doc>>
    _id: Ref<Doc>
  }[]
}

interface FulltextSearch {
  token: string
  query: SearchQuery
  options: SearchOptions
}

interface Search {
  token: string
  _classes: Ref<Class<Doc>>[]
  query: DocumentQuery<Doc>
  fullTextLimit: number
}

interface Reindex {
  token: string
  onlyDrop?: boolean
}
// Register close on process exit.
process.on('exit', () => {
  shutdownPostgres(sharedPipelineContextVars).catch((err) => {
    console.error(err)
  })
  shutdownMongo(sharedPipelineContextVars).catch((err) => {
    console.error(err)
  })
})

export async function startIndexer (
  ctx: MeasureContext,
  opt: {
    queue: PlatformQueue
    model: Tx[]
    dbURL: string
    config: FulltextDBConfiguration
    externalStorage: StorageAdapter
    elasticIndexName: string
    port: number
    serverSecret: string
    accountsUrl: string
  }
): Promise<() => void> {
  const closeTimeout = 5 * 60 * 1000

  const usePrepare = (process.env.DB_PREPARE ?? 'true') === 'true'

  setDBExtraOptions({
    prepare: usePrepare // We override defaults
  })

  setMetadata(serverToken.metadata.Secret, opt.serverSecret)
  setMetadata(serverCore.metadata.ElasticIndexName, opt.elasticIndexName)
  setMetadata(serverClientPlugin.metadata.Endpoint, opt.accountsUrl)

  registerTxAdapterFactory('mongodb', createMongoTxAdapter)
  registerAdapterFactory('mongodb', createMongoAdapter)
  registerDestroyFactory('mongodb', createMongoDestroyAdapter)

  registerTxAdapterFactory('postgresql', createPostgresTxAdapter, true)
  registerAdapterFactory('postgresql', createPostgresAdapter, true)
  registerDestroyFactory('postgresql', createPostgreeDestroyAdapter, true)
  setAdapterSecurity('postgresql', true)

  registerServerPlugins()
  registerStringLoaders()

  const sysHierarchy = new Hierarchy()
  for (const tx of opt.model) {
    sysHierarchy.tx(tx)
  }

  const app = new Koa()
  const router = new Router()

  const indexers = new Map<string, WorkspaceIndexer | Promise<WorkspaceIndexer>>()

  const contentAdapter = await ctx.with('create content adapter', {}, (ctx) =>
    createContentAdapter(opt.config.contentAdapters, opt.config.defaultContentAdapter)
  )
  const fulltextAdapter = await opt.config.fulltextAdapter.factory(opt.config.fulltextAdapter.url)

  await fulltextAdapter.initMapping(ctx)

  const shutdownInterval = setInterval(() => {
    for (const [k, v] of [...indexers.entries()]) {
      if (v instanceof Promise) {
        continue
      }
      if (Date.now() - v.lastUpdate > closeTimeout) {
        indexers.delete(k)
        void v.close()
      }
    }
  }, closeTimeout) // Every 5 minutes we should close unused indexes.

  const workspaceProducer = opt.queue.createProducer<QueueWorkspaceMessage>(ctx, QueueTopic.Workspace)

  const workspaceConsumer = opt.queue.createConsumer<QueueWorkspaceMessage>(
    ctx,
    QueueTopic.Workspace,
    opt.queue.getClientId(),
    async (msg, control) => {
      for (const m of msg) {
        ctx.info('workspace message', { message: m })
        const ws = m.id as WorkspaceUuid

        for (const mm of m.value) {
          if (
            mm.type === QueueWorkspaceEvent.Created ||
            mm.type === QueueWorkspaceEvent.Restored ||
            mm.type === QueueWorkspaceEvent.FullReindex
          ) {
            const indexer = await getIndexer(ctx, ws, generateToken(systemAccountUuid, ws), true)
            if (indexer !== undefined) {
              await indexer.dropWorkspace() // TODO: Add heartbeat
              const classes = await indexer.getIndexClassess()
              await workspaceProducer.send(
                ws,
                classes.map((it) => workspaceEvents.reindex(it.domain, it.classes))
              )
            }
          } else if (
            mm.type === QueueWorkspaceEvent.Deleted ||
            mm.type === QueueWorkspaceEvent.Archived ||
            mm.type === QueueWorkspaceEvent.ClearIndex
          ) {
            const token = generateToken(systemAccountUuid, ws)
            const accountClient = getAccountClient(token)
            const workspaceInfo = await accountClient.getWorkspaceInfo(false)
            if (workspaceInfo !== undefined) {
              if (workspaceInfo.dataId != null) {
                await fulltextAdapter.clean(ctx, workspaceInfo.dataId as unknown as WorkspaceUuid)
              }
              await fulltextAdapter.clean(ctx, workspaceInfo.uuid)
            }
          } else if (mm.type === QueueWorkspaceEvent.Reindex) {
            const indexer = await getIndexer(ctx, ws, generateToken(systemAccountUuid, ws), true)
            const mmd = mm as QueueWorkspaceReindexMessage
            await indexer?.reindex(ctx, mmd.domain, mmd.classes, control)
          }
        }
      }
    }
  )

  let txInformer: any
  let txMessages: number = 0
  const txConsumer = opt.queue.createConsumer<TxCUD<Doc>>(
    ctx,
    QueueTopic.Tx,
    opt.queue.getClientId(),
    async (msg, control) => {
      clearTimeout(txInformer)
      txInformer = setTimeout(() => {
        ctx.info('tx message', { count: txMessages })
        txMessages = 0
      }, 5000)

      txMessages += msg.length
      for (const m of msg) {
        const ws = m.id as WorkspaceUuid

        const indexer = await getIndexer(ctx, ws, generateToken(systemAccountUuid, ws), true)
        await indexer?.fulltext.processDocuments(ctx, m.value, control)
      }
    }
  )

  async function getIndexer (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    token: string | undefined,
    create: boolean = false
  ): Promise<WorkspaceIndexer | undefined> {
    let idx = indexers.get(workspace)
    if (idx === undefined && create) {
      const accountClient = getAccountClient(token)
      const workspaceInfo = await accountClient.getWorkspaceInfo(false)
      if (workspaceInfo === undefined) {
        ctx.error('Workspace not available for token')
        return
      }
      ctx.warn('indexer created', { workspace })
      idx = WorkspaceIndexer.create(
        ctx,
        opt.model,
        {
          uuid: workspace,
          dataId: workspaceInfo.dataId,
          url: workspaceInfo.url
        },
        opt.dbURL,
        opt.externalStorage,
        fulltextAdapter,
        contentAdapter
      )
      indexers.set(workspace, idx)
    }
    if (idx instanceof Promise) {
      idx = await idx
      indexers.set(workspace, idx)
    }
    return idx
  }

  app.use(
    cors({
      credentials: true
    })
  )
  app.use(bodyParser())

  router.put('/api/v1/search', async (req, res) => {
    try {
      const request = req.request.body as Search
      const token = request.token ?? req.headers.authorization?.split(' ')[1]
      const decoded = decodeToken(token) // Just to be safe

      ctx.info('search', { classes: request._classes, query: request.query, workspace: decoded.workspace })
      await ctx.with('search', {}, async (ctx) => {
        const docs = await ctx.with('search', { workspace: decoded.workspace }, (ctx) =>
          fulltextAdapter.search(ctx, decoded.workspace, request._classes, request.query, request.fullTextLimit)
        )
        req.body = docs
      })
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
      req.res.writeHead(404, {})
      req.res.end()
    }
  })

  router.put('/api/v1/full-text-search', async (req, res) => {
    try {
      const request = req.request.body as FulltextSearch
      const token = request.token ?? req.headers.authorization?.split(' ')[1]
      const decoded = decodeToken(token) // Just to be safe
      ctx.info('fulltext-search', { ...request.query, workspace: decoded.workspace })
      await ctx.with('full-text-search', {}, async (ctx) => {
        const result = await ctx.with('searchFulltext', {}, (ctx) =>
          searchFulltext(ctx, decoded.workspace, sysHierarchy, fulltextAdapter, request.query, request.options)
        )
        req.body = result
      })
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
      req.res.writeHead(404, {})
      req.res.end()
    }
  })

  router.put('/api/v1/close', async (req, res) => {
    try {
      const request = req.request.body as IndexDocuments
      const token = request.token ?? req.headers.authorization?.split(' ')[1]
      const decoded = decodeToken(token) // Just to be safe
      req.body = {}

      ctx.info('close', { workspace: decoded.workspace })
      const idx = indexers.get(decoded.workspace)
      indexers.delete(decoded.workspace)
      if (idx !== undefined && idx instanceof Promise) {
        void idx.then((res) => {
          void res.close()
        })
      } else if (idx !== undefined) {
        void idx.close()
      }
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
      req.res.writeHead(404, {})
      req.res.end()
    }
  })

  router.put('/api/v1/index-documents', async (req, res) => {
    try {
      const request = req.request.body as IndexDocuments
      const token = request.token ?? req.headers.authorization?.split(' ')[1]
      const decoded = decodeToken(token) // Just to be safe

      const indexer = await getIndexer(ctx, decoded.workspace, token)
      if (indexer !== undefined) {
        indexer.lastUpdate = Date.now()
        // TODO: Fixme
        // await ctx.with('index-documents', {}, (ctx) => indexer.fulltext.indexDocuments(ctx, request.requests))
      }
      req.body = {}
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
      req.res.writeHead(404, {})
      req.res.end()
    }
  })

  router.put('/api/v1/reindex', async (req, res) => {
    try {
      const request = req.request.body as Reindex
      const token = request.token ?? req.headers.authorization?.split(' ')[1]
      const decoded = decodeToken(token) // Just to be safe
      req.body = {}

      ctx.info('reindex', { workspace: decoded.workspace })
      const indexer = await getIndexer(ctx, decoded.workspace, token, true)
      if (indexer !== undefined) {
        indexer.lastUpdate = Date.now()
        if (request?.onlyDrop ?? false) {
          await workspaceProducer.send(decoded.workspace, [workspaceEvents.clearIndex()])
        } else {
          await workspaceProducer.send(decoded.workspace, [workspaceEvents.fullReindex()])
        }
      }
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
      req.res.writeHead(404, {})
      req.res.end()
    }
  })

  app.use(router.routes()).use(router.allowedMethods())

  const server = app.listen(opt.port, () => {
    console.log(`server started on port ${opt.port}`)
  })

  const close = (): void => {
    void txConsumer.shutdown()
    void workspaceConsumer.shutdown()
    clearInterval(shutdownInterval)
    server.close()
  }

  return close
}
