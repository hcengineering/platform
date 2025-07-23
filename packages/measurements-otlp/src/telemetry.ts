import {
  childMetrics,
  consoleLogger,
  MeasureContext,
  MeasureMetricsContext,
  newMetrics,
  noParamsLogger,
  nullPromise,
  platformNow,
  platformNowDiff,
  updateMeasure,
  type FullParamsType,
  type MeasureLogger,
  type Metrics,
  type ParamsType
} from '@hcengineering/measurements'
import { context, Span, trace, type Context, type Tracer } from '@opentelemetry/api'
import { suppressTracing } from '@opentelemetry/core'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'

/**
 * @public
 */
export class OpenTelemetryMetricsContext implements MeasureContext {
  private readonly name: string
  private readonly params: ParamsType

  private readonly fullParams: FullParamsType | (() => FullParamsType) = {}
  logger: MeasureLogger
  metrics: Metrics
  id?: string

  st = platformNow()
  contextData: object = {}
  private done (value?: number, override?: boolean): void {
    updateMeasure(this.metrics, this.st, this.params, this.fullParams, (spend) => {}, value, override)
    this.span?.end()
  }

  constructor (
    name: string,
    readonly tracer: Tracer,
    readonly context: Context,
    readonly span: Span | undefined,
    params: ParamsType,
    fullParams: FullParamsType | (() => FullParamsType) = {},
    metrics: Metrics = newMetrics(),
    logger?: MeasureLogger,
    readonly parent?: MeasureContext,
    readonly logParams?: ParamsType
  ) {
    this.name = name
    this.params = params
    this.fullParams = fullParams
    this.metrics = metrics
    this.metrics.namedParams = this.metrics.namedParams ?? {}
    for (const [k, v] of Object.entries(params)) {
      if (this.metrics.namedParams[k] !== v) {
        this.metrics.namedParams[k] = v
      } else {
        this.metrics.namedParams[k] = '*'
      }
    }

    this.logger = logger ?? (this.logParams != null ? consoleLogger(this.logParams ?? {}) : noParamsLogger)
  }

  measure (name: string, value: number, override?: boolean): void {
    this.span?.addEvent(name, value)
  }

  newChild (
    name: string,
    params: ParamsType,
    fullParams?: FullParamsType | (() => FullParamsType),
    logger?: MeasureLogger,
    useContextParent: boolean = true
  ): MeasureContext {
    const childContext = useContextParent
      ? context.active()
      : this.span !== undefined
        ? trace.setSpan(this.context, this.span)
        : this.context
    const span = this.tracer.startSpan(name, undefined, childContext)

    const spanParams = [...Object.entries(params)]
    for (const [k, v] of spanParams) {
      span?.setAttribute(k, v as any)
    }

    const result = new OpenTelemetryMetricsContext(
      name,
      this.tracer,
      childContext,
      span,
      params,
      fullParams ?? {},
      childMetrics(this.metrics, [name]),
      logger ?? this.logger,
      this,
      this.logParams
    )
    result.id = this.id
    result.contextData = this.contextData
    return result
  }

  with<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T | Promise<T>,
    fullParams?: ParamsType | (() => FullParamsType)
  ): Promise<T> {
    const c = this.newChild(name, params, fullParams, this.logger, false)
    let needFinally = true
    try {
      const _context = (c as OpenTelemetryMetricsContext).context ?? context.active()

      const span = (c as OpenTelemetryMetricsContext).span

      const value = context.with(_context, () => op(c))
      if (value instanceof Promise) {
        needFinally = false
        if (span !== undefined) {
          void value.catch((err) => {
            span?.recordException(err)
          })
        }
        return value.finally(() => {
          if (span !== undefined) {
            const fParams = typeof fullParams === 'function' ? fullParams() : fullParams
            const spanParams = [...Object.entries(fParams ?? {})]
            for (const [k, v] of spanParams) {
              span?.setAttribute(k, v)
            }
          }
          c.end()
        })
      } else {
        if (value == null) {
          return nullPromise as Promise<T>
        }
        return Promise.resolve(value)
      }
    } finally {
      if (needFinally) {
        c.end()
      }
    }
  }

  withoutTracing<T>(op: () => T): T {
    return context.with(suppressTracing(this.context), op)
  }

  withSync<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T,
    fullParams?: ParamsType | (() => FullParamsType)
  ): T {
    const c = this.newChild(name, params, fullParams, this.logger, false)
    const _context = (c as OpenTelemetryMetricsContext).context ?? context.active()

    const span = (c as OpenTelemetryMetricsContext).span

    try {
      return context.with(_context, () => op(c))
    } catch (err: any) {
      if (span !== undefined) {
        span.recordException(err)
      }
      throw err
    } finally {
      c.end()
    }
  }

  withLog<T>(
    name: string,
    params: ParamsType,
    op: (ctx: MeasureContext) => T | Promise<T>,
    fullParams?: ParamsType
  ): Promise<T> {
    const st = platformNow()
    const r = this.with(name, params, op, fullParams)
    r.catch(() => {
      // Ignore logging errors to prevent unhandled rejections
    }).finally(() => {
      this.logger.logOperation(name, platformNowDiff(st), { ...params, ...fullParams })
    })
    return r
  }

  error (message: string, args?: Record<string, any>): void {
    this.logger.error(message, { ...this.params, ...args, ...(this.logParams ?? {}) })
  }

  info (message: string, args?: Record<string, any>): void {
    this.logger.info(message, { ...this.params, ...args, ...(this.logParams ?? {}) })
  }

  warn (message: string, args?: Record<string, any>): void {
    this.logger.warn(message, { ...this.params, ...args, ...(this.logParams ?? {}) })
  }

  end (): void {
    this.done()
  }

  getParams (): ParamsType {
    return this.params
  }
}

/**
 * Parse W3C baggage header format to Record<string, string>
 *
 * W3C baggage format: "key1=value1,key2=value2;property=value,key3=value3"
 * Returns only the key-value pairs, ignoring properties
 */
function parseBaggage (baggageHeader?: string): Record<string, string> {
  if (baggageHeader == null || typeof baggageHeader !== 'string') {
    return {}
  }

  const result: Record<string, string> = {}

  // Split by comma to get individual baggage members
  const members = baggageHeader.split(',')

  for (const member of members) {
    const trimmedMember = member.trim()
    if (trimmedMember === '') continue

    // Split by semicolon to separate key=value from properties
    const parts = trimmedMember.split(';')
    const keyValuePart = parts[0]?.trim()

    if (keyValuePart == null) continue

    // Split by equals to get key and value
    const equalIndex = keyValuePart.indexOf('=')
    if (equalIndex === -1) continue

    const key = keyValuePart.substring(0, equalIndex).trim()
    const value = keyValuePart.substring(equalIndex + 1).trim()

    if (key != null) {
      // URL decode the key and value
      try {
        const decodedKey = decodeURIComponent(key)
        const decodedValue = decodeURIComponent(value)
        result[decodedKey] = decodedValue
      } catch (error) {
        // If decoding fails, use the original values
        result[key] = value
      }
    }
  }

  return result
}

export function createOpenTelemetryMetricsContext (
  name: string,
  params: ParamsType,
  fullParams: FullParamsType | (() => FullParamsType) = {},
  metrics: Metrics = newMetrics(),
  logger?: MeasureLogger
): MeasureContext {
  let url = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT

  if (url !== undefined && !url.endsWith('/v1/traces')) {
    if (url.endsWith('/')) {
      url += 'v1/traces'
    } else {
      url += '/v1/traces'
    }
  }

  if (url === undefined) {
    console.warn('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT is not set, OpenTelemetry metrics will not be sent')
    return new MeasureMetricsContext(name, params, fullParams, metrics, logger)
  }

  const headers: Record<string, string> = parseBaggage(process.env.OTEL_EXPORTER_OTLP_HEADERS) ?? {}

  if (process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS !== undefined) {
    const extraHeaders = parseBaggage(process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS)
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers[key] = value
    }
  }

  const exporter = new OTLPTraceExporter({
    url,
    headers,
    compression:
      (process.env.OTEL_EXPORTER_OTLP_COMPRESSION as CompressionAlgorithm) ??
      (process.env.OTEL_EXPORTER_OTLP_TRACES_COMPRESSION as CompressionAlgorithm) ??
      CompressionAlgorithm.GZIP,
    keepAlive: true
  })

  const bsp = new BatchSpanProcessor(exporter, {
    maxExportBatchSize: parseInt(process.env.OTEL_EXPORTER_OTLP_TRACES_MAX_EXPORT_BATCH_SIZE ?? '1000'),
    maxQueueSize: parseInt(process.env.OTEL_EXPORTER_OTLP_TRACES_MAX_QUEUE_SIZE ?? '1000')
  })

  const sdk = new NodeSDK({
    spanProcessor: bsp,
    serviceName: name,
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations()],
    idGenerator: new AWSXRayIdGenerator()
  })

  sdk.start()

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => {
        console.log('Tracing terminated')
      })
      .catch((error) => {
        console.log('Error terminating tracing', error)
      })
      .finally(() => process.exit(0))
  })

  const tracer = trace.getTracer(name)
  const currentConext = context.active()
  const ctx = new OpenTelemetryMetricsContext(
    name,
    tracer,
    currentConext,
    undefined,
    params,
    fullParams,
    metrics,
    logger
  )
  ctx.info('Using open telemetry metrics context', {
    endpoint: url
  })
  return ctx
}
