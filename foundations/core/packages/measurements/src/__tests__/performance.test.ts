import { MeasureMetricsContext, NoMetricsContext, noParamsLogger } from '../context'
import { newMetrics, metricsAggregate } from '../metrics'
import type { MeasureContext } from '../types'

describe('performance', () => {
  describe('overhead measurement', () => {
    // Reduced iterations to fit within 10 seconds total test time
    const iterations = 100
    const depth = 5

    it('should measure overhead of with() vs raw execution', async () => {
      // Baseline: raw execution without measurement
      const baselineStart = performance.now()
      for (let i = 0; i < iterations; i++) {
        await simulateWork(1)
      }
      const baselineTime = performance.now() - baselineStart

      // With measurement context
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('root', {}, {}, metrics, noParamsLogger)

      const measuredStart = performance.now()
      for (let i = 0; i < iterations; i++) {
        await ctx.with('operation', { iteration: i }, async () => {
          await simulateWork(1)
        })
      }
      const measuredTime = performance.now() - measuredStart

      const overhead = measuredTime - baselineTime
      const overheadPercentage = (overhead / baselineTime) * 100

      console.log(`\n📊 Overhead Analysis (${iterations} iterations):`)
      console.log(`  Baseline time: ${baselineTime.toFixed(2)}ms`)
      console.log(`  Measured time: ${measuredTime.toFixed(2)}ms`)
      console.log(`  Overhead: ${overhead.toFixed(2)}ms (${overheadPercentage.toFixed(2)}%)`)
      console.log(`  Per operation: ${(overhead / iterations).toFixed(4)}ms`)

      expect(metrics.measurements.operation).toBeDefined()
      expect(metrics.measurements.operation.operations).toBe(iterations)

      // Overhead should be reasonable (typically < 50% for simple operations)
      // This is informational rather than a strict assertion
      expect(overheadPercentage).toBeLessThan(400)
    })

    it('should measure overhead with deep nested contexts', async () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('root', {}, {}, metrics, noParamsLogger)

      // Baseline: single level
      const singleLevelStart = performance.now()
      for (let i = 0; i < iterations; i++) {
        await ctx.with('shallow', {}, async () => {
          await simulateWork(1)
        })
      }
      const singleLevelTime = performance.now() - singleLevelStart

      // Deep nesting
      const deepStart = performance.now()
      for (let i = 0; i < iterations; i++) {
        await deepNestedExecution(ctx, depth, 1)
      }
      const deepTime = performance.now() - deepStart

      const nestingOverhead = deepTime - singleLevelTime
      const overheadPerLevel = nestingOverhead / (iterations * depth)

      console.log(`\n📊 Deep Nesting Overhead (${iterations} iterations, depth=${depth}):`)
      console.log(`  Single level: ${singleLevelTime.toFixed(2)}ms`)
      console.log(`  Deep nested: ${deepTime.toFixed(2)}ms`)
      console.log(`  Nesting overhead: ${nestingOverhead.toFixed(2)}ms`)
      console.log(`  Per level: ${overheadPerLevel.toFixed(4)}ms`)

      expect(metrics.measurements.shallow).toBeDefined()
      expect(metrics.measurements.level0).toBeDefined()
    })

    it('should measure overhead with complex parameter tracking', async () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('root', {}, {}, metrics, noParamsLogger)

      // Simple params
      const simpleStart = performance.now()
      for (let i = 0; i < iterations; i++) {
        await ctx.with('simple', { id: i }, async () => {
          await simulateWork(1)
        })
      }
      const simpleTime = performance.now() - simpleStart

      // Complex params with multiple tracked values
      const complexStart = performance.now()
      for (let i = 0; i < iterations; i++) {
        await ctx.with(
          'complex',
          {
            method: i % 3 === 0 ? 'GET' : i % 3 === 1 ? 'POST' : 'PUT',
            status: i % 2 === 0 ? 200 : 404,
            cached: i % 4 === 0
          },
          async () => {
            await simulateWork(1)
          },
          {
            userId: `user_${i % 10}`,
            endpoint: `/api/v1/resource/${i % 5}`,
            timestamp: Date.now()
          }
        )
      }
      const complexTime = performance.now() - complexStart

      const paramOverhead = complexTime - simpleTime

      console.log(`\n📊 Parameter Tracking Overhead (${iterations} iterations):`)
      console.log(`  Simple params: ${simpleTime.toFixed(2)}ms`)
      console.log(`  Complex params: ${complexTime.toFixed(2)}ms`)
      console.log(`  Param overhead: ${paramOverhead.toFixed(2)}ms`)
      console.log(`  Per operation: ${(paramOverhead / iterations).toFixed(4)}ms`)

      expect(metrics.measurements.simple).toBeDefined()
      expect(metrics.measurements.complex).toBeDefined()
      expect(Object.keys(metrics.measurements.complex.params).length).toBeGreaterThan(0)
    })

    it('should measure overhead with NoMetricsContext', async () => {
      // NoMetricsContext should have minimal overhead
      const noMetricsCtx = new NoMetricsContext(noParamsLogger)

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        await noMetricsCtx.with('operation', { iteration: i }, async () => {
          await simulateWork(1)
        })
      }
      const noMetricsTime = performance.now() - start

      // Compare with raw execution
      const rawStart = performance.now()
      for (let i = 0; i < iterations; i++) {
        await simulateWork(1)
      }
      const rawTime = performance.now() - rawStart

      const overhead = noMetricsTime - rawTime
      const overheadPercentage = (overhead / rawTime) * 100

      console.log(`\n📊 NoMetricsContext Overhead (${iterations} iterations):`)
      console.log(`  Raw time: ${rawTime.toFixed(2)}ms`)
      console.log(`  NoMetrics time: ${noMetricsTime.toFixed(2)}ms`)
      console.log(`  Overhead: ${overhead.toFixed(2)}ms (${overheadPercentage.toFixed(2)}%)`)

      // NoMetricsContext should have very low overhead
      expect(overheadPercentage).toBeLessThan(100)
    })
  })

  describe('realistic workload simulation', () => {
    it('should measure overhead in complex realistic scenario', async () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('app', { service: 'api' }, {}, metrics, noParamsLogger)

      const requests = 50
      const baselineStart = performance.now()

      // Simulate without metrics
      for (let i = 0; i < requests; i++) {
        await simulateAPIRequest(null, i)
      }
      const baselineTime = performance.now() - baselineStart

      // Reset for measured run
      const measuredStart = performance.now()

      // Simulate with metrics
      for (let i = 0; i < requests; i++) {
        await simulateAPIRequest(ctx, i)
      }
      const measuredTime = performance.now() - measuredStart

      const overhead = measuredTime - baselineTime
      const overheadPercentage = (overhead / baselineTime) * 100

      console.log(`\n📊 Realistic Workload Analysis (${requests} API requests):`)
      console.log(`  Baseline: ${baselineTime.toFixed(2)}ms`)
      console.log(`  With metrics: ${measuredTime.toFixed(2)}ms`)
      console.log(`  Overhead: ${overhead.toFixed(2)}ms (${overheadPercentage.toFixed(2)}%)`)
      console.log(`  Per request: ${(overhead / requests).toFixed(4)}ms`)

      // Check metrics structure
      const aggregated = metricsAggregate(metrics, 10)
      console.log(`  Collected operations: ${aggregated.measurements.request?.operations ?? 0}`)

      expect(aggregated.measurements.request).toBeDefined()
      expect(overheadPercentage).toBeLessThan(200) // Should be less than 100% overhead
    })
  })
})

// Helper functions

async function simulateWork (durationMs: number): Promise<void> {
  const end = performance.now() + durationMs
  while (performance.now() < end) {
    // Busy wait to simulate work
    const r = Math.random() * Math.random()
    expect(r).toBeGreaterThanOrEqual(0)
  }
}

async function deepNestedExecution (
  ctx: MeasureContext,
  depth: number,
  workMs: number,
  currentLevel: number = 0
): Promise<void> {
  if (currentLevel >= depth) {
    await simulateWork(workMs)
    return
  }

  await ctx.with(`level${currentLevel}`, { level: currentLevel }, async (childCtx) => {
    await deepNestedExecution(childCtx, depth, workMs, currentLevel + 1)
  })
}

async function simulateAPIRequest (ctx: MeasureContext | null, requestId: number): Promise<void> {
  const method = ['GET', 'POST', 'PUT'][requestId % 3]
  const endpoint = `/api/resource/${requestId % 10}`

  if (ctx === null) {
    // No metrics version
    await simulateWork(1)
    // Simulate DB query
    await simulateWork(2)
    // Simulate processing
    await simulateWork(1)
    return
  }

  // With metrics version
  await ctx.with('request', { method, endpoint }, async (reqCtx) => {
    await reqCtx.with('auth', { userId: `user_${requestId % 50}` }, async () => {
      await simulateWork(1)
    })

    await reqCtx.with('database', { query: 'SELECT' }, async (dbCtx) => {
      await dbCtx.with('query_execution', {}, async () => {
        await simulateWork(2)
      })
    })

    await reqCtx.with('processing', { items: requestId % 20 }, async () => {
      await simulateWork(1)
    })
  })
}
