import { MeasureMetricsContext } from '@hcengineering/measurements'

describe('context tests', () => {
  it('check withLog proper catch', async () => {
    const ctx = new MeasureMetricsContext('test', {})

    try {
      await ctx.withLog('failed op', {}, async () => {
        throw new Error('failed')
      })
      expect(true).toBe(false)
    } catch (err: any) {
      expect(err.message).toBe('failed')
    }
  })
})
