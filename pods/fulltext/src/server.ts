/* eslint-disable @typescript-eslint/unbound-method */
import { Analytics } from '@hcengineering/analytics'
import type {
  Class,
  Doc,
  DocumentQuery,
  IndexingUpdateEvent,
  MeasureContext,
  Ref,
  SearchOptions,
  SearchQuery,
  Tx,
  TxWorkspaceEvent,
  WorkspaceId,
  WorkspaceIdWithUrl
} from '@hcengineering/core'
import core, {
  DOMAIN_DOC_INDEX_STATE,
  generateId,
  Hierarchy,
  ModelDb,
  systemAccountEmail,
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
import { createMongoAdapter, createMongoDestroyAdapter, createMongoTxAdapter } from '@hcengineering/mongo'
import { PlatformError, setMetadata, unknownError } from '@hcengineering/platform'
import { createPostgreeDestroyAdapter, createPostgresAdapter, createPostgresTxAdapter } from '@hcengineering/postgres'
import serverClientPlugin, { getTransactorEndpoint, getWorkspaceInfo } from '@hcengineering/server-client'
import serverCore, {
  createContentAdapter,
  createPipeline,
  type ContentTextAdapter,
  type FullTextAdapter,
  type MiddlewareCreator,
  type Pipeline,
  type PipelineContext,
  type StorageAdapter
} from '@hcengineering/server-core'
import { FullTextIndexPipeline, searchFulltext, type FulltextDBConfiguration } from '@hcengineering/server-indexer'
import {
  getConfig,
  registerAdapterFactory,
  registerDestroyFactory,
  registerServerPlugins,
  registerStringLoaders,
  registerTxAdapterFactory
} from '@hcengineering/server-pipeline'
import serverToken, { decodeToken, generateToken, type Token } from '@hcengineering/server-token'
import cors from '@koa/cors'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'

class WorkspaceIndexer {
  fulltext!: FullTextIndexPipeline
  pipeline!: Pipeline

  lastUpdate: number = Date.now()

  constructor (readonly fulltextAdapter: FullTextAdapter) {}

  static async create (
    ctx: MeasureContext,
    model: Tx[],
    workspace: WorkspaceIdWithUrl,
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
      storageAdapter: externalStorage
    }
    result.pipeline = await createPipeline(ctx, middlewares, context)

    const defaultAdapter = result.pipeline.context.adapterManager?.getDefaultAdapter()
    if (defaultAdapter === undefined) {
      throw new PlatformError(unknownError('Default adapter should be set'))
    }

    const token = generateToken(systemAccountEmail, workspace)
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
        void fetch(transactorEndpoint + `/api/v1/broadcast?token=${token}&workspace=${workspace.name}`, {
          method: 'PUT',
          body: JSON.stringify(tx)
        })
      },
      async () => {
        const helper = result.pipeline.context.adapterManager?.domainHelper
        if (helper !== undefined) {
          const dhelper = result.pipeline.context.adapterManager?.getAdapter(DOMAIN_DOC_INDEX_STATE, true).helper?.()
          if (dhelper !== undefined) {
            // Force creation of indexes for search domain
            await helper.checkDomain(ctx, DOMAIN_DOC_INDEX_STATE, 10000, dhelper)
          }
        }
      }
    )
    await result.fulltext.startIndexing(() => {
      result.lastUpdate = Date.now()
    })
    return result
  }

  async reindex (): Promise<void> {
    await this.fulltext.cancel()
    await this.fulltext.clearIndex()
    await this.fulltext.startIndexing(() => {
      this.lastUpdate = Date.now()
    })
  }

  async close (): Promise<void> {
    await this.fulltext.cancel()
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
}

export async function startIndexer (
  ctx: MeasureContext,
  opt: {
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

  setMetadata(serverToken.metadata.Secret, opt.serverSecret)
  setMetadata(serverCore.metadata.ElasticIndexName, opt.elasticIndexName)
  setMetadata(serverClientPlugin.metadata.Endpoint, opt.accountsUrl)

  registerTxAdapterFactory('mongodb', createMongoTxAdapter)
  registerAdapterFactory('mongodb', createMongoAdapter)
  registerDestroyFactory('mongodb', createMongoDestroyAdapter)

  registerTxAdapterFactory('postgresql', createPostgresTxAdapter, true)
  registerAdapterFactory('postgresql', createPostgresAdapter, true)
  registerDestroyFactory('postgresql', createPostgreeDestroyAdapter, true)

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

  async function getIndexer (
    ctx: MeasureContext,
    workspace: WorkspaceId,
    token: string,
    create: boolean = false
  ): Promise<WorkspaceIndexer | undefined> {
    const workspaceInfo = await getWorkspaceInfo(token)
    let idx = indexers.get(workspace.name)
    if (idx === undefined && create) {
      if (workspaceInfo === undefined) {
        ctx.error('Workspace not available for token')
        return
      }
      ctx.warn('indexer created', { workspace: workspace.name })
      idx = WorkspaceIndexer.create(
        ctx,
        opt.model,
        {
          ...workspace,
          uuid: workspaceInfo.uuid,
          workspaceName: workspaceInfo.workspaceName ?? workspaceInfo.workspace,
          workspaceUrl: workspaceInfo.workspaceUrl ?? workspaceInfo.workspace
        },
        opt.dbURL,
        opt.externalStorage,
        fulltextAdapter,
        contentAdapter
      )
      indexers.set(workspace.name, idx)
    }
    if (idx instanceof Promise) {
      idx = await idx
      indexers.set(workspace.name, idx)
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
      const decoded = decodeToken(request.token) // Just to be safe

      ctx.info('search', { classes: request._classes, query: request.query, workspace: decoded.workspace })
      await ctx.with('search', {}, async (ctx) => {
        const docs = await ctx.with('search', { workspace: decoded.workspace.name }, (ctx) =>
          fulltextAdapter.search(ctx, decoded.workspace, request._classes, request.query, request.fullTextLimit)
        )
        req.body = docs
      })

      void triggerIndexer(decoded, request.token)
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
      const decoded = decodeToken(request.token) // Just to be safe
      ctx.info('fulltext-search', { ...request.query, workspace: decoded.workspace })
      await ctx.with('full-text-search', {}, async (ctx) => {
        const result = await ctx.with('searchFulltext', {}, (ctx) =>
          searchFulltext(ctx, decoded.workspace, sysHierarchy, fulltextAdapter, request.query, request.options)
        )
        req.body = result
      })

      void triggerIndexer(decoded, request.token)
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
      req.res.writeHead(404, {})
      req.res.end()
    }
  })

  router.put('/api/v1/warmup', async (req, res) => {
    try {
      const request = req.request.body as IndexDocuments
      const decoded = decodeToken(request.token) // Just to be safe
      req.body = {}

      ctx.info('warm-up', { workspace: decoded.workspace })
      void triggerIndexer(decoded, request.token, true)
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
      const decoded = decodeToken(request.token) // Just to be safe
      req.body = {}

      ctx.info('close', { workspace: decoded.workspace })
      const idx = indexers.get(decoded.workspace.name)
      indexers.delete(decoded.workspace.name)
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
      const decoded = decodeToken(request.token) // Just to be safe

      const indexer = await getIndexer(ctx, decoded.workspace, request.token)
      if (indexer !== undefined) {
        indexer.lastUpdate = Date.now()
        await ctx.with('index-documents', {}, (ctx) => indexer.fulltext.indexDocuments(ctx, request.requests))
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
      const decoded = decodeToken(request.token) // Just to be safe
      req.body = {}

      ctx.info('reindex', { workspace: decoded.workspace })
      const indexer = await getIndexer(ctx, decoded.workspace, request.token, true)
      if (indexer !== undefined) {
        indexer.lastUpdate = Date.now()
        await indexer.reindex()
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
    clearInterval(shutdownInterval)
    server.close()
  }

  return close

  async function triggerIndexer (decoded: Token, token: string, trigger: boolean = false): Promise<void> {
    const indexer = await getIndexer(ctx, decoded.workspace, token, trigger)
    if (indexer !== undefined) {
      indexer.lastUpdate = Date.now()
      if (trigger) {
        indexer.fulltext.triggerIndexing()
      }
    }
  }
}
