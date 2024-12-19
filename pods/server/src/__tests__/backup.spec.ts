import core, {
  DOMAIN_TX,
  generateId,
  MeasureMetricsContext,
  type Doc,
  type LowLevelStorage,
  type Ref,
  type TxCreateDoc
} from '@hcengineering/core'
import builder from '@hcengineering/model-all'
import { wrapPipeline } from '@hcengineering/server-core'
import { getServerPipeline } from '@hcengineering/server-pipeline'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'

const model = builder().getTxes()
// const dbURL = 'postgresql://root@localhost:26257/defaultdb?sslmode=disable'
const dbURL = 'postgresql://postgres:example@localhost:5432'
const STORAGE_CONFIG = 'minio|localhost:9000?accessKey=minioadmin&secretKey=minioadmin&useSSL=false'

// jest.setTimeout(4500000)
describe.skip('test-backup-find', () => {
  it('check create/load/clean', async () => {
    const toolCtx = new MeasureMetricsContext('-', {})
    // We should setup a DB with docuemnts and try to backup them.
    const wsUrl = {
      name: 'testdb-backup-test',
      uuid: 'testdb-backup-uuid',
      workspaceName: 'test',
      workspaceUrl: 'test'
    }
    const storageConfig = storageConfigFromEnv(STORAGE_CONFIG)
    const storageAdapter = buildStorageFromConfig(storageConfig)

    const pipeline = await getServerPipeline(toolCtx, model, dbURL, wsUrl, storageAdapter, {
      disableTriggers: true
    })
    try {
      const client = wrapPipeline(toolCtx, pipeline, wsUrl)
      const lowLevel = pipeline.context.lowLevelStorage as LowLevelStorage

      // We need to create a backup docs if they are missing.
      await prepareTxes(lowLevel, toolCtx)

      const docs: Doc[] = []
      while (true) {
        const chunk = await client.loadChunk(DOMAIN_TX, 0)
        const part = await client.loadDocs(
          DOMAIN_TX,
          chunk.docs.map((doc) => doc.id as Ref<Doc>)
        )
        docs.push(...part)
        if (chunk.finished) {
          break
        }
      }
      await client.closeChunk(0)
      expect(docs.length).toBeGreaterThan(459)

      await client.clean(
        DOMAIN_TX,
        docs.map((doc) => doc._id)
      )
      const findDocs = await client.findAll(core.class.Tx, {})
      expect(findDocs.length).toBe(0)

      //
    } finally {
      await pipeline.close()
      await storageAdapter.close()
    }
  })
  it('check traverse', async () => {
    const toolCtx = new MeasureMetricsContext('-', {})
    // We should setup a DB with docuemnts and try to backup them.
    const wsUrl = {
      name: 'testdb-backup-test',
      uuid: 'testdb-backup-uuid',
      workspaceName: 'test',
      workspaceUrl: 'test'
    }
    const storageConfig = storageConfigFromEnv(STORAGE_CONFIG)
    const storageAdapter = buildStorageFromConfig(storageConfig)
    const pipeline = await getServerPipeline(toolCtx, model, dbURL, wsUrl, storageAdapter, {
      disableTriggers: true
    })
    try {
      const client = wrapPipeline(toolCtx, pipeline, wsUrl)
      const lowLevel = pipeline.context.lowLevelStorage as LowLevelStorage

      // We need to create a backup docs if they are missing.
      await prepareTxes(lowLevel, toolCtx, 1500)

      const iter = await lowLevel.traverse(DOMAIN_TX, {})

      const allDocs: Doc[] = []

      while (true) {
        const docs = await iter.next(50)
        if (docs == null || docs?.length === 0) {
          break
        }
        await client.clean(
          DOMAIN_TX,
          docs.map((doc) => doc._id)
        )
        allDocs.push(...docs)
      }
      expect(allDocs.length).toBeGreaterThan(1449)

      const findDocs = await client.findAll(core.class.Tx, {})
      expect(findDocs.length).toBe(0)

      //
    } finally {
      await pipeline.close()
      await storageAdapter.close()
    }
  })
})
async function prepareTxes (
  lowLevel: LowLevelStorage,
  toolCtx: MeasureMetricsContext,
  count: number = 500
): Promise<void> {
  const docs = await lowLevel.rawFindAll(DOMAIN_TX, {})
  if ((docs?.length ?? 0) < count) {
    // We need to fill some documents to be pressent
    const docs: TxCreateDoc<Doc>[] = []
    for (let i = 0; i < count; i++) {
      docs.push({
        _class: core.class.TxCreateDoc,
        _id: generateId(),
        space: core.space.Tx,
        modifiedBy: core.account.ConfigUser,
        modifiedOn: Date.now(),
        attributes: {
          qwe: generateId()
        },
        objectClass: core.class.DocIndexState,
        objectId: generateId(),
        objectSpace: core.space.Workspace
      })
    }
    await lowLevel.upload(toolCtx, DOMAIN_TX, docs)
  }
}
