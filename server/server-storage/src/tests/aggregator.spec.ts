import { MeasureMetricsContext, type MeasureContext, type WorkspaceId } from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/storage'
import { AggregatorStorageAdapter } from '../aggregator'
import { MemRawDBAdapter, MemStorageAdapter } from './memAdapters'

describe('aggregator tests', () => {
  function prepare1 (): {
    mem1: MemStorageAdapter
    mem2: MemStorageAdapter
    aggr: AggregatorStorageAdapter
    testCtx: MeasureContext
    ws1: WorkspaceId
  } {
    const mem1 = new MemStorageAdapter()

    const mem2 = new MemStorageAdapter()
    const adapters = new Map<string, StorageAdapter>()
    adapters.set('mem1', mem1)
    adapters.set('mem2', mem2)
    const blobs = new MemRawDBAdapter()
    const aggr = new AggregatorStorageAdapter(adapters, 'mem2', blobs)

    const testCtx = new MeasureMetricsContext('test', {})
    const ws1: WorkspaceId = { name: 'ws1' }
    return { mem1, mem2, aggr, ws1, testCtx }
  }
  it('not reuse existing storage', async () => {
    const { mem1, aggr, ws1, testCtx } = prepare1()

    // Test default provider
    await mem1.put(testCtx, ws1, 'test', 'data', 'text/plain')
    await aggr.syncBlobFromStorage(testCtx, ws1, 'test', 'mem1')

    const stat = await aggr.stat(testCtx, ws1, 'test')
    expect(stat?.provider).toEqual('mem1')

    // Test content typed provider
    await aggr.put(testCtx, ws1, 'test', 'data2', 'text/plain')
    const stat2 = await aggr.stat(testCtx, ws1, 'test')
    expect(stat2?.provider).toEqual('mem2')

    const dta = Buffer.concat(await aggr.read(testCtx, ws1, 'test')).toString()
    expect(dta).toEqual('data2')
  })
})
