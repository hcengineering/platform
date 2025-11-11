import core, { MeasureMetricsContext, toFindResult } from '@hcengineering/core'
import type { SessionFindAll } from '@hcengineering/server-core'
import { QueryJoiner } from '../queryJoin'

describe('test query joiner', () => {
  it('test find', async () => {
    let count = 0
    const findT: SessionFindAll = async (ctx, _class, query, options) => {
      await new Promise<void>((resolve) => {
        count++
        setTimeout(resolve, 100)
      })
      return toFindResult([])
    }
    const joiner = new QueryJoiner()
    const ctx = new MeasureMetricsContext('test', {})

    const p1 = joiner.query(ctx, core.class.Class, (ctx) => findT(ctx, core.class.Class, {}))
    const p2 = joiner.query(ctx, core.class.Class, (ctx) => findT(ctx, core.class.Class, {}))
    await Promise.all([p1, p2])
    expect(count).toBe(1)
    expect((joiner as any).queries.size).toBe(0)
  })
})
