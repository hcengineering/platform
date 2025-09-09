import { TickManagerImpl, timeouts, type NetworkClient } from '@hcengineering/network-core'
import { NetworkClientImpl } from './client'

export * from './types'
export * from './client'
export * from './agent'

const tickMgr = new TickManagerImpl(timeouts.pingInterval * 2)
tickMgr.start()

export function shutdownNetworkTickMgr (): void {
  tickMgr.stop()
}

process.on('exit', () => {
  shutdownNetworkTickMgr()
})

export function createNetworkClient (host: string, port: number): NetworkClient {
  return new NetworkClientImpl(host, port, tickMgr)
}
