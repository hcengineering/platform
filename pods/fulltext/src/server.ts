/* eslint-disable @typescript-eslint/unbound-method */
import { Analytics } from '@hcengineering/analytics'
import type {
  Class,
  Doc,
  DocumentQuery,
  MeasureContext,
  Ref,
  SearchOptions,
  SearchQuery,
  Tx
} from '@hcengineering/core'
import {
  createMongoAdapter,
  createMongoDestroyAdapter,
  createMongoTxAdapter,
  shutdownMongo
} from '@hcengineering/mongo'
import { setMetadata } from '@hcengineering/platform'
import {
  createPostgreeDestroyAdapter,
  createPostgresAdapter,
  createPostgresTxAdapter,
  setDBExtraOptions,
  shutdownPostgres
} from '@hcengineering/postgres'
import serverClientPlugin from '@hcengineering/server-client'
import serverCore, { workspaceEvents, type PlatformQueue, type StorageAdapter } from '@hcengineering/server-core'
import { searchFulltext, type FulltextDBConfiguration } from '@hcengineering/server-indexer'
import {
  registerAdapterFactory,
  registerDestroyFactory,
  registerServerPlugins,
  registerStringLoaders,
  registerTxAdapterFactory,
  setAdapterSecurity,
  sharedPipelineContextVars
} from '@hcengineering/server-pipeline'
import serverToken, { decodeToken } from '@hcengineering/server-token'
import cors from '@koa/cors'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'

import { WorkspaceManager } from './manager'

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

  const app = new Koa()
  const router = new Router()

  const manager = new WorkspaceManager(ctx, opt.model, { ...opt })
  await manager.startIndexer()
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
          manager.fulltextAdapter.search(ctx, decoded.workspace, request._classes, request.query, request.fullTextLimit)
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
          searchFulltext(
            ctx,
            decoded.workspace,
            manager.sysHierarchy,
            manager.fulltextAdapter,
            request.query,
            request.options
          )
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
      await manager.closeWorkspace(decoded.workspace)
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

      const indexer = await manager.getIndexer(ctx, decoded.workspace, token)
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
      const indexer = await manager.getIndexer(ctx, decoded.workspace, token, true)
      if (indexer !== undefined) {
        indexer.lastUpdate = Date.now()
        if (request?.onlyDrop ?? false) {
          await manager.workspaceProducer.send(decoded.workspace, [workspaceEvents.clearIndex()])
        } else {
          await manager.workspaceProducer.send(decoded.workspace, [workspaceEvents.fullReindex()])
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
    void manager.shutdown()
    void opt.queue.shutdown()
    server.close()
  }

  return close
}
