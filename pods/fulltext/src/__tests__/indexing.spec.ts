/* eslint-disable @typescript-eslint/unbound-method */
import core, {
  generateId,
  MeasureMetricsContext,
  TxOperations,
  type Doc,
  type MeasureContext,
  type PersonUuid,
  type Ref,
  type Tx,
  type WorkspaceDataId,
  type WorkspaceInfoWithStatus,
  type WorkspaceUuid
} from '@hcengineering/core'
import { WorkspaceManager } from '../manager'

import { createPlatformQueue, parseQueueConfig } from '@hcengineering/kafka'
import {
  createDummyStorageAdapter,
  QueueTopic,
  workspaceEvents,
  wrapPipeline,
  type FulltextListener,
  type IndexedDoc,
  type QueueWorkspaceMessage
} from '@hcengineering/server-core'
import { decodeToken, generateToken } from '@hcengineering/server-token'
import { randomUUID } from 'crypto'
import { createDoc, test, type TestDocument } from './minmodel'

import { dbConfig, dbUrl, elasticIndexName, model, prepare, preparePipeline } from './utils'

prepare()

jest.setTimeout(500000)

class TestWorkspaceManager extends WorkspaceManager {
  public async getWorkspaceInfo (token?: string): Promise<WorkspaceInfoWithStatus | undefined> {
    const decodedToken = decodeToken(token ?? '')
    return {
      uuid: decodedToken.workspace,
      url: decodedToken.workspace,
      region: 'test',
      name: 'test',
      dataId: decodedToken.workspace as unknown as WorkspaceDataId,
      mode: 'active',
      processingProgress: 0,
      backupInfo: {
        dataSize: 0,
        blobsSize: 0,
        backupSize: 0,
        lastBackup: 0,
        backups: 0
      },
      versionMajor: 0,
      versionMinor: 0,
      versionPatch: 0,
      lastVisit: 0,
      createdOn: 0,
      createdBy: decodedToken.account
    }
  }

  async getTransactorAPIEndpoint (token: string): Promise<string | undefined> {
    return undefined
  }
}
class TestQueue {
  genId = generateId()
  config = parseQueueConfig('localhost:19093;-testing-' + this.genId, 'fulltext-test-' + this.genId, '')
  fulltextListener: FulltextListener | undefined
  queue = createPlatformQueue(this.config)
  mgr!: TestWorkspaceManager
  constructor (readonly ctx: MeasureContext) {}
  async start (): Promise<void> {
    await this.queue.createTopics(1)

    this.mgr = new TestWorkspaceManager(this.ctx, model, {
      queue: this.queue,
      accountsUrl: 'http://localhost:3003',
      elasticIndexName,
      serverSecret: 'secret',
      dbURL: dbUrl,
      config: dbConfig,
      externalStorage: createDummyStorageAdapter(),
      listener: {
        onIndexing: async (doc: IndexedDoc) => {
          return await this.fulltextListener?.onIndexing?.(doc)
        },
        onClean: async (doc: Ref<Doc>[]) => {
          return await this.fulltextListener?.onClean?.(doc)
        }
      }
    })
    await this.mgr.startIndexer()
  }

  async close (): Promise<void> {
    await this.mgr.shutdown(true)
    await this.queue.shutdown()
  }

  async expectIndexingDoc (pattern: string, op: () => Promise<void>, timeoutMs: number = 10000): Promise<void> {
    const waitPromise = new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => {
        reject(new Error(`Timeout waiting for document with pattern "${pattern}" to be indexed`))
      }, timeoutMs)
      this.fulltextListener = {
        onIndexing: async (doc) => {
          if ((doc.fulltextSummary ?? '')?.includes(pattern)) {
            clearTimeout(to)
            resolve()
          }
        }
      }
    })

    await op()
    await waitPromise
  }
}

describe('full-text-indexing', () => {
  const toolCtx = new MeasureMetricsContext('tool', {})

  it('check-file-indexing', async () => {
    const queue = new TestQueue(toolCtx)
    await queue.start()
    try {
      const txProducer = queue.queue.createProducer<Tx>(toolCtx, QueueTopic.Tx)
      const personId = randomUUID().toString() as PersonUuid
      const wsId: WorkspaceUuid = randomUUID().toString() as WorkspaceUuid
      const token = generateToken(personId, wsId)
      const indexer = await queue.mgr.getIndexer(toolCtx, wsId, token, true)
      expect(indexer).toBeDefined()

      const dataId = generateId()

      await queue.expectIndexingDoc(dataId, async () => {
        await txProducer.send(wsId, [
          createDoc(test.class.TestDocument, {
            title: 'first doc',
            description: dataId
          })
        ])
      })
    } finally {
      await queue.close()
    }
  })

  it('check-full-pipeline', async () => {
    const queue = new TestQueue(toolCtx)
    await queue.start()
    const { pipeline, wsIds } = await preparePipeline(toolCtx, queue.queue)

    try {
      const pipelineClient = wrapPipeline(toolCtx, pipeline, wsIds, true)

      const dataId = generateId()

      const ops = new TxOperations(pipelineClient, core.account.System)

      let id: Ref<TestDocument>
      await queue.expectIndexingDoc(dataId, async () => {
        id = await ops.createDoc(test.class.TestDocument, core.space.Workspace, {
          title: 'first doc',
          description: dataId
        })
      })

      const newData = generateId()
      await queue.expectIndexingDoc(newData, async () => {
        await ops.updateDoc<TestDocument>(test.class.TestDocument, core.space.Workspace, id, {
          description: newData
        })
      })
    } finally {
      await queue.close()
      await pipeline.close()
    }
  })
  it('test-reindex', async () => {
    const queue = new TestQueue(toolCtx)
    await queue.start()
    const { pipeline, wsIds } = await preparePipeline(toolCtx, queue.queue, false) // Do not use broadcast
    const wsProcessor = queue.queue.createProducer<QueueWorkspaceMessage>(toolCtx, QueueTopic.Workspace)
    try {
      const pipelineClient = wrapPipeline(toolCtx, pipeline, wsIds)

      const dataId = generateId()

      const ops = new TxOperations(pipelineClient, core.account.System)

      for (let i = 0; i < 1000; i++) {
        await ops.createDoc(test.class.TestDocument, core.space.Workspace, {
          title: 'first doc:' + i,
          description: dataId + i
        })
      }
      let indexOps = 0
      const reindexAllP = new Promise<void>((resolve) => {
        queue.fulltextListener = {
          onIndexing: async (doc) => {
            indexOps++
            if (indexOps === 1000) {
              resolve()
            }
          }
        }
      })

      await wsProcessor.send(wsIds.uuid, [workspaceEvents.fullReindex()])

      // Wait for reindex
      await reindexAllP
    } finally {
      await wsProcessor.close()
      await queue.close()
      await pipeline.close()
    }
  })
})
