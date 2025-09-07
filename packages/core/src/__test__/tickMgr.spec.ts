import { TickManagerImpl } from '../utils'

describe('check tickManager', () => {
  it('check ticks', async () => {
    const mgr = new TickManagerImpl(20)
    const h1 = mgr.nextHash()

    // await mgr.tick()
    expect(mgr.isMe(h1, 1)).toBe(true)
    expect(mgr.isMe(h1, 2)).toBe(true)
    expect(mgr.isMe(h1, 3)).toBe(true)
    ;(mgr as any)._tick = 20
    expect(mgr.isMe(h1, 1)).toBe(true)
    expect(mgr.isMe(h1, 2)).toBe(false)
    expect(mgr.isMe(h1, 3)).toBe(false)
    ;(mgr as any)._tick = 40
    expect(mgr.isMe(h1, 1)).toBe(true)
    expect(mgr.isMe(h1, 2)).toBe(true)
    expect(mgr.isMe(h1, 3)).toBe(false)
    ;(mgr as any)._tick = 60
    expect(mgr.isMe(h1, 1)).toBe(true)
    expect(mgr.isMe(h1, 2)).toBe(false)
    expect(mgr.isMe(h1, 3)).toBe(true)
  })
})
