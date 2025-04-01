/* eslint-disable @typescript-eslint/unbound-method */
import type { Doc, MeasureContext, Space, Tx, TxCUD, WorkspaceInfoWithStatus, WorkspaceUuid } from '@hcengineering/core'
import { Hierarchy, systemAccountUuid } from '@hcengineering/core'
import { getAccountClient, getTransactorEndpoint } from '@hcengineering/server-client'
import {
  createContentAdapter,
  QueueTopic,
  QueueWorkspaceEvent,
  workspaceEvents,
  type ConsumerControl,
  type ConsumerHandle,
  type ConsumerMessage,
  type ContentTextAdapter,
  type FullTextAdapter,
  type FulltextListener,
  type PlatformQueue,
  type PlatformQueueProducer,
  type QueueWorkspaceMessage,
  type QueueWorkspaceReindexMessage,
  type StorageAdapter
} from '@hcengineering/server-core'
import { type FulltextDBConfiguration } from '@hcengineering/server-indexer'
import { generateToken } from '@hcengineering/server-token'

import { WorkspaceIndexer } from './workspace'

const closeTimeout = 5 * 60 * 1000

export class WorkspaceManager {
  indexers = new Map<string, WorkspaceIndexer | Promise<WorkspaceIndexer>>()
  sysHierarchy = new Hierarchy()

  workspaceConsumer?: ConsumerHandle
  txConsumer?: ConsumerHandle

  constructor (
    readonly ctx: MeasureContext,
    readonly model: Tx[],
    private readonly opt: {
      queue: PlatformQueue
      dbURL: string
      config: FulltextDBConfiguration
      externalStorage: StorageAdapter
      elasticIndexName: string
      serverSecret: string
      accountsUrl: string
      listener?: FulltextListener
    }
  ) {
    for (const tx of model) {
      this.sysHierarchy.tx(tx)
    }

    this.workspaceProducer = this.opt.queue.createProducer<QueueWorkspaceMessage>(this.ctx, QueueTopic.Workspace)
  }

  shutdownInterval: any

  contentAdapter!: ContentTextAdapter

  fulltextAdapter!: FullTextAdapter

  workspaceProducer!: PlatformQueueProducer<QueueWorkspaceMessage>

  txInformer: any

  async startIndexer (): Promise<void> {
    this.contentAdapter = await this.ctx.with('create content adapter', {}, (ctx) =>
      createContentAdapter(this.opt.config.contentAdapters, this.opt.config.defaultContentAdapter)
    )
    this.fulltextAdapter = await this.opt.config.fulltextAdapter.factory(this.opt.config.fulltextAdapter.url)

    await this.fulltextAdapter.initMapping(this.ctx)

    this.shutdownInterval = setInterval(() => {
      for (const [k, v] of [...this.indexers.entries()]) {
        if (v instanceof Promise) {
          continue
        }
        if (Date.now() - v.lastUpdate > closeTimeout) {
          this.indexers.delete(k)
          void v.close()
        }
      }
    }, closeTimeout) // Every 5 minutes we should close unused indexes.

    this.workspaceConsumer = this.opt.queue.createConsumer<QueueWorkspaceMessage>(
      this.ctx,
      QueueTopic.Workspace,
      this.opt.queue.getClientId(),
      async (msg, control) => {
        await this.processWorkspaceEvent(msg, control)
      }
    )

    let txMessages: number = 0
    this.txConsumer = this.opt.queue.createConsumer<TxCUD<Doc>>(
      this.ctx,
      QueueTopic.Tx,
      this.opt.queue.getClientId(),
      async (msg, control) => {
        clearTimeout(this.txInformer)
        this.txInformer = setTimeout(() => {
          this.ctx.info('tx message', { count: txMessages })
          txMessages = 0
        }, 5000)

        txMessages += msg.length

        await this.processDocuments(msg, control)
      }
    )
  }

  private async processDocuments (msg: ConsumerMessage<TxCUD<Doc<Space>>>[], control: ConsumerControl): Promise<void> {
    for (const m of msg) {
      const ws = m.id as WorkspaceUuid

      const indexer = await this.getIndexer(this.ctx, ws, generateToken(systemAccountUuid, ws), true)
      await indexer?.fulltext.processDocuments(this.ctx, m.value, control)
    }
  }

  private async processWorkspaceEvent (
    msg: ConsumerMessage<QueueWorkspaceMessage>[],
    control: ConsumerControl
  ): Promise<void> {
    for (const m of msg) {
      this.ctx.info('workspace message', { message: m })
      const ws = m.id as WorkspaceUuid

      for (const mm of m.value) {
        if (
          mm.type === QueueWorkspaceEvent.Created ||
          mm.type === QueueWorkspaceEvent.Restored ||
          mm.type === QueueWorkspaceEvent.FullReindex
        ) {
          const indexer = await this.getIndexer(this.ctx, ws, generateToken(systemAccountUuid, ws), true)
          if (indexer !== undefined) {
            await indexer.dropWorkspace() // TODO: Add heartbeat
            const classes = await indexer.getIndexClassess()
            await this.workspaceProducer.send(
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
          const workspaceInfo = await this.getWorkspaceInfo(token)
          if (workspaceInfo !== undefined) {
            if (workspaceInfo.dataId != null) {
              await this.fulltextAdapter.clean(this.ctx, workspaceInfo.dataId as unknown as WorkspaceUuid)
            }
            await this.fulltextAdapter.clean(this.ctx, workspaceInfo.uuid)
          }
        } else if (mm.type === QueueWorkspaceEvent.Reindex) {
          const indexer = await this.getIndexer(this.ctx, ws, generateToken(systemAccountUuid, ws), true)
          const mmd = mm as QueueWorkspaceReindexMessage
          await indexer?.reindex(this.ctx, mmd.domain, mmd.classes, control)
        }
      }
    }
  }

  public async getWorkspaceInfo (token?: string): Promise<WorkspaceInfoWithStatus | undefined> {
    const accountClient = getAccountClient(token)
    return await accountClient.getWorkspaceInfo(false)
  }

  async getTransactorAPIEndpoint (token: string): Promise<string | undefined> {
    return (await getTransactorEndpoint(token, 'internal')).replace('wss://', 'https://').replace('ws://', 'http://')
  }

  async getIndexer (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    token: string | undefined,
    create: boolean = false
  ): Promise<WorkspaceIndexer | undefined> {
    let idx = this.indexers.get(workspace)
    if (idx === undefined && create) {
      const workspaceInfo = await this.getWorkspaceInfo(token)
      if (workspaceInfo === undefined) {
        ctx.error('Workspace not available for token')
        return
      }
      ctx.warn('indexer created', { workspace })
      idx = WorkspaceIndexer.create(
        ctx,
        this.model,
        {
          uuid: workspace,
          dataId: workspaceInfo.dataId,
          url: workspaceInfo.url
        },
        this.opt.dbURL,
        this.opt.externalStorage,
        this.fulltextAdapter,
        this.contentAdapter,
        (token) => this.getTransactorAPIEndpoint(token),
        this.opt.listener
      )
      this.indexers.set(workspace, idx)
    }
    if (idx instanceof Promise) {
      idx = await idx
      this.indexers.set(workspace, idx)
    }
    return idx
  }

  async shutdown (deleteTopics: boolean = false): Promise<void> {
    clearInterval(this.shutdownInterval)
    clearTimeout(this.txInformer)
    await this.txConsumer?.close()
    await this.workspaceConsumer?.close()
    await this.workspaceProducer.close()

    for (const v of this.indexers.values()) {
      if (v instanceof Promise) {
        const d = await v
        await d.close()
      } else {
        await v.close()
      }
    }
    if (deleteTopics) {
      await this.opt.queue.deleteTopics()
    }
    await this.fulltextAdapter.close()
  }

  async closeWorkspace (workspace: WorkspaceUuid): Promise<void> {
    let idx = this.indexers.get(workspace)
    this.indexers.delete(workspace)
    if (idx !== undefined && idx instanceof Promise) {
      idx = await idx
    }
    await idx?.close()
  }
}
