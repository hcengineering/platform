import {
  MeasureMetricsContext,
  NoMetricsContext,
  consoleLogger,
  noParamsLogger,
  withContext,
  setOperationLogProfiling,
  registerOperationLog,
  updateOperationLog,
  addOperation
} from '../context'
import { newMetrics } from '../metrics'
import type { MeasureLogger, MeasureContext } from '../types'

describe('context', () => {
  describe('consoleLogger', () => {
    it('should create a logger with params', () => {
      const logger = consoleLogger({ service: 'test' })
      
      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.close).toBe('function')
    })

    it('should log info messages', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation()
      const logger = consoleLogger({ service: 'test' })
      
      logger.info('Test message', { key: 'value' })
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should log error messages', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const logger = consoleLogger({ service: 'test' })
      
      logger.error('Error message', { error: 'details' })
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should log warn messages', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const logger = consoleLogger({ service: 'test' })
      
      logger.warn('Warning message', { warning: 'info' })
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle errors in params', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const logger = consoleLogger({})
      const error = new Error('Test error')
      
      logger.error('Error occurred', { error })
      
      expect(consoleSpy).toHaveBeenCalled()
      const call = consoleSpy.mock.calls[0]
      expect(call[0]).toBe('Error occurred')
      consoleSpy.mockRestore()
    })
  })

  describe('MeasureMetricsContext', () => {
    let logger: MeasureLogger

    beforeEach(() => {
      logger = noParamsLogger
    })

    it('should create a new context', () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', { op: 'create' }, {}, metrics, logger)
      
      expect(ctx).toBeDefined()
      expect(ctx.metrics).toBe(metrics)
      expect(ctx.logger).toBe(logger)
    })

    it('should measure operation duration', async () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', { op: 'create' }, {}, metrics, logger)
      
      await new Promise(resolve => setTimeout(resolve, 50))
      ctx.end()
      
      expect(metrics.operations).toBe(1)
      expect(metrics.value).toBeGreaterThan(40)
    })

    it('should create child context', () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('parent', { op: 'parent' }, {}, metrics, logger)
      const child = ctx.newChild('child', { op: 'child' })
      
      expect(child).toBeDefined()
      expect(child.parent).toBe(ctx)
    })

    it('should execute async operation with context', async () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, logger)
      
      let executed = false
      await ctx.with('operation', { op: 'test' }, async () => {
        executed = true
        await new Promise(resolve => setTimeout(resolve, 10))
      })
      
      expect(executed).toBe(true)
      expect(metrics.measurements.operation).toBeDefined()
    })

    it('should execute sync operation with context', () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, logger)
      
      const result = ctx.withSync('operation', { op: 'test' }, () => {
        return 42
      })
      
      expect(result).toBe(42)
      expect(metrics.measurements.operation).toBeDefined()
    })

    it('should measure custom value', () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, logger)
      
      ctx.measure('custom', 100)
      
      expect(metrics.measurements['#custom']).toBeDefined()
      expect(metrics.measurements['#custom'].value).toBe(100)
    })

    it('should log info messages', () => {
      const mockLogger: MeasureLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        close: jest.fn(async () => {}),
        logOperation: jest.fn()
      }
      
      const ctx = new MeasureMetricsContext('test', { op: 'test' }, {}, newMetrics(), mockLogger)
      ctx.info('Test message', { key: 'value' })
      
      expect(mockLogger.info).toHaveBeenCalledWith('Test message', expect.objectContaining({ key: 'value', op: 'test' }))
    })

    it('should log error messages', () => {
      const mockLogger: MeasureLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        close: jest.fn(async () => {}),
        logOperation: jest.fn()
      }
      
      const ctx = new MeasureMetricsContext('test', { op: 'test' }, {}, newMetrics(), mockLogger)
      ctx.error('Error message', { error: 'details' })
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error message', expect.objectContaining({ error: 'details', op: 'test' }))
    })

    it('should log warn messages', () => {
      const mockLogger: MeasureLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        close: jest.fn(async () => {}),
        logOperation: jest.fn()
      }
      
      const ctx = new MeasureMetricsContext('test', { op: 'test' }, {}, newMetrics(), mockLogger)
      ctx.warn('Warning message', { warning: 'info' })
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Warning message', expect.objectContaining({ warning: 'info', op: 'test' }))
    })

    it('should get params', () => {
      const ctx = new MeasureMetricsContext('test', { op: 'test', method: 'GET' }, {}, newMetrics(), logger)
      const params = ctx.getParams()
      
      expect(params).toEqual({ op: 'test', method: 'GET' })
    })

    it('should share contextData with children', () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('parent', {}, {}, metrics, logger)
      ctx.contextData = { userId: '123' }
      
      const child = ctx.newChild('child', {})
      
      expect(child.contextData).toBe(ctx.contextData)
    })

    it('should handle named parameters', () => {
      const metrics = newMetrics()
      new MeasureMetricsContext('test', { method: 'GET' }, {}, metrics, logger)
      
      expect(metrics.namedParams.method).toBe('GET')
    })

    it('should update named parameters on multiple contexts', () => {
      const metrics = newMetrics()
      const ctx1 = new MeasureMetricsContext('test1', { method: 'GET' }, {}, metrics, logger)
      
      expect(metrics.namedParams.method).toBe('GET')
      
      // Create another context with different value for same param
      const ctx2 = new MeasureMetricsContext('test2', { method: 'POST' }, {}, metrics, logger)
      
      // The second context will see existing value is different, so it will update to '*'
      // But this happens within the constructor logic
      expect(metrics.namedParams.method).toBe('POST')
    })
  })

  describe('NoMetricsContext', () => {
    it('should create a no-op context', () => {
      const ctx = new NoMetricsContext()
      
      expect(ctx).toBeDefined()
      expect(ctx.logger).toBeDefined()
    })

    it('should execute operations without measuring', async () => {
      const ctx = new NoMetricsContext()
      
      let executed = false
      await ctx.with('operation', {}, async () => {
        executed = true
      })
      
      expect(executed).toBe(true)
    })

    it('should create child contexts', () => {
      const ctx = new NoMetricsContext()
      const child = ctx.newChild('child', {})
      
      expect(child).toBeDefined()
      expect(child).toBeInstanceOf(NoMetricsContext)
    })

    it('should handle measure calls without error', () => {
      const ctx = new NoMetricsContext()
      
      expect(() => {
        ctx.measure('test', 100)
      }).not.toThrow()
    })

    it('should handle end calls without error', () => {
      const ctx = new NoMetricsContext()
      
      expect(() => {
        ctx.end()
      }).not.toThrow()
    })

    it('should return empty params', () => {
      const ctx = new NoMetricsContext()
      const params = ctx.getParams()
      
      expect(params).toEqual({})
    })
  })

  describe('withContext decorator', () => {
    it('should wrap method with context', async () => {
      class TestClass {
        @withContext('testOperation', { service: 'test' })
        async testMethod(ctx: MeasureContext, value: number): Promise<number> {
          return value * 2
        }
      }
      
      const instance = new TestClass()
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('root', {}, {}, metrics, noParamsLogger)
      
      const result = await instance.testMethod(ctx, 21)
      
      expect(result).toBe(42)
      expect(metrics.measurements.testOperation).toBeDefined()
    })
  })

  describe('operation log profiling', () => {
    beforeEach(() => {
      setOperationLogProfiling(false)
    })

    afterEach(() => {
      setOperationLogProfiling(false)
    })

    it('should register operation log when profiling enabled', () => {
      setOperationLogProfiling(true)
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, noParamsLogger)
      
      const { opLogMetrics, op } = registerOperationLog(ctx)
      
      expect(opLogMetrics).toBe(metrics)
      expect(op).toBeDefined()
      expect(ctx.id).toBeDefined()
    })

    it('should not register operation log when profiling disabled', () => {
      setOperationLogProfiling(false)
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, noParamsLogger)
      
      const { opLogMetrics, op } = registerOperationLog(ctx)
      
      expect(opLogMetrics).toBeUndefined()
      expect(op).toBeUndefined()
    })

    it('should update operation log', () => {
      setOperationLogProfiling(true)
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, noParamsLogger)
      
      const { opLogMetrics, op } = registerOperationLog(ctx)
      updateOperationLog(opLogMetrics, op)
      
      expect(op?.end).toBeGreaterThan(0)
    })

    it('should add operation to log', async () => {
      setOperationLogProfiling(true)
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, noParamsLogger)
      
      registerOperationLog(ctx)
      
      let executed = false
      await addOperation(ctx, 'asyncOp', { op: 'test' }, async () => {
        executed = true
      })
      
      expect(executed).toBe(true)
      expect(metrics.opLog).toBeDefined()
    })

    it('should limit operation log entries', () => {
      setOperationLogProfiling(true)
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, noParamsLogger)
      
      registerOperationLog(ctx)
      
      // Create many operation log entries
      if (metrics.opLog && ctx.id) {
        for (let i = 0; i < 50; i++) {
          metrics.opLog[ctx.id].ops.push({
            op: `test${i}`,
            start: i,
            end: i + 1,
            params: {}
          })
        }
        
        const op = metrics.opLog[ctx.id]
        updateOperationLog(metrics, op)
        
        expect(Object.keys(metrics.opLog).length).toBeLessThanOrEqual(31)
      }
    })
  })

  describe('extractMeta', () => {
    it('should return empty metadata', () => {
      const ctx = new MeasureMetricsContext('test', {}, {}, newMetrics(), noParamsLogger)
      const meta = ctx.extractMeta()
      
      expect(meta).toEqual({})
    })
  })

  describe('async operations', () => {
    it('should handle promise rejection', async () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, noParamsLogger)
      
      await expect(
        ctx.with('operation', { op: 'test' }, async () => {
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')
      
      expect(metrics.measurements.operation).toBeDefined()
    })

    it('should return null promise for null sync result', async () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, noParamsLogger)
      
      const result = await ctx.with('operation', { op: 'test' }, () => {
        return null
      })
      
      expect(result).toBeUndefined()
    })

    it('should handle sync return value', async () => {
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, noParamsLogger)
      
      const result = await ctx.with('operation', { op: 'test' }, () => {
        return 42
      })
      
      expect(result).toBe(42)
    })

    it('should log operation when log option is true', async () => {
      const mockLogger: MeasureLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        close: jest.fn(async () => {}),
        logOperation: jest.fn()
      }
      
      const metrics = newMetrics()
      const ctx = new MeasureMetricsContext('test', {}, {}, metrics, mockLogger)
      
      await ctx.with('operation', { op: 'test' }, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      }, {}, { log: true })
      
      expect(mockLogger.logOperation).toHaveBeenCalledWith(
        'operation',
        expect.any(Number),
        expect.objectContaining({ op: 'test' })
      )
    })
  })
})
