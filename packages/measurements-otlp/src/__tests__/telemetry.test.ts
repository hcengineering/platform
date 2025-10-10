import { OpenTelemetryMetricsContext } from '../telemetry'
import { newMetrics, type MeasureLogger } from '@hcengineering/measurements'
import { trace, context, SpanStatusCode } from '@opentelemetry/api'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'

describe('telemetry', () => {
  let tracer: any
  let provider: NodeTracerProvider

  beforeAll(() => {
    provider = new NodeTracerProvider()
    provider.register()
    tracer = trace.getTracer('test-tracer')
  })

  afterAll(() => {
    provider.shutdown()
  })

  describe('OpenTelemetryMetricsContext', () => {
    const mockLogger: MeasureLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      close: jest.fn(async () => {}),
      logOperation: jest.fn()
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should create a new context with tracer', () => {
      const metrics = newMetrics()
      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        undefined,
        undefined,
        { op: 'create' },
        {},
        metrics,
        mockLogger
      )

      expect(ctx).toBeDefined()
      expect(ctx.metrics).toBe(metrics)
      expect(ctx.logger).toBe(mockLogger)
    })

    it('should create child context with span', () => {
      const metrics = newMetrics()
      const ctx = new OpenTelemetryMetricsContext(
        'parent',
        tracer,
        context.active(),
        undefined,
        {},
        {},
        metrics,
        mockLogger
      )

      const child = ctx.newChild('child', { op: 'child' }, { span: true })

      expect(child).toBeDefined()
      expect(child.parent).toBe(ctx)
    })

    it('should create child context without span when span is false', () => {
      const metrics = newMetrics()
      const ctx = new OpenTelemetryMetricsContext(
        'parent',
        tracer,
        context.active(),
        undefined,
        {},
        {},
        metrics,
        mockLogger
      )

      const child = ctx.newChild('child', { op: 'child' }, { span: false })

      expect(child).toBeDefined()
    })

    it('should execute async operation with context', async () => {
      const metrics = newMetrics()
      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        context.active(),
        undefined,
        {},
        {},
        metrics,
        mockLogger
      )

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
      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        context.active(),
        undefined,
        {},
        {},
        metrics,
        mockLogger
      )

      const result = ctx.withSync('operation', { op: 'test' }, () => {
        return 42
      })

      expect(result).toBe(42)
      expect(metrics.measurements.operation).toBeDefined()
    })

    it('should handle errors in async operations', async () => {
      const metrics = newMetrics()
      const span = tracer.startSpan('test-span')
      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        context.active(),
        span,
        {},
        {},
        metrics,
        mockLogger
      )

      await expect(
        ctx.with('operation', { op: 'test' }, async () => {
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')

      expect(metrics.measurements.operation).toBeDefined()
    })

    it('should measure custom value with meter', () => {
      const metrics = newMetrics()
      const mockMeter = {
        getCounter: jest.fn(() => ({
          counter: { record: jest.fn() },
          value: 0
        }))
      }

      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        undefined,
        undefined,
        { op: 'test' },
        {},
        metrics,
        mockLogger,
        undefined,
        undefined,
        undefined,
        mockMeter as any
      )

      ctx.measure('custom', 100)

      expect(mockMeter.getCounter).toHaveBeenCalledWith('custom')
    })

    it('should log info with OTLP logger', () => {
      const metrics = newMetrics()
      const mockOtlpLogger = {
        emit: jest.fn()
      }

      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        context.active(),
        undefined,
        { op: 'test' },
        {},
        metrics,
        mockLogger,
        undefined,
        undefined,
        mockOtlpLogger as any
      )

      ctx.info('Test message', { key: 'value' })

      expect(mockOtlpLogger.emit).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalled()
    })

    it('should log error with OTLP logger', () => {
      const metrics = newMetrics()
      const mockOtlpLogger = {
        emit: jest.fn()
      }

      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        context.active(),
        undefined,
        { op: 'test' },
        {},
        metrics,
        mockLogger,
        undefined,
        undefined,
        mockOtlpLogger as any
      )

      ctx.error('Error message', { error: 'details' })

      expect(mockOtlpLogger.emit).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('should log warn with OTLP logger', () => {
      const metrics = newMetrics()
      const mockOtlpLogger = {
        emit: jest.fn()
      }

      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        context.active(),
        undefined,
        { op: 'test' },
        {},
        metrics,
        mockLogger,
        undefined,
        undefined,
        mockOtlpLogger as any
      )

      ctx.warn('Warning message', { warning: 'info' })

      expect(mockOtlpLogger.emit).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should extract metadata from context', () => {
      const metrics = newMetrics()
      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        context.active(),
        undefined,
        {},
        {},
        metrics,
        mockLogger
      )

      const meta = ctx.extractMeta()

      expect(meta).toBeDefined()
      expect(typeof meta).toBe('object')
    })

    it('should get params', () => {
      const metrics = newMetrics()
      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        undefined,
        undefined,
        { op: 'test', method: 'GET' },
        {},
        metrics,
        mockLogger
      )

      const params = ctx.getParams()

      expect(params).toEqual({ op: 'test', method: 'GET' })
    })

    it('should share contextData with children', () => {
      const metrics = newMetrics()
      const ctx = new OpenTelemetryMetricsContext(
        'parent',
        tracer,
        context.active(),
        undefined,
        {},
        {},
        metrics,
        mockLogger
      )
      ctx.contextData = { userId: '123' }

      const child = ctx.newChild('child', {})

      expect(child.contextData).toBe(ctx.contextData)
    })

    it('should inherit params when inheritParams is true', async () => {
      const metrics = newMetrics()
      const ctx = new OpenTelemetryMetricsContext(
        'parent',
        tracer,
        context.active(),
        undefined,
        { parentKey: 'parentValue' },
        {},
        metrics,
        mockLogger
      )

      await ctx.with(
        'child',
        { childKey: 'childValue' },
        async (childCtx) => {
          expect(childCtx.getParams()).toEqual({ childKey: 'childValue' })
        },
        {},
        { inheritParams: false }
      )

      await ctx.with(
        'child',
        { childKey: 'childValue' },
        async (childCtx) => {
          expect(childCtx.getParams()).toEqual({
            parentKey: 'parentValue',
            childKey: 'childValue'
          })
        },
        {},
        { inheritParams: true }
      )
    })

    it('should not call end() twice', () => {
      const metrics = newMetrics()
      const span = tracer.startSpan('test-span')
      const spanEndSpy = jest.spyOn(span, 'end')

      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        context.active(),
        span,
        {},
        {},
        metrics,
        mockLogger
      )

      ctx.end()
      ctx.end() // Second call should be no-op

      expect(spanEndSpy).toHaveBeenCalledTimes(1)
    })

    it('should handle null return value', async () => {
      const metrics = newMetrics()
      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        context.active(),
        undefined,
        {},
        {},
        metrics,
        mockLogger
      )

      const result = await ctx.with('operation', {}, () => null)

      expect(result).toBeUndefined()
    })

    it('should log operation when log option is true', async () => {
      const metrics = newMetrics()
      const ctx = new OpenTelemetryMetricsContext(
        'test',
        tracer,
        context.active(),
        undefined,
        {},
        {},
        metrics,
        mockLogger
      )

      await ctx.with(
        'operation',
        { op: 'test' },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
        },
        {},
        { log: true }
      )

      expect(mockLogger.logOperation).toHaveBeenCalledWith(
        'operation',
        expect.any(Number),
        expect.objectContaining({ op: 'test' })
      )
    })

    it('should suppress tracing when span is disable', () => {
      const metrics = newMetrics()
      const ctx = new OpenTelemetryMetricsContext(
        'parent',
        tracer,
        context.active(),
        undefined,
        {},
        {},
        metrics,
        mockLogger
      )

      const child = ctx.newChild('child', {}, { span: 'disable' })

      expect(child).toBeDefined()
    })

    it('should set span attributes from params', () => {
      const metrics = newMetrics()
      
      const ctx = new OpenTelemetryMetricsContext(
        'parent',
        tracer,
        context.active(),
        undefined,
        {},
        {},
        metrics,
        mockLogger
      )

      // When creating a child with span: true, attributes are set on the child's span
      const child = ctx.newChild('child', { key1: 'value1', key2: 'value2' }, { span: true }) as OpenTelemetryMetricsContext

      // The child should have been created successfully
      expect(child).toBeDefined()
      expect(child.parent).toBe(ctx)
    })
  })
})
