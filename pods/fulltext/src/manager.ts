/* eslint-disable @typescript-eslint/unbound-method */
import type {
  Doc,
  MeasureContext,
  Space,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxDomainEvent,
  Version,
  WorkspaceInfoWithStatus,
  WorkspaceUuid
} from '@hcengineering/core'
import core, { Hierarchy, systemAccountUuid, TxProcessor, versionToString } from '@hcengineering/core'
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
import { type QueueSourced, type FulltextDBConfiguration } from '@hcengineering/server-indexer'
import { generateToken } from '@hcengineering/server-token'
import { type Event } from '@hcengineering/communication-sdk-types'

import { WorkspaceIndexer } from './workspace'

const closeTimeout = 5 * 60 * 1000

export class WorkspaceManager {
  indexers = new Map<string, WorkspaceIndexer | Promise<WorkspaceIndexer>>()

  restoring = new Set<WorkspaceUuid>()
  sysHierarchy = new Hierarchy()

  workspaceConsumer?: ConsumerHandle

  fulltextConsumer?: ConsumerHandle
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
    this.supportedVersion = TxProcessor.createDoc2Doc(
      model.find(
        (it) => TxProcessor.isExtendsCUD(it._class) && (it as TxCUD<Doc>).objectClass === core.class.Version
      ) as TxCreateDoc<Version>
    )
    this.fulltextProducer = this.opt.queue.getProducer<QueueWorkspaceMessage>(this.ctx, QueueTopic.Fulltext)
  }

  shutdownInterval: any

  contentAdapter!: ContentTextAdapter

  fulltextAdapter!: FullTextAdapter

  fulltextProducer!: PlatformQueueProducer<QueueWorkspaceMessage>

  txInformer: any

  supportedVersion: Version

  async startIndexer (): Promise<void> {
    this.contentAdapter = await this.ctx.with('create content adapter', {}, (ctx) =>
      createContentAdapter(this.opt.config.contentAdapters, this.opt.config.defaultContentAdapter)
    )
    this.fulltextAdapter = await this.opt.config.fulltextAdapter.factory(this.opt.config.fulltextAdapter.url)

    let adapterInitialized = false
    while (!adapterInitialized) {
      adapterInitialized = await this.fulltextAdapter.initMapping(this.ctx)
      if (!adapterInitialized) {
        this.ctx.warn('Failed to initialize indexer mapping, retrying in 5 s')
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }

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
      async (ctx, msg, control) => {
        await this.processWorkspaceEvent(ctx, msg, control)
      }
    )

    this.fulltextConsumer = this.opt.queue.createConsumer<QueueWorkspaceMessage>(
      this.ctx,
      QueueTopic.Fulltext,
      this.opt.queue.getClientId(),
      async (ctx, msg, control) => {
        await this.processFulltextEvent(msg, control)
      }
    )

    let txMessages: number = 0
    this.txConsumer = this.opt.queue.createConsumer<TxCUD<Doc> | TxDomainEvent<QueueSourced<Event>>>(
      this.ctx,
      QueueTopic.Tx,
      this.opt.queue.getClientId(),
      async (ctx, msg, control) => {
        clearTimeout(this.txInformer)
        this.txInformer = setTimeout(() => {
          this.ctx.info('tx message', { count: txMessages })
          txMessages = 0
        }, 5000)

        txMessages += 1

        await this.processTransactions(msg, control)
      }
    )
  }

  private async processTransactions (
    m: ConsumerMessage<TxCUD<Doc<Space>> | TxDomainEvent<QueueSourced<Event>>>,
    control: ConsumerControl
  ): Promise<void> {
    const ws = m.workspace

    let token: string
    try {
      token = generateToken(systemAccountUuid, ws, { service: 'fulltext' })
    } catch (err: any) {
      this.ctx.error('Error generating token', { err, systemAccountUuid, ws })
      throw err
    }

    await this.withIndexer(this.ctx, ws, token, true, async (indexer) => {
      await indexer.fulltext.processTransactions(this.ctx, [m.value], control)
    })
  }

  private async processWorkspaceEvent (
    ctx: MeasureContext,
    m: ConsumerMessage<QueueWorkspaceMessage>,
    control: ConsumerControl
  ): Promise<void> {
    const ws = m.workspace
    const mm = m.value

    this.ctx.info('workspace event', { type: mm.type, workspace: ws, restoring: Array.from(this.restoring) })
    let token: string
    try {
      token = generateToken(systemAccountUuid, ws, { service: 'fulltext' })
    } catch (err: any) {
      this.ctx.error('Error generating token', { err, systemAccountUuid, ws })
      return
    }

    if (mm.type === QueueWorkspaceEvent.Restoring) {
      this.restoring.add(ws)
      await this.closeWorkspace(ws)
    } else if (
      mm.type === QueueWorkspaceEvent.Created ||
      mm.type === QueueWorkspaceEvent.Restored ||
      mm.type === QueueWorkspaceEvent.FullReindex
    ) {
      if (mm.type === QueueWorkspaceEvent.Restored) {
        this.restoring.delete(ws)
      }

      if (this.restoring.has(ws)) {
        // Ignore fulltext in case of restoring
        return
      }
      await this.fulltextProducer.send(ctx, ws, [workspaceEvents.fullReindex()])
    } else if (
      mm.type === QueueWorkspaceEvent.Deleted ||
      mm.type === QueueWorkspaceEvent.Archived ||
      mm.type === QueueWorkspaceEvent.ClearIndex
    ) {
      const workspaceInfo = await this.getWorkspaceInfo(this.ctx, token)
      if (workspaceInfo !== undefined) {
        await this.fulltextAdapter.clean(
          this.ctx,
          (workspaceInfo.dataId as unknown as WorkspaceUuid) ?? workspaceInfo.uuid
        )
      }
    } else if (mm.type === QueueWorkspaceEvent.Upgraded) {
      this.ctx.warn('Upgraded', this.supportedVersion)
      await this.closeWorkspace(ws)
    }
  }

  private async processFulltextEvent (
    m: ConsumerMessage<QueueWorkspaceMessage>,
    control: ConsumerControl
  ): Promise<void> {
    const ws = m.workspace
    const mm = m.value

    this.ctx.info('fulltext event', { type: mm.type, workspace: ws, restoring: Array.from(this.restoring) })
    let token: string
    try {
      token = generateToken(systemAccountUuid, ws, { service: 'fulltext' })
    } catch (err: any) {
      this.ctx.error('Error generating token', { err, systemAccountUuid, ws })
      return
    }

    if (mm.type === QueueWorkspaceEvent.FullReindex) {
      await this.withIndexer(this.ctx, ws, token, true, async (indexer) => {
        await indexer.dropWorkspace()
        const toIndex = await indexer.getIndexClassess()
        this.ctx.info('reindex starting full', { workspace: ws })
        await this.ctx.with(
          'reindex-workspace',
          {},
          async (ctx) => {
            for (const { domain, classes } of toIndex) {
              try {
                await control.heartbeat()
                await indexer.reindex(ctx, domain, classes, control)
              } catch (err: any) {
                ctx.error('failed to reindex domain', { workspace: ws })
                throw err
              }
            }
          },
          { workspace: ws }
        )
        this.ctx.info('reindex full done', { workspace: ws })
      })
    } else if (mm.type === QueueWorkspaceEvent.Reindex) {
      const mmd = mm as QueueWorkspaceReindexMessage
      if (!this.restoring.has(ws)) {
        await this.withIndexer(this.ctx, ws, token, true, async (indexer) => {
          try {
            await indexer.reindex(this.ctx, mmd.domain, mmd.classes, control)
          } catch (err: any) {
            this.ctx.error('failed to reindex domain', { workspace: ws })
            throw err
          }
        })
      }
    }
  }

  public async getWorkspaceInfo (ctx: MeasureContext, token?: string): Promise<WorkspaceInfoWithStatus | undefined> {
    const accountClient = getAccountClient(token)
    try {
      return await accountClient.getWorkspaceInfo(false)
    } catch (err: any) {
      ctx.error('Workspace not available for token', { err })
      return undefined
    }
  }

  async getTransactorAPIEndpoint (token: string): Promise<string | undefined> {
    return (await getTransactorEndpoint(token, 'internal')).replace('wss://', 'https://').replace('ws://', 'http://')
  }

  async createIndexer (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    token: string | undefined
  ): Promise<WorkspaceIndexer> {
    while (true) {
      const workspaceInfo = await this.getWorkspaceInfo(ctx, token)
      if (workspaceInfo === undefined) {
        throw new Error('Workspace not found')
      }
      if (
        workspaceInfo.versionMajor !== this.supportedVersion.major ||
        workspaceInfo.versionMinor !== this.supportedVersion.minor ||
        workspaceInfo.versionPatch !== this.supportedVersion.patch
      ) {
        ctx.warn('wrong version', {
          workspace,
          version: versionToString({
            major: workspaceInfo.versionMajor,
            minor: workspaceInfo.versionMinor,
            patch: workspaceInfo.versionPatch
          }),
          supportedVersion: this.supportedVersion
        })
        if (workspaceInfo.processingAttemps < 4) {
          await new Promise((resolve) => setTimeout(resolve, 10000))
          continue
        }
        throw new Error('Workspace limit reached')
      }
      ctx.warn('indexer created', { workspace })
      return await WorkspaceIndexer.create(
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
    }
  }

  async withIndexer (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    token: string | undefined,
    create: boolean = false,
    op: (indexer: WorkspaceIndexer) => Promise<void>
  ): Promise<boolean> {
    while (this.restoring.has(workspace)) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    let idx = this.indexers.get(workspace)
    if (idx === undefined && create) {
      idx = this.createIndexer(ctx, workspace, token)
      this.indexers.set(workspace, idx)
    }
    if (idx === undefined) {
      return false
    }
    try {
      if (idx instanceof Promise) {
        idx = await idx
        this.indexers.set(workspace, idx)
      }
    } catch (err: any) {
      this.indexers.delete(workspace)
      return false
    }
    if (await idx.doOperation(op)) {
      this.indexers.delete(workspace)
    }
    return true
  }

  async shutdown (deleteTopics: boolean = false): Promise<void> {
    clearInterval(this.shutdownInterval)
    clearTimeout(this.txInformer)
    await this.txConsumer?.close()
    await this.workspaceConsumer?.close()
    await this.fulltextConsumer?.close()
    await this.fulltextProducer.close()

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
    if (idx !== undefined) {
      if (idx instanceof Promise) {
        idx = await idx
      }
      if (await idx.close()) {
        this.indexers.delete(workspace)
      }
    }
  }
}
