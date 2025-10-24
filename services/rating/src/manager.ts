/* eslint-disable @typescript-eslint/unbound-method */
import { type Event } from '@hcengineering/communication-sdk-types'
import type {
  Class,
  Doc,
  Domain,
  MeasureContext,
  Ref,
  Space,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxDomainEvent,
  Version,
  WorkspaceInfoWithStatus,
  WorkspaceUuid
} from '@hcengineering/core'
import core, { Hierarchy, ModelDb, systemAccountUuid, TxProcessor, versionToString } from '@hcengineering/core'
import { getAccountClient, getTransactorEndpoint } from '@hcengineering/server-client'
import {
  QueueTopic,
  QueueWorkspaceEvent,
  type ConsumerControl,
  type ConsumerHandle,
  type ConsumerMessage,
  type PlatformQueue,
  type PlatformQueueProducer,
  type QueueWorkspaceMessage
} from '@hcengineering/server-core'
import { generateToken } from '@hcengineering/server-token'

import { RatingCalculator } from './calculator'
import { QueueRatingEvent, ratingEvents, type QueueCalculateMessage, type QueueRatingMessage } from './types'
import { getIgnoreDomains } from './utils'

// Inner presentation in message queue differs from sdk-types,
// also date is always filled at the output queue
export type QueueSourced<T extends Event> = Omit<T, 'date'> & { date: string }

// type IndexableCommunicationEvent =
//   | QueueSourced<CreateMessageEvent>
//   | QueueSourced<UpdatePatchEvent>
//   | QueueSourced<AttachmentPatchEvent>
//   | QueueSourced<RemovePatchEvent>
//   | QueueSourced<UpdateCardTypeEvent>
//   | QueueSourced<RemoveCardEvent>

const ratingTopic = 'rating'

const closeTimeout = 5 * 60 * 1000

export class WorkspaceManager {
  calculators = new Map<string, RatingCalculator | Promise<RatingCalculator>>()

  restoring = new Set<WorkspaceUuid>()
  sysHierarchy = new Hierarchy()
  sysModel = new ModelDb(this.sysHierarchy)

  workspaceConsumer?: ConsumerHandle

  ratingConsumer?: ConsumerHandle

  txConsumer?: ConsumerHandle

  ignoreDomains!: Map<Domain, Set<Ref<Class<Doc>>>>

  constructor (
    readonly ctx: MeasureContext,
    readonly model: Tx[],
    private readonly opt: {
      queue: PlatformQueue
      dbURL: string
      serverSecret: string
      accountsUrl: string
    }
  ) {
    for (const tx of model) {
      this.sysHierarchy.tx(tx)
    }
    this.sysModel.addTxes(ctx, model, true)

    this.supportedVersion = TxProcessor.createDoc2Doc(
      model.find(
        (it) => TxProcessor.isExtendsCUD(it._class) && (it as TxCUD<Doc>).objectClass === core.class.Version
      ) as TxCreateDoc<Version>
    )

    this.ignoreDomains = new Map(getIgnoreDomains(this.sysHierarchy, this.sysModel))
  }

  shutdownInterval: any

  ratingProducer!: PlatformQueueProducer<QueueRatingMessage>

  txInformer: any

  supportedVersion: Version

  async startRatingCalculator (): Promise<void> {
    this.shutdownInterval = setInterval(() => {
      for (const [k, v] of [...this.calculators.entries()]) {
        if (v instanceof Promise) {
          continue
        }
        if (Date.now() - v.lastUpdate > closeTimeout) {
          this.calculators.delete(k)
          void v.close()
        }
      }
    }, closeTimeout) // Every 5 minutes we should close unused indexes.

    // We need to check for topis are created properly

    await this.opt.queue.createTopic(ratingTopic, 10)

    this.ratingProducer = this.opt.queue.getProducer<QueueRatingMessage>(this.ctx, ratingTopic)

    // System model and system hierarchy, to filter out some of transactions not related to ratings at all

    this.workspaceConsumer = this.opt.queue.createConsumer<QueueWorkspaceMessage>(
      this.ctx,
      QueueTopic.Workspace,
      this.opt.queue.getClientId(),
      async (ctx, msg, control) => {
        await this.processWorkspaceEvent(ctx, msg, control)
      }
    )

    this.ratingConsumer = this.opt.queue.createConsumer<QueueRatingMessage>(
      this.ctx,
      'rating',
      this.opt.queue.getClientId(),
      async (ctx, msg, control) => {
        await this.processRatingEvent(msg, control)
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

        await this.processTxTransactions(msg, control)
      }
    )
  }

  private async processTxTransactions (
    m: ConsumerMessage<TxCUD<Doc<Space>> | TxDomainEvent<QueueSourced<Event>>>,
    control: ConsumerControl
  ): Promise<void> {
    try {
      const ws = m.workspace

      if (m.value.objectSpace === core.space.DerivedTx) {
        return
      }
      if (TxProcessor.isExtendsCUD(m.value._class)) {
        const cud = m.value as TxCUD<Doc>
        const domain = this.sysHierarchy.findDomain(cud.objectClass)

        // If in ignore domains, skip
        const d = domain != null ? this.ignoreDomains.get(domain) : undefined
        if (d != null && d.has(cud.objectClass)) {
          return
        }

        await this.ratingProducer.send(this.ctx, ws, [ratingEvents.calculate(m.value)])
      }
    } catch (err: any) {
      this.ctx.error('Could not process transactions', { err, m })
    }
  }

  private async processWorkspaceEvent (
    ctx: MeasureContext,
    m: ConsumerMessage<QueueWorkspaceMessage>,
    control: ConsumerControl
  ): Promise<void> {
    const ws = m.workspace
    const mm = m.value

    this.ctx.info('workspace event', { type: mm.type, workspace: ws })

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
        // Ignore rating in case of restoring
        return
      }
      await this.ratingProducer.send(ctx, ws, [ratingEvents.reindex()])
    } else if (mm.type === QueueWorkspaceEvent.Upgraded) {
      this.ctx.warn('Upgraded', this.supportedVersion)
      await this.closeWorkspace(ws)
    }
  }

  private async processRatingEvent (m: ConsumerMessage<QueueRatingMessage>, control: ConsumerControl): Promise<void> {
    const ws = m.workspace
    const mm = m.value

    this.ctx.info('rating event', { type: mm.type, workspace: ws })
    if (mm.type === QueueRatingEvent.Reindex) {
      await this.withRating(this.ctx, ws, true, async (indexer) => {
        await indexer.dropWorkspace()
        this.ctx.info('reranking full', { workspace: ws })
        await this.ctx.with(
          'reindex-workspace',
          {},
          async (ctx) => {
            await indexer.recalculateAll(ctx, control)
          },
          { workspace: ws }
        )
        this.ctx.info('reindex full done', { workspace: ws })
      })
    } else if (mm.type === QueueRatingEvent.Calculate) {
      const mmd = mm as QueueCalculateMessage
      if (!this.restoring.has(ws)) {
        await this.withRating(this.ctx, ws, true, async (indexer) => {
          try {
            await indexer.calculate(this.ctx, [mmd.tx], control)
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

  async createCalculator (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    token: string | undefined,
    control?: ConsumerControl
  ): Promise<RatingCalculator> {
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
      return await RatingCalculator.create(
        ctx,
        this.model,
        {
          uuid: workspace,
          dataId: workspaceInfo.dataId,
          url: workspaceInfo.url
        },
        this.opt.dbURL,
        (token) => this.getTransactorAPIEndpoint(token),
        control
      )
    }
  }

  async withRating (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    create: boolean = false,
    op: (indexer: RatingCalculator) => Promise<void>,
    control?: ConsumerControl
  ): Promise<boolean> {
    while (this.restoring.has(workspace)) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    let idx = this.calculators.get(workspace)
    if (idx === undefined && create) {
      let token: string
      try {
        token = generateToken(systemAccountUuid, workspace, { service: 'rating' })
      } catch (err: any) {
        this.ctx.error('Error generating token', { err, systemAccountUuid, workspace })
        return false
      }

      idx = this.createCalculator(ctx, workspace, token, control)
      this.calculators.set(workspace, idx)
    }
    if (idx === undefined) {
      return false
    }
    try {
      if (idx instanceof Promise) {
        idx = await idx
        this.calculators.set(workspace, idx)
      }
    } catch (err: any) {
      this.calculators.delete(workspace)
      return false
    }
    if (await idx.doOperation(op)) {
      this.calculators.delete(workspace)
    }
    return true
  }

  async shutdown (deleteTopics: boolean = false): Promise<void> {
    clearInterval(this.shutdownInterval)
    clearTimeout(this.txInformer)
    await this.txConsumer?.close()
    await this.workspaceConsumer?.close()
    await this.ratingConsumer?.close()
    await this.ratingProducer.close()

    for (const v of this.calculators.values()) {
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
  }

  async closeWorkspace (workspace: WorkspaceUuid): Promise<void> {
    let idx = this.calculators.get(workspace)
    if (idx !== undefined) {
      if (idx instanceof Promise) {
        idx = await idx
      }
      if (await idx.close()) {
        this.calculators.delete(workspace)
      }
    }
  }
}
