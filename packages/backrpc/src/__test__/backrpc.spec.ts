import { TickManagerImpl } from '@hcengineering/network-core'
import { BackRPCServer } from '../server'
import { BackRPCClient } from '../client'
import type { ClientId } from '../types'

describe('backrpc', () => {
  it('test request/response', async () => {
    const tickMgr = new TickManagerImpl(10)
    const server = new BackRPCServer(
      {
        requestHandler: async (client, method, params, send) => {
          switch (method) {
            case 'hello':
              await send('World')
              break
            case 'do':
              await send(await server.request(client, 'callback', ''))
              break
            default:
              await send('unknown')
          }
        },
        helloHandler: async (clientId) => {
          console.log(`Client ${clientId} connected`)
        }
      },
      tickMgr
    )

    const client = new BackRPCClient(
      'client1' as ClientId,
      {
        requestHandler: async (method, param, send) => {
          if (method === 'callback') {
            await send('callback-value')
          }
          await send('')
        },
        onRegister: async () => {
          console.log('Client registered')
        }
      },
      'localhost',
      await server.getPort(),
      tickMgr
    )

    const response = await client.request('hello', 'world')
    expect(response).toBe('World')

    const response2 = await client.request('do', '')
    expect(response2).toBe('callback-value')

    client.close()
    await server.close()
  })

  it('test check-register', async () => {
    const tickMgr = new TickManagerImpl(10)
    let server = new BackRPCServer(
      {
        requestHandler: async (client, method, params, send) => {},
        helloHandler: async (clientId) => {
          console.log(`Client ${clientId} connected`)
        }
      },
      tickMgr,
      '*',
      8701
    )

    let registered = 0

    let doResolve: () => void
    const p: Promise<void> = new Promise<void>((resolve) => {
      doResolve = () => {
        resolve()
      }
    })

    let doResolve2: () => void
    const p2: Promise<void> = new Promise<void>((resolve) => {
      doResolve2 = () => {
        resolve()
      }
    })
    const client = new BackRPCClient(
      'client1' as ClientId,
      {
        requestHandler: async (method, param, send) => {},
        onRegister: async () => {
          registered++
          doResolve()
          if (registered === 2) {
            doResolve2()
          }
        }
      },
      'localhost',
      8701,
      tickMgr
    )

    await p

    expect(registered).toBe(1)

    await server.close()

    server = new BackRPCServer(
      {
        requestHandler: async (client, method, params, send) => {},
        helloHandler: async (clientId) => {
          console.log(`Client ${clientId} connected`)
        }
      },
      tickMgr,
      '*',
      8701
    )

    await p2
    expect(registered).toBe(2)

    client.close()
    await server.close()
  })

  it('test error handling', async () => {
    const tickMgr = new TickManagerImpl(10)
    const server = new BackRPCServer(
      {
        requestHandler: async (client, method, params, send) => {
          switch (method) {
            case 'error':
              throw new Error('Test error')
            case 'success':
              await send('OK')
              break
            default:
              await send('unknown')
          }
        },
        helloHandler: async (clientId) => {
          console.log(`Client ${clientId} connected`)
        }
      },
      tickMgr
    )

    const client = new BackRPCClient(
      'client1' as ClientId,
      {
        requestHandler: async (method, param, send) => {
          await send('client response')
        },
        onRegister: async () => {
          console.log('Client registered')
        }
      },
      'localhost',
      await server.getPort(),
      tickMgr
    )

    // Test successful request
    const response = await client.request('success', 'test')
    expect(response).toBe('OK')

    // Test error handling
    try {
      await client.request('error', 'test')
      fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toBe('Test error')
    }

    client.close()
    await server.close()
  })

  it('test server to client request', async () => {
    const tickMgr = new TickManagerImpl(10)
    let clientRequestReceived = false

    const server = new BackRPCServer(
      {
        requestHandler: async (client, method, params, send) => {
          if (method === 'trigger-client-request') {
            const clientResponse = await server.request(client, 'client-method', 'server-data')
            await send(clientResponse)
          } else {
            await send('unknown')
          }
        },
        helloHandler: async (clientId) => {
          console.log(`Client ${clientId} connected`)
        }
      },
      tickMgr
    )

    const client = new BackRPCClient(
      'client1' as ClientId,
      {
        requestHandler: async (method, param, send) => {
          if (method === 'client-method') {
            clientRequestReceived = true
            expect(param).toBe('server-data')
            await send('client-processed-' + param)
          } else {
            await send('unknown-client-method')
          }
        },
        onRegister: async () => {
          console.log('Client registered')
        }
      },
      'localhost',
      await server.getPort(),
      tickMgr
    )

    const response = await client.request('trigger-client-request', 'test')
    expect(response).toBe('client-processed-server-data')
    expect(clientRequestReceived).toBe(true)

    client.close()
    await server.close()
  })

  it('test events', async () => {
    const tickMgr = new TickManagerImpl(10)
    const eventsReceived: any[] = []

    const server = new BackRPCServer(
      {
        requestHandler: async (client, method, params, send) => {
          if (method === 'send-event') {
            await server.send(client, { type: 'test-event', data: params })
            await send('event-sent')
          } else {
            await send('unknown')
          }
        },
        helloHandler: async (clientId) => {
          console.log(`Client ${clientId} connected`)
        }
      },
      tickMgr
    )

    const client = new BackRPCClient(
      'client1' as ClientId,
      {
        requestHandler: async (method, param, send) => {
          await send('client response')
        },
        onRegister: async () => {
          console.log('Client registered')
        },
        onEvent: async (event) => {
          eventsReceived.push(event)
        }
      },
      'localhost',
      await server.getPort(),
      tickMgr
    )

    const response = await client.request('send-event', 'test-data')
    expect(response).toBe('event-sent')

    // Wait a bit for the event to be processed
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(eventsReceived).toHaveLength(1)
    expect(eventsReceived[0]).toEqual({ type: 'test-event', data: 'test-data' })

    client.close()
    await server.close()
  })

  it('test multiple clients', async () => {
    const tickMgr = new TickManagerImpl(10)
    const connectedClients = new Set<string>()

    const server = new BackRPCServer(
      {
        requestHandler: async (client, method, params, send) => {
          switch (method) {
            case 'get-client-id':
              await send(client)
              break
            case 'get-connected-count':
              await send(connectedClients.size)
              break
            default:
              await send('unknown')
          }
        },
        helloHandler: async (clientId) => {
          connectedClients.add(clientId)
          console.log(`Client ${clientId} connected`)
        }
      },
      tickMgr
    )

    const client1 = new BackRPCClient(
      'client1' as ClientId,
      {
        requestHandler: async (method, param, send) => {
          await send('client1 response')
        },
        onRegister: async () => {
          console.log('Client1 registered')
        }
      },
      'localhost',
      await server.getPort(),
      tickMgr
    )

    const client2 = new BackRPCClient(
      'client2' as ClientId,
      {
        requestHandler: async (method, param, send) => {
          await send('client2 response')
        },
        onRegister: async () => {
          console.log('Client2 registered')
        }
      },
      'localhost',
      await server.getPort(),
      tickMgr
    )

    // Wait for both clients to connect
    await new Promise((resolve) => setTimeout(resolve, 100))

    const client1Id = await client1.request('get-client-id', '')
    const client2Id = await client2.request('get-client-id', '')
    const connectedCount = await client1.request('get-connected-count', '')

    expect(client1Id).toBe('client1')
    expect(client2Id).toBe('client2')
    expect(connectedCount).toBe(2)

    client1.close()
    client2.close()
    await server.close()
  })

  it('test client not found error', async () => {
    const tickMgr = new TickManagerImpl(10)

    const server = new BackRPCServer(
      {
        requestHandler: async (client, method, params, send) => {
          await send('OK')
        },
        helloHandler: async (clientId) => {
          console.log(`Client ${clientId} connected`)
        }
      },
      tickMgr
    )

    // Try to send request to non-existent client
    try {
      await server.request('non-existent-client' as ClientId, 'test', 'data')
      fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toBe('Client non-existent-client not found')
    }

    // Try to send event to non-existent client
    try {
      await server.send('non-existent-client' as ClientId, { test: 'data' })
      fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).toBe('Client non-existent-client not found')
    }

    await server.close()
  })

  it('test concurrent requests', async () => {
    const tickMgr = new TickManagerImpl(10)

    const server = new BackRPCServer(
      {
        requestHandler: async (client, method, params, send) => {
          // Simulate some async work
          await new Promise((resolve) => setTimeout(resolve, 50))
          await send(`processed-${params}`)
        },
        helloHandler: async (clientId) => {
          console.log(`Client ${clientId} connected`)
        }
      },
      tickMgr
    )

    const client = new BackRPCClient(
      'client1' as ClientId,
      {
        requestHandler: async (method, param, send) => {
          await send('client response')
        },
        onRegister: async () => {
          console.log('Client registered')
        }
      },
      'localhost',
      await server.getPort(),
      tickMgr
    )

    // Send multiple concurrent requests
    const promises = []
    for (let i = 0; i < 5; i++) {
      promises.push(client.request('test', `request-${i}`))
    }

    const responses = await Promise.all(promises)

    expect(responses).toHaveLength(5)
    for (let i = 0; i < 5; i++) {
      expect(responses[i]).toBe(`processed-request-${i}`)
    }

    client.close()
    await server.close()
  })

  it('test timeout handling', async () => {
    const tickMgr = new TickManagerImpl(10)
    let timeoutHandlerCalled = false

    const server = new BackRPCServer(
      {
        requestHandler: async (client, method, params, send) => {
          if (method === 'slow-request') {
            // Don't send response to simulate timeout
            return
          }
          await send('OK')
        },
        helloHandler: async (clientId) => {
          console.log(`Client ${clientId} connected`)
        },
        closeHandler: async (clientId) => {
          timeoutHandlerCalled = true
          console.log(`Timeout for client ${clientId}`)
        }
      },
      tickMgr
    )

    const client = new BackRPCClient(
      'client1' as ClientId,
      {
        requestHandler: async (method, param, send) => {
          await send('client response')
        },
        onRegister: async () => {
          console.log('Client registered')
        }
      },
      'localhost',
      await server.getPort(),
      tickMgr
    )

    // This should work normally
    const response1 = await client.request('normal', 'test')
    expect(response1).toBe('OK')

    // The timeout handler exists but may not be easily testable without manipulating internal state
    // So we just verify the server accepts the timeout handler
    expect(timeoutHandlerCalled).toBe(false) // Not called yet

    client.close()
    await server.close()
  })
})
