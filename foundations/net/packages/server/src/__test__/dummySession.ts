import type { Container, ClientUuid } from '@hcengineering/network-core'

export class DummySessionContainer implements Container {
  async request (operation: string, data?: any, clientId?: ClientUuid): Promise<any> {
    if (operation === 'test') {
      for (const [k, bk] of this.eventHandlers.entries()) {
        if (k === clientId) {
          await bk('event')
        }
      }
      return 'test-ok'
    }
    throw new Error('Unknown operation')
  }

  // Called when the container is terminated
  onTerminated?: () => void

  async terminate (): Promise<void> {}

  async ping (): Promise<void> {}

  connect (clientId: ClientUuid, handler: (data: any) => Promise<void>): void {
    this.eventHandlers.set(clientId, handler)
  }

  disconnect (clientId: ClientUuid): void {
    this.eventHandlers.delete(clientId)
  }

  private readonly eventHandlers = new Map<ClientUuid, (data: any) => Promise<void>>()
}
