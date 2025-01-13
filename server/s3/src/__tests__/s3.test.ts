//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { MeasureMetricsContext, generateId } from '@hcengineering/core'
import { objectsToArray, type StorageConfiguration } from '@hcengineering/server-core'
import { S3Service, processConfigFromEnv, type S3Config } from '..'

describe('s3 operations', () => {
  const config: StorageConfiguration = { default: 'minio', storages: [] }
  const minioConfigVar = processConfigFromEnv(config)
  if (minioConfigVar !== undefined || config.storages[0] === undefined) {
    console.error('No S3 config env is configured:' + minioConfigVar)
    it.skip('No S3 config env is configured', async () => {})
    return
  }
  const toolCtx = new MeasureMetricsContext('test', {})
  it('check root bucket', async () => {
    jest.setTimeout(50000)
    const minioService = new S3Service({ ...(config.storages[0] as S3Config), rootBucket: 'haiodo-test-bucket' })

    let existingTestBuckets = await minioService.listBuckets(toolCtx)
    // Delete old buckets
    for (const b of existingTestBuckets) {
      await b.delete()
    }

    const genWorkspaceId1 = generateId()
    const genWorkspaceId2 = generateId()

    expect(genWorkspaceId1).not.toEqual(genWorkspaceId2)

    const ws1 = genWorkspaceId1
    const ws2 = genWorkspaceId2
    await minioService.make(toolCtx, ws1)
    await minioService.make(toolCtx, ws2)

    const v1 = generateId()
    await minioService.put(toolCtx, ws1, 'obj1.txt', v1, 'text/plain')
    await minioService.put(toolCtx, ws2, 'obj2.txt', v1, 'text/plain')

    const w1Objects = await objectsToArray(toolCtx, minioService, ws1)
    expect(w1Objects.map((it) => it._id)).toEqual(['obj1.txt'])

    const w2Objects = await objectsToArray(toolCtx, minioService, ws2)
    expect(w2Objects.map((it) => it._id)).toEqual(['obj2.txt'])

    await minioService.put(toolCtx, ws1, 'obj1.txt', 'obj1', 'text/plain')
    await minioService.put(toolCtx, ws1, 'obj2.txt', 'obj2', 'text/plain')

    const w1Objects2 = await objectsToArray(toolCtx, minioService, ws1)
    expect(w1Objects2.map((it) => it._id)).toEqual(['obj1.txt', 'obj2.txt'])

    const read = (await minioService.read(toolCtx, ws1, 'obj1.txt')) as unknown as Uint8Array[]
    const data = Buffer.concat(read)

    expect('obj1').toEqual(data.toString())

    existingTestBuckets = await minioService.listBuckets(toolCtx)
    expect(existingTestBuckets.length).toEqual(2)
    // Delete old buckets
    for (const b of existingTestBuckets) {
      await b.delete()
    }
    existingTestBuckets = await minioService.listBuckets(toolCtx)
    expect(existingTestBuckets.length).toEqual(0)
  })
})
