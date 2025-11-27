import { ContainerConnectionImpl } from '../agent'

describe('ContainerConnectionImpl behavior', () => {
  test('resolves promise connection and forwards request/close', async () => {
    const connA = {
      containerId: 'c1',
      request: jest.fn().mockResolvedValue('resA'),
      close: jest.fn().mockResolvedValue(undefined),
      on: undefined
    }

    const promiseA = Promise.resolve(connA as any)
    const cc = new ContainerConnectionImpl('c1' as any, promiseA as any)

    // connect should await the promise
    await cc.connect()

    const res = await cc.request('op')
    expect(res).toBe('resA')
    expect(connA.request).toHaveBeenCalledWith('op', undefined)

    await cc.close()
    expect(connA.close).toHaveBeenCalled()
  })

  test('setConnection replaces and closes previous connection', async () => {
    const connOld = {
      containerId: 'c2',
      request: jest.fn().mockResolvedValue('old'),
      close: jest.fn().mockResolvedValue(undefined),
      on: undefined
    }
    const cc = new ContainerConnectionImpl('c2' as any, connOld as any)

    // set new connection should close old
    const connNew = {
      containerId: 'c2',
      request: jest.fn().mockResolvedValue('new'),
      close: jest.fn().mockResolvedValue(undefined),
      on: undefined
    }
    cc.setConnection(connNew as any)
    // Give microtasks time
    const res = await cc.request('op')
    expect(res).toBe('new')
    expect(connOld.close).toHaveBeenCalled()
  })
})
