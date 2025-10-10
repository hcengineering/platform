import {
  newMetrics,
  measure,
  childMetrics,
  metricsAggregate,
  metricsToString,
  metricsToJson,
  metricsToRows,
  updateMeasure
} from '../metrics'
import { platformNow } from '../index'

describe('metrics', () => {
  describe('newMetrics', () => {
    it('should create a new metrics object with default values', () => {
      const metrics = newMetrics()
      
      expect(metrics.operations).toBe(0)
      expect(metrics.value).toBe(0)
      expect(metrics.measurements).toEqual({})
      expect(metrics.params).toEqual({})
      expect(metrics.namedParams).toEqual({})
    })
  })

  describe('measure', () => {
    it('should measure operation duration', async () => {
      const metrics = newMetrics()
      const done = measure(metrics, { operation: 'test' })
      
      await new Promise(resolve => setTimeout(resolve, 50))
      done()
      
      expect(metrics.operations).toBe(1)
      expect(metrics.value).toBeGreaterThan(40)
    })

    it('should call endOp callback with duration', async () => {
      const metrics = newMetrics()
      let capturedSpend = 0
      const done = measure(metrics, { operation: 'test' }, {}, (spend) => {
        capturedSpend = spend
      })
      
      await new Promise(resolve => setTimeout(resolve, 50))
      done()
      
      expect(capturedSpend).toBeGreaterThan(40)
    })

    it('should handle multiple operations', async () => {
      const metrics = newMetrics()
      
      const done1 = measure(metrics, { operation: 'test' })
      await new Promise(resolve => setTimeout(resolve, 20))
      done1()
      
      const done2 = measure(metrics, { operation: 'test' })
      await new Promise(resolve => setTimeout(resolve, 20))
      done2()
      
      expect(metrics.operations).toBe(2)
      expect(metrics.value).toBeGreaterThan(30)
    })
  })

  describe('updateMeasure', () => {
    it('should update metrics with custom value', () => {
      const metrics = newMetrics()
      const st = platformNow()
      
      updateMeasure(metrics, st, { op: 'test' }, {}, undefined, 100)
      
      expect(metrics.operations).toBe(1)
      expect(metrics.value).toBe(100)
    })

    it('should override operations when override is true', () => {
      const metrics = newMetrics()
      const st = platformNow()
      
      // First call without override - accumulates value and increments operations
      updateMeasure(metrics, st, { op: 'test' }, {}, undefined, 50, false)
      expect(metrics.value).toBe(50)
      expect(metrics.operations).toBe(1)
      
      // Second call with override - sets operations, doesn't add to value
      updateMeasure(metrics, st, { op: 'test' }, {}, undefined, 100, true)
      
      expect(metrics.operations).toBe(100) // overridden
      expect(metrics.value).toBe(50) // not changed when override=true
    })

    it('should track parameters', () => {
      const metrics = newMetrics()
      const st = platformNow()
      
      updateMeasure(metrics, st, { method: 'GET' }, {}, undefined, 100)
      updateMeasure(metrics, st, { method: 'POST' }, {}, undefined, 200)
      
      expect(metrics.params.method).toBeDefined()
      expect(metrics.params.method.GET).toBeDefined()
      expect(metrics.params.method.POST).toBeDefined()
      expect(metrics.params.method.GET.value).toBe(100)
      expect(metrics.params.method.POST.value).toBe(200)
    })

    it('should handle multiple parameters as counters', () => {
      const metrics = newMetrics()
      const st = platformNow()
      
      updateMeasure(metrics, st, { method: 'GET', status: '200' }, {}, undefined, 100)
      updateMeasure(metrics, st, { method: 'GET', status: '404' }, {}, undefined, 50)
      
      expect(metrics.params.method.GET).toBeDefined()
      expect(metrics.params.method.GET.topResult).toBeDefined()
      expect(metrics.params.method.GET.topResult?.length).toBeGreaterThan(0)
    })

    it('should update top results', () => {
      const metrics = newMetrics()
      const st = platformNow()
      
      updateMeasure(metrics, st, {}, { request: 'slow' }, undefined, 100)
      updateMeasure(metrics, st, {}, { request: 'fast' }, undefined, 10)
      
      expect(metrics.topResult).toBeDefined()
      expect(metrics.topResult?.length).toBeGreaterThan(0)
    })
  })

  describe('childMetrics', () => {
    it('should create child metrics in hierarchy', () => {
      const root = newMetrics()
      const child = childMetrics(root, ['level1', 'level2'])
      
      expect(root.measurements.level1).toBeDefined()
      expect(root.measurements.level1.measurements.level2).toBeDefined()
      expect(child).toBe(root.measurements.level1.measurements.level2)
    })

    it('should reuse existing child metrics', () => {
      const root = newMetrics()
      const child1 = childMetrics(root, ['level1'])
      const child2 = childMetrics(root, ['level1'])
      
      expect(child1).toBe(child2)
    })

    it('should create nested paths', () => {
      const root = newMetrics()
      childMetrics(root, ['api', 'users', 'create'])
      
      expect(root.measurements.api).toBeDefined()
      expect(root.measurements.api.measurements.users).toBeDefined()
      expect(root.measurements.api.measurements.users.measurements.create).toBeDefined()
    })
  })

  describe('metricsAggregate', () => {
    it('should aggregate metrics', () => {
      const metrics = newMetrics()
      metrics.value = 100
      metrics.operations = 10
      
      const child1 = childMetrics(metrics, ['child1'])
      child1.value = 50
      child1.operations = 5
      
      const child2 = childMetrics(metrics, ['child2'])
      child2.value = 30
      child2.operations = 3
      
      const aggregated = metricsAggregate(metrics)
      
      expect(aggregated.value).toBe(80) // child1 + child2
      expect(aggregated.operations).toBe(10)
    })

    it('should limit number of child metrics', () => {
      const metrics = newMetrics()
      
      for (let i = 0; i < 10; i++) {
        const child = childMetrics(metrics, [`child${i}`])
        child.value = i * 10
      }
      
      const aggregated = metricsAggregate(metrics, 3)
      
      expect(Object.keys(aggregated.measurements).length).toBe(3)
    })

    it('should filter out metrics starting with #', () => {
      const metrics = newMetrics()
      
      const child1 = childMetrics(metrics, ['normal'])
      child1.value = 50
      
      const child2 = childMetrics(metrics, ['#internal'])
      child2.value = 30
      
      const aggregated = metricsAggregate(metrics)
      
      expect(aggregated.value).toBe(50) // only 'normal' counted
    })
  })

  describe('metricsToString', () => {
    it('should convert metrics to string', () => {
      const metrics = newMetrics()
      metrics.value = 100
      metrics.operations = 10
      
      const str = metricsToString(metrics, 'TestMetrics', 50)
      
      expect(str).toContain('TestMetrics')
      expect(str).toContain('100')
      expect(str).toContain('10')
    })

    it('should include child metrics in string', () => {
      const metrics = newMetrics()
      const child = childMetrics(metrics, ['operation'])
      child.value = 50
      child.operations = 5
      
      const str = metricsToString(metrics, 'TestMetrics', 50)
      
      expect(str).toContain('operation')
    })
  })

  describe('metricsToJson', () => {
    it('should convert metrics to JSON', () => {
      const metrics = newMetrics()
      metrics.value = 100
      metrics.operations = 10
      
      const json = metricsToJson(metrics)
      
      // aggregated value is the total value when no children
      expect(json.$total).toBe(100)
      expect(json.$ops).toBe(10)
    })

    it('should include child metrics in JSON', () => {
      const metrics = newMetrics()
      const child = childMetrics(metrics, ['operation'])
      child.value = 50
      child.operations = 5
      
      const json = metricsToJson(metrics)
      
      expect(json).toBeDefined()
      const keys = Object.keys(json)
      expect(keys.some(k => k.includes('operation'))).toBe(true)
    })
  })

  describe('metricsToRows', () => {
    it('should convert metrics to rows', () => {
      const metrics = newMetrics()
      metrics.value = 100
      metrics.operations = 10
      
      const rows = metricsToRows(metrics, 'TestMetrics')
      
      expect(Array.isArray(rows)).toBe(true)
      expect(rows.length).toBeGreaterThan(0)
      expect(rows[0]).toContain('TestMetrics')
    })

    it('should include child metrics in rows', () => {
      const metrics = newMetrics()
      const child = childMetrics(metrics, ['operation'])
      child.value = 50
      child.operations = 5
      
      const rows = metricsToRows(metrics, 'TestMetrics')
      
      expect(rows.length).toBeGreaterThan(1)
      expect(rows.some(row => row.includes('operation'))).toBe(true)
    })

    it('should properly format row values', () => {
      const metrics = newMetrics()
      metrics.value = 100
      metrics.operations = 10
      
      const rows = metricsToRows(metrics, 'TestMetrics')
      
      expect(rows[0]).toHaveLength(5) // offset, name, avg, total, ops
      expect(typeof rows[0][0]).toBe('number') // offset
      expect(typeof rows[0][1]).toBe('string') // name
    })
  })
})
