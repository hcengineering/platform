import * as zmq from 'zeromq'

describe('zmq-tests', () => {
  it('check reconnect', async () => {
    // Simulate a reconnect event

    const router = new zmq.Router()

    await router.bind('tcp://0.0.0.0:7654')

    const request = new zmq.Request()
    request.connect('tcp://localhost:7654')

    await request.send('Hello')

    const data = await router.receive()
    expect(data[2].toString()).toBe('Hello')

    await router.send([data[0], data[1], 'World'])

    const result2 = await request.receive()
    expect(result2.toString()).toBe('World')

    const obs1 = new zmq.Observer(request)

    let closed = false
    obs1.on('close', (dta) => {
      closed = true
      console.log('closed', dta.address)
    })

    router.close()

    // eslint-disable-next-line no-unmodified-loop-condition
    while (!closed) {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve()
        }, 10)
      })
    }

    request.close()
  })
  it('check diff order', async () => {
    // Simulate a reconnect event

    const router = new zmq.Router()

    await router.bind('tcp://0.0.0.0:7654')

    const request = new zmq.Request()
    request.connect('tcp://localhost:7654')

    const request2 = new zmq.Request()
    request2.connect('tcp://localhost:7654')

    await request.send('Hello1')
    await request2.send('Hello2')
    const data = await router.receive()
    const data2 = await router.receive()

    expect(data[2].toString()).toBe('Hello1')

    expect(data2[2].toString()).toBe('Hello2')

    await router.send([data2[0], data2[1], 'World2'])
    await router.send([data[0], data[1], 'World1'])

    const result2 = await request.receive()
    expect(result2.toString()).toBe('World1')

    const result3 = await request2.receive()
    expect(result3.toString()).toBe('World2')
    request.close()
    request2.close()
    router.close()
  })

  it('check multiple requests from same client', async () => {
    // Create router socket (server)
    const router = new zmq.Pull()
    await router.bind('tcp://0.0.0.0:7654')

    const routerPub = new zmq.Publisher()
    await routerPub.bind('tcp://0.0.0.0:7655')

    // Create request socket (client)
    const client = new zmq.Push()
    client.connect('tcp://localhost:7654')

    const clientSub = new zmq.Subscriber()
    clientSub.connect('tcp://localhost:7655')
    clientSub.subscribe('client1')

    await client.send('Hello1')
    await client.send('Hello2')
    await client.send('Hello3')

    const d1 = await router.receive()
    const d2 = await router.receive()
    const d3 = await router.receive()

    expect(d1[0].toString()).toBe('Hello1')
    expect(d2[0].toString()).toBe('Hello2')
    expect(d3[0].toString()).toBe('Hello3')

    await routerPub.send(['client1', '', 'World1'])
    await routerPub.send(['client1', '', 'World2'])
    await routerPub.send(['client1', '', 'World3'])

    const result1 = await clientSub.receive()
    const result2 = await clientSub.receive()
    const result3 = await clientSub.receive()

    expect(result1[2].toString()).toBe('World1')
    expect(result2[2].toString()).toBe('World2')
    expect(result3[2].toString()).toBe('World3')

    // Cleanup
    client.close()
    clientSub.close()
    router.close()
    routerPub.close()
  })

  it('random port text', async () => {
    // Simulate a reconnect event

    const router = new zmq.Router()

    await router.bind('tcp://*:0')

    const reqEndpoint: string = router.lastEndpoint as string
    expect(reqEndpoint).toBeDefined()

    const portMatch = reqEndpoint.match(/:(\d+)$/)
    const port = portMatch != null ? parseInt(portMatch[1]) : 0

    expect(port).toBeGreaterThan(0)

    const request = new zmq.Request()
    request.connect(`tcp://localhost:${port}`)

    await request.send('Hello')

    const data = await router.receive()
    expect(data[2].toString()).toBe('Hello')

    await router.send([data[0], data[1], 'World'])

    const result2 = await request.receive()
    expect(result2.toString()).toBe('World')

    router.close()
    request.close()
  })

  it('dealer check', async () => {
    // Simulate a reconnect event

    const router = new zmq.Router()

    await router.bind('tcp://*:0')

    const reqEndpoint: string = router.lastEndpoint as string
    expect(reqEndpoint).toBeDefined()

    const portMatch = reqEndpoint.match(/:(\d+)$/)
    const port = portMatch != null ? parseInt(portMatch[1]) : 0

    expect(port).toBeGreaterThan(0)

    const request = new zmq.Dealer()
    request.connect(`tcp://localhost:${port}`)

    await request.send('Hello')
    await request.send('Hello2')

    const data = await router.receive()
    const data2 = await router.receive()
    expect(data[1].toString()).toBe('Hello')
    expect(data2[1].toString()).toBe('Hello2')

    await router.send([data2[0], 'World'])
    await router.send([data[0], 'World'])

    let result2 = await request.receive()
    expect(result2.toString()).toBe('World')

    result2 = await request.receive()
    expect(result2.toString()).toBe('World')

    router.close()
    request.close()
  })

  it('client broadcast check', async () => {
    // Simulate a reconnect event

    const router = new zmq.Router()

    await router.bind('tcp://*:0')

    const reqEndpoint: string = router.lastEndpoint as string
    expect(reqEndpoint).toBeDefined()

    const portMatch = reqEndpoint.match(/:(\d+)$/)
    const port = portMatch != null ? parseInt(portMatch[1]) : 0

    expect(port).toBeGreaterThan(0)

    const request = new zmq.Dealer()
    request.connect(`tcp://localhost:${port}`)

    await request.send('Hello')

    const data = await router.receive()
    expect(data[1].toString()).toBe('Hello')

    await router.send([data[0], 'World'])
    await router.send([data[0], 'World2'])
    await router.send([data[0], 'World3'])

    let result2 = await request.receive()
    expect(result2.toString()).toBe('World')

    result2 = await request.receive()
    expect(result2.toString()).toBe('World2')

    result2 = await request.receive()
    expect(result2.toString()).toBe('World3')

    router.close()
    request.close()
  })
})
