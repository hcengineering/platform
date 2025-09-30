import {
  type ContainerEndpointRef,
  type ContainerUuid,
  type NetworkEvent,
  NetworkEventKind,
  type AgentUuid,
  type NetworkAgent,
  type ContainerRecord,
  type ContainerKind
} from '@hcengineering/network-core'
import { NetworkClientImpl } from '../client'

// Mock BackRPCClient
const mockWaitConnection = jest.fn().mockResolvedValue(undefined)
const mockRequest = jest.fn()
const mockClose = jest.fn()

jest.mock('@hcengineering/network-backrpc', () => {
  return {
    BackRPCClient: jest.fn().mockImplementation(() => ({
      waitConnection: mockWaitConnection,
      request: mockRequest,
      close: mockClose
    }))
  }
})

// Minimal TickManager mock
const tickMgr = {
  tps: 10,
  now: () => Date.now(),
  waitTick: (n: number) => new Promise<void>((resolve) => setTimeout(resolve, n * 10)),
  register: (_fn: any, _interval: number) => {
    return () => {}
  }
}

describe('NetworkClientImpl extended tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('waitConnection with timeout resolves successfully', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    await client.waitConnection(1000)
    expect(mockWaitConnection).toHaveBeenCalled()
  })

  test('waitConnection with timeout rejects on timeout', async () => {
    mockWaitConnection.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 2000)))
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    
    await expect(client.waitConnection(100)).rejects.toThrow('Connection timeout')
  })

  test('close cleans up references and connections', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    mockRequest.mockResolvedValue(undefined)

    // Add a fake reference
    const uuid = '00000000-0000-0000-0000-000000000001' as ContainerUuid
    const fakeRef: any = {
      uuid,
      endpoint: 'endpoint',
      close: jest.fn().mockResolvedValue(undefined),
      request: jest.fn(),
      connect: jest.fn()
    }
    client.references.set(uuid, {
      kind: 'test' as any,
      ref: fakeRef,
      request: {} as any,
      endpoint: 'endpoint' as any
    })

    // Add a fake agent
    const mockAgent: Partial<NetworkAgent> = {
      uuid: 'agent-1' as AgentUuid,
      kinds: ['test' as ContainerKind],
      list: jest.fn().mockResolvedValue([]),
      get: jest.fn(),
      terminate: jest.fn()
    }
    client._agents.set('agent-1' as AgentUuid, {
      agent: mockAgent as NetworkAgent,
      register: Promise.resolve(),
      resolve: () => {}
    })

    await client.close()

    expect(fakeRef.close).toHaveBeenCalled()
    expect(mockRequest).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ uuid: 'agent-1' }))
    expect(mockClose).toHaveBeenCalled()
  })

  test('requestHandler calls correct agent method - getContainer', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    
    const mockAgent: Partial<NetworkAgent> = {
      uuid: 'agent-1' as AgentUuid,
      kinds: ['test' as ContainerKind],
      get: jest.fn().mockResolvedValue({ uuid: 'container-1', endpoint: 'endpoint' })
    }
    
    client._agents.set('agent-1' as AgentUuid, {
      agent: mockAgent as NetworkAgent,
      register: Promise.resolve(),
      resolve: () => {}
    })

    const sendMock = jest.fn()
    await client.requestHandler('gg', ['agent-1', ['test', {}]], sendMock)

    expect(mockAgent.get).toHaveBeenCalledWith('test', {})
    expect(sendMock).toHaveBeenCalled()
  })

  test('requestHandler returns error for unknown agent', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    
    const sendMock = jest.fn()
    await client.requestHandler('getContainer', ['unknown-agent', ['test', {}]], sendMock)

    expect(sendMock).toHaveBeenCalledWith({ error: 'Agent unknown-agent not found' })
  })

  test('requestHandler calls listContainers', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    
    const mockAgent: Partial<NetworkAgent> = {
      uuid: 'agent-1' as AgentUuid,
      list: jest.fn().mockResolvedValue([])
    }
    
    client._agents.set('agent-1' as AgentUuid, {
      agent: mockAgent as NetworkAgent,
      register: Promise.resolve(),
      resolve: () => {}
    })

    const sendMock = jest.fn()
    await client.requestHandler('cl', ['agent-1', ['test']], sendMock)

    expect(mockAgent.list).toHaveBeenCalledWith('test')
    expect(sendMock).toHaveBeenCalled()
  })

  test('requestHandler calls sendContainer', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    
    const mockAgent: Partial<NetworkAgent> = {
      uuid: 'agent-1' as AgentUuid,
      request: jest.fn().mockResolvedValue('response')
    }
    
    client._agents.set('agent-1' as AgentUuid, {
      agent: mockAgent as NetworkAgent,
      register: Promise.resolve(),
      resolve: () => {}
    })

    const sendMock = jest.fn()
    await client.requestHandler('cs', ['agent-1', ['container-1', 'operation', 'data']], sendMock)

    expect(mockAgent.request).toHaveBeenCalledWith('container-1', 'operation', 'data')
    expect(sendMock).toHaveBeenCalledWith('response')
  })

  test('requestHandler calls terminate', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    
    const mockAgent: Partial<NetworkAgent> = {
      uuid: 'agent-1' as AgentUuid,
      terminate: jest.fn().mockResolvedValue(undefined)
    }
    
    client._agents.set('agent-1' as AgentUuid, {
      agent: mockAgent as NetworkAgent,
      register: Promise.resolve(),
      resolve: () => {}
    })

    const sendMock = jest.fn()
    await client.requestHandler('ct', ['agent-1', ['container-1']], sendMock)

    expect(mockAgent.terminate).toHaveBeenCalledWith('container-1')
    expect(sendMock).toHaveBeenCalledWith('')
  })

  test('requestHandler throws on unknown method', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    
    const mockAgent: Partial<NetworkAgent> = {
      uuid: 'agent-1' as AgentUuid
    }
    
    client._agents.set('agent-1' as AgentUuid, {
      agent: mockAgent as NetworkAgent,
      register: Promise.resolve(),
      resolve: () => {}
    })

    const sendMock = jest.fn()
    await expect(client.requestHandler('unknownMethod', ['agent-1', []], sendMock)).rejects.toThrow('Unknown method')
  })

  test('onEvent calls all listeners', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    
    const listener1 = jest.fn()
    const listener2 = jest.fn()
    
    client.onUpdate(listener1)
    client.onUpdate(listener2)

    const event: NetworkEvent = {
      agents: [],
      containers: []
    }

    await client.onEvent(event)

    expect(listener1).toHaveBeenCalledWith(event)
    expect(listener2).toHaveBeenCalledWith(event)
  })

  test('onEvent handles listener errors gracefully', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    
    const listener1 = jest.fn().mockRejectedValue(new Error('Listener error'))
    const listener2 = jest.fn()
    
    client.onUpdate(listener1)
    client.onUpdate(listener2)

    const event: NetworkEvent = {
      agents: [],
      containers: []
    }

    await client.onEvent(event)

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(listener2).toHaveBeenCalledWith(event)
    
    consoleErrorSpy.mockRestore()
  })

  test('handleRefUpdate updates connection when endpoint changes', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    
    const uuid = 'container-1' as ContainerUuid
    const oldEndpoint = JSON.stringify({
      kind: 0, // EndpointKind.direct
      host: 'host1',
      port: 3000,
      uuid,
      agentId: 'agent-1'
    }) as ContainerEndpointRef
    const newEndpoint = JSON.stringify({
      kind: 0, // EndpointKind.direct
      host: 'host2',
      port: 3000,
      uuid,
      agentId: 'agent-1'
    }) as ContainerEndpointRef
    
    const mockConnection: any = {
      setConnection: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn()
    }
    
    const fakeRef: any = {
      uuid,
      endpoint: oldEndpoint
    }
    
    client.references.set(uuid, {
      kind: 'test' as any,
      ref: fakeRef,
      request: {} as any,
      endpoint: oldEndpoint
    })
    
    client.containerConnections.set(uuid, mockConnection)

    await client.handleRefUpdate(uuid, newEndpoint)

    expect(mockConnection.setConnection).toHaveBeenCalled()
  })

  test('handleNewContainer moves reference to new uuid', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    
    const oldUuid = 'container-old' as ContainerUuid
    const newUuid = 'container-new' as ContainerUuid
    const endpoint = JSON.stringify({
      kind: 0, // EndpointKind.direct
      host: 'host',
      port: 3000,
      uuid: oldUuid,
      agentId: 'agent-1'
    }) as ContainerEndpointRef
    
    const fakeRef: any = {
      uuid: oldUuid,
      endpoint
    }
    
    client.references.set(oldUuid, {
      kind: 'test' as any,
      ref: fakeRef,
      request: {} as any,
      endpoint
    })

    await client.handleNewContainer(oldUuid, newUuid, endpoint)

    expect(client.references.has(oldUuid)).toBe(false)
    expect(client.references.has(newUuid)).toBe(true)
    expect(fakeRef.uuid).toBe(newUuid)
  })

  test('onRegister re-registers all agents', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    mockRequest.mockResolvedValue([])
    
    const mockAgent: Partial<NetworkAgent> = {
      uuid: 'agent-1' as AgentUuid,
      kinds: ['test' as ContainerKind],
      endpoint: 'agent-endpoint' as any,
      list: jest.fn().mockResolvedValue([]),
      terminate: jest.fn()
    }
    
    client._agents.set('agent-1' as AgentUuid, {
      agent: mockAgent as NetworkAgent,
      register: Promise.resolve(),
      resolve: () => {}
    })

    await client.onRegister()

    expect(client.registered).toBe(true)
    expect(mockAgent.list).toHaveBeenCalled()
  })

  test('register adds agent and calls doRegister when registered', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    client.registered = true
    mockRequest.mockResolvedValue([])
    
    const mockAgent: Partial<NetworkAgent> = {
      uuid: 'agent-1' as AgentUuid,
      kinds: ['test' as ContainerKind],
      endpoint: 'agent-endpoint' as any,
      list: jest.fn().mockResolvedValue([])
    }

    await client.register(mockAgent as NetworkAgent)

    expect(client._agents.has('agent-1' as AgentUuid)).toBe(true)
    expect(mockAgent.onUpdate).toBeDefined()
    expect(mockAgent.onAgentUpdate).toBeDefined()
    expect(mockRequest).toHaveBeenCalled()
  })

  test('doRegister calls agent list and registers containers', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    mockRequest.mockResolvedValue([])
    
    const mockAgent: Partial<NetworkAgent> = {
      uuid: 'agent-1' as AgentUuid,
      kinds: ['test' as ContainerKind],
      endpoint: 'agent-endpoint' as any,
      list: jest.fn().mockResolvedValue([
        {
          uuid: 'container-1' as ContainerUuid,
          endpoint: 'endpoint' as ContainerEndpointRef,
          kind: 'test' as ContainerKind,
          lastVisit: 0
        }
      ]),
      terminate: jest.fn()
    }

    client._agents.set('agent-1' as AgentUuid, {
      agent: mockAgent as NetworkAgent,
      register: Promise.resolve(),
      resolve: jest.fn()
    })

    await client.doRegister(mockAgent as NetworkAgent)

    expect(mockAgent.list).toHaveBeenCalled()
    expect(mockRequest).toHaveBeenCalledWith(
      'ar', // opNames.register
      expect.objectContaining({
        uuid: 'agent-1',
        containers: expect.arrayContaining([
          expect.objectContaining({ uuid: 'container-1' })
        ])
      })
    )
  })

  test('doRegister terminates containers marked for cleanup', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    const containerToClean = 'container-to-clean' as ContainerUuid
    mockRequest.mockResolvedValue([containerToClean])
    
    const mockAgent: Partial<NetworkAgent> = {
      uuid: 'agent-1' as AgentUuid,
      kinds: ['test' as ContainerKind],
      endpoint: 'agent-endpoint' as any,
      list: jest.fn().mockResolvedValue([]),
      terminate: jest.fn()
    }

    client._agents.set('agent-1' as AgentUuid, {
      agent: mockAgent as NetworkAgent,
      register: Promise.resolve(),
      resolve: jest.fn()
    })

    await client.doRegister(mockAgent as NetworkAgent)

    expect(mockAgent.terminate).toHaveBeenCalledWith(containerToClean)
  })

  test('agents returns list from server', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    const agentsList = [{ uuid: 'agent-1', kinds: ['test'], endpoint: 'endpoint' }]
    mockRequest.mockResolvedValue(agentsList)

    const result = await client.agents()

    expect(result).toEqual(agentsList)
    expect(mockRequest).toHaveBeenCalledWith('al', {}) // opNames.getAgents
  })

  test('kinds returns list from server', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    const kindsList = ['test', 'production']
    mockRequest.mockResolvedValue(kindsList)

    const result = await client.kinds()

    expect(result).toEqual(kindsList)
    expect(mockRequest).toHaveBeenCalledWith('ak', {}) // opNames.getKinds
  })

  test('release calls server to release container', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    mockRequest.mockResolvedValue(undefined)
    
    const uuid = 'container-1' as ContainerUuid
    await client.release(uuid)

    expect(mockRequest).toHaveBeenCalledWith('cr', { uuid }) // opNames.releaseContainer
  })

  test('list calls server with kind parameter', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    const containers: ContainerRecord[] = []
    mockRequest.mockResolvedValue(containers)

    const result = await client.list('test' as ContainerKind)

    expect(result).toEqual(containers)
    expect(mockRequest).toHaveBeenCalledWith('cl', { kind: 'test' }) // opNames.listContainers
  })

  test('list calls server without kind parameter', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    const containers: ContainerRecord[] = []
    mockRequest.mockResolvedValue(containers)

    const result = await client.list()

    expect(result).toEqual(containers)
    expect(mockRequest).toHaveBeenCalledWith('cl', { kind: undefined }) // opNames.listContainers
  })

  test('request proxies to server', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    mockRequest.mockResolvedValue('response')

    const result = await client.request('container-1' as ContainerUuid, 'operation', 'data')

    expect(result).toBe('response')
    expect(mockRequest).toHaveBeenCalledWith('cs', ['container-1', 'operation', 'data']) // opNames.sendContainer
  })

  test('handleConnectionUpdates processes container removed events', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    
    const uuid = 'container-1' as ContainerUuid
    const endpoint = JSON.stringify({
      kind: 0, // EndpointKind.direct
      host: 'host',
      port: 3000,
      uuid,
      agentId: 'agent-1'
    }) as ContainerEndpointRef
    
    const fakeRef: any = {
      uuid,
      endpoint: 'old-endpoint'
    }
    
    client.references.set(uuid, {
      kind: 'test' as any,
      ref: fakeRef,
      request: {} as any,
      endpoint: 'old-endpoint' as any
    })

    const event: NetworkEvent = {
      agents: [],
      containers: [{
        event: NetworkEventKind.removed,
        container: {
          agentId: 'agent-1' as AgentUuid,
          uuid,
          endpoint,
          kind: 'test' as ContainerKind,
          lastVisit: 0
        }
      }]
    }

    await client.handleConnectionUpdates(event)

    // Endpoint should be updated
    const ref = client.references.get(uuid)
    expect(ref?.endpoint).toBe(endpoint)
  })

  test('ContainerReferenceImpl close removes reference', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    const uuid = 'container-1' as ContainerUuid
    const endpoint = JSON.stringify({ kind: 0, host: 'host', port: 3000, uuid, agentId: 'agent-1' }) as ContainerEndpointRef
    
    mockRequest.mockResolvedValueOnce([uuid, endpoint]) // For get()
      .mockResolvedValueOnce(undefined) // For release()
    
    const ref = await client.get('test' as ContainerKind, { uuid })

    await ref.close()

    expect(client.references.has(uuid)).toBe(false)
    expect(mockRequest).toHaveBeenCalledWith('cr', { uuid }) // opNames.releaseContainer
  })

  test('ContainerReferenceImpl request proxies to client', async () => {
    const client = new NetworkClientImpl('localhost', 3000, tickMgr as any)
    const uuid = 'container-1' as ContainerUuid
    const endpoint = JSON.stringify({ kind: 0, host: 'host', port: 3000, uuid, agentId: 'agent-1' }) as ContainerEndpointRef
    
    mockRequest.mockResolvedValueOnce([uuid, endpoint]) // For get()
      .mockResolvedValueOnce('response') // For request()
    
    const ref = await client.get('test' as ContainerKind, {})
    const result = await ref.request('operation', 'data')

    expect(result).toBe('response')
  })
})
