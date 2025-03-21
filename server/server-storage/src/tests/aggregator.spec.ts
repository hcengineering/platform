import {
  MeasureMetricsContext,
  type WorkspaceDataId,
  type MeasureContext,
  type WorkspaceUuid,
  type WorkspaceIds
} from '@hcengineering/core'
import type { NamedStorageAdapter } from '@hcengineering/storage'
import { FallbackStorageAdapter } from '../fallback'
import { MemStorageAdapter } from './memAdapters'

describe('aggregator tests', () => {
  function prepare1 (): {
    mem1: MemStorageAdapter
    mem2: MemStorageAdapter
    aggr: FallbackStorageAdapter
    testCtx: MeasureContext
    wsIds1: WorkspaceIds
  } {
    const mem1 = new MemStorageAdapter()

    const mem2 = new MemStorageAdapter()
    const adapters: NamedStorageAdapter[] = []
    adapters.push({ name: 'mem2', adapter: mem2 })
    adapters.push({ name: 'mem1', adapter: mem1 })
    const aggr = new FallbackStorageAdapter(adapters)

    const testCtx = new MeasureMetricsContext('test', {})
    const wsIds1 = {
      uuid: 'ws1-uuid' as WorkspaceUuid,
      dataId: 'ws1-dataId' as WorkspaceDataId,
      url: 'ws1-url'
    }
    return { mem1, mem2, aggr, wsIds1, testCtx }
  }

  it('not reuse existing storage', async () => {
    const { mem1, aggr, wsIds1, testCtx } = prepare1()

    // Test default provider
    await mem1.put(testCtx, wsIds1, 'test', 'data', 'text/plain')

    const stat = await aggr.stat(testCtx, wsIds1, 'test')
    expect(stat?.provider).toEqual('mem1')

    await aggr.put(testCtx, wsIds1, 'test', 'data2', 'text/plain')
    const stat2 = await aggr.stat(testCtx, wsIds1, 'test')
    expect(stat2?.provider).toEqual('mem2')

    const dta = (await aggr.read(testCtx, wsIds1, 'test')).toString()
    expect(dta).toEqual('data2')
  })
})
