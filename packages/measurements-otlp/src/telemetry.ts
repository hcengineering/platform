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
import {
  context,
  metrics as otelMetrics,
  Span,
  trace,
  type Context,
  type Gauge,
  type Meter,
  type Tracer
} from '@opentelemetry/api'
import { Logger, SeverityNumber } from '@opentelemetry/api-logs'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'

class MetricsContext {
  counters = new Map<string, { counter: Gauge, value: 0 }>()
  constructor (readonly meter?: Meter) {}

  getCounter (name: string): { counter: Gauge, value: number } | undefined {
    if (this.meter === undefined) {
      return undefined
    }
    let counter = this.counters.get(name)
    if (counter === undefined) {
      counter = { counter: this.meter.createGauge(name), value: 0 }
      this.counters.set(name, counter)
    }
    return counter
  }
}

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
  isDone = false
  doneTrace: string = ''
  private done (value?: number, override?: boolean): void {
    if (!this.isDone) {
      this.doneTrace = new Error().stack ?? ''
      this.isDone = true
      updateMeasure(this.metrics, this.st, this.params, this.fullParams, (spend) => {}, value, override)
      this.span?.end()
    }
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
    readonly logParams?: ParamsType,

    readonly otlpLogger?: Logger,
    readonly meter?: MetricsContext
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
    const cnt = this.meter?.getCounter(name)
    if (cnt !== undefined) {
      if (cnt.value !== value) {
        cnt.counter.record(value, this.params)
        cnt.value = value
      }
    }
  }

  newChild (
    name: string,
    params: ParamsType,
    fullParams?: FullParamsType | (() => FullParamsType),
    logger?: MeasureLogger,
    useContextParent?: boolean
  ): MeasureContext {
    const childContext =
      useContextParent === true || useContextParent == null
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
      this.logParams,
      this.otlpLogger,
      this.meter
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
    if (this.otlpLogger !== undefined) {
      this.otlpLogger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: 'error',
        body: message,
        attributes: args ?? {}
      })
    }
    this.logger.error(message, { ...this.params, ...args, ...(this.logParams ?? {}) })
  }

  info (message: string, args?: Record<string, any>): void {
    if (this.otlpLogger !== undefined) {
      this.otlpLogger.emit({
        severityNumber: SeverityNumber.INFO,
        severityText: 'info',
        body: message,
        attributes: args ?? {}
      })
    }
    this.logger.info(message, { ...this.params, ...args, ...(this.logParams ?? {}) })
  }

  warn (message: string, args?: Record<string, any>): void {
    if (this.otlpLogger !== undefined) {
      this.otlpLogger.emit({
        severityNumber: SeverityNumber.WARN,
        severityText: 'warn',
        body: message,
        attributes: args ?? {}
      })
    }
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
  logger?: MeasureLogger,
  version?: string
): MeasureContext {
  // Traces
  const tracesUrl = getTracesUrl()

  if (tracesUrl === undefined) {
    console.warn('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT is not set, OpenTelemetry metrics will not be sent')
    return new MeasureMetricsContext(name, params, fullParams, metrics, logger)
  }

  const traceHeaders = parseTraceExporterHeaders()

  const exporter = new OTLPTraceExporter({
    url: tracesUrl,
    headers: traceHeaders,
    compression:
      (process.env.OTEL_EXPORTER_OTLP_COMPRESSION as CompressionAlgorithm) ??
      (process.env.OTEL_EXPORTER_OTLP_TRACES_COMPRESSION as CompressionAlgorithm) ??
      CompressionAlgorithm.GZIP,
    keepAlive: true
  })

  const batchSpanProcessor = new BatchSpanProcessor(exporter, {
    maxExportBatchSize: parseInt(process.env.OTEL_EXPORTER_OTLP_TRACES_MAX_EXPORT_BATCH_SIZE ?? '1000'),
    maxQueueSize: parseInt(process.env.OTEL_EXPORTER_OTLP_TRACES_MAX_QUEUE_SIZE ?? '1000')
  })

  // Logs
  const logsEndpoint = getLogsUrl()
  const logHeaders = parseLogsExporterHeaders()
  const logExporter = new OTLPLogExporter({
    url: logsEndpoint,
    headers: logHeaders,
    compression:
      (process.env.OTEL_EXPORTER_OTLP_COMPRESSION as CompressionAlgorithm) ??
      (process.env.OTEL_EXPORTER_OTLP_LOGS_COMPRESSION as CompressionAlgorithm) ??
      CompressionAlgorithm.GZIP,
    keepAlive: true
  })

  const batchLogProcessor = new BatchLogRecordProcessor(logExporter, {
    maxExportBatchSize: parseInt(process.env.OTEL_EXPORTER_OTLP_LOGS_MAX_EXPORT_BATCH_SIZE ?? '1000'),
    maxQueueSize: parseInt(process.env.OTEL_EXPORTER_OTLP_LOGS_MAX_QUEUE_SIZE ?? '1000')
  })

  // Metrics

  const metricsUrl = getMetricsUrl()
  const metricsHeaders = parseMetricsExporterHeaders()
  const metricsExporter = new OTLPMetricExporter({
    url: metricsUrl,
    headers: metricsHeaders
  })
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricsExporter,
    exportIntervalMillis: 15000
  })

  // SDK

  const sdk = new NodeSDK({
    spanProcessors: [batchSpanProcessor],
    serviceName: name,
    traceExporter: exporter,
    resource: resourceFromAttributes({
      'service-name': name,
      'service-version': version ?? '0.7',
      'deployment-environment': process.env.OTEL_ENVIRONMENT
    }),
    instrumentations: [getNodeAutoInstrumentations()],
    idGenerator: new AWSXRayIdGenerator(),
    logRecordProcessors: [batchLogProcessor],
    metricReader
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

  const loggerProvider = new LoggerProvider({
    processors: [batchLogProcessor]
  })

  const otlpLogger: Logger = loggerProvider.getLogger(name)

  const meter = otelMetrics.getMeter(name, version)

  const currentConext = context.active()
  const ctx = new OpenTelemetryMetricsContext(
    name,
    tracer,
    currentConext,
    undefined,
    params,
    fullParams,
    metrics,
    logger,
    undefined,
    undefined,
    otlpLogger,
    new MetricsContext(meter)
  )
  ctx.info('Using open telemetry metrics context', {
    traceEndpoint: tracesUrl,
    tracerHeadersSet: Array.from(Object.keys(traceHeaders)),
    logsEndpoint,
    logHeadersSet: Array.from(Object.keys(logHeaders))
  })
  return ctx
}
function parseTraceExporterHeaders (): Record<string, string> {
  const headers: Record<string, string> = parseBaggage(process.env.OTEL_EXPORTER_OTLP_HEADERS) ?? {}

  if (process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS !== undefined) {
    const extraHeaders = parseBaggage(process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS)
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers[key] = value
    }
  }
  return headers
}

function getTracesUrl (): string | undefined {
  let tracesUrl = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT

  if (tracesUrl !== undefined && !tracesUrl.endsWith('/v1/traces')) {
    if (tracesUrl.endsWith('/')) {
      tracesUrl += 'v1/traces'
    } else {
      tracesUrl += '/v1/traces'
    }
  }
  return tracesUrl
}

function getLogsUrl (): string | undefined {
  let logsUrl = process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT

  if (logsUrl !== undefined && !logsUrl.endsWith('/v1/logs')) {
    if (logsUrl.endsWith('/')) {
      logsUrl += 'v1/logs'
    } else {
      logsUrl += '/v1/logs'
    }
  }
  return logsUrl
}
function parseLogsExporterHeaders (): Record<string, string> {
  const headers: Record<string, string> = parseBaggage(process.env.OTEL_EXPORTER_OTLP_HEADERS) ?? {}

  if (process.env.OTEL_EXPORTER_OTLP_LOGS_HEADERS !== undefined) {
    const extraHeaders = parseBaggage(process.env.OTEL_EXPORTER_OTLP_LOGS_HEADERS)
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers[key] = value
    }
  }
  return headers
}

function getMetricsUrl (): string | undefined {
  let metricsUrl = process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT

  if (metricsUrl !== undefined && !metricsUrl.endsWith('/v1/metrics')) {
    if (metricsUrl.endsWith('/')) {
      metricsUrl += 'v1/metrics'
    } else {
      metricsUrl += '/v1/metrics'
    }
  }
  return metricsUrl
}
function parseMetricsExporterHeaders (): Record<string, string> {
  const headers: Record<string, string> = parseBaggage(process.env.OTEL_EXPORTER_OTLP_HEADERS) ?? {}

  if (process.env.OTEL_EXPORTER_OTLP_METRICS_HEADERS !== undefined) {
    const extraHeaders = parseBaggage(process.env.OTEL_EXPORTER_OTLP_METRICS_HEADERS)
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers[key] = value
    }
  }
  return headers
}
