import { makeSequential } from '../mutex'

describe('mutex', () => {
  let results: number[]

  beforeEach(() => {
    results = []
  })

  async function waitAndPushResult (millis: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, millis)
    })
    results.push(millis)
  }

  it('expect sequential execution', async () => {
    const myUpdate = makeSequential(waitAndPushResult)
    await Promise.all([myUpdate(50), myUpdate(30), myUpdate(40), myUpdate(10), myUpdate(20)])
    expect(results).toEqual([50, 30, 40, 10, 20])
  })

  it('expect parallel execution', async () => {
    const myUpdate = waitAndPushResult
    await Promise.all([myUpdate(50), myUpdate(30), myUpdate(40), myUpdate(10), myUpdate(20)])
    expect(results).toEqual([10, 20, 30, 40, 50])
  })
})
