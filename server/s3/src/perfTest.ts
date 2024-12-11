import { MeasureMetricsContext, generateId } from '@hcengineering/core'
import type { StorageConfiguration } from '@hcengineering/server-core'
import { S3Service, processConfigFromEnv, type S3Config } from '.'

const MB = 1024 * 1024

const config: StorageConfiguration = { default: 'minio', storages: [] }
const minioConfigVar = processConfigFromEnv(config)
if (minioConfigVar !== undefined || config.storages[0] === undefined) {
  console.error('No S3 config env is configured:' + minioConfigVar)
  it.skip('No S3 config env is configured', async () => {})
  process.exit(1)
}
const toolCtx = new MeasureMetricsContext('test', {})
const storageService = new S3Service({ ...(config.storages[0] as S3Config), rootBucket: 'haiodo-test-bucket' })

async function doTest (): Promise<void> {
  const existingTestBuckets = await storageService.listBuckets(toolCtx)
  // Delete old buckets
  for (const b of existingTestBuckets) {
    await b.delete()
  }

  const genWorkspaceId1 = generateId()

  const ws1 = genWorkspaceId1
  await storageService.make(toolCtx, ws1)
  /// /////// Uploads
  let st1 = Date.now()
  const sz = 10
  const stream = Buffer.alloc(sz * 1024 * 1024)
  for (let i = 0; i < 10; i++) {
    // We need 1Mb random file to check upload speed.
    const st = Date.now()
    await storageService.put(toolCtx, ws1, `testObject.${i}`, stream, 'application/octet-stream', stream.length)
    console.log('upload time', Date.now() - st)
  }
  let now = Date.now()
  console.log(`upload performance: ${Math.round((sz * 10 * 1000 * 100) / (now - st1)) / 100} mb per second`)

  /// // Downloads 1
  st1 = Date.now()
  for (let i = 0; i < 10; i++) {
    // We need 1Mb random file to check upload speed.
    const st = Date.now()
    await storageService.read(toolCtx, ws1, `testObject.${i}`)
    console.log('download time', Date.now() - st)
  }

  now = Date.now()
  console.log(`download performance: ${Math.round((sz * 10 * 1000 * 100) / (now - st1)) / 100} mb per second`)

  /// Downloads 2
  st1 = Date.now()
  for (let i = 0; i < 10; i++) {
    // We need 1Mb random file to check upload speed.
    const st = Date.now()
    const readable = await storageService.get(toolCtx, ws1, `testObject.${i}`)
    const chunks: Buffer[] = []
    readable.on('data', (chunk) => {
      chunks.push(chunk)
    })
    await new Promise<void>((resolve) => {
      readable.on('end', () => {
        resolve()
        readable.destroy()
      })
    })
    console.log('download time 2', Date.now() - st)
  }

  now = Date.now()
  console.log(`download performance: ${Math.round((sz * 10 * 1000 * 100) / (now - st1)) / 100} mb per second`)

  /// Downloads 3
  st1 = Date.now()
  for (let i = 0; i < 10; i++) {
    // We need 1Mb random file to check upload speed.
    const st = Date.now()
    for (let i = 0; i < sz; i++) {
      const readable = await storageService.partial(toolCtx, ws1, `testObject.${i}`, i * MB, MB)
      const chunks: Buffer[] = []
      readable.on('data', (chunk) => {
        chunks.push(chunk)
      })
      await new Promise<void>((resolve) => {
        readable.on('end', () => {
          resolve()
          readable.destroy()
        })
      })
    }
    console.log('download time 2', Date.now() - st)
  }

  now = Date.now()
  console.log(`download performance: ${Math.round((sz * 10 * 1000 * 100) / (now - st1)) / 100} mb per second`)
}
void doTest().catch((err) => {
  console.error(err)
})
console.log('done')
