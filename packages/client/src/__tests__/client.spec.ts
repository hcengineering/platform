import type { ContainerEndpointRef, ContainerUuid, GetOptions } from '@hcengineering/network-core'
import { NetworkClientImpl } from '../client'

// Mock BackRPCClient used inside NetworkClientImpl
jest.mock('@hcengineering/network-backrpc', () => {
  return {
    BackRPCClient: jest.fn().mockImplementation(() => ({
      waitConnection: jest.fn().mockResolvedValue(undefined),
      request: jest.fn().mockResolvedValue(undefined),
      close: jest.fn()
    }))
  }
})

// Minimal TickManager mock
const tickMgr = {
  tps: 1,
  now: () => Date.now(),
  waitTick: (n: number) => new Promise<void>((resolve) => setTimeout(resolve, 0)),
  register: (_fn: any, _interval: number) => {
    return () => {}
  }
}

describe('NetworkClientImpl basic behaviors', () => {
  test('onUpdate registers and unregisters listener', () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    const unsub = client.onUpdate(async () => {
      // noop
    })
    // There should be one listener registered
    expect(client.containerListeners.size).toBe(1)
    unsub()
    expect(client.containerListeners.size).toBe(0)
  })

  test('get returns existing reference when uuid provided', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    const uuid = '00000000-0000-0000-0000-000000000001' as ContainerUuid
    // Insert a fake ContainerReferenceImpl-like object
    const fakeRef: any = {
      uuid,
      endpoint: 'endpoint',
      close: jest.fn(),
      request: jest.fn(),
      connect: jest.fn()
    }
    const entry: { kind: any, ref: any, request: GetOptions, endpoint: ContainerEndpointRef } = {
      kind: 'test' as any,
      ref: fakeRef,
      request: {} as any,
      endpoint: 'endpoint' as any
    }
    client.references.set(uuid, entry)

    const ref = await client.get('test' as any, { uuid } as any)
    expect(ref).toBe(fakeRef)
  })
})
