import { platformNow, platformNowDiff } from '../index'

describe('index', () => {
  describe('platformNow', () => {
    it('should return a positive number', () => {
      const now = platformNow()
      expect(typeof now).toBe('number')
      expect(now).toBeGreaterThan(0)
    })

    it('should return increasing values over time', async () => {
      const first = platformNow()
      await new Promise((resolve) => setTimeout(resolve, 10))
      const second = platformNow()
      expect(second).toBeGreaterThan(first)
    })
  })

  describe('platformNowDiff', () => {
    it('should calculate the difference between timestamps', async () => {
      const start = platformNow()
      await new Promise((resolve) => setTimeout(resolve, 50))
      const diff = platformNowDiff(start)

      expect(diff).toBeGreaterThan(40)
      expect(diff).toBeLessThan(100)
    })

    it('should round to 2 decimal places', async () => {
      const start = platformNow()
      await new Promise((resolve) => setTimeout(resolve, 10))
      const diff = platformNowDiff(start)

      // Check that it has at most 2 decimal places
      const decimalPlaces = (diff.toString().split('.')[1] ?? '').length
      expect(decimalPlaces).toBeLessThanOrEqual(2)
    })

    it('should handle very small differences', () => {
      const start = platformNow()
      const diff = platformNowDiff(start)

      expect(diff).toBeGreaterThanOrEqual(0)
      expect(typeof diff).toBe('number')
    })
  })
})
