/* eslint-disable @typescript-eslint/unbound-method */
import core, {
  type Class,
  type Doc,
  type Domain,
  generateId,
  Hierarchy,
  type IndexingUpdateEvent,
  type MeasureContext,
  ModelDb,
  type Ref,
  systemAccountUuid,
  type Tx,
  type TxWorkspaceEvent,
  WorkspaceEvent,
  type WorkspaceIds
} from '@hcengineering/core'
import {
  ContextNameMiddleware,
  DBAdapterInitMiddleware,
  DBAdapterMiddleware,
  DomainFindMiddleware,
  LowLevelMiddleware,
  ModelMiddleware
} from '@hcengineering/middleware'
import { PlatformError, unknownError } from '@hcengineering/platform'
import {
  type ConsumerControl,
  type ContentTextAdapter,
  createPipeline,
  type FullTextAdapter,
  type FulltextListener,
  type MiddlewareCreator,
  type Pipeline,
  type PipelineContext,
  type StorageAdapter
} from '@hcengineering/server-core'
import { FullTextIndexPipeline } from '@hcengineering/server-indexer'
import { getConfig } from '@hcengineering/server-pipeline'
import { generateToken } from '@hcengineering/server-token'
import { Api as CommunicationApi } from '@hcengineering/communication-server'

import { fulltextModelFilter } from './utils'

export class WorkspaceIndexer {
  fulltext!: FullTextIndexPipeline
  pipeline!: Pipeline

  lastUpdate: number = Date.now()

  operations: number = 0
  closing: boolean = false

  constructor (readonly fulltextAdapter: FullTextAdapter) {}

  static async create (
    ctx: MeasureContext,
    model: Tx[],
    workspace: WorkspaceIds,
    dbURL: string,
    externalStorage: StorageAdapter,
    ftadapter: FullTextAdapter,
    contentAdapter: ContentTextAdapter,
    endpointProvider: (token: string) => Promise<string | undefined>,
    listener?: FulltextListener
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
      contextVars: {}
    }
    result.pipeline = await createPipeline(ctx, middlewares, context)

    const defaultAdapter = result.pipeline.context.adapterManager?.getDefaultAdapter()
    if (defaultAdapter === undefined) {
      throw new PlatformError(unknownError('Default adapter should be set'))
    }

    const token = generateToken(systemAccountUuid, workspace.uuid, { service: 'fulltext' })
    const transactorEndpoint = await endpointProvider(token)

    let communicationApi: CommunicationApi | undefined
    if (process.env.COMMUNICATION_API_ENABLED === 'true') {
      communicationApi = await CommunicationApi.create(ctx, workspace.uuid, dbURL, {
        broadcast: () => {},
        enqueue: () => {},
        registerAsyncRequest: () => {}
      })
    }

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
        if (transactorEndpoint !== undefined) {
          void fetch(transactorEndpoint + `/api/v1/broadcast?workspace=${workspace.uuid}`, {
            method: 'PUT',
            keepalive: true,
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(tx)
          }).catch((err) => {
            ctx.error('failed to send broadcast', { err })
          })
        }
      },
      communicationApi,
      listener
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

  async doOperation (op: (indexer: WorkspaceIndexer) => Promise<void>): Promise<boolean> {
    this.operations++
    try {
      await op(this)
    } finally {
      this.operations--
    }
    if (this.closing) {
      return await this.close()
    }
    return false
  }

  async close (): Promise<boolean> {
    this.closing = true
    if (this.operations === 0) {
      try {
        this.fulltext.cancel()
        await this.pipeline.close()
      } catch (err: any) {
        console.error('error during closing', { err })
      }
      return true
    }
    return false
  }
}
